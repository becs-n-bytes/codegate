import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import pino from 'pino';
import type { Config } from './config.js';
import { Semaphore } from './services/semaphore.js';
import { ExecutionTracker } from './services/tracker.js';
import { Executor } from './services/executor.js';
import { ProviderRegistry } from './providers/registry.js';
import { ClaudeCodeProvider } from './providers/claude-code.js';
import { CodexProvider } from './providers/codex.js';
import { AiderProvider } from './providers/aider.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { executeRoute } from './routes/execute.js';
import { healthRoute } from './routes/health.js';
import { providersRoute } from './routes/providers.js';
import { cancelRoute } from './routes/cancel.js';

export interface AppContext {
  app: Hono;
  semaphore: Semaphore;
  tracker: ExecutionTracker;
  registry: ProviderRegistry;
  logger: pino.Logger;
  setShuttingDown: () => void;
}

export function createApp(config: Config): AppContext {
  const logger = pino({ level: config.CODEGATE_LOG_LEVEL });

  const semaphore = new Semaphore(
    config.CODEGATE_MAX_CONCURRENCY,
    config.CODEGATE_MAX_QUEUE_SIZE,
    config.CODEGATE_QUEUE_TIMEOUT_MS,
  );

  const tracker = new ExecutionTracker();

  const registry = new ProviderRegistry();
  registry.register(new ClaudeCodeProvider());
  registry.register(new CodexProvider());
  registry.register(new AiderProvider());

  const executor = new Executor(config, semaphore, tracker, registry, logger);

  const app = new Hono();
  const startedAt = Date.now();
  let shuttingDown = false;

  app.onError(createErrorHandler(logger));

  // Health endpoint — no auth, for load balancers
  app.route(
    '/health',
    healthRoute(
      semaphore,
      tracker,
      registry,
      config.CODEGATE_MAX_CONCURRENCY,
      startedAt,
      () => shuttingDown,
    ),
  );

  // Auth middleware for /api/*
  app.use('/api/*', bearerAuth({ token: config.CODEGATE_AUTH_TOKEN }));

  // API routes
  app.route('/api/execute', executeRoute(executor));
  app.route('/api/providers', providersRoute(registry));
  app.route('/api/cancel', cancelRoute(tracker));

  return {
    app,
    semaphore,
    tracker,
    registry,
    logger,
    setShuttingDown: () => {
      shuttingDown = true;
    },
  };
}
