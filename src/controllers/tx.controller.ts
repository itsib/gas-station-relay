import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, next, request, response } from 'inversify-express-utils';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction';
import { POST_TX_FEE_SCHEMA } from '../schemas/post-tx-fee.schema';
import { RpcService } from '../services';
import { validatorMiddlewareFactory } from '../utils';

@controller('/tx')
export class TxController implements interfaces.Controller {

  constructor(@inject('RpcService') private _rpcService: RpcService) {
  }

  /**
   * Returns total transaction fee in received tokens (raw tokens amount)
   * @param req
   * @param res
   * @param nextFn
   */
  @httpPost('/fee', validatorMiddlewareFactory(POST_TX_FEE_SCHEMA))
  async postFee(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const fee = await this._rpcService.transactionFee(req.body.from, req.body.to, req.body.data, req.body.token);

    return res.json({ fee });
  }

  /**
   * Returns the estimated number of gas units to execute the transaction.
   * @param req
   * @param res
   * @param nextFn
   */
  @httpPost('/estimate-gas', validatorMiddlewareFactory(POST_TX_FEE_SCHEMA))
  async postEstimateGas(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const estimateGas = await this._rpcService.estimateGas(req.body.from, req.body.to, req.body.data, req.body.token);

    return res.json({ estimateGas });
  }

  /**
   * Sends a transaction to the Gas Station contract.
   * @param req
   * @param res
   * @param nextFn
   */
  @httpPost('/send', validatorMiddlewareFactory(POST_SEND_TRANSACTION_SCHEMA))
  async postSend(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const { tx, fee, signature } = req.body;

    const txHash = await this._rpcService.sendTransaction(tx, fee, signature);
    return res.json({ txHash });
  }
}
