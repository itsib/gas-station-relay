import { BigNumber } from '@ethersproject/bignumber';

export interface SerializedBlock {
  hash: string;
  parentHash: string;
  number: number;

  timestamp: number;
  nonce: string;
  difficulty: number;
  _difficulty: string;

  gasLimit: string;
  gasUsed: string;

  miner: string;
  extraData: string;

  baseFeePerGas?: null | string;
  transactions: Array<string>;
}
