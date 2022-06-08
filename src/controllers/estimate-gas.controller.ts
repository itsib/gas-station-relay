import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, next, request, response } from 'inversify-express-utils';
import { POST_ESTIMATE_GAS_SCHEMA } from '../schemas/post-estimate-gas.schema';
import { RpcService } from '../services';
import { validatorMiddlewareFactory } from '../utils';

@controller('/estimate-gas')
export class EstimateGasController implements interfaces.Controller {

  constructor(@inject('RpcService') private rpcService: RpcService) {
  }

  @httpPost('/', validatorMiddlewareFactory(POST_ESTIMATE_GAS_SCHEMA))
  async postEstimateGas(@request() req: Request, @response() res: Response, @next() nextFn: NextFunction): Promise<Response> {
    const estimateGas = await this.rpcService.estimateGas(req.body.from, req.body.to, req.body.data, req.body.value, req.body.token);

    return res.json({ estimateGas });
  }
}
