export interface TxInfo {
  from: string;
  to: string;
  data: string;
  gas: string;
  nonce: string;
  value: string;
  deadline: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
}
