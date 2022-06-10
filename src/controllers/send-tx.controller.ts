import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, next, request, response } from 'inversify-express-utils';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction.schema';
import { TxService } from '../services';
import { validatorMiddlewareFactory } from '../utils';

@controller('/send-tx')
export class SendTxController implements interfaces.Controller {

  constructor(@inject('TxService') private _txService: TxService) {
  }

  @httpPost('/', validatorMiddlewareFactory(POST_SEND_TRANSACTION_SCHEMA))
  async postSendTx(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const { tx, fee, signature } = req.body;

    const txHash = await this._txService.sendTransaction(tx, fee, signature);
    return res.json({ txHash });
  }
}
