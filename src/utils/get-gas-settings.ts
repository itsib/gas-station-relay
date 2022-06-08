import { suggestFees } from 'eip1559-fee-suggestions-ethers';
import { BigNumber } from 'ethers';

interface LegacyGasSettings {
  gasPrice: BigNumber;
}

interface LondonGasSettings {
  maxPriorityFeePerGas: BigNumber;
  maxFeePerGas: BigNumber;
}

interface SimpleProvider {
  send: (method: string, params: Array<any>) => Promise<any>;
}

/**
 * Returns optimal gas settings
 * @param provider
 */
export async function getGasSettings(provider: SimpleProvider): Promise<LegacyGasSettings | LondonGasSettings | undefined> {
  const block = await provider.send('eth_getBlockByNumber', ['latest', false]);

  // EIP-1559
  if (block.baseFeePerGas) {
    const send = (method: string, args: [number, string, number[]]) => {
      const [ count, ...otherArgs ] = args;
      return provider.send(method, [`0x${count.toString(16)}`, ...otherArgs]);
    }
    const { baseFeeSuggestion, maxPriorityFeeSuggestions } = await suggestFees({ send } as any);

    const baseFeePerGas = BigNumber.from(baseFeeSuggestion);
    const maxPriorityFeePerGas = BigNumber.from(maxPriorityFeeSuggestions.urgent === '0' ? baseFeeSuggestion : maxPriorityFeeSuggestions.urgent);
    const maxFeePerGas = BigNumber.from(baseFeePerGas).add(maxPriorityFeePerGas);

    return { maxFeePerGas, maxPriorityFeePerGas };
  }
  // Legacy
  else {
    const gasPriceHex = await provider.send('eth_gasPrice', []);
    const gasPrice = BigNumber.from(gasPriceHex);

    return { gasPrice };
  }
}
