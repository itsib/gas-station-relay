import { NextFunction, Request, Response, Router } from 'express';
import { validateMiddleware } from '../middlewares';
import { POST_TX_FEE_SCHEMA } from '../schemas/post-tx-fee.schema';
import { RpcService } from '../services';
import { Route } from '../types';

export class TxFeeRouter implements Route {
  public readonly path = '/tx-fee';
  public readonly router = Router();

  constructor(rpcService: RpcService) {
    this.router.post(this.path, validateMiddleware(POST_TX_FEE_SCHEMA), async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const fee = await rpcService.transactionFee(req.body.from, req.body.to, req.body.data, req.body.token);

        return res.json({ fee });

      } catch (error) {
        next(error);
      }
    });
  }
}
