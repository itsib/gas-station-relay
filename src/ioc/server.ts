import { Router } from 'express';
import 'reflect-metadata'; // <- Should be before the inversify-express-utils import
import { InversifyExpressServer } from 'inversify-express-utils';
import { container } from './container';

// Controllers
import '../controllers/info.controller';
import '../controllers/estimate-gas.controller';
import '../controllers/tx-fee.controller';
import '../controllers/send-tx.controller';

export function serverFactory(router?: Router): InversifyExpressServer {
  return new InversifyExpressServer(container, router);
}
