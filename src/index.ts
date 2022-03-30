import { App } from './app';
import { IndexRoute, SendTxRoute, InfoRoute, TxFeeRouter, EstimateGasRouter } from './routes';
import { RpcService } from './services';
import { Route } from './types';
import { logger } from './utils';

process.on('uncaughException', (e) => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

logger.info('Starting application...');
startApp().catch(e => {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
});

async function startApp(): Promise<void> {
  const rpcService = await new RpcService().init();

  const routes: Route[] = [
    new IndexRoute(),
    new InfoRoute(rpcService),
    new TxFeeRouter(rpcService),
    new SendTxRoute(rpcService),
    new EstimateGasRouter(rpcService),
  ];

  const app = new App(routes);

  app.listen();
}
