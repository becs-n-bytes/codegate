import { Hono } from 'hono';
import type { ExecutionTracker } from '../services/tracker.js';

export function cancelRoute(tracker: ExecutionTracker): Hono {
  const route = new Hono();

  route.post('/:requestId', async (c) => {
    const requestId = c.req.param('requestId');
    const cancelled = tracker.cancel(requestId);

    if (!cancelled) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No active execution with id: ${requestId}`,
          },
        },
        404,
      );
    }

    return c.json({ requestId, status: 'cancelled' });
  });

  return route;
}
