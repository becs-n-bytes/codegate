import { BaseProvider } from './base.js';
import type { SpawnSpec, ProviderOutput } from '../types.js';

export class CodexProvider extends BaseProvider {
  readonly name = 'codex';
  readonly binary = 'codex';

  buildSpawnSpec(prompt: string, model: string, _cwd: string): SpawnSpec {
    return {
      command: this.binary,
      args: ['--quiet', '--full-auto', '--model', model, prompt],
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    return { output: stdout.trim(), exitCode };
  }
}
