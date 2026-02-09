import { describe, it, expect, vi, afterEach } from 'vitest';
import { Semaphore } from '../../../src/services/semaphore.js';
import { CapacityError } from '../../../src/errors.js';

describe('Semaphore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows acquisition up to max concurrency', async () => {
    const sem = new Semaphore(2, 10, 5000);

    await sem.acquire();
    await sem.acquire();

    expect(sem.activeCount).toBe(2);
    expect(sem.queueDepth).toBe(0);
  });

  it('queues beyond max concurrency', async () => {
    const sem = new Semaphore(1, 10, 5000);
    await sem.acquire();

    const pending = sem.acquire();
    expect(sem.queueDepth).toBe(1);

    sem.release();
    await pending;
    expect(sem.activeCount).toBe(1);
    expect(sem.queueDepth).toBe(0);
  });

  it('throws CapacityError when queue is full', async () => {
    const sem = new Semaphore(1, 1, 5000);
    await sem.acquire();

    // Fill the queue
    const _queued = sem.acquire();
    expect(sem.queueDepth).toBe(1);

    // This should throw
    await expect(sem.acquire()).rejects.toThrow(CapacityError);
    await expect(sem.acquire()).rejects.toThrow('Queue full');

    // Clean up
    sem.release();
    await _queued;
    sem.release();
  });

  it('throws CapacityError on queue timeout', async () => {
    vi.useFakeTimers();
    const sem = new Semaphore(1, 10, 100);
    await sem.acquire();

    const pending = sem.acquire();

    vi.advanceTimersByTime(101);

    await expect(pending).rejects.toThrow(CapacityError);
    await expect(pending).rejects.toThrow('without capacity');

    sem.release();
    vi.useRealTimers();
  });

  it('throws if signal is already aborted', async () => {
    const sem = new Semaphore(2, 10, 5000);
    const ac = new AbortController();
    ac.abort();

    await expect(sem.acquire(ac.signal)).rejects.toThrow(CapacityError);
  });

  it('aborts a queued waiter when signal fires', async () => {
    const sem = new Semaphore(1, 10, 5000);
    await sem.acquire();

    const ac = new AbortController();
    const pending = sem.acquire(ac.signal);

    expect(sem.queueDepth).toBe(1);
    ac.abort();

    await expect(pending).rejects.toThrow(CapacityError);
    expect(sem.queueDepth).toBe(0);

    sem.release();
  });

  it('release promotes queued waiter without changing active count', async () => {
    const sem = new Semaphore(1, 10, 5000);
    await sem.acquire();
    expect(sem.activeCount).toBe(1);

    const p = sem.acquire();
    sem.release();
    await p;

    // After promoting, active should still be 1 (one released, one promoted)
    expect(sem.activeCount).toBe(1);
    sem.release();
    expect(sem.activeCount).toBe(0);
  });

  it('release does not go below zero', () => {
    const sem = new Semaphore(2, 10, 5000);
    sem.release();
    sem.release();
    sem.release();
    expect(sem.activeCount).toBe(0);
  });

  it('drain rejects all queued waiters', async () => {
    const sem = new Semaphore(1, 10, 5000);
    await sem.acquire();

    const p1 = sem.acquire();
    const p2 = sem.acquire();

    expect(sem.queueDepth).toBe(2);

    // drain rejects queued, then waits for active to finish
    const drainPromise = sem.drain(1000);

    await expect(p1).rejects.toThrow('shutting down');
    await expect(p2).rejects.toThrow('shutting down');
    expect(sem.queueDepth).toBe(0);

    // Release the active one so drain completes
    sem.release();
    await drainPromise;
  });

  it('drain resolves immediately if no active executions', async () => {
    const sem = new Semaphore(4, 10, 5000);
    await sem.drain(100);
    // Should not throw or hang
  });
});
