import { BaseProvider } from '@ethersproject/providers';
import { getDefaultProvider } from 'ethers';
import { Container } from 'inversify';
import { join } from 'path';
import { CONFIG } from '../config';
import { sync } from 'glob';
import { GasService, IGasService, ITxService, TxService } from '../services';

/**
 * Dynamic import all controllers
 */
const [, ext] = __filename.match(/\.(\w+)$/);
sync(join(__dirname,'../controllers' ,'**', `*.controller.${ext}`)).forEach((filename: string): void => require(filename));

/**
 * Creates container that will contain all dependencies
 */
const container = new Container({ defaultScope: 'Singleton' });

container.bind<BaseProvider>('BaseProvider').toConstantValue(getDefaultProvider(CONFIG.RPC_URL));
container.bind<ITxService>('TxService').to(TxService);
container.bind<IGasService>('GasService').to(GasService);

export { container };
