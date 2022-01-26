import { Router } from 'express';
import { RelayController } from '../controllers/relay.controller';
import { Route } from '../types';

export class RelayRoute implements Route {
  public path = '/relay';
  public router = Router();
  public controller = new RelayController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(`${this.path}`, this.controller.index);
  }
}
