import { Block, BlockTag } from '@ethersproject/abstract-provider';
import { FallbackProvider } from '@ethersproject/providers';
import { BigNumber, getDefaultProvider } from 'ethers';
import { CONFIG } from '../config';
import { NetworkConfig, Provider } from '../types';
import { logger } from './logger';

const DEFAULT_BLOCK_GAS_LIMIT = BigNumber.from(20_000_000);

export function getProvider(networkConfig: NetworkConfig): Provider {
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
  const providers = rpcUrls.map(url => getDefaultProvider(url));
  const provider = new FallbackProvider(providers);

  provider.getBlock = async function (blockNumberOrTag: BlockTag): Promise<Block> {
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

  return provider;
}
