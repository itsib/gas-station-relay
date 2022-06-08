import './polyfills';
import { NotFound } from '@tsed/exceptions';
import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import { resolve } from 'path';
import { CONFIG } from './config';
import { serverFactory } from './ioc/server';
import { errorMiddleware, httpLogMiddleware } from './middlewares';
import { logger } from './utils';

process.on('uncaughException', (e) => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

logger.info('Starting application...');

startApp().catch(e => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

async function startApp(): Promise<void> {
  const server = serverFactory();

  server.setConfig((app: Application) => {
    // app.use(function(req, res, next) {
    //   if (CONFIG.BASE_PATH !== '/' && req.url.startsWith(CONFIG.BASE_PATH)) {
    //     req.url = req.url.replace(CONFIG.BASE_PATH, '');
    //   }
    //   next();
    // });
    app.use(CONFIG.BASE_PATH, express.static(resolve(`${__dirname}/public`), { redirect: true }));
    app.use(cors({ origin: CONFIG.CORS_ORIGIN, credentials: CONFIG.CORS_CREDENTIALS }));
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(httpLogMiddleware);
  });

  server.setErrorConfig((app: Application) => {
    // Handle not found error
    app.use('/*', () => {
      throw new NotFound('Route not found');
    });

    // Catch and handle all errors
    app.use(errorMiddleware);
  });

  const app = server.build();

  app.listen(CONFIG.PORT, () => {
    logger.info(`ENV: ${CONFIG.NODE_ENV}`);
    logger.info(`LOG_LEVEL: ${CONFIG.LOG_LEVEL}`);
    logger.info(`App listening on the port ${CONFIG.PORT}`);
  });
}
