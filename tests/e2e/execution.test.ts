import { describe, it, expect } from 'vitest';
import { createTestApp, jsonPost, authHeaders } from './helpers.js';

describe('E2E: Execution flow', () => {
  it('executes a simple prompt and returns output', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'echo:hello world',
      provider: 'mock',
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.output).toBe('echo: echo:hello world');
    expect(body.exitCode).toBe(0);
    expect(body.provider).toBe('mock');
    expect(body.model).toBe('test-model');
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.durationMs).toBeGreaterThan(0);
    expect(body.files).toEqual([]);
  });

  it('uses a custom model when specified', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'echo:test',
      provider: 'mock',
      model: 'custom-model-v2',
    });

    const body = await res.json();
    expect(body.model).toBe('custom-model-v2');
  });

  it('seeds files into workspace before execution', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'echo:seeded',
      provider: 'mock',
      files: [
        { path: 'src/app.ts', content: 'const x = 1;' },
        { path: 'README.md', content: '# Hello' },
      ],
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toContain('echo:seeded');
    // Seeded files are unchanged, so they should not appear in diff
    expect(body.files).toEqual([]);
  });

  it('detects new files created by provider', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'create:output.txt:generated content',
      provider: 'mock',
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.files).toHaveLength(1);
    expect(body.files[0].path).toBe('output.txt');
    expect(body.files[0].content).toBe('generated content');
    expect(body.files[0].encoding).toBe('utf-8');
  });

  it('detects modified files in workspace', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'modify:app.ts:const x = 2; // modified',
      provider: 'mock',
      files: [{ path: 'app.ts', content: 'const x = 1;' }],
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.files).toHaveLength(1);
    expect(body.files[0].path).toBe('app.ts');
    expect(body.files[0].content).toBe('const x = 2; // modified');
  });

  it('handles nested file creation by provider', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'create:src/utils/helper.ts:export const add = (a, b) => a + b;',
      provider: 'mock',
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // walkDir finds the new file
    const newFile = body.files.find(
      (f: any) => f.path === 'src/utils/helper.ts',
    );
    expect(newFile).toBeDefined();
    expect(newFile.content).toBe('export const add = (a, b) => a + b;');
  });

  it('returns provider error on non-zero exit code', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'fail',
      provider: 'mock',
    });

    // Provider exits 1, but parseOutput still returns output
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exitCode).toBe(1);
  });

  it('returns JSON output from provider', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'json',
      provider: 'mock',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = JSON.parse(body.output);
    expect(parsed.result).toBe('structured output');
  });

  it('cleans up workspace after execution', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'echo:cleanup test',
      provider: 'mock',
      files: [{ path: 'temp.txt', content: 'temporary' }],
    });

    expect(res.status).toBe(200);

    // Verify tracker has no active executions (workspace was cleaned up)
    const healthRes = await app.request('/health');
    const health = await healthRes.json();
    expect(health.activeExecutions).toBe(0);
  });

  it('handles base64 file seeding end-to-end', async () => {
    const { app } = createTestApp();
    const encoded = Buffer.from('decoded content').toString('base64');

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'echo:base64 test',
      provider: 'mock',
      files: [{ path: 'data.bin', content: encoded, encoding: 'base64' }],
    });

    expect(res.status).toBe(200);
  });

  it('rejects requests for unknown providers', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'test',
      provider: 'nonexistent',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('PROVIDER_NOT_FOUND');
  });

  it('respects custom timeout from request', async () => {
    const { app } = createTestApp();

    const res = await jsonPost(app, '/api/execute', {
      prompt: 'slow:5000',
      provider: 'mock',
      timeoutMs: 500,
    });

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error.code).toBe('TIMEOUT');
  }, 10_000);
});
