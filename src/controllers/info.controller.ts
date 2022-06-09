import * as express from 'express';
import { inject } from 'inversify';
import { controller, httpGet, interfaces, response } from 'inversify-express-utils';
import * as tsoa from 'tsoa';
import { RpcService } from '../services';

@controller('/info')
@tsoa.Route('info')
export class InfoController implements interfaces.Controller {

  constructor( @inject('RpcService') private _rpcService: RpcService ) {}

  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   */
  @httpGet('/')
  @tsoa.Get('/')
  @tsoa.Response(200, 'Relay server connection info', {
    chainId: 1,
    gasStation: '0x280c78D5829Ad6E2403d6ae49BCf85f1D2119E0d',
    feeTokens: ['0xdAC17F958D2ee523a2206206994597C13D831ec7', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    balance: '242392145778186007',
  })
  async getInfo(@response() res: express.Response): Promise<express.Response> {
    const relayInfo = await this._rpcService.relayInfo();
    return res.json(relayInfo);
  }
}
