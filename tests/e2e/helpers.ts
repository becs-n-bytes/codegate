import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BaseProvider } from '../../src/providers/base.js';
import { createApp, type AppContext } from '../../src/app.js';
import type { Config } from '../../src/config.js';
import type { SpawnSpec, ProviderOutput } from '../../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_SCRIPT = resolve(__dirname, '../fixtures/mock-provider.mjs');

export const TEST_TOKEN = 'e2e-test-token';

export class MockProvider extends BaseProvider {
  readonly name = 'mock';
  readonly binary = 'node';

  buildSpawnSpec(prompt: string, _model: string, _cwd: string): SpawnSpec {
    return {
      command: 'node',
      args: [MOCK_SCRIPT, prompt],
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    return { output: stdout.trim(), exitCode };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export function makeTestConfig(overrides: Partial<Config> = {}): Config {
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
    CODEGATE_DEFAULT_PROVIDER: 'mock',
    ...overrides,
  };
}

export function createTestApp(
  overrides: Partial<Config> = {},
): AppContext {
  const ctx = createApp(makeTestConfig(overrides));
  ctx.registry.register(new MockProvider());
  return ctx;
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export function jsonPost(
  app: AppContext['app'],
  path: string,
  body: unknown,
  auth = true,
): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: auth ? authHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
