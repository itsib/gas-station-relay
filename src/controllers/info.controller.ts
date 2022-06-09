import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, interfaces, response } from 'inversify-express-utils';
import { Route } from 'tsoa';
import { RpcService } from '../services';

@Route('/info')
@controller('/info')
export class InfoController implements interfaces.Controller {

  constructor( @inject('RpcService') private _rpcService: RpcService ) {}

  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   */
  @httpGet('/')
  async getInfo(@response() res: Response): Promise<Response> {
    const relayInfo = await this._rpcService.relayInfo();
    return res.json(relayInfo);
  }
}
