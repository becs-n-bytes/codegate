import type { TrackedExecution } from '../types.js';

export class ExecutionTracker {
  private readonly executions = new Map<string, TrackedExecution>();

  register(execution: TrackedExecution): void {
    this.executions.set(execution.requestId, execution);
  }

  unregister(requestId: string): void {
    this.executions.delete(requestId);
  }

  cancel(requestId: string): boolean {
    const execution = this.executions.get(requestId);
    if (!execution) return false;
    execution.abortController.abort();
    return true;
  }

  get(requestId: string): TrackedExecution | undefined {
    return this.executions.get(requestId);
  }

  getAll(): TrackedExecution[] {
    return Array.from(this.executions.values());
  }

  get activeCount(): number {
    return this.executions.size;
  }
}
