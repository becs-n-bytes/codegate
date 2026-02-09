import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
const { app, semaphore, tracker, logger, setShuttingDown } = createApp(config);

const server = serve(
  { fetch: app.fetch, port: config.CODEGATE_PORT },
  (info) => {
    logger.info({ port: info.port }, 'codegate listening');
  },
);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down...');
  setShuttingDown();

  server.close();

  await semaphore.drain(config.CODEGATE_SHUTDOWN_TIMEOUT_MS);

  for (const execution of tracker.getAll()) {
    logger.warn({ requestId: execution.requestId }, 'Force-aborting execution');
    execution.abortController.abort();
  }

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
