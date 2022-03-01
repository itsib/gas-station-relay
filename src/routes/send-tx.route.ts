import { NextFunction, Request, Response, Router } from 'express';
import { validateMiddleware } from '../middlewares';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction';
import { RpcService } from '../services';
import { Route } from '../types';
import { logger } from '../utils';

export class SendTxRoute implements Route {
  public path = '/send-tx';
  public router = Router();

  constructor(rpcService: RpcService) {
    this.router.post(this.path, validateMiddleware(POST_SEND_TRANSACTION_SCHEMA), async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      const { tx, fee, signature } = req.body;

      try {
        const txHash = await rpcService.sendTransaction(tx, fee, signature);
        return res.json({ txHash });
      } catch (e) {
        next(e);
      }
    });
  }
}
