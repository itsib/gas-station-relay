import { Interface } from '@ethersproject/abi';
import { Block, Log } from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { BadRequest, InternalServerError } from '@tsed/exceptions';
import { default as axios } from 'axios';
import { Big } from 'big.js';
import { BigNumber, Contract, utils, Wallet } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { inject, injectable } from 'inversify';
import get from 'lodash.get';
import EXCHANGE_ABI from '../abi/exchange.json';
import GAS_STATION_ABI from '../abi/gas-station.json';
import { CONFIG } from '../config';
import { FeeInfo, RelayInfo, TxInfo } from '../types';
import { logger, parseRpcCallError, getGasSettings } from '../utils';

export interface IRpcService {
  relayInfo: () => Promise<RelayInfo>;
  estimateGas: (from: string, to: string, data: string, token: string) => Promise<string>;
  transactionFee: (from: string, to: string, data: string, token: string) => Promise<string>;
  sendTransaction: (tx: TxInfo, fee: FeeInfo, signature: string) => Promise<string>;
}

@injectable()
export class RpcService implements IRpcService {

  private readonly _initialization: Promise<void>;

  private readonly _wallet: Wallet;

  private _gasStationContract: Contract;

  private _exchangeContract: Contract;
  // Commission for the execution of the transaction.
  private _txRelayFeePercent: string;

  constructor(@inject('BaseProvider') private _provider: BaseProvider) {
    this._wallet = new Wallet(CONFIG.FEE_PAYER_WALLET_KEY, this._provider);

    this._initialization = new Promise(async (resolve: () => void) => {
      logger.debug(`RPC Service initialization...`);

      this._gasStationContract = new Contract(CONFIG.GAS_STATION_CONTRACT_ADDRESS, GAS_STATION_ABI, this._wallet);

      const [exchange, feePercent, balance]: [string, BigNumber, BigNumber] = await Promise.all([
        this._gasStationContract.exchange(),
        this._gasStationContract.txRelayFeePercent(),
        this._wallet.getBalance('latest'),
      ]);

      this._txRelayFeePercent = feePercent.toString();
      this._exchangeContract = new Contract(exchange, EXCHANGE_ABI, this._wallet);

      logger.debug(`Fee Payer Wallet: ${this._wallet.address}`);
      logger.debug(`Fee Payer Balance: ${formatEther(balance)} ETH`);
      logger.debug(`Gas Station Contract: ${this._gasStationContract.address}`);
      logger.debug(`Exchange Contract: ${this._exchangeContract.address}`);
      logger.debug(`Tx Relay Fee Percent: ${this._txRelayFeePercent}%`);

      // Subscribe to change contract state events
      const address = this._gasStationContract.address;

      this._provider.on({ address, topics: [utils.id('GasStationExchangeUpdated(address)')] }, (log: Log) => {
        const { args: { newExchange } } = this._gasStationContract.interface.parseLog(log);
        this._exchangeContract = new Contract(newExchange, new Interface(EXCHANGE_ABI), this._wallet);
        logger.debug(`Exchange Contract was updated: ${newExchange}`);
      });

      this._provider.on({ address, topics: [utils.id('GasStationTxRelayFeePercentUpdated(uint256)')] }, (log: Log) => {
        const { args: { newTxRelayFeePercent } } = this._gasStationContract.interface.parseLog(log);
        this._txRelayFeePercent = newTxRelayFeePercent.toString();
        logger.debug(`Tx Relay Fee Percent was updated: ${this._txRelayFeePercent}%`);
      });

      resolve();
    });
  }

  /**
   * Common relay info
   */
  public async relayInfo(): Promise<RelayInfo> {
    await this._initialization;

    const [network, balance, feeTokens]: [Network, BigNumber, string[]] = await Promise.all([
      this._provider.getNetwork(),
      this._wallet.getBalance('latest'),
      this._gasStationContract.feeTokens(),
    ]);

    return {
      chainId: network.chainId,
      gasStation: this._gasStationContract.address,
      feeTokens: feeTokens,
      balance: balance.toString(),
    }
  }

  /**
   * Calculate estimated gas for transaction relay
   * @param from
   * @param to
   * @param data
   * @param token
   */
  public async estimateGas(from: string, to: string, data: string, token: string): Promise<string> {
    await this._initialization;

    const [relayEstimateGas, txEstimateGas]: [BigNumber, BigNumber] = await Promise.all([
      this._gasStationContract.getEstimatedPostCallGas(token),
      this._gasStationContract.estimateGas.execute(from, to, data),
    ]);

    return Big(relayEstimateGas.add(txEstimateGas).toString())
      .times(CONFIG.ESTIMATE_GAS_MULTIPLIER)
      .toFixed(0);
  }

