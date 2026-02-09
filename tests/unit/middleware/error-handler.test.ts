import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createErrorHandler } from '../../../src/middleware/error-handler.js';
import {
  ValidationError,
  CapacityError,
  TimeoutError,
} from '../../../src/errors.js';

function makeLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: 'info',
  } as any;
}

describe('createErrorHandler', () => {
  it('maps CodegateError to correct status and JSON', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new ValidationError('bad input');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'bad input' },
    });
  });

  it('handles CapacityError with 503', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new CapacityError('queue full');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(503);
  });

  it('handles TimeoutError with 504', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new TimeoutError('timed out');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(504);
  });

  it('passes through HTTPException responses', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new HTTPException(401, { message: 'Unauthorized' });
    });

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('returns 500 for unknown errors', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new Error('unexpected');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('logs CodegateError at warn level', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new ValidationError('bad');
    });

    await app.request('/test');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs unknown errors at error level', async () => {
    const logger = makeLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));
    app.get('/test', () => {
      throw new TypeError('whoops');
    });

    await app.request('/test');
    expect(logger.error).toHaveBeenCalled();
  });
});
