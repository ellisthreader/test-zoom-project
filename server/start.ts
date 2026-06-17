import { config } from './config.js';
import { createApp } from './index.js';

const server = createApp().listen(config.port, () => {
  console.log(`ChatoraAi AI backend running on http://127.0.0.1:${config.port}`);
});

server.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

server.ref();

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
