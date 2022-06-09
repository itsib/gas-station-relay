import { Router } from 'express';
import { sync } from 'glob';
import { InversifyExpressServer } from 'inversify-express-utils';
import { join } from 'path';
import { container } from './container';

export function serverFactory(router?: Router): InversifyExpressServer {
  const [, ext] = __filename.match(/\.(\w+)$/);

  // Dynamic import all controllers
  sync(join(__dirname,'../controllers' ,'**', `*.controller.${ext}`)).forEach((filename: string): void => require(filename));

  return new InversifyExpressServer(container, router);
}
