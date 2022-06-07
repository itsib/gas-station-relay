import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, interfaces, next, request, response } from 'inversify-express-utils';
import { RpcService } from '../services';

@controller('/info')
export class InfoController implements interfaces.Controller {

  constructor( @inject('RpcService') private rpcService: RpcService ) {}

  @httpGet('/')
  async getInfo(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const relayInfo = await this.rpcService.relayInfo();
    return res.json(relayInfo);
  }
}
