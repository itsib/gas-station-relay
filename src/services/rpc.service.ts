import { Interface } from '@ethersproject/abi';
import { Block, Log } from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { BaseProvider } from '@ethersproject/providers';
import { BadRequest, InternalServerError } from '@tsed/exceptions';
import { BigNumber, Contract, getDefaultProvider, utils, Wallet } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import EXCHANGE_ABI from '../abi/exchange.json';
import GAS_STATION_TOKENS_STORE_ABI from '../abi/gas-station-tokens-store.json';
import GAS_STATION_ABI from '../abi/gas-station.json';
import { CONFIG } from '../config';
import { FeeInfo, RelayInfo, Service, TxInfo } from '../types';
import { logger, parseRpcCallError } from '../utils';

export class RpcService implements Service {

  private _isInitialized: boolean;

  private readonly _minPriorityFeePerGas = BigNumber.from(1e9);

  private readonly _provider: BaseProvider;

  private readonly _wallet: Wallet;

  private readonly _gasStationContract: Contract;

  private _gasStationTokensStoreContract: Contract;

  private _exchangeContract: Contract;
  // Commission for the execution of the transaction.
  private _txRelayFeePercent: BigNumber;

  private _gasLimitMargin: BigNumber = BigNumber.from('10');

  constructor() {
    this._isInitialized = false;
    this._provider = getDefaultProvider(CONFIG.RPC_URL);
    this._wallet = new Wallet(CONFIG.FEE_PAYER_WALLET_KEY, this._provider);
    this._gasStationContract = new Contract(CONFIG.GAS_STATION_CONTRACT_ADDRESS, new Interface(GAS_STATION_ABI), this._wallet);
  }

  async init(): Promise<RpcService> {
    if (this._isInitialized) {
      return this;
    }
    this._isInitialized = true;


    const [exchange, feeTokensStore, feePercent, balance]: [string, string, BigNumber, BigNumber] = await Promise.all([
      this._gasStationContract.exchange(),
      this._gasStationContract.feeTokensStore(),
      this._gasStationContract.txRelayFeePercent(),
      this._wallet.getBalance('latest'),
    ]);

    this._gasStationTokensStoreContract = new Contract(feeTokensStore, new Interface(GAS_STATION_TOKENS_STORE_ABI), this._wallet);
    this._exchangeContract = new Contract(exchange, new Interface(EXCHANGE_ABI), this._wallet);
    this._txRelayFeePercent = feePercent;

    logger.debug(`Fee Payer Wallet: ${this._wallet.address}`);
    logger.debug(`Fee Payer Balance: ${formatEther(balance)} ETH`);
    logger.debug(`Gas Station Contract: ${this._gasStationContract.address}`);
    logger.debug(`Gas Station Tokens Store Contract: ${this._gasStationTokensStoreContract.address}`);
    logger.debug(`Exchange Contract: ${this._exchangeContract.address}`);
    logger.debug(`Tx Relay Fee Percent: ${this._txRelayFeePercent.toString()}%`);

    // Subscribe to change contract state events
    const address = this._gasStationContract.address;

    this._provider.on({ address, topics: [utils.id('GasStationExchangeUpdated(address)')] }, (log: Log) => {
      const { args: { newExchange } } = this._gasStationContract.interface.parseLog(log);
      this._exchangeContract = new Contract(newExchange, new Interface(EXCHANGE_ABI), this._wallet);
      logger.debug(`Exchange Contract was updated: ${newExchange}`);
    });

    this._provider.on({ address, topics: [utils.id('GasStationFeeTokensStoreUpdated(address)')] }, (log: Log) => {
      const { args: { newFeeTokensStore } } = this._gasStationContract.interface.parseLog(log);
      this._gasStationTokensStoreContract = new Contract(newFeeTokensStore, new Interface(GAS_STATION_TOKENS_STORE_ABI), this._wallet);
      logger.debug(`Gas Station Tokens Store Contract was updated: ${newFeeTokensStore}`);
    });

    this._provider.on({ address, topics: [utils.id('GasStationTxRelayFeePercentUpdated(uint256)')] }, (log: Log) => {
      const { args: { newTxRelayFeePercent } } = this._gasStationContract.interface.parseLog(log);
      this._txRelayFeePercent = newTxRelayFeePercent;
      logger.debug(`Tx Relay Fee Percent was updated: ${newTxRelayFeePercent.toString()}%`);
    });

    return this;
  }

