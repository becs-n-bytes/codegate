import { describe, it, expect } from 'vitest';
import { ClaudeCodeProvider } from '../../../src/providers/claude-code.js';

describe('ClaudeCodeProvider', () => {
  const provider = new ClaudeCodeProvider();

  it('has correct name and binary', () => {
    expect(provider.name).toBe('claude-code');
    expect(provider.binary).toBe('claude');
  });

  describe('buildSpawnSpec', () => {
    it('builds correct spawn spec', () => {
      const spec = provider.buildSpawnSpec('fix the bug', 'sonnet', '/tmp/ws');

      expect(spec.command).toBe('claude');
      expect(spec.args).toEqual([
        '-p',
        'fix the bug',
        '--model',
        'sonnet',
        '--output-format',
        'json',
        '--dangerously-skip-permissions',
      ]);
    });

    it('passes prompt with special characters', () => {
      const spec = provider.buildSpawnSpec(
        'add "quotes" and $pecial chars',
        'opus',
        '/tmp/ws',
      );
      expect(spec.args[1]).toBe('add "quotes" and $pecial chars');
    });
  });

  describe('parseOutput', () => {
    it('parses JSON string output', () => {
      const result = provider.parseOutput('"Hello, I fixed the bug"', 0);
      expect(result.output).toBe('Hello, I fixed the bug');
      expect(result.exitCode).toBe(0);
    });

    it('parses JSON object with result field', () => {
      const json = JSON.stringify({ result: 'Done fixing' });
      const result = provider.parseOutput(json, 0);
      expect(result.output).toBe('Done fixing');
    });

    it('parses JSON object with text field', () => {
      const json = JSON.stringify({ text: 'Some output' });
      const result = provider.parseOutput(json, 0);
      expect(result.output).toBe('Some output');
    });

    it('stringifies JSON object without result/text fields', () => {
      const json = JSON.stringify({ data: 'value', count: 42 });
      const result = provider.parseOutput(json, 0);
      expect(JSON.parse(result.output)).toEqual({ data: 'value', count: 42 });
    });

    it('falls back to raw stdout on invalid JSON', () => {
      const result = provider.parseOutput('not json output\n', 1);
      expect(result.output).toBe('not json output');
      expect(result.exitCode).toBe(1);
    });

    it('handles empty stdout', () => {
      const result = provider.parseOutput('', 0);
      expect(result.output).toBe('');
      expect(result.exitCode).toBe(0);
    });
  });
});
