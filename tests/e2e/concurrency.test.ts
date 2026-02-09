import { describe, it, expect } from 'vitest';
import { createTestApp, jsonPost } from './helpers.js';

describe('E2E: Concurrency and backpressure', () => {
  it('executes concurrent requests up to capacity', async () => {
    const { app } = createTestApp({ CODEGATE_MAX_CONCURRENCY: 3 });

    const results = await Promise.all([
      jsonPost(app, '/api/execute', {
        prompt: 'echo:request-1',
        provider: 'mock',
      }),
      jsonPost(app, '/api/execute', {
        prompt: 'echo:request-2',
        provider: 'mock',
      }),
      jsonPost(app, '/api/execute', {
        prompt: 'echo:request-3',
        provider: 'mock',
      }),
    ]);

    for (const res of results) {
      expect(res.status).toBe(200);
    }
  });

  it(
    'returns 503 when capacity is exceeded and queue is full',
    async () => {
      const { app } = createTestApp({
        CODEGATE_MAX_CONCURRENCY: 1,
        CODEGATE_MAX_QUEUE_SIZE: 1,
      });

      // First request: occupies the slot (slow)
      const p1 = jsonPost(app, '/api/execute', {
        prompt: 'slow:2000',
        provider: 'mock',
      });

      // Small delay to let p1 acquire the semaphore
      await new Promise((r) => setTimeout(r, 50));

      // Second request: enters queue
      const p2 = jsonPost(app, '/api/execute', {
        prompt: 'slow:2000',
        provider: 'mock',
      });

      // Small delay to let p2 enter queue
      await new Promise((r) => setTimeout(r, 50));

      // Third request: should be rejected (queue full)
      const p3 = jsonPost(app, '/api/execute', {
        prompt: 'echo:overflow',
        provider: 'mock',
      });

      const res3 = await p3;
      expect(res3.status).toBe(503);

      const body = await res3.json();
      expect(body.error.code).toBe('CAPACITY_EXCEEDED');

      // Wait for slow requests to finish
      await Promise.all([p1, p2]);
    },
    15_000,
  );

  it('queued requests execute after capacity frees up', async () => {
    const { app } = createTestApp({
      CODEGATE_MAX_CONCURRENCY: 1,
      CODEGATE_MAX_QUEUE_SIZE: 2,
    });

    // First: takes the slot with a brief delay
    const p1 = jsonPost(app, '/api/execute', {
      prompt: 'slow:200',
      provider: 'mock',
    });

    // Small delay so p1 acquires the semaphore
    await new Promise((r) => setTimeout(r, 50));

    // Second: queued, will execute after p1 finishes
    const p2 = jsonPost(app, '/api/execute', {
      prompt: 'echo:queued-then-ran',
      provider: 'mock',
    });

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body2 = await res2.json();
    expect(body2.output).toContain('queued-then-ran');
  }, 10_000);

  it('tracks active executions in health endpoint', async () => {
    const { app } = createTestApp({ CODEGATE_MAX_CONCURRENCY: 2 });

    // Start a slow execution
    const p = jsonPost(app, '/api/execute', {
      prompt: 'slow:1000',
      provider: 'mock',
    });

    // Brief delay to let it start
    await new Promise((r) => setTimeout(r, 100));

    const healthRes = await app.request('/health');
    const health = await healthRes.json();
    expect(health.activeExecutions).toBeGreaterThanOrEqual(1);

    // Wait for it to complete
    await p;

    const healthAfter = await app.request('/health');
    const after = await healthAfter.json();
    expect(after.activeExecutions).toBe(0);
  }, 10_000);
});
