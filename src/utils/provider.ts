import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { getDefaultProvider } from 'ethers';
import { CONFIG } from '../config';
import { NetworkConfig } from '../types';
import { cancelPromiseByTimeout, TimeoutError } from './cancel-promise-by-timeout';
import { formatBlock } from './format-block';
import { getPromiseState } from './get-promise-state';
import { logger } from './logger';

const BLOCK_NUMBER_CACHE_TIMEOUT = 3000; // The time of storing the block number in the cache
const CHAIN_ID_CACHE_TIMEOUT = 30 * 60000; // The storage time of the chain id in the cache
const NETWORK_CACHE_TIMEOUT = 20 * 60000; // We update the network data no more than once every 20 minutes.
const TIMEOUT_ERROR_MUL = 0.99;
const OTHER_ERROR_MUL = 0.9;
const SUCCESS_MUL = 1.01;

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
  private _detectedNetworkCache?: Promise<Network>;
  /**
   * The saved number of the last block, to reduce the load on the RPC server.
   * @private
   */
  private _blockNumberCache?: Promise<string>;
  /**
   * The saved chain id, to reduce the load on the RPC server.
   * @private
   */
  private _chainIdCache?: Promise<string>;

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
  }

  /**
   * Network detection.
   */
  async detectNetwork(): Promise<Network> {
    if (!this._detectedNetworkCache || await getPromiseState(this._detectedNetworkCache) === 'rejected') {
      this._detectedNetworkCache = new Promise<Network>(async (resolve, reject) => {
        let result: Network | null = null;
        let error: Error | null = null;

        const networks: (Network | null)[] = await Promise.all(this._providerConfigs.map((c) => {
          return cancelPromiseByTimeout<Network>(c.provider.getNetwork(), CONFIG.RPC_REQUEST_TIMEOUT)
            .then(network => {
              c.weight = c.weight === 0 ? 0.5 : c.weight;
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
          setTimeout(() => this._detectedNetworkCache = undefined, NETWORK_CACHE_TIMEOUT);
          return resolve(result);
        }
        return reject(error || new Error('Cannot detect network'));
      });
    }
    return this._detectedNetworkCache;
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
    // Method 'getBlock' should be call through the 'send' method, for format a response block and caching.
    else if (method === 'getBlock') {
      if (params.blockTag) {
        return this.send('eth_getBlockByNumber', [ params.blockTag, !!params.includeTransactions ]);
      } else if (params.blockHash) {
        return this.send('eth_getBlockByHash', [ params.blockHash, !!params.includeTransactions ]);
      } else {
        throw new Error(`Method getBlock call with wrong parameters`);
      }
    }
    // Method 'getBlockNumber' should be call through the 'send' method, for caching.
    else if (method === 'getBlockNumber') {
      return this.send('eth_blockNumber', []);
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

    // Returns cached results
    if (method === 'eth_blockNumber' && this._blockNumberCache) {
      return this._blockNumberCache;
    } else if (method === 'eth_chainId' && this._chainIdCache) {
      return this._chainIdCache;
    }

    const result = this._execProviderMethod('send', [method, params]).then(result => {
      // Networks like CELO return non-standard blocks, which leads to an error.
      // Here we add the missing parameters to the block, and bring the fields to the desired type.
      if (method === 'eth_getBlockByNumber') {
        return formatBlock(result);
      }

      return result;
    });

    // Add results to cache
    if (method === 'eth_blockNumber') {
      this._blockNumberCache = result;
      setTimeout(() => this._blockNumberCache = undefined, BLOCK_NUMBER_CACHE_TIMEOUT);
    } else if (method === 'eth_chainId') {
      this._chainIdCache = result;
      setTimeout(() => this._chainIdCache = undefined, CHAIN_ID_CACHE_TIMEOUT);
    }

    return result;
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
