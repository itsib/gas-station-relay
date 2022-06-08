export interface GasSettingsBySpeed {
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  confirmationTime?: string;
}

export interface GasSettings {
  high: GasSettingsBySpeed;
  middle: GasSettingsBySpeed;
  low: GasSettingsBySpeed;
  avgBlockTime: string;
}
