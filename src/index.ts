import { App } from './app';
import { IndexRoute, RelayRoute } from './routes';

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

try {
  const app = new App([new IndexRoute(), new RelayRoute()]);
  app.listen();
} catch (e) {
  console.error('Unhandled Error:');
  console.error(e);
  process.exit(-1);
}
