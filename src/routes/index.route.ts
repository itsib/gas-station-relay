import { Router } from 'express';
import { IndexController } from '../controllers';
import { Route } from '../types';

export class IndexRoute implements Route {
  public path = '/';
  public router = Router();
  public controller = new IndexController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.controller.index);
  }
}
