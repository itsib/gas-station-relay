export interface RelayInfo {
  /**
   * The ID of the blockchain. 1 для mainnet, 137 - polygon, 56 - finance smart chain, etc.
   * @format int
   */
  chainId: number;
  /**
   * Gas station contract address
   * @format address
   */
  gasStation: string;
  /**
   * Addresses of tokens that support gas payment.
   */
  feeTokens: string[];
  /**
   * The balance of the relay wallet
   * @format int256
   */
  balance: string;
  /**
   * Relay version, from package.json
   */
  version: string;
}
