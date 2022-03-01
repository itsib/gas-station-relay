import { NextFunction, Request, Response, Router } from 'express';
import { RpcService } from '../services';
import { Route } from '../types';

export class InfoRoute implements Route {
  public path = '/info';
  public router = Router();

  constructor(rpcService: RpcService) {
    this.router.get(this.path, async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const relayInfo = await rpcService.relayInfo();

        return res.json(relayInfo);
      } catch (error) {
        next(error);
      }
    });
  }
}
