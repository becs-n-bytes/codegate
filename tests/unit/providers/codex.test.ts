import { describe, it, expect } from 'vitest';
import { CodexProvider } from '../../../src/providers/codex.js';

describe('CodexProvider', () => {
  const provider = new CodexProvider();

  it('has correct name and binary', () => {
    expect(provider.name).toBe('codex');
    expect(provider.binary).toBe('codex');
  });

  describe('buildSpawnSpec', () => {
    it('builds correct spawn spec', () => {
      const spec = provider.buildSpawnSpec('refactor code', 'gpt-4', '/tmp/ws');

      expect(spec.command).toBe('codex');
      expect(spec.args).toEqual([
        '--quiet',
        '--full-auto',
        '--model',
        'gpt-4',
        'refactor code',
      ]);
    });
  });

  describe('parseOutput', () => {
    it('trims and returns stdout', () => {
      const result = provider.parseOutput('  output text\n\n', 0);
      expect(result.output).toBe('output text');
      expect(result.exitCode).toBe(0);
    });

    it('preserves exit code', () => {
      const result = provider.parseOutput('error', 1);
      expect(result.exitCode).toBe(1);
    });
  });
});
