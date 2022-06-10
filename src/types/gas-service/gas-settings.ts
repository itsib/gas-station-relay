export interface GasSettingsBySpeed {
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  /**
   * Approximate transaction confirmation time, with current parameters. In seconds.
   */
  confirmationTime?: string;
}

export interface GasSettings {
  high: GasSettingsBySpeed;
  middle: GasSettingsBySpeed;
  low: GasSettingsBySpeed;
  /**
   * Average block processing time in the blockchain
   */
  avgBlockTime: string;
}
