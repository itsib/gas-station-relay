import { BaseProvider } from '@ethersproject/providers';
import { getDefaultProvider } from 'ethers';
import { Container } from 'inversify';
import { CONFIG } from '../config';
import { IGasService, GasService, IRpcService, RpcService } from '../services';

/**
 * Creates container that will contain all dependencies
 */
const container = new Container({ defaultScope: 'Singleton' });

container.bind<BaseProvider>('BaseProvider').toConstantValue(getDefaultProvider(CONFIG.RPC_URL));
container.bind<IRpcService>('RpcService').to(RpcService);
container.bind<IGasService>('GasService').to(GasService);

export { container };
