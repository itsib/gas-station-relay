import { NextFunction, Request, Response, Router } from 'express';
import { validateMiddleware } from '../middlewares';
import { POST_FEES_SCHEMA } from '../schemas/post-fees.schema';
import { RpcService } from '../services';
import { Route } from '../types';

export class FeesRouter implements Route {
  public readonly path = '/fees';
  public readonly router = Router();

  constructor(rpcService: RpcService) {
    this.router.post(this.path, validateMiddleware(POST_FEES_SCHEMA), async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const { from, to, value, data, token, pricePerGas } = req.body;
        const fees = await rpcService.transactionFee(from, to, value, data, token, pricePerGas);

        return res.json({ fees: fees.toString() });

      } catch (error) {
        next(error);
      }
    });
  }
}
