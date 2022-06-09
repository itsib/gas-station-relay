import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet } from 'inversify-express-utils';
import { Example, Get, Route, Tags } from 'tsoa';
import { GasService } from '../services';
import { GasSettings } from '../types';

@Route('/gas')
@controller('/gas')
export class GasController extends BaseHttpController {

  constructor(@inject('GasService') private _gasService: GasService) {
    super();
  }

  /**
   * Returns recommended priority fee or gas price in wei. And also estimated  transaction execution time.
   *
   * @summary Gas price
   */
  @Get('/')
  @Example<GasSettings>({
    high: {
      maxFeePerGas: '3904221514',
      maxPriorityFeePerGas: '3904221504',
      gasPrice: '3904221504',
      confirmationTime: '363.06',
    },
    middle: {
      maxFeePerGas: '3904221514',
      maxPriorityFeePerGas: '3904221504',
      gasPrice: '3904221504',
      confirmationTime: '363.06',
    },
    low: {
      maxFeePerGas: '3904221514',
      maxPriorityFeePerGas: '3904221504',
      gasPrice: '3904221504',
      confirmationTime: '363.06',
    },
    avgBlockTime: '12.102',
  })
  @Tags('Gas')
  @httpGet('/')
  async geGasPrice(): Promise<GasSettings> {
    return await this._gasService.getGasSettings();
  }
}
