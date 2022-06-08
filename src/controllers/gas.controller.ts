import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, interfaces, next, request, response } from 'inversify-express-utils';
import { GasService } from '../services';

@controller('/gas')
export class GasController implements interfaces.Controller {

  constructor( @inject('GasService') private _gasService: GasService ) {}

  @httpGet('/')
  async geGasPrice(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    return res.json(await this._gasService.getGasSettings());
  }
}