  /**
   * Calculate cost of transaction
   * @param from
   * @param to
   * @param data
   * @param token
   */
  public async transactionFee(from: string, to: string, data: string, token: string): Promise<string> {
    await this._initialization;

    const [estimateGas, feePerGas]: [string, string] = await Promise.all([
      this.estimateGas(from, to, data, token),
      this._getFeePerGas(),
    ]);

    const feeInEth = Big(estimateGas)
      .times(feePerGas)
      .times(Big(this._txRelayFeePercent).div(100).add(1))
      .toFixed(0);

    return await this._toTokens(feeInEth, token);
  }

  /**
   * Send user's transaction to gas station contract
   * @param tx
   * @param fee
   * @param signature
   */
  public async sendTransaction(tx: TxInfo, fee: FeeInfo, signature: string): Promise<string> {
    await this._initialization;

    const [block, feePerGas]: [Block, string] = await Promise.all([
      this._provider.getBlock('latest'),
      this._getFeePerGas(),
    ]);

    const gasOptions = block.baseFeePerGas ? {
      maxFeePerGas: Big(feePerGas).add(1).toString(),
      maxPriorityFeePerGas: feePerGas,
    } : {
      gasPrice: feePerGas,
    };

    const txOptions = {
      value: '0',
      gasLimit: tx.gas,
      ...gasOptions,
    };

    // We check whether the transaction completes successfully.
    try {
      logger.debug(`Transaction verification by calling eth_call`);
      await this._gasStationContract.callStatic.sendTransaction(tx, { ...fee, feePerGas }, signature, txOptions);
    } catch (e) {
      console.error(e);
      const error = parseRpcCallError(e);
      throw new InternalServerError(error ? error.message : e.message, error || e);
    }

    // Send client's transaction
    try {
      logger.debug(`Transaction sending`);
      const transaction = await this._gasStationContract.sendTransaction(tx, { ...fee, feePerGas }, signature, txOptions);
      logger.debug(`Transaction sent ${transaction.hash}`);
      return transaction.hash;
    } catch (e) {
      throw new InternalServerError(e.message, e);
    }
  }

  /**
   * Returns the exchange price
   * @param ethAmount
   * @param toTokens
   */
  private async _toTokens(ethAmount: string, toTokens: string): Promise<string> {
    try {
      const tokensAmount = await this._exchangeContract.callStatic.getEstimatedTokensForETH(toTokens, ethAmount);
      return tokensAmount.toString();
    } catch (e) {
      logger.error(e);
      throw new BadRequest('Validation error', [
        { field: '/token', message: 'No liquidity for exchange fee tokens' },
      ]);
    }
  }

  /**
   * Get and calculate fee per gas
   * @private
   */
  private async _getFeePerGas(): Promise<string> {
    // Try to get gas price from external gas station.
    if (CONFIG.EXTERNAL_GAS_STATION_URL) {
      let data: any;

      try {
        const result = await axios.request({
          url: CONFIG.EXTERNAL_GAS_STATION_URL,
          method: CONFIG.EXTERNAL_GAS_STATION_METHOD,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        });
        data = result.data;
      } catch (e) {
        logger.error(e);
        throw new Error('Gas price fetch error');
      }

      try {
        const rawValue = get(data, CONFIG.EXTERNAL_GAS_STATION_VALUE_PLACE);
        const decValue = CONFIG.EXTERNAL_GAS_STATION_VALUE_BASE === 'HEX' ? parseInt(rawValue, 16) : parseFloat(rawValue);
        return Big(decValue)
          .times(Big(10).pow(Number(CONFIG.EXTERNAL_GAS_STATION_VALUE_DECIMALS)))
          .times(CONFIG.FEE_PER_GAS_MULTIPLIER)
          .toFixed(0);
      } catch (e) {
        logger.error(e);
        throw new Error('Gas price parse error');
      }
    }
    // Calculate gas price by blockchain
    else {
      const gasSettings = await getGasSettings(this._provider as any);

      if ('maxFeePerGas' in gasSettings) {
        return Big(gasSettings.maxFeePerGas.toString()).times(CONFIG.FEE_PER_GAS_MULTIPLIER).toString();
      } else {
        return Big(gasSettings.gasPrice.toString()).times(CONFIG.FEE_PER_GAS_MULTIPLIER).toString();
      }
    }
  }
}
