import { BaseProvider } from './base.js';
import type { SpawnSpec, ProviderOutput } from '../types.js';

export class ClaudeCodeProvider extends BaseProvider {
  readonly name = 'claude-code';
  readonly binary = 'claude';

  buildSpawnSpec(prompt: string, model: string, _cwd: string): SpawnSpec {
    return {
      command: this.binary,
      args: [
        '-p',
        prompt,
        '--model',
        model,
        '--output-format',
        'json',
        '--dangerously-skip-permissions',
      ],
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    try {
      const parsed = JSON.parse(stdout);
      const output =
        typeof parsed === 'string'
          ? parsed
          : (parsed.result ?? parsed.text ?? JSON.stringify(parsed));
      return { output, exitCode };
    } catch {
      return { output: stdout.trim(), exitCode };
    }
  }
}
