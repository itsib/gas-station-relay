import { BadRequest } from '@tsed/exceptions';
import { isAddress } from 'ethers/lib/utils';
import { NextFunction, Request, Response, Router } from 'express';
import { RpcService } from '../services';
import { Route } from '../types';

export class ExchangeRouter implements Route {
  public readonly path = '/exchange';
  public readonly router = Router();

  constructor(rpcService: RpcService) {
    this.router.get(this.path, async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const token = req.query.token as string | undefined;
        const amount = req.query.amount as string | undefined;

        if (!token || !isAddress(token)) {
          throw new BadRequest('Validation query parameter', [
            { field: '/token', message: 'Invalid token address' },
          ]);
        }

        if (!amount || !/^[0-9]+$/.test(amount)) {
          throw new BadRequest('Validation query parameter', [
            { field: '/amount', message: 'Invalid ETH amount' },
          ]);
        }

        const tokenAmount = await rpcService.exchange(token, amount);

        return res.json({ tokenAmount: tokenAmount.toString() });

      } catch (error) {
        next(error);
      }
    });
  }
}
