import { BadRequest } from '@tsed/exceptions';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import betterAjvErrors from 'better-ajv-errors';
import { NextFunction, Request, RequestHandler, Response } from 'express';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
ajv.addFormat('address', /^(0x)[0-9a-fA-F]{40}$/);
ajv.addFormat('hex', /^0x[0-9A-Fa-f]*$/);

export function validatorMiddlewareFactory(schema: any): RequestHandler {
  const validate = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction): void => {
    const valid = validate(req.body);
    if (!valid) {
      const output = betterAjvErrors(schema, req.body, validate.errors, { format: 'js' });
      next(new BadRequest('Validation error', output.map(e => ({ field: (e as any).path, message: e.error }))));
    } else {
      next();
    }
  }
}
