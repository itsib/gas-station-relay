import axios from 'axios';
import { NetworkConfig } from '../types';

const CONFIG_LIST_URL = 'https://raw.githubusercontent.com/plasmadlt/plasma-mobile-app/main/chainlist.json';

export async function getNetworkConfig(chainId: number): Promise<NetworkConfig> {
  return axios.get<NetworkConfig[]>(CONFIG_LIST_URL)
    .then(res => {
      const config = res.data.find(c => c.chainId === chainId);
      if (!config) {
        throw new Error('Network config not found');
      }
      return config;
    })
    .catch(() => {
      throw new Error(`Cannot get network config, for chainId: ${chainId}. Please check URL: ${CONFIG_LIST_URL}`);
    });
}
