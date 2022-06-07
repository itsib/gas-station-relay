import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, next, request, response } from 'inversify-express-utils';
import { POST_TX_FEE_SCHEMA } from '../schemas/post-tx-fee.schema';
import { RpcService } from '../services';
import { validatorMiddlewareFactory } from '../utils';

@controller('/tx-fee')
export class TxFeeController implements interfaces.Controller {

  constructor(@inject('RpcService') private rpcService: RpcService) {
  }

  @httpPost('/', validatorMiddlewareFactory(POST_TX_FEE_SCHEMA))
  async postTxFee(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const fee = await this.rpcService.transactionFee(req.body.from, req.body.to, req.body.data, req.body.token);

    return res.json({ fee });
  }
}
