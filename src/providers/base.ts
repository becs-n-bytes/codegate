import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SpawnSpec, ProviderOutput } from '../types.js';
import {
  ProviderError,
  TimeoutError,
  CancelledError,
} from '../errors.js';
import type { Logger } from 'pino';

const execFileAsync = promisify(execFile);

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly binary: string;

  abstract buildSpawnSpec(
    prompt: string,
    model: string,
    cwd: string,
  ): SpawnSpec;

  abstract parseOutput(stdout: string, exitCode: number): ProviderOutput;

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync('which', [this.binary]);
      return true;
    } catch {
      return false;
    }
  }

  async execute(
    prompt: string,
    model: string,
    cwd: string,
    signal: AbortSignal,
    timeoutMs: number,
    logger: Logger,
  ): Promise<ProviderOutput> {
    const spec = this.buildSpawnSpec(prompt, model, cwd);
    logger.info(
      { provider: this.name, command: spec.command },
      'Spawning provider process',
    );

    return new Promise<ProviderOutput>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const settle = (
        fn: typeof resolve | typeof reject,
        value: ProviderOutput | Error,
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        (fn as (v: unknown) => void)(value);
      };

      const child = spawn(spec.command, spec.args, {
        cwd,
        env: { ...process.env, ...spec.env },
        signal,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
        settle(
          reject,
          new TimeoutError(
            `Provider ${this.name} timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (err.name === 'AbortError' || signal.aborted) {
          settle(reject, new CancelledError('Execution was cancelled'));
        } else {
          settle(
            reject,
            new ProviderError(
              `Provider ${this.name} failed to spawn: ${err.message}`,
            ),
          );
        }
      });

      child.on('close', (exitCode) => {
        logger.info(
          {
            provider: this.name,
            exitCode,
            stdoutLen: stdout.length,
            stderrLen: stderr.length,
          },
          'Provider process exited',
        );

        if (signal.aborted) {
          settle(reject, new CancelledError('Execution was cancelled'));
          return;
        }

        try {
          const result = this.parseOutput(stdout, exitCode ?? 1);
          settle(resolve, result);
        } catch (err) {
          settle(
            reject,
            new ProviderError(
              `Provider ${this.name} output parsing failed: ${(err as Error).message}`,
            ),
          );
        }
      });
    });
  }
}
