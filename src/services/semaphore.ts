import { CapacityError } from '../errors.js';

interface Waiter {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class Semaphore {
  private active = 0;
  private readonly queue: Waiter[] = [];

  constructor(
    private readonly maxConcurrency: number,
    private readonly maxQueueSize: number,
    private readonly queueTimeoutMs: number,
  ) {}

  get activeCount(): number {
    return this.active;
  }

  get queueDepth(): number {
    return this.queue.length;
  }

  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new CapacityError('Request was aborted');
    }

    if (this.active < this.maxConcurrency) {
      this.active++;
      return;
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new CapacityError(
        `Queue full (${this.maxQueueSize} waiting). Try again later.`,
      );
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(waiter);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(
          new CapacityError(
            `Queued for ${this.queueTimeoutMs}ms without capacity. Try again later.`,
          ),
        );
      }, this.queueTimeoutMs);

      const waiter: Waiter = { resolve, reject, timer };
      this.queue.push(waiter);

      signal?.addEventListener(
        'abort',
        () => {
          const idx = this.queue.indexOf(waiter);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            clearTimeout(timer);
            reject(new CapacityError('Request was aborted while queued'));
          }
        },
        { once: true },
      );
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const waiter = this.queue.shift()!;
      clearTimeout(waiter.timer);
      waiter.resolve();
    } else {
      this.active = Math.max(0, this.active - 1);
    }
  }

  async drain(timeoutMs: number): Promise<void> {
    for (const waiter of this.queue) {
      clearTimeout(waiter.timer);
      waiter.reject(new CapacityError('Server is shutting down'));
    }
    this.queue.length = 0;

    if (this.active === 0) return;

    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      const check = setInterval(() => {
        if (this.active === 0) {
          clearInterval(check);
          clearTimeout(timer);
          resolve();
        }
      }, 100);
    });
  }
}
