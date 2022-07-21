import { Block } from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber, getDefaultProvider } from 'ethers';
import { CONFIG } from '../config';
import { NetworkConfig } from '../types';
import { cancelPromiseByTimeout } from './cancel-promise-by-timeout';
import { logger } from './logger';

const DEFAULT_BLOCK_GAS_LIMIT = BigNumber.from(20_000_000);

interface ProviderConfig {
  index: number;
  provider: BaseProvider;
  weight: number;
  timeout: number;
}

export class Provider extends BaseProvider {

  private readonly _providerConfigs: ProviderConfig[];

  // Due to the highly asyncronous nature of the blockchain, we need
  // to make sure we never unroll the blockNumber due to our random
  // sample of backends
  _highestBlockNumber: number;

  constructor(networkConfig: NetworkConfig) {
    const rpcUrls = networkConfig.rpc.reduce<string[]>((acc, rpcSource) => {
      if (rpcSource.includes('${INFURA_API_KEY}')) {
        if (CONFIG.INFURA_API_KEY) {
          acc.push(rpcSource.replace('${INFURA_API_KEY}', CONFIG.INFURA_API_KEY));
        } else {
          logger.warn('INFURA_API_KEY not provided for RPC URL');
        }
      } else {
        acc.push(rpcSource);
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
        timeout: 5000,
      }
    });
    this._highestBlockNumber = -1;
  }

  async detectNetwork(): Promise<Network> {
    const networks = await Promise.all(this._providerConfigs.map((c) => c.provider.getNetwork().catch(() => null)));
    let result = null;

    for (let i = 0; i < networks.length; i++) {
      const network = networks[i];

      // Null! We do not know our network; bail.
      if (network == null) {
        continue;
      }

      if (result) {
        // Make sure the network matches the previous networks
        if (!(result.name === network.name && result.chainId === network.chainId && ((result.ensAddress === network.ensAddress) || (result.ensAddress == null && network.ensAddress == null)))) {
          logger.warn(`Provider mismatch network`, network);
        }
      } else {
        result = network;
      }
    }

    return result;
  }

  async perform(method: string, params: { [name: string]: any }): Promise<any> {
    // Sending transactions is special; always broadcast it to all backends
    if (method === 'sendTransaction') {
      const results: Array<string | Error> = await Promise.all(this._providerConfigs.map((c) => {
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

    // We need to make sure we are in sync with our backends, so we need
    // to know this before we can make a lot of calls
    if (this._highestBlockNumber === -1 && method !== 'getBlockNumber') {
      await this.getBlockNumber();
    }

    return this._execProviderMethod('perform', [method, params]);
  }

  async send(method: string, param: any) {
    return this._execProviderMethod('send', [method, param]);
  }

  async getBlock (blockNumberOrTag: string | number): Promise<Block> {
    blockNumberOrTag = typeof blockNumberOrTag === 'number' ? `0x${blockNumberOrTag.toString(16)}` : blockNumberOrTag;
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

  private async _execProviderMethod(method: string, params: any[]): Promise<any> {
    const configs = this._providerConfigs.sort((a, b) => (b.weight - a.weight));
    const errors: { index: number; error: Error } [] = [];

    for(let i = 0; i < configs.length; i++) {
      const config = configs[i];
      try {
        return await cancelPromiseByTimeout(config.provider[method](...params), config.timeout).then(result => {
          errors.forEach(({ index, error}) => {
            const providerConfig = this._providerConfigs.find(p => p.index === index);
            providerConfig.weight *= 0.99;
          });
          config.weight = config.weight < 100 ? config.weight * 0.01 : config.weight;
          return result;
        });
      } catch (e) {
        errors.push({ index: config.index, error: e });
      }
    }

    throw errors[0].error;
  }
}
