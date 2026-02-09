import { describe, it, expect } from 'vitest';
import { ExecutionTracker } from '../../../src/services/tracker.js';
import type { TrackedExecution } from '../../../src/types.js';

function makeTracked(requestId: string): TrackedExecution {
  return {
    requestId,
    provider: 'claude-code',
    startedAt: new Date(),
    abortController: new AbortController(),
  };
}

describe('ExecutionTracker', () => {
  it('registers and retrieves an execution', () => {
    const tracker = new ExecutionTracker();
    const tracked = makeTracked('req-1');

    tracker.register(tracked);

    expect(tracker.get('req-1')).toBe(tracked);
    expect(tracker.activeCount).toBe(1);
  });

  it('unregisters an execution', () => {
    const tracker = new ExecutionTracker();
    tracker.register(makeTracked('req-1'));

    tracker.unregister('req-1');

    expect(tracker.get('req-1')).toBeUndefined();
    expect(tracker.activeCount).toBe(0);
  });

  it('cancels an execution by aborting its controller', () => {
    const tracker = new ExecutionTracker();
    const tracked = makeTracked('req-1');
    tracker.register(tracked);

    const result = tracker.cancel('req-1');

    expect(result).toBe(true);
    expect(tracked.abortController.signal.aborted).toBe(true);
  });

  it('returns false when cancelling non-existent execution', () => {
    const tracker = new ExecutionTracker();
    expect(tracker.cancel('nonexistent')).toBe(false);
  });

  it('getAll returns all tracked executions', () => {
    const tracker = new ExecutionTracker();
    tracker.register(makeTracked('req-1'));
    tracker.register(makeTracked('req-2'));
    tracker.register(makeTracked('req-3'));

    const all = tracker.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.requestId).sort()).toEqual([
      'req-1',
      'req-2',
      'req-3',
    ]);
  });

  it('tracks active count correctly through lifecycle', () => {
    const tracker = new ExecutionTracker();
    expect(tracker.activeCount).toBe(0);

    tracker.register(makeTracked('req-1'));
    tracker.register(makeTracked('req-2'));
    expect(tracker.activeCount).toBe(2);

    tracker.unregister('req-1');
    expect(tracker.activeCount).toBe(1);

    tracker.unregister('req-2');
    expect(tracker.activeCount).toBe(0);
  });

  it('unregister is idempotent for unknown IDs', () => {
    const tracker = new ExecutionTracker();
    tracker.unregister('nonexistent');
    expect(tracker.activeCount).toBe(0);
  });
});
