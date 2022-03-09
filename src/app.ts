import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { CONFIG } from './config';
import { errorMiddleware, httpLogMiddleware } from './middlewares';
import { Route } from './types';
import { logger } from './utils';

export class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor(routes: Route[]) {
    this.app = express();
    this.port = CONFIG.PORT;
    this.env = CONFIG.NODE_ENV;

    this._initializeMiddlewares();
    this._initializeRoutes(routes);
    this._initializeErrorHandling();
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      logger.info(`ENV: ${this.env}`);
      logger.info(`App listening on the port ${this.port}`);
    });
  }

  private _initializeMiddlewares(): void {
    this.app.use(cors({ origin: CONFIG.CORS_ORIGIN, credentials: CONFIG.CORS_CREDENTIALS }));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(httpLogMiddleware);
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
