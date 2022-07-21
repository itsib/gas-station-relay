export interface NetworkConfig {
  name: string;
  chain: string;
  network: string;
  icon: string;
  rpc: string[];
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  slip44: number;
  ens: {
    registry: string;
  };
  explorers?: [
    {
      name: "etherscan",
      url: "https://etherscan.io",
      standard: "EIP3091"
    }
  ],
  multicall: string;
}
