import { Block } from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber, getDefaultProvider } from 'ethers';
import { CONFIG } from '../config';
import { NetworkConfig } from '../types';
import { cancelPromiseByTimeout, TimeoutError } from './cancel-promise-by-timeout';
import { getPromiseState } from './get-promise-state';
import { logger } from './logger';

const NETWORK_CACHE_TIMEOUT = 20 * 60000; // We update the network data no more than once every 20 minutes.
const DEFAULT_BLOCK_GAS_LIMIT = BigNumber.from(20_000_000);
const TIMEOUT_ERROR_MUL = 0.99;
const OTHER_ERROR_MUL = 0.9;
const SUCCESS_MUL = 1.001;

interface ProviderConfig {
  index: number;
  provider: BaseProvider;
  weight: number;
}

export class Provider extends BaseProvider {
  /**
   * Stored providers and weight
   * @private
   */
  private readonly _providerConfigs: ProviderConfig[];
  /**
   * Network detection cache
   * @private
   */
  private _detectedNetwork?: Promise<Network>;
  /**
   * Recent network updates.
   * @private
   */
  private _detectedNetworkLastUpdate: number;

  constructor(networkConfig: NetworkConfig) {
    const rpcUrls = networkConfig.rpc.reduce<string[]>((acc, rpcSource) => {
      if (!rpcSource.startsWith('ws')) {
        if (rpcSource.includes('${INFURA_API_KEY}')) {
          if (CONFIG.INFURA_API_KEY) {
            acc.push(rpcSource.replace('${INFURA_API_KEY}', CONFIG.INFURA_API_KEY));
          } else {
            logger.warn('INFURA_API_KEY not provided for RPC URL');
          }
        } else {
          acc.push(rpcSource);
        }
      }
      return acc;
    }, []);
    if (rpcUrls.length === 0) {
      throw new Error('RPC URLs not is empty');
    }

    const network: Network = {
      name: networkConfig.name,
      chainId: networkConfig.chainId,
      ensAddress: networkConfig.ens?.registry,
    };

    super(network);

    this._providerConfigs = rpcUrls.map((url, index) => {
      return {
        index,
        provider: getDefaultProvider(url),
        weight: 1,
      }
    });
    this._detectedNetworkLastUpdate = 0;
  }

  /**
   * Network detection.
   */
  async detectNetwork(): Promise<Network> {
    if (!this._detectedNetwork || this._detectedNetworkLastUpdate + NETWORK_CACHE_TIMEOUT < Date.now() || await getPromiseState(this._detectedNetwork) === 'rejected') {
      this._detectedNetworkLastUpdate = Date.now();
      this._detectedNetwork = new Promise<Network>(async (resolve, reject) => {
        let result: Network | null = null;
        let error: Error | null = null;

        const networks: (Network | null)[] = await Promise.all(this._providerConfigs.map((c) => {
          return cancelPromiseByTimeout<Network>(c.provider.getNetwork(), CONFIG.RPC_REQUEST_TIMEOUT)
            .then(network => {
              c.weight = 1;
              return network;
            })
            .catch(e => {
              c.weight = 0;
              error = e;
              return null;
            });
        }));

        for (let i = 0; i < networks.length; i++) {
          const network = networks[i];

          // Null! We do not know our network; bail.
          if (network == null) {
            continue;
          }

          if (result) {
            // Make sure the network matches the previous networks
            if (!(result.name === network.name && result.chainId === network.chainId)) {
              logger.warn(`Provider mismatch network`, network);
            }
          } else {
            result = network;
          }
        }

        if (result) {
          return resolve(result);
        }
        return reject(error || new Error('Cannot detect network'));
      });
    }
    return this._detectedNetwork;
  }

