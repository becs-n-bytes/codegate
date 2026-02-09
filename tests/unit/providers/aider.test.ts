import { describe, it, expect } from 'vitest';
import { AiderProvider } from '../../../src/providers/aider.js';

describe('AiderProvider', () => {
  const provider = new AiderProvider();

  it('has correct name and binary', () => {
    expect(provider.name).toBe('aider');
    expect(provider.binary).toBe('aider');
  });

  describe('buildSpawnSpec', () => {
    it('builds correct spawn spec', () => {
      const spec = provider.buildSpawnSpec(
        'add logging',
        'gpt-4-turbo',
        '/tmp/ws',
      );

      expect(spec.command).toBe('aider');
      expect(spec.args).toEqual([
        '--message',
        'add logging',
        '--model',
        'gpt-4-turbo',
        '--yes',
        '--no-auto-commits',
        '--no-stream',
      ]);
    });
  });

  describe('parseOutput', () => {
    it('trims and returns stdout', () => {
      const result = provider.parseOutput('  done  \n', 0);
      expect(result.output).toBe('done');
      expect(result.exitCode).toBe(0);
    });
  });
});
