import { Router } from 'express';
import { RelayController } from '../controllers/relay.controller';
import { validateMiddleware } from '../middlewares/validate.middleware';
import { POST_ESTIMATE_GAS_SCHEMA } from '../schemas/post-estimate-gas.schema';
import { POST_SEND_TRANSACTION_SCHEMA } from '../schemas/post-send-transaction';
import { Route } from '../types';

export class RelayRoute implements Route {
  public path = '/relay';
  public router = Router();
  public controller = new RelayController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(`${this.path}`, this.controller.index.bind(this.controller));
    this.router.post(`${this.path}/estimate-gas`, validateMiddleware(POST_ESTIMATE_GAS_SCHEMA), this.controller.estimateGas.bind(this.controller));
    this.router.post(`${this.path}/send-transaction`, validateMiddleware(POST_SEND_TRANSACTION_SCHEMA), this.controller.sendTransaction.bind(this.controller));
  }
}
