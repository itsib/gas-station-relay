import { inject } from 'inversify';
import { BaseHttpController, controller, httpPost, requestBody } from 'inversify-express-utils';
import { Body, Example, Post, Route, Tags } from 'tsoa';
import { POST_ESTIMATE_GAS_SCHEMA } from '../schemas/post-estimate-gas.schema';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction.schema';
import { POST_TX_FEE_SCHEMA } from '../schemas/post-tx-fee.schema';
import { RpcService } from '../services';
import { TxEstimateGasQuery, TxFeeQuery, TxFeeResult, TxSendQuery } from '../types';
import { validatorMiddlewareFactory } from '../utils';

@Route('/tx')
@controller('/tx')
export class TxController extends BaseHttpController {

  constructor(@inject('RpcService') private _rpcService: RpcService) {
    super();
  }

  /**
   * Returns total transaction fee in received tokens.
   * If the received token address is not defined or is not supported, then fee will be in ETH
   */
  @Post('/fee')
  @Example<TxFeeResult>({
    currency: 'NATIVE',
    fee: '89934100000000',
  })
  @Tags('Transaction')
  @httpPost('/fee', validatorMiddlewareFactory(POST_TX_FEE_SCHEMA))
  async postFee(@requestBody() @Body() body: TxFeeQuery): Promise<TxFeeResult> {
    return await this._rpcService.transactionFee(body.from, body.to, body.data, body.value, body.feePerGas, body.token);
  }

  /**
   * Returns an estimate of the amount of gas that would be required to submit transaction to the network.
   * An estimate may not be accurate since there could be another transaction on the network that was not accounted for, but after being mined affected relevant state.
   */
  @Post('/estimate-gas')
  @Example<{ estimateGas: string }>({ estimateGas: '8993410'})
  @Tags('Transaction')
  @httpPost('/estimate-gas', validatorMiddlewareFactory(POST_ESTIMATE_GAS_SCHEMA))
  async postEstimateGas(@requestBody() @Body() body: TxEstimateGasQuery): Promise<{ estimateGas: string }> {
    return await this._rpcService.estimateGas(body.from, body.to, body.data, body.value, body.token);
  }

  /**
   * Sends a transaction to the Gas Station contract.
   */
  @Post('/send')
  @Tags('Transaction')
  @httpPost('/send', validatorMiddlewareFactory(POST_SEND_TRANSACTION_SCHEMA))
  async postSend(@requestBody() @Body() body: TxSendQuery): Promise<{txHash: string}> {
    const { tx, fee, signature } = body;
    return await this._rpcService.sendTransaction(tx, fee, signature);
  }
}
