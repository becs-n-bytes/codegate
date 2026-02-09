import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createApp } from '../../src/app.js';
import type { Config } from '../../src/config.js';

const TEST_TOKEN = 'test-secret-token';

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    CODEGATE_AUTH_TOKEN: TEST_TOKEN,
    CODEGATE_PORT: 0,
    CODEGATE_LOG_LEVEL: 'error',
    CODEGATE_MAX_CONCURRENCY: 2,
    CODEGATE_MAX_QUEUE_SIZE: 4,
    CODEGATE_QUEUE_TIMEOUT_MS: 5000,
    CODEGATE_DEFAULT_TIMEOUT_MS: 30_000,
    CODEGATE_MAX_TIMEOUT_MS: 60_000,
    CODEGATE_SHUTDOWN_TIMEOUT_MS: 5000,
    CODEGATE_DEFAULT_MODEL: 'test-model',
    CODEGATE_DEFAULT_PROVIDER: 'claude-code',
    ...overrides,
  };
}

function authHeader() {
  return { Authorization: `Bearer ${TEST_TOKEN}` };
}

describe('API Integration', () => {
  describe('GET /health', () => {
    it('returns 200 without auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/health');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.activeExecutions).toBe(0);
      expect(body.queueDepth).toBe(0);
      expect(body.maxConcurrency).toBe(2);
      expect(body.providers).toHaveLength(3);
      expect(typeof body.uptime).toBe('number');
    });

    it('includes provider information', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/health');
      const body = await res.json();

      const names = body.providers.map((p: any) => p.name);
      expect(names).toContain('claude-code');
      expect(names).toContain('codex');
      expect(names).toContain('aider');
    });

    it('reports shutting_down status when set', async () => {
      const { app, setShuttingDown } = createApp(makeConfig());
      setShuttingDown();

      const res = await app.request('/health');
      const body = await res.json();
      expect(body.status).toBe('shutting_down');
    });
  });

  describe('GET /api/providers', () => {
    it('returns 401 without auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/providers');
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong token', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/providers', {
        headers: { Authorization: 'Bearer wrong-token' },
      });
      expect(res.status).toBe(401);
    });

    it('returns provider list with valid auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/providers', {
        headers: authHeader(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.providers).toHaveLength(3);
      expect(body.providers[0]).toHaveProperty('name');
      expect(body.providers[0]).toHaveProperty('binary');
      expect(body.providers[0]).toHaveProperty('available');
    });
  });

  describe('POST /api/execute', () => {
    it('returns 401 without auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', provider: 'claude-code' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing prompt', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'claude-code' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('prompt');
    });

    it('returns 400 for missing provider', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('provider');
    });

    it('returns 400 for unknown provider', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', provider: 'nonexistent' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('PROVIDER_NOT_FOUND');
    });

    it('returns 400 for empty prompt', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '', provider: 'claude-code' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid timeoutMs', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'test',
          provider: 'claude-code',
          timeoutMs: 999_999,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for empty body', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/execute', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/cancel/:requestId', () => {
    it('returns 401 without auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/cancel/some-id', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('returns 404 for unknown request ID', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/api/cancel/nonexistent', {
        method: 'POST',
        headers: authHeader(),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('cancels a tracked execution', async () => {
      const { app, tracker } = createApp(makeConfig());
      const ac = new AbortController();
      tracker.register({
        requestId: 'test-req-1',
        provider: 'claude-code',
        startedAt: new Date(),
        abortController: ac,
      });

      const res = await app.request('/api/cancel/test-req-1', {
        method: 'POST',
        headers: authHeader(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('cancelled');
      expect(body.requestId).toBe('test-req-1');
      expect(ac.signal.aborted).toBe(true);
    });
  });

  describe('Auth middleware', () => {
    it('blocks all /api/* routes without auth', async () => {
      const { app } = createApp(makeConfig());

      const endpoints = [
        { path: '/api/providers', method: 'GET' },
        { path: '/api/execute', method: 'POST' },
        { path: '/api/cancel/id', method: 'POST' },
      ];

      for (const { path, method } of endpoints) {
        const res = await app.request(path, { method });
        expect(res.status).toBe(401);
      }
    });

    it('allows /health without auth', async () => {
      const { app } = createApp(makeConfig());
      const res = await app.request('/health');
      expect(res.status).toBe(200);
    });
  });
});
