import { App } from './app';
import { IndexRoute, RelayRoute } from './routes';

const app = new App([new IndexRoute(), new RelayRoute()]);
app.listen();
