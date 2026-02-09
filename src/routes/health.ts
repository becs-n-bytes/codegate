import { Hono } from 'hono';
import type { Semaphore } from '../services/semaphore.js';
import type { ExecutionTracker } from '../services/tracker.js';
import type { ProviderRegistry } from '../providers/registry.js';

export function healthRoute(
  semaphore: Semaphore,
  tracker: ExecutionTracker,
  registry: ProviderRegistry,
  maxConcurrency: number,
  startedAt: number,
  isShuttingDown: () => boolean,
): Hono {
  const route = new Hono();

  route.get('/', async (c) => {
    const providers = await registry.listWithAvailability();
    return c.json({
      status: isShuttingDown() ? 'shutting_down' : 'ok',
      activeExecutions: tracker.activeCount,
      queueDepth: semaphore.queueDepth,
      maxConcurrency,
      providers,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    });
  });

  return route;
}
