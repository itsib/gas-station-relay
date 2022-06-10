import { Interface } from '@ethersproject/abi';
import { Block, Log } from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { BadRequest, InternalServerError, ServiceUnvailable } from '@tsed/exceptions';
import { Big } from 'big.js';
import { BigNumber, Contract, utils, Wallet } from 'ethers';
import { formatEther, hexlify } from 'ethers/lib/utils';
import { inject, injectable } from 'inversify';
import EXCHANGE_ABI from '../abi/exchange.json';
import GAS_PRICE_ORACLE_ABI from '../abi/gas-price-oracle.json';
import GAS_STATION_ABI from '../abi/gas-station.json';
import RECIPIENT_ABI from '../abi/recipient.json';
import { CONFIG } from '../config';
import { RelayInfo, TxFeeResult, TxSendQueryFee, TxSendQueryInfo } from '../types';
import { isAddress, logger, parseRpcCallError } from '../utils';
import { GasService } from './gas.service';

const APPROVE_METHOD_HASH = '0x095ea7b3';
const RECIPIENT_INTERFACE = new Interface(RECIPIENT_ABI as any);

export interface ITxService {
  relayInfo: () => Promise<RelayInfo>;
  estimateGas: (from: string, to: string, data: string, token: string) => Promise<{ estimateGas: string }>;
  transactionFee: (from: string, to: string, data: string, value: string, feePerGas: string, token?: string) => Promise<{ fee: string; currency: string }>;
  sendTransaction: (tx: TxSendQueryInfo, fee: TxSendQueryFee, signature: string) => Promise<{ txHash: string }>;
}

@injectable()
export class TxService implements ITxService {
  /**
   * Returns whether the service is ready to work or not.
   * @private
   */
  private readonly _isReady: Promise<boolean>;
  /**
   * Fee payer wallet
   * @private
   */
  private readonly _wallet?: Wallet;
  /**
   * Saved addresses of contracts that support the pay fee with tokens
   * @private
   */
  private readonly _gasStationSupports: { [address: string]: Promise<boolean> };
  /**
   * Used for fee calculation in Optimism network
   * @private
   */
  private _gasPriceOracleContract: Contract;
  /**
   * A contract that directly executes the transaction and exchanges fee tokens for ETH
   * @private
   */
  private _gasStationContract?: Contract;
  /**
   * Contract to exchange fee tokens to native currency
   * @private
   */
  private _exchangeContract?: Contract;
  /**
   * Commission for the execution of the transaction.
   * @private
   */
  private _txRelayFeePercent: string;

  constructor(@inject('BaseProvider') private _provider: BaseProvider, @inject('GasService') private _gasService: GasService) {
    this._gasStationSupports = {};
    this._gasPriceOracleContract = new Contract(CONFIG.GAS_PRICE_ORACLE_CONTRACT, GAS_PRICE_ORACLE_ABI, this._provider);

    if (!CONFIG.FEE_PAYER_WALLET_KEY || !CONFIG.GAS_STATION_CONTRACT_ADDRESS) {
      logger.error(`To process transactions, you need to fill in the environment variables FEE_PAYER_WALLET_KEY and GAS_STATION_CONTRACT_ADDRESS.`);
      this._isReady = Promise.resolve(false);
      return;
    }

    try {
      this._wallet = new Wallet(CONFIG.FEE_PAYER_WALLET_KEY, this._provider);
    } catch (e) {
      logger.error(`Invalid private key FEE_PAYER_WALLET_KEY.`);
      this._isReady = Promise.resolve(false);
      return;
    }

    try {
      this._gasStationContract = new Contract(CONFIG.GAS_STATION_CONTRACT_ADDRESS, GAS_STATION_ABI, this._wallet);
    } catch (e) {
      logger.error(`Invalid gas station contract address GAS_STATION_CONTRACT_ADDRESS.`);
      this._isReady = Promise.resolve(false);
      return;
    }

    this._isReady = new Promise(async (resolve: (isReady: boolean) => void) => {
      try {
        logger.debug(`TX Service initialization...`);

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

        resolve(true);
      } catch (e) {
        logger.error(`TX Service initialization error`);
        logger.error(e);
        resolve(false);
      }
    });
  }

