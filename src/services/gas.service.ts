import { default as axios, Method } from 'axios';
import { Big } from 'big.js';
import { suggestFees } from 'eip1559-fee-suggestions-ethers';
import { inject, injectable } from 'inversify';
import { CONFIG } from '../config';
import { GasSettings } from '../types';
import { getPromiseState, Provider } from '../utils';

@injectable()
export class GasService {

  private _gasCache?: Promise<GasSettings>;

  constructor(@inject('Provider') private _provider: Provider) {}

  async getGasSettings(): Promise<GasSettings> {
    if (!this._gasCache || await getPromiseState(this._gasCache) === 'rejected') {
      this._gasCache = new Promise<GasSettings>(async (resolve, reject) => {
        try {
          const { chainId } = await this._provider.getNetwork();
          let gasSettings: GasSettings;
          switch (chainId) {
            case 1:       // Mainnet
            case 3:       // Ropsten
            case 4:       // Rinkeby
            case 5:       // Gorly
            case 42:      // Kovan
            case 137:     // Polygon
            case 80001:   // Mumbai (Polygon testnet)
              gasSettings = await this._getEthereumGasSettings();
              break;
            case 56:      // Binance Smart Chain
            case 97:      // Binance Smart Chain (Testnet)
              gasSettings = await this._getBinanceGasSettings();
              break;
            case 250:     // Fantom
              gasSettings = await this._getFantomGasSettings();
              break;
            case 10:      // Optimism
            case 69:      // Optimism Kovan
              gasSettings = await this._getOptimismGasSettings();
              break;
            default:
              gasSettings = await this._getDefaultGasSettings();
          }

          setTimeout(() => this._gasCache = undefined, CONFIG.GAS_CACHE_TIMEOUT);
          return resolve(gasSettings);
        } catch (e) {
          return reject(e)
        }
      });
    }
    return this._gasCache;
  }

  private async _getEthereumGasSettings(): Promise<GasSettings> {
    const lastBlock = await this._provider.getBlock('latest');
    const [pastBlock, suggestedFees] = await Promise.all([this._provider.getBlock(lastBlock.number - 1000), suggestFees(this._provider as any)]);

    const { baseFeeSuggestion, maxPriorityFeeSuggestions, confirmationTimeByPriorityFee } = suggestedFees;
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

    if (!maxPriorityFeeSuggestions.urgent || !maxPriorityFeeSuggestions.fast || !maxPriorityFeeSuggestions.normal || !baseFeeSuggestion) {
      throw new Error('It is impossible to obtain gas price');
    }

    const sortedKeys = Object.keys(confirmationTimeByPriorityFee).sort((k0, k1) => {
      const diff = Big(k0).minus(k1);
      if (diff.eq(0)) {
        return 0;
      }
      return diff.gt(0) ? 1 : -1;
    });
    const baseFeePerGas = Big(baseFeeSuggestion).times(1.2).round(0);
    const urgentConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.urgent).gte(confirmationTimeByPriorityFee[key]));
    const fastConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.fast).gte(confirmationTimeByPriorityFee[key]));
    const normalConfirmTimeInBlocks = sortedKeys.find(key => Big(maxPriorityFeeSuggestions.normal).gte(confirmationTimeByPriorityFee[key]));

    return {
      high: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.urgent).toFixed(0),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.urgent,
        baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        confirmationTime: urgentConfirmTimeInBlocks ? Big(urgentConfirmTimeInBlocks).times(avgBlockTime).toFixed(0) : undefined,
      },
      middle: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.fast).toFixed(0),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.fast,
        baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        confirmationTime: fastConfirmTimeInBlocks ? Big(fastConfirmTimeInBlocks).times(avgBlockTime).toFixed(0) : undefined,
      },
      low: {
        maxFeePerGas: Big(baseFeePerGas).add(maxPriorityFeeSuggestions.normal).toFixed(0),
        maxPriorityFeePerGas: maxPriorityFeeSuggestions.normal,
        baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        confirmationTime: normalConfirmTimeInBlocks ? Big(normalConfirmTimeInBlocks).times(avgBlockTime).toFixed(0) : undefined,
      },
      avgBlockTime,
    };
  }

  private async _getBinanceGasSettings(): Promise<GasSettings> {
    const lastBlock = await this._provider.getBlock('latest');
    const [pastBlock, gasPrice] = await Promise.all([this._provider.getBlock(lastBlock.number - 1000), this._provider.getGasPrice()]);
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
      const lastBlock = await this._provider.getBlock('latest');
      const query = {
        url: 'https://gftm.blockscan.com/gasapi.ashx?apikey=key&method=pendingpooltxgweidata',
        method: 'GET' as Method,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      };
      const [pastBlock, response] = await Promise.all([this._provider.getBlock(lastBlock.number - 1000), axios.request(query)]);
      const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();

      const baseFeePerGas = Big(lastBlock.baseFeePerGas.toString()).times(1.2).round(0);
      const gweiMultiplier = Math.pow(10, 9);
      const externalGasSettings = response.data?.result;

      if (!externalGasSettings.rapidgaspricegwei || !externalGasSettings.fastgaspricegwei || !externalGasSettings.standardgaspricegwei) {
        throw new Error('It is impossible to obtain gas price');
      }

      const highMaxPriorityFeePerGas = Big(externalGasSettings.rapidgaspricegwei).times(gweiMultiplier).toFixed(0);
      const middleMaxPriorityFeePerGas = Big(externalGasSettings.fastgaspricegwei).times(gweiMultiplier).toFixed(0);
      const lowMaxPriorityFeePerGas = Big(externalGasSettings.standardgaspricegwei).times(gweiMultiplier).toFixed(0);

      return {
        high: {
          maxFeePerGas: baseFeePerGas.add(highMaxPriorityFeePerGas).toFixed(0),
          maxPriorityFeePerGas: highMaxPriorityFeePerGas,
          baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        },
        middle: {
          maxFeePerGas: baseFeePerGas.add(middleMaxPriorityFeePerGas).toFixed(0),
          maxPriorityFeePerGas: middleMaxPriorityFeePerGas,
          baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        },
        low: {
          maxFeePerGas: baseFeePerGas.add(lowMaxPriorityFeePerGas).toFixed(0),
          maxPriorityFeePerGas: lowMaxPriorityFeePerGas,
          baseFeePerGas: lastBlock.baseFeePerGas.toString(),
        },
        avgBlockTime,
      };
    } catch (e) {
      return this._getEthereumGasSettings();
    }
  }

  private async _getOptimismGasSettings(): Promise<GasSettings> {
    const lastBlock = await this._provider.getBlock('latest');
    const [pastBlock, gasPrice] = await Promise.all([this._provider.getBlock(lastBlock.number - 1000), this._provider.getGasPrice()]);
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
    const lastBlock = await this._provider.getBlock('latest');
    if (lastBlock.baseFeePerGas) {
      return this._getEthereumGasSettings();
    }

    const [pastBlock, gasPrice] = await Promise.all([this._provider.getBlock( lastBlock.number - 1000), this._provider.getGasPrice()]);
    const avgBlockTime = Big(lastBlock.timestamp).minus(pastBlock.timestamp).div(1000).toString();
    const bGasPrice = Big(gasPrice.toString());

    return {
      high: {
        gasPrice: bGasPrice.times(1.8).toFixed(0),
      },
      middle: {
        gasPrice: bGasPrice.times(1.4).toFixed(0),
      },
      low: {
        gasPrice: bGasPrice.times(1.01).toFixed(0),
      },
      avgBlockTime,
    };
  }
}
