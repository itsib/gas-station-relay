import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet } from 'inversify-express-utils';
import { Example, Get, Route, Tags } from 'tsoa';
import { RpcService } from '../services';
import { RelayInfo } from '../types';

@Route('info')
@controller('/info')
export class InfoController extends BaseHttpController {

  constructor( @inject('RpcService') private _rpcService: RpcService ) {
    super();
  }

  /**
   * The Gas Station relay server configuration info.
   *
   * @summary Relay server info.
   */
  @Get()
  @Example<RelayInfo>({
    chainId: 1,
    gasStation: '0x280c78D5829Ad6E2403d6ae49BCf85f1D2119E0d',
    feeTokens: ['0xdAC17F958D2ee523a2206206994597C13D831ec7', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    balance: '242392145778186007',
  })
  @Tags('Info')
  @httpGet('/')
  async getInfo(): Promise<RelayInfo> {
    return await this._rpcService.relayInfo();
  }
}
