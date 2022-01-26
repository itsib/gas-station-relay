import compression from 'compression';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { errorMiddleware } from './middlewares/error.middleware';
import { Route } from './types';
import { logger, stringToBool } from './utils';

require('dotenv').config({ path: path.resolve(`${process.cwd()}/.env`) });

export class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor(routes: Route[]) {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.env = process.env.NODE_ENV || 'development';

    this._initializeMiddlewares();
    this._initializeRoutes(routes);
    this._initializeErrorHandling();
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  private _initializeMiddlewares(): void {
    this.app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: stringToBool(process.env.CORS_CREDENTIALS) }));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private _initializeRoutes(routes: Route[]): void {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private _initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }
}
