import { sync } from 'glob';
import { Container } from 'inversify';
import { join } from 'path';
import { CONFIG } from '../config';
import { GasService, TxService } from '../services';
import { NetworkConfig } from '../types';
import { getNetworkConfig, Provider } from '../utils';

/**
 * Dynamic import all controllers
 */
const [, ext] = __filename.match(/\.(\w+)$/);
sync(join(__dirname, '../controllers', '**', `*.controller.${ext}`)).forEach((filename: string): void => require(filename));

export async function buildContainer(): Promise<Container> {
  const networkConfig: NetworkConfig = await getNetworkConfig(CONFIG.CHAIN_ID);

  /**
   * Creates container that will contain all dependencies
   */
  const container = new Container({ defaultScope: 'Singleton' });

  container.bind<Provider>('Provider').toConstantValue(new Provider(networkConfig));
  container.bind<TxService>('TxService').to(TxService);
  container.bind<GasService>('GasService').to(GasService);

  return container;
}
