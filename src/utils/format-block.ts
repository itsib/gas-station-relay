import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from 'ethers';

const DEFAULT_BLOCK_GAS_LIMIT = BigNumber.from(20_000_000);

export interface RawBlock extends Block {
  totalDifficulty?: string | number;
}

/**
 * Networks like CELO return non-standard blocks, which leads to an error.
 * Here we add the missing parameters to the block, and bring the fields to the desired type.
 * @param rawBlock
 */
export function formatBlock(rawBlock: RawBlock): Block {
  const difficulty = BigNumber.from(rawBlock.difficulty || rawBlock.totalDifficulty || '0x1');

  let gasLimit: BigNumber;
  if (rawBlock.gasLimit) {
    gasLimit = BigNumber.from(rawBlock.gasLimit);
  } else {
    if (rawBlock.gasUsed) {
      const gasUsed = BigNumber.from(rawBlock.gasUsed);
      if (gasUsed.gt(DEFAULT_BLOCK_GAS_LIMIT)) {
        gasLimit = gasUsed;
      }
    }

    if (!gasLimit) {
      gasLimit = DEFAULT_BLOCK_GAS_LIMIT;
    }
  }

  const blockNumber = BigNumber.from(rawBlock.number).toNumber();

  return {
    hash: rawBlock.hash,
    parentHash: rawBlock.parentHash,
    number: blockNumber,

    timestamp: BigNumber.from(rawBlock.timestamp).toNumber(),
    nonce: rawBlock.nonce || blockNumber.toString(16),
    difficulty: difficulty.toString() as any,
    _difficulty: difficulty,

    gasLimit: gasLimit,
    gasUsed: BigNumber.from(rawBlock.gasUsed),

    miner: rawBlock.miner,
    extraData: rawBlock.extraData,

    transactions: rawBlock.transactions,
    ...(rawBlock.baseFeePerGas ? { baseFeePerGas: BigNumber.from(rawBlock.baseFeePerGas) } : {}),
  };
}
