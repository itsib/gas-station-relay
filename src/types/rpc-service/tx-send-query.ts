export interface TxSendQueryFee {
  token: string;
  approvalData: string;
}


export interface TxSendQueryInfo {
  from: string;
  to: string;
  gas: string;
  nonce: string;
  deadline: string;
  data: string;
}

export interface TxSendQuery {
  tx: TxSendQueryInfo;
  fee: TxSendQueryFee;
  signature: string;
}
