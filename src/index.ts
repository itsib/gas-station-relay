import { App } from './app';
import { IndexRoute, RelayRoute } from './routes';

try {
  const app = new App([new IndexRoute(), new RelayRoute()]);
  app.listen();
} catch (e) {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
}