  /**
   * Common relay info
   */
  public async relayInfo(): Promise<RelayInfo> {
    await this._checkReadiness();

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
   * @param value
   * @param token
   */
  public async estimateGas(from: string, to: string, data: string, value: string, token?: string): Promise<{ estimateGas: string }> {
    // Estimate gas with gas station
    if (token && await this._hasSupportFeeInTokens(to, data, value)) {
      const [relayEstimateGas, txEstimateGas]: [BigNumber, BigNumber] = await Promise.all([
        this._gasStationContract.getEstimatedPostCallGas(token),
        this._gasStationContract.estimateGas.execute(from, to, data),
      ]);

      return {
        estimateGas: Big(relayEstimateGas.add(txEstimateGas).toString())
          .times(CONFIG.ESTIMATE_GAS_MULTIPLIER)
          .toFixed(0),
      };
    }
    // Common estimate gas
    else {
      const estimateGas = await this._provider.estimateGas({ from, to, data, value });

      return {
        estimateGas: Big(estimateGas.toString())
          .times(CONFIG.ESTIMATE_GAS_MULTIPLIER)
          .toFixed(0),
      };
    }
  }

  /**
   * Calculate cost of transaction
   * @param from
   * @param to
   * @param data
   * @param value
   * @param feePerGas
   * @param token
   */
  public async transactionFee(from: string, to: string, data: string, value: string, feePerGas: string, token?: string): Promise<TxFeeResult> {
    const [{ estimateGas }, l1Fee] = await Promise.all([this.estimateGas(from, to, data, value, token), this._getL1GasCost(data)]);

    if (token && await this._hasSupportFeeInTokens(to, data, value)) {
      const highFeePerGas = await this._getHighFeePerGas();

      const feeInEth = Big(estimateGas)
        .times(highFeePerGas)
        .add(l1Fee)
        .times(Big(this._txRelayFeePercent).div(100).add(1))
        .toFixed(0);

      const fee = await this._toTokens(feeInEth, token);
      return { fee, currency: token };
    } else {
      return { fee: Big(estimateGas).times(feePerGas).add(l1Fee).toFixed(0), currency: 'NATIVE' };
    }
  }

  /**
   * Send user's transaction to gas station contract
   * @param tx
   * @param fee
   * @param signature
   */
  public async sendTransaction(tx: TxSendQueryInfo, fee: TxSendQueryFee, signature: string): Promise<{ txHash: string }> {
    await this._checkReadiness();

    const [block, feePerGas]: [Block, string] = await Promise.all([
      this._provider.getBlock('latest'),
      this._getHighFeePerGas(),
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
      const transaction = await this._gasStationContract.sendTransaction(tx, {
        ...fee,
        feePerGas,
      }, signature, txOptions);
      logger.debug(`Transaction sent ${transaction.hash}`);
      return { txHash: transaction.hash };
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
  private async _getHighFeePerGas(): Promise<string> {
    const gasSettings = await this._gasService.getGasSettings();
    if (!gasSettings.high.maxFeePerGas && !gasSettings.high.gasPrice) {
      throw new Error('Cannot get fee per gas');
    }

    return Big(gasSettings.high.maxFeePerGas || gasSettings.high.gasPrice).times(CONFIG.FEE_PER_GAS_MULTIPLIER).toString()
  }

  /**
   * Does the transaction support pay fee in tokens?
   * @param data
   * @param to
   * @param value
   */
  private async _hasSupportFeeInTokens(to?: string, data?: string, value?: string): Promise<boolean> {
    const isReady = await this._isReady;

    if (!isReady || !this._gasStationContract || !to || !data || hexlify(data).startsWith(APPROVE_METHOD_HASH) || (value && BigNumber.from(value).gt(0))) {
      return false;
    }
    const contractAddress = isAddress(to);
    if (!contractAddress) {
      return false;
    }

    if (contractAddress in this._gasStationSupports) {
      return this._gasStationSupports[contractAddress];
    }

    this._gasStationSupports[contractAddress] = this._provider.call({
      to: contractAddress,
      data: RECIPIENT_INTERFACE.encodeFunctionData('isOwnGasStation', [this._gasStationContract.address]),
    })
      .then(result => {
        const [isOwnGasStation] = RECIPIENT_INTERFACE.decodeFunctionResult('isOwnGasStation', result);
        return isOwnGasStation;
      })
      .catch(() => false);

    return this._gasStationSupports[contractAddress];
  }

  /**
   * Used in optimistic total fee calculation
   * https://optimistic.etherscan.io/address/0x420000000000000000000000000000000000000f#readContract
   * @param data
   * @private
   */
  private async _getL1GasCost(data: string): Promise<string> {
    const network = await this._provider.getNetwork();
    if (![10, 69].includes(network.chainId)) {
      return '0';
    }

    const l1Fee = await this._gasPriceOracleContract.getL1Fee(data);
    return l1Fee.toString();
  }

  /**
   * Readiness check of service, and throw 500 error, if not ready.
   * @private
   */
  private async _checkReadiness(): Promise<void> {
    const isReady = await this._isReady;
    if (!isReady) {
      throw new ServiceUnvailable('The server is not configured');
    }
  }
}
