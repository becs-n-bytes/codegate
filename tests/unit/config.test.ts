import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid config from env vars', () => {
    process.env.CODEGATE_AUTH_TOKEN = 'my-secret';
    process.env.CODEGATE_PORT = '8080';
    process.env.CODEGATE_LOG_LEVEL = 'debug';
    process.env.CODEGATE_MAX_CONCURRENCY = '8';

    const config = loadConfig();
    expect(config.CODEGATE_AUTH_TOKEN).toBe('my-secret');
    expect(config.CODEGATE_PORT).toBe(8080);
    expect(config.CODEGATE_LOG_LEVEL).toBe('debug');
    expect(config.CODEGATE_MAX_CONCURRENCY).toBe(8);
  });

  it('uses defaults for optional fields', () => {
    process.env.CODEGATE_AUTH_TOKEN = 'token';

    const config = loadConfig();
    expect(config.CODEGATE_PORT).toBe(3000);
    expect(config.CODEGATE_LOG_LEVEL).toBe('info');
    expect(config.CODEGATE_MAX_CONCURRENCY).toBe(4);
    expect(config.CODEGATE_MAX_QUEUE_SIZE).toBe(16);
    expect(config.CODEGATE_QUEUE_TIMEOUT_MS).toBe(30_000);
    expect(config.CODEGATE_DEFAULT_TIMEOUT_MS).toBe(300_000);
    expect(config.CODEGATE_MAX_TIMEOUT_MS).toBe(600_000);
    expect(config.CODEGATE_SHUTDOWN_TIMEOUT_MS).toBe(30_000);
    expect(config.CODEGATE_DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    expect(config.CODEGATE_DEFAULT_PROVIDER).toBe('claude-code');
  });

  it('exits on missing required CODEGATE_AUTH_TOKEN', () => {
    delete process.env.CODEGATE_AUTH_TOKEN;

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadConfig()).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('exits on invalid log level', () => {
    process.env.CODEGATE_AUTH_TOKEN = 'token';
    process.env.CODEGATE_LOG_LEVEL = 'verbose';

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadConfig()).toThrow('process.exit called');

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('coerces string port to number', () => {
    process.env.CODEGATE_AUTH_TOKEN = 'token';
    process.env.CODEGATE_PORT = '9999';

    const config = loadConfig();
    expect(config.CODEGATE_PORT).toBe(9999);
    expect(typeof config.CODEGATE_PORT).toBe('number');
  });
});
