import { NextFunction, Request, Response } from 'express';
import { HTTPException } from '@tsed/exceptions';

export const errorMiddleware = (error: HTTPException, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';

    console.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`);

    if (status === 400) {
      res.status(status).json({ status, message, validationErrors: error.body || [] })
    } else {
      res.status(status).json({ status, message })
    }
  } catch (error) {
    next(error);
  }
};
