import { Container } from 'inversify';
import { IRpcService, RpcService } from '../services';

/**
 * Creates container that will contain all dependencies
 */
const container = new Container({ defaultScope: 'Singleton' });

container.bind<IRpcService>('RpcService').to(RpcService);

export { container };
