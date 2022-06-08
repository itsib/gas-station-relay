import { BaseProvider } from '@ethersproject/providers';
import { default as axios, Method } from 'axios';
import { Big } from 'big.js';
import { suggestFees } from 'eip1559-fee-suggestions-ethers';
import { inject, injectable } from 'inversify';
import { GasSettings } from '../types';
import { getBlock } from '../utils/get-block';

export interface IGasService {
  getGasSettings: () => Promise<any>;
}

@injectable()
export class GasService implements IGasService {

  constructor(@inject('BaseProvider') private _provider: BaseProvider) {}

  async getGasSettings(): Promise<GasSettings> {
    const { chainId } = await this._provider.getNetwork();
    switch (chainId) {
      case 1:       // Mainnet
      case 3:       // Ropsten
      case 4:       // Rinkeby
      case 5:       // Gorly
      case 42:      // Kovan
      case 137:     // Polygon
      case 80001:   // Mumbai (Polygon testnet)
        return this._getEthereumGasSettings();
      case 56:      // Binance Smart Chain
      case 97:      // Binance Smart Chain (Testnet)
        return this._getBinanceGasSettings();
      case 250:     // Fantom
        return this._getFantomGasSettings();
      case 10:      // Optimism
      case 69:      // Optimism Kovan
        return this._getOptimismGasSettings();
      default:
        return this._getDefaultGasSettings();
    }
  }

  private async _getEthereumGasSettings(): Promise<GasSettings> {
    const send = (method: string, args: [number, string, number[]]) => {
      const [ count, ...otherArgs ] = args;
      return (this._provider as any).send(method, [`0x${count.toString(16)}`, ...otherArgs]);
    }
    const lastBlock = await getBlock(this._provider);
    const [pastBlock, suggestedFees] = await Promise.all([getBlock(this._provider, lastBlock.number - 1000), suggestFees({ send } as any)]);

    const { baseFeeSuggestion, maxPriorityFeeSuggestions, confirmationTimeByPriorityFee } = suggestedFees;
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

    if (!maxPriorityFeeSuggestions.urgent || !maxPriorityFeeSuggestions.fast || !maxPriorityFeeSuggestions.normal || !baseFeeSuggestion) {
      throw new Error('It is impossible to obtain gas price');
    }

    const sortedKeys = Object.keys(confirmationTimeByPriorityFee).sort((k0, k1) => Big(k0).minus(k1).toNumber());
    const baseFeePerGas = Big(baseFeeSuggestion).times(1.2).round(0);
    const urgentConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.urgent).gte(confirmationTimeByPriorityFee[key]));
    const fastConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.fast).gte(confirmationTimeByPriorityFee[key]));
    const normalConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.normal).gte(confirmationTimeByPriorityFee[key]));

    return {
      high: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.urgent).toFixed(),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.urgent,
        confirmationTime: urgentConfirmTimeInBlocks ? Big(urgentConfirmTimeInBlocks).times(avgBlockTime).toFixed() : undefined,
      },
      middle: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.fast).toFixed(),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.fast,
        confirmationTime: fastConfirmTimeInBlocks ? Big(fastConfirmTimeInBlocks).times(avgBlockTime).toFixed() : undefined,
      },
      low: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.normal).toFixed(),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.normal,
        confirmationTime: normalConfirmTimeInBlocks ? Big(normalConfirmTimeInBlocks).times(avgBlockTime).toFixed() : undefined,
      },
      avgBlockTime,
    };
  }

  private async _getBinanceGasSettings(): Promise<GasSettings> {
    const lastBlock = await getBlock(this._provider, 'latest');
    const [pastBlock, gasPrice] = await Promise.all([getBlock(this._provider, lastBlock.number - 1000), this._provider.getGasPrice()]);
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

    return {
      high: {
        gasPrice: gasPrice.toString(),
      },
      middle: {
        gasPrice: gasPrice.toString(),
      },
      low: {
        gasPrice: gasPrice.toString(),
      },
      avgBlockTime,
    };
  }

  private async _getFantomGasSettings(): Promise<GasSettings> {
    try {
      const lastBlock = await getBlock(this._provider, 'latest');
      const query = {
        url: 'https://gftm.blockscan.com/gasapi.ashx?apikey=key&method=pendingpooltxgweidata',
        method: 'GET' as Method,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      };
      const [pastBlock, response] = await Promise.all([getBlock(this._provider, lastBlock.number - 1000), axios.request(query)]);
      const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

      const baseFeePerGas = Big(lastBlock.baseFeePerGas.toString()).times(1.2).round(0);
      const gweiMultiplier = Math.pow(10, 9);
      const externalGasSettings = response.data?.result;

      if (!externalGasSettings.rapidgaspricegwei || !externalGasSettings.fastgaspricegwei || !externalGasSettings.standardgaspricegwei) {
        throw new Error('It is impossible to obtain gas price');
      }

      const highMaxPriorityFeePerGas = Big(externalGasSettings.rapidgaspricegwei).times(gweiMultiplier).toFixed();
      const middleMaxPriorityFeePerGas = Big(externalGasSettings.fastgaspricegwei).times(gweiMultiplier).toFixed();
      const lowMaxPriorityFeePerGas = Big(externalGasSettings.standardgaspricegwei).times(gweiMultiplier).toFixed();

      return {
        high: {
          maxFeePerGas: baseFeePerGas.add(highMaxPriorityFeePerGas).toFixed(),
          maxPriorityFeePerGas: highMaxPriorityFeePerGas,
        },
        middle: {
          maxFeePerGas: baseFeePerGas.add(middleMaxPriorityFeePerGas).toFixed(),
          maxPriorityFeePerGas: middleMaxPriorityFeePerGas,
        },
        low: {
          maxFeePerGas: baseFeePerGas.add(lowMaxPriorityFeePerGas).toFixed(),
          maxPriorityFeePerGas: lowMaxPriorityFeePerGas,
        },
        avgBlockTime,
      };
    } catch (e) {
      return this._getEthereumGasSettings();
    }
  }

  private async _getOptimismGasSettings(): Promise<GasSettings> {
    const lastBlock = await getBlock(this._provider, 'latest');
    const [pastBlock, gasPrice] = await Promise.all([getBlock(this._provider, lastBlock.number - 1000), this._provider.getGasPrice()]);
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

    return {
      high: {
        gasPrice: gasPrice.toString(),
      },
      middle: {
        gasPrice: gasPrice.toString(),
      },
      low: {
        gasPrice: gasPrice.toString(),
      },
      avgBlockTime,
    };
  }

  private async _getDefaultGasSettings(): Promise<GasSettings> {
    const lastBlock = await getBlock(this._provider, 'latest');
    if (lastBlock.baseFeePerGas) {
      return this._getEthereumGasSettings();
    }

    const [pastBlock, gasPrice] = await Promise.all([getBlock(this._provider, lastBlock.number - 1000), this._provider.getGasPrice()]);
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();
    const bGasPrice = Big(gasPrice.toString());

    return {
      high: {
        gasPrice: bGasPrice.times(1.8).toFixed(),
      },
      middle: {
        gasPrice: bGasPrice.times(1.4).toFixed(),
      },
      low: {
        gasPrice: bGasPrice.times(1.01).toFixed(),
      },
      avgBlockTime,
    };
  }
}
