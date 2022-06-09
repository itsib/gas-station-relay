import { BaseProvider } from '@ethersproject/providers';
import { getDefaultProvider } from 'ethers';
import { Container, decorate, injectable } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import { Controller } from 'tsoa';
import { CONFIG } from '../config';
import { GasService, IGasService, IRpcService, RpcService } from '../services';

/**
 * Creates container that will contain all dependencies
 */
const container = new Container({ defaultScope: 'Singleton' });

container.bind<BaseProvider>('BaseProvider').toConstantValue(getDefaultProvider(CONFIG.RPC_URL));
container.bind<IRpcService>('RpcService').to(RpcService);
container.bind<IGasService>('GasService').to(GasService);

// Makes tsoa's Controller injectable
decorate(injectable(), Controller);

// make inversify aware of inversify-binding-decorators
container.load(buildProviderModule());

export { container };
