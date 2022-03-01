import { NextFunction, Request, Response, Router } from 'express';
import { validateMiddleware } from '../middlewares';
import { POST_ESTIMATE_GAS_SCHEMA } from '../schemas/post-estimate-gas.schema';
import { RpcService } from '../services';
import { Route } from '../types';

export class EstimateGasRoute implements Route {
  public readonly path = '/estimate-gas';
  public readonly router = Router();

  constructor(rpcService: RpcService) {
    this.router.post(this.path, validateMiddleware(POST_ESTIMATE_GAS_SCHEMA), async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const { from, to, value, data, token } = req.body;
        const estimatedGas = await rpcService.estimateGas(from, to, value, data, token);

        return res.json({ estimateGas: estimatedGas.toString() });

      } catch (error) {
        next(error);
      }
    });
  }
}
