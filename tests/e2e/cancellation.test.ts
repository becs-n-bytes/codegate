import { describe, it, expect } from 'vitest';
import { createTestApp, jsonPost, authHeaders } from './helpers.js';

describe('E2E: Cancellation and timeouts', () => {
  it('cancels a running execution', async () => {
    const { app, tracker } = createTestApp();

    // Start a slow execution
    const execPromise = jsonPost(app, '/api/execute', {
      prompt: 'slow:10000',
      provider: 'mock',
    });

    // Wait for it to register in tracker
    await new Promise((r) => setTimeout(r, 200));

    const tracked = tracker.getAll();
    expect(tracked.length).toBe(1);
    const requestId = tracked[0].requestId;

    // Cancel it
    const cancelRes = await app.request(`/api/cancel/${requestId}`, {
      method: 'POST',
      headers: authHeaders(),
    });

    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.status).toBe('cancelled');
    expect(cancelBody.requestId).toBe(requestId);

    // The execution should resolve with a cancellation error
    const execRes = await execPromise;
    expect(execRes.status).toBe(499);

    const execBody = await execRes.json();
    expect(execBody.error.code).toBe('CANCELLED');
  }, 10_000);

  it('returns 404 when cancelling non-existent execution', async () => {
    const { app } = createTestApp();

    const res = await app.request('/api/cancel/not-a-real-id', {
      method: 'POST',
      headers: authHeaders(),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('times out when provider exceeds timeout', async () => {
    const { app } = createTestApp({
      CODEGATE_DEFAULT_TIMEOUT_MS: 500,
      CODEGATE_MAX_TIMEOUT_MS: 1000,
    });

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'slow:5000',
      provider: 'mock',
      timeoutMs: 500,
    });

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error.code).toBe('TIMEOUT');
  }, 10_000);

  it('caps timeout at CODEGATE_MAX_TIMEOUT_MS', async () => {
    const { app } = createTestApp({
      CODEGATE_MAX_TIMEOUT_MS: 800,
    });

    // Request asks for 60s but server caps at 800ms
    // Provider takes 5s, so it should time out at ~800ms
    const start = Date.now();
    const res = await jsonPost(app, '/api/execute', {
      prompt: 'slow:5000',
      provider: 'mock',
      timeoutMs: 60_000,
    });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(504);
    // Should have timed out well before 5s
    expect(elapsed).toBeLessThan(3000);
  }, 10_000);

  it('cleans up resources after cancellation', async () => {
    const { app, tracker, semaphore } = createTestApp();

    const execPromise = jsonPost(app, '/api/execute', {
      prompt: 'slow:10000',
      provider: 'mock',
    });

    await new Promise((r) => setTimeout(r, 200));

    const tracked = tracker.getAll();
    tracker.cancel(tracked[0].requestId);

    await execPromise;

    // Verify cleanup: no active executions, semaphore released
    expect(tracker.activeCount).toBe(0);
    expect(semaphore.activeCount).toBe(0);
  }, 10_000);

  it('cleans up resources after timeout', async () => {
    const { app, tracker, semaphore } = createTestApp();

    await jsonPost(app, '/api/execute', {
      prompt: 'slow:5000',
      provider: 'mock',
      timeoutMs: 300,
    });

    // After the request completes (with timeout error), resources should be freed
    expect(tracker.activeCount).toBe(0);
    expect(semaphore.activeCount).toBe(0);
  }, 10_000);
});