  /**
   * Common relay info
   */
  public async relayInfo(): Promise<RelayInfo> {
    const [network, exchange, balance]: [Network, string, BigNumber] = await Promise.all([
      this._provider.getNetwork(),
      this._gasStationContract.exchange(),
      this._wallet.getBalance('latest')
    ]);

    return {
      chainId: network.chainId,
      gasStation: this._gasStationContract.address,
      exchange: exchange,
      balance: balance.toString(),
    }
  }

  /**
   * Calculate estimated gas for transaction relay
   * @param from
   * @param to
   * @param value
   * @param data
   * @param token
   */
  public async estimateGas(from: string, to: string, value: string, data: string, token: string): Promise<BigNumber> {
    const [relayEstimateGas, txEstimateGas]: [BigNumber, BigNumber] = await Promise.all([
      this._gasStationContract.getEstimatedPostCallGas(token),
      this._gasStationContract.estimateGas.execute(from, to, value, data),
    ]);

    return relayEstimateGas.add(txEstimateGas);
  }

  /**
   * Returns transaction max fee in tokens.
   * @param from
   * @param to
   * @param value
   * @param data
   * @param token
   */
  public async transactionFee(from: string, to: string, value: string, data: string, token: string): Promise<BigNumber> {
    const [estimatedGas, block, gasPrice]: [BigNumber, Block, BigNumber] = await Promise.all([
      this.estimateGas(from, to, value, data, token),
      this._provider.getBlock('latest'),
      this._provider.getGasPrice(),
    ]);

    const pricePerGas = block.baseFeePerGas ? block.baseFeePerGas.add('3000000000') : gasPrice;
    const estimatedGasWithMargin = estimatedGas.mul(this._gasLimitMargin.add('100')).div('100');
    const feeInEth = estimatedGasWithMargin.mul(pricePerGas);
    const totalFeeInEth = feeInEth.mul(this._txRelayFeePercent.add('100')).div('100');

    try {
      const totalFeeInTokens = await this._exchangeContract.callStatic.getEstimatedTokensForETH(token, totalFeeInEth);

      logger.debug(`Estimated Gas: ${estimatedGasWithMargin.toString()}`);
      logger.debug(`Transaction Fee: ${utils.formatUnits(feeInEth, 18)} ETH`);
      logger.debug(`Transaction Fee With Plasma Fee: ${utils.formatUnits(totalFeeInEth, 18)} ETH`);
      logger.debug(`Transaction Fee in tokens: ${totalFeeInTokens.toString()}`);

      return totalFeeInTokens;
    } catch (e) {
      logger.error(e);
      throw new BadRequest('Validation error', [
        { field: '/token', message: 'No liquidity for exchange fee tokens' },
      ]);
    }
  }

  /**
   * Send user's transaction to gas station contract
   * @param tx
   * @param fee
   * @param signature
   */
  public async sendTransaction(tx: TxInfo, fee: FeeInfo, signature: string): Promise<string> {
    const block: Block = await this._provider.getBlock('latest');

    // EIP-1559 transaction
    if (block.baseFeePerGas) {
      const minFeePerGas = block.baseFeePerGas.add(this._minPriorityFeePerGas);

      // Check gas price fields
      if (this._minPriorityFeePerGas.gt(tx.maxPriorityFeePerGas || 0)) {
        throw new BadRequest('Validation error', [
          { field: '/tx/maxPriorityFeePerGas', message: 'The maxPriorityFeePerGas value is too small' },
        ]);
      }
      if (minFeePerGas.gt(tx.maxFeePerGas || 0)) {
        throw new BadRequest('Validation error', [
          { field: '/tx/maxFeePerGas', message: 'The maxFeePerGas value is too small' },
        ])
      }
    }
    // Legacy transaction
    else {
      const minGasPrice = await this._provider.getGasPrice();
      if (minGasPrice.gt(tx.gasPrice || 0)) {
        throw new BadRequest('Validation error', [
          { field: '/tx/gasPrice', message: 'The gasPrice value is too small' },
        ]);
      }
    }

    const txOptions = {
      gasLimit: tx.gas,
      ...(block.baseFeePerGas ? { maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas } : { gasPrice: tx.gasPrice })
    };

    // We check whether the transaction completes successfully.
    try {
      logger.debug(`Transaction verification by calling eth_call`);
      await this._gasStationContract.callStatic.sendTransaction(tx, fee, signature, txOptions);
    } catch (e) {
      const error = parseRpcCallError(e);
      throw new InternalServerError(error ? error.message : e.message, error || e);
    }

    // Send client's transaction
    try {
      const transaction = await this._gasStationContract.sendTransaction(tx, fee, signature, txOptions);
      logger.debug(`Transaction sent ${transaction.hash}`);
      return transaction.hash;
    } catch (e) {
      throw new InternalServerError(e.message, e);
    }
  }
}
