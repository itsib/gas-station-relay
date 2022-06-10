export interface TxFeeQuery {
  /**
   * The address from which the transaction is sent
   * @format address
   */
  from: string;
  /**
   * The address of the contract or user where the transaction will be sent
   * @format address
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
   * The cost of a unit of gas in wei
   */
  feePerGas: string;
  /**
   * The token that is required to pay fee
   */
  token?: string;
}
