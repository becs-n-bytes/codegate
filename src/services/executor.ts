import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';
import type {
  ExecutionRequest,
  ExecutionResult,
  TrackedExecution,
} from '../types.js';
import type { Semaphore } from './semaphore.js';
import type { ExecutionTracker } from './tracker.js';
import type { ProviderRegistry } from '../providers/registry.js';
import {
  createWorkspace,
  snapshotWorkspace,
  diffWorkspace,
  destroyWorkspace,
} from './workspace.js';
import type { Logger } from 'pino';

export class Executor {
  constructor(
    private readonly config: Config,
    private readonly semaphore: Semaphore,
    private readonly tracker: ExecutionTracker,
    private readonly registry: ProviderRegistry,
    private readonly logger: Logger,
  ) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const requestId = randomUUID();
    const abortController = new AbortController();
    const provider = this.registry.get(request.provider);
    const model = request.model ?? this.config.CODEGATE_DEFAULT_MODEL;
    const timeoutMs = Math.min(
      request.timeoutMs ?? this.config.CODEGATE_DEFAULT_TIMEOUT_MS,
      this.config.CODEGATE_MAX_TIMEOUT_MS,
    );
    const startedAt = Date.now();
    const reqLogger = this.logger.child({
      requestId,
      provider: provider.name,
      model,
    });

    const tracked: TrackedExecution = {
      requestId,
      provider: provider.name,
      startedAt: new Date(),
      abortController,
    };

    await this.semaphore.acquire(abortController.signal);
    this.tracker.register(tracked);

    let workspacePath: string | undefined;
    try {
      workspacePath = await createWorkspace(request.files);
      const snapshot = await snapshotWorkspace(workspacePath);

      reqLogger.info(
        { workspacePath, fileCount: request.files?.length ?? 0 },
        'Workspace created',
      );

      const result = await provider.execute(
        request.prompt,
        model,
        workspacePath,
        abortController.signal,
        timeoutMs,
        reqLogger,
      );

      const files = await diffWorkspace(workspacePath, snapshot);

      return {
        requestId,
        provider: provider.name,
        model,
        output: result.output,
        exitCode: result.exitCode,
        durationMs: Date.now() - startedAt,
        files,
      };
    } finally {
      this.tracker.unregister(requestId);
      this.semaphore.release();
      if (workspacePath) {
        await destroyWorkspace(workspacePath).catch((err) => {
          reqLogger.warn({ err, workspacePath }, 'Failed to destroy workspace');
        });
      }
    }
  }
}
