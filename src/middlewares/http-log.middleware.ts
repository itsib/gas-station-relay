import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils';

export const httpLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let body = '';
  if (Object.keys(req.body).length) {
    body = ` BODY: ${JSON.stringify(req.body, null, '  ')}`;
  }

  logger.debug(`Request: ${req.method} ${req.url}${body}`);

  next();
}
