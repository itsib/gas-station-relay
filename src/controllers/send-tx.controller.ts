import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, next, request, response } from 'inversify-express-utils';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction';
import { RpcService } from '../services';
import { validatorMiddlewareFactory } from '../utils';

@controller('/send-tx')
export class SendTxController implements interfaces.Controller {

  constructor(@inject('RpcService') private rpcService: RpcService) {
  }

  @httpPost('/', validatorMiddlewareFactory(POST_SEND_TRANSACTION_SCHEMA))
  async postSendTx(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const { tx, fee, signature } = req.body;

    const txHash = await this.rpcService.sendTransaction(tx, fee, signature);
    return res.json({ txHash });
  }
}
