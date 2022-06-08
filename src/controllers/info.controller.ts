import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, interfaces, response } from 'inversify-express-utils';
import { RpcService } from '../services';

@controller('/info')
export class InfoController implements interfaces.Controller {

  constructor( @inject('RpcService') private _rpcService: RpcService ) {}

  @httpGet('/')
  /**
   * Tets
   * @param res
   */
  async getInfo(@response() res: Response): Promise<Response> {
    const relayInfo = await this._rpcService.relayInfo();
    return res.json(relayInfo);
  }
}
