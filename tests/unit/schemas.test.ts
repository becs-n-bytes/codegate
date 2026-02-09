import { describe, it, expect } from 'vitest';
import { ExecutionRequestSchema, FileEntrySchema } from '../../src/schemas.js';

describe('FileEntrySchema', () => {
  it('accepts valid file entry', () => {
    const result = FileEntrySchema.safeParse({
      path: 'src/main.ts',
      content: 'console.log("hello")',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.encoding).toBe('utf-8');
    }
  });

  it('accepts base64 encoding', () => {
    const result = FileEntrySchema.safeParse({
      path: 'image.png',
      content: 'iVBORw0KGgo=',
      encoding: 'base64',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty path', () => {
    const result = FileEntrySchema.safeParse({
      path: '',
      content: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects path exceeding 500 chars', () => {
    const result = FileEntrySchema.safeParse({
      path: 'a'.repeat(501),
      content: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid encoding', () => {
    const result = FileEntrySchema.safeParse({
      path: 'file.txt',
      content: 'hello',
      encoding: 'ascii',
    });
    expect(result.success).toBe(false);
  });
});

describe('ExecutionRequestSchema', () => {
  it('accepts minimal valid request', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'fix the bug',
      provider: 'claude-code',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full request with all fields', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'add tests',
      provider: 'codex',
      model: 'gpt-4',
      files: [{ path: 'app.ts', content: 'const x = 1;' }],
      timeoutMs: 60000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing prompt', () => {
    const result = ExecutionRequestSchema.safeParse({
      provider: 'claude-code',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing provider', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'fix bug',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty prompt', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: '',
      provider: 'claude-code',
    });
    expect(result.success).toBe(false);
  });

  it('rejects prompt exceeding 100k chars', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'x'.repeat(100_001),
      provider: 'claude-code',
    });
    expect(result.success).toBe(false);
  });

  it('rejects timeoutMs exceeding 600000', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'test',
      provider: 'claude-code',
      timeoutMs: 700_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative timeoutMs', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'test',
      provider: 'claude-code',
      timeoutMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 files', () => {
    const files = Array.from({ length: 101 }, (_, i) => ({
      path: `file${i}.ts`,
      content: 'x',
    }));
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'test',
      provider: 'claude-code',
      files,
    });
    expect(result.success).toBe(false);
  });

  it('allows omitting optional fields', () => {
    const result = ExecutionRequestSchema.safeParse({
      prompt: 'test',
      provider: 'aider',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBeUndefined();
      expect(result.data.files).toBeUndefined();
      expect(result.data.timeoutMs).toBeUndefined();
    }
  });
});
