export interface TxEstimateGasQuery {
  /**
   * The address from which the transaction is sent
   */
  from: string;
  /**
   * The address of the contract or user where the transaction will be sent
   */
  to: string;
  /**
   * Transaction raw data
   */
  data: string;
  /**
   * ETH to send
   */
  value: string;
  /**
   * The token that is required to pay fee
   */
  token?: string;
}
