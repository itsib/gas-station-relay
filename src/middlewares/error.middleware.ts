import { NextFunction, Request, Response } from 'express';
import { HTTPException } from '@tsed/exceptions';
import { logger } from '../utils';

export const errorMiddleware = (error: HTTPException, req: Request, res: Response, next: NextFunction) => {
  const status: number = error.status || 500;
  const message: string = error.message || 'Something went wrong';

  if (status === 400) {
    const validationErrors = error.body || [];
    logger.warn(`Validation error ${JSON.stringify(validationErrors, null, '  ')}`);
    res.status(status).json({ status, message, validationErrors: error.body || [] });
  } else {
    logger.error(`${message} ${error.body ? JSON.stringify(error.body, null, '  ') : ''}`);
    res.status(status).json({ status, message });
  }
};