  /**
   * Perform call
   * @param method
   * @param params
   */
  async perform(method: string, params: { [name: string]: any }): Promise<any> {
    // Sending transactions is special; always broadcast it to all backends
    if (method === 'sendTransaction') {
      const providers = this._providerConfigs.filter(({ weight }) => weight !== 0);
      const results: Array<string | Error> = await Promise.all(providers.map((c) => {
        return c.provider.sendTransaction(params.signedTransaction).then((result) => {
          return result.hash;
        }, (error) => {
          return error;
        });
      }));

      // Any success is good enough (other errors are likely "already seen" errors
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (typeof (result) === 'string') {
          return result;
        }
      }

      // They were all an error; pick the first error
      throw results[0];
    }

    return this._execProviderMethod('perform', [method, params]);
  }

  /**
   * Call RPC method
   * @param method
   * @param params
   */
  async send(method: string, params: Array<any>): Promise<any> {
    // Validate fee history params
    if (method === 'eth_feeHistory') {
      const [count, ...otherParams] = params;
      params = [`0x${count.toString(16)}`, ...otherParams];
    }
    // Validate block number params
    else if (method === 'eth_getBlockByNumber') {
      const [blockNumberOrTag, ...otherParams] = params;
      params = [typeof blockNumberOrTag === 'number' ? `0x${blockNumberOrTag.toString(16)}` : blockNumberOrTag, ...otherParams];
    }
    return this._execProviderMethod('send', [method, params]);
  }

  /**
   * Get block by number or tag and format result
   * @param blockNumberOrTag
   */
  async getBlock(blockNumberOrTag: string | number): Promise<Block> {
    const block = await this.send('eth_getBlockByNumber', [blockNumberOrTag, false]);
    const difficulty = BigNumber.from(block.difficulty || block.totalDifficulty || '0x1');

    let gasLimit: BigNumber;
    if (block.gasLimit) {
      gasLimit = BigNumber.from(block.gasLimit);
    } else {
      if (block.gasUsed) {
        const gasUsed = BigNumber.from(block.gasUsed);
        if (gasUsed.gt(DEFAULT_BLOCK_GAS_LIMIT)) {
          gasLimit = gasUsed;
        }
      }

      if (!gasLimit) {
        gasLimit = DEFAULT_BLOCK_GAS_LIMIT;
      }
    }

    return {
      hash: block.hash,
      parentHash: block.parentHash,
      number: BigNumber.from(block.number).toNumber(),

      timestamp: BigNumber.from(block.timestamp).toNumber(),
      nonce: block.nonce || block.number,
      difficulty: difficulty.toString() as any,
      _difficulty: difficulty,

      gasLimit: gasLimit,
      gasUsed: BigNumber.from(block.gasUsed),

      miner: block.miner,
      extraData: block.extraData,

      baseFeePerGas: block.baseFeePerGas ? BigNumber.from(block.baseFeePerGas) : undefined,
      transactions: block.transactions,
    };
  }

  /**
   * Call the method of one of the providers, and change its weight, depending on the results.
   * @param method Provider's method. !!!NOT TO BE CONFUSED WITH THE RPC METHOD!!!
   * @param params Array of parameters passed to the method.
   * @private
   */
  private async _execProviderMethod<T = any>(method: string, params: any[]): Promise<T> {
    const configs = this._providerConfigs.filter(({ weight }) => weight !== 0).sort((a, b) => (b.weight - a.weight));
    const errors: { index: number; error: Error } [] = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      try {
        const result = await cancelPromiseByTimeout(config.provider[method](...params), CONFIG.RPC_REQUEST_TIMEOUT);

        // Lowering the weight of providers who made an error
        errors.forEach(({ index, error }) => {
          const providerConfig = this._providerConfigs.find(p => p.index === index);
          providerConfig.weight *= error instanceof TimeoutError ? TIMEOUT_ERROR_MUL : OTHER_ERROR_MUL;
        });

        // We increase the weight of the provider who executed the request.
        if (config.weight < 1) {
          const newWeight = config.weight * SUCCESS_MUL;
          config.weight = newWeight < 1 ? newWeight : 1;
        }

        return result;
      } catch (e) {
        logger.warn(`Provider index: ${config.index}; Method: ${params[0] || method}; ${e.message}`);
        errors.push({ index: config.index, error: e });
      }
    }

    throw errors[0].error;
  }
}
