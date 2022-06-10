export interface TxFeeResult {
  /**
   * Fee amount. int256 string.
   */
  fee: string;
  /**
   * Token address for pay fee, or 'NATIVE' if fee cannot be paid with tokens.
   */
  currency: string;
}
