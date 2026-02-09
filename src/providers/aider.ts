import { BaseProvider } from './base.js';
import type { SpawnSpec, ProviderOutput } from '../types.js';

export class AiderProvider extends BaseProvider {
  readonly name = 'aider';
  readonly binary = 'aider';

  buildSpawnSpec(prompt: string, model: string, _cwd: string): SpawnSpec {
    return {
      command: this.binary,
      args: [
        '--message',
        prompt,
        '--model',
        model,
        '--yes',
        '--no-auto-commits',
        '--no-stream',
      ],
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    return { output: stdout.trim(), exitCode };
  }
}
