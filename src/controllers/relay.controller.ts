import { Interface } from '@ethersproject/abi';
import { Block } from '@ethersproject/abstract-provider';
import { BaseProvider } from '@ethersproject/providers';
import { BadRequest, InternalServerError } from '@tsed/exceptions';
import { BigNumber, Contract, getDefaultProvider, Wallet } from 'ethers';
import { NextFunction, Request, Response } from 'express';
import GSN_EXECUTOR_ABI from '../abi/gsn-tx-executor.json';
import SWAP_ROUTER_ABI from '../abi/swap-router.json';
import { CONFIG } from '../config';
import { logger, parseRpcCallError } from '../utils';

export class RelayController {

  private readonly _minPriorityFeePerGas: BigNumber;

  private readonly _provider: BaseProvider;

  private readonly _wallet: Wallet;

  private readonly _relayContract: Contract;

  private _swapRouterContract: Contract;

  constructor() {
    this._minPriorityFeePerGas = BigNumber.from(1e9);
    this._provider = getDefaultProvider(CONFIG.RPC_URL);
    this._wallet = new Wallet(CONFIG.FEE_PAYER_WALLET_KEY, this._provider);
    this._relayContract = new Contract(CONFIG.RELAY_CONTRACT_ADDRESS, new Interface(GSN_EXECUTOR_ABI), this._wallet);
    this._relayContract.getRouter().then(address => this._swapRouterContract = new Contract(address, new Interface(SWAP_ROUTER_ABI), this._wallet));

    logger.debug(`Fee Payer Wallet ${this._wallet.address}`);
    logger.debug(`Relay Contract Address ${this._relayContract.address}`);
  }

  public async index(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const network = await this._provider.getNetwork();

      return res.json({
        chainId: network.chainId,
        relayAddress: this._relayContract.address,
      });
    } catch (error) {
      next(error);
    }
  }

  public async estimateGas(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { from, to, value, data, token } = req.body;
      const [relayGas, transactionGas, weth, block, gasPrice]: [[BigNumber, BigNumber, BigNumber], BigNumber, string, Block, BigNumber] = await Promise.all([
        this._relayContract.getGasLimits(),
        this._relayContract.estimateGas.execute(from, to, value, data),
        this._swapRouterContract.WETH(),
        this._provider.getBlock('pending'),
        this._provider.getGasPrice(),
      ]);

      const totalRelayGasUsage = relayGas[0].add(relayGas[1]).add(relayGas[2]).add(transactionGas).toString();
      const approximateFee = block.baseFeePerGas ? block.baseFeePerGas.add(this._minPriorityFeePerGas).mul(totalRelayGasUsage) : gasPrice.mul(totalRelayGasUsage);

      try {
        const getAmountsInEstimateGas = await this._swapRouterContract.estimateGas.getAmountsIn(approximateFee, [token, weth]);
        const estimateGas = getAmountsInEstimateGas.add(totalRelayGasUsage).toString();

        logger.debug(`Max Permit Gas Usage: ${relayGas[0].toString()}`);
        logger.debug(`Pre Call Gas Usage: ${relayGas[1].toString()}`);
        logger.debug(`Post Call Gas Usage: ${relayGas[2].toString()}`);
        logger.debug(`Get Exchange Rate Gas Usage: ${getAmountsInEstimateGas.toString()}`);
        logger.debug(`Total Estimate Gas: ${estimateGas}`);

        return res.json({ estimateGas });
      } catch (e) {
        return next(new BadRequest('There is no liquidity for the selected token', []));
      }
    } catch (error) {
      next(error);
    }
  }

  public async sendTransaction(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { tx, fee, signature } = req.body;
    const block: Block = await this._provider.getBlock('pending');

    // EIP-1559 transaction
    if (block.baseFeePerGas) {
      const minFeePerGas = block.baseFeePerGas.add(this._minPriorityFeePerGas);

      // Check gas price fields
      if (this._minPriorityFeePerGas.gt(tx.maxPriorityFeePerGas || 0)) {
        return next(
          new BadRequest('Validation error', [
            { field: '/settings/maxPriorityFeePerGas', message: 'The maxPriorityFeePerGas value is too small' },
          ]),
        );
      }
      if (minFeePerGas.gt(tx.maxFeePerGas || 0)) {
        return next(
          new BadRequest('Validation error', [
            { field: '/settings/maxFeePerGas', message: 'The maxFeePerGas value is too small' },
          ]),
        );
      }
    }
    // Legacy transaction
    else {
      const minGasPrice = await this._provider.getGasPrice();
      if (minGasPrice.gt(tx.gasPrice || 0)) {
        return next(
          new BadRequest('Validation error', [
            { field: '/settings/gasPrice', message: 'The gasPrice value is too small' },
          ])
        );
      }
    }

    const txOptions = {
      gasLimit: tx.gas,
      ...(block.baseFeePerGas ? { maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas } : { gasPrice: tx.gasPrice })
    };
    logger.debug(`Send ${block.baseFeePerGas ? 'EIP-1559' : 'Legacy'} Transaction: `);
    logger.debug(`TX Options ${JSON.stringify(txOptions, null, '  ')}`);

    // We check whether the transaction completes successfully.
    try {
      logger.debug(`Transaction verification by calling eth_call`);
      await this._relayContract.callStatic.sendTransaction(tx, fee, signature, txOptions);
    } catch (e) {
      const error = parseRpcCallError(e);
      return next(new InternalServerError(error ? error.message : e.message, error || e));
    }

    // Send client transaction
    try {
      const transaction = await this._relayContract.sendTransaction(tx, fee, signature, txOptions);
      logger.debug(`Transaction sent ${transaction.hash}`);
      return res.json({ txHash: transaction.hash });
    } catch (e) {
      return next(new InternalServerError(e.message, e));
    }
  }
}
