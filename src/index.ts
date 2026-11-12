/** Resolves after `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown by `withTimeout` when the promise does not settle in time. */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/** Rejects with a `TimeoutError` if `promise` does not settle within `ms` milliseconds. */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export type RetryOptions = {
  /** Total number of tries, including the first one. Must be >= 1. */
  attempts: number;
  /** Delay before the second try; doubles after each failure. */
  baseMs: number;
  /** Return false to stop retrying and throw immediately. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

/** Runs `fn`, retrying failures with exponential backoff (baseMs, 2x, 4x, ...). */
export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  if (options.attempts < 1) throw new RangeError('attempts must be >= 1');
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLast = attempt === options.attempts;
      if (isLast || options.shouldRetry?.(error, attempt) === false) break;
      await sleep(options.baseMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

/** Returns a function that runs at most `concurrency` tasks at the same time; the rest wait in order. */
export function limitConcurrency(concurrency: number): <T>(task: () => Promise<T>) => Promise<T> {
  if (concurrency < 1) throw new RangeError('concurrency must be >= 1');
  let running = 0;
  const waiting: Array<() => void> = [];

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

/** Splits an array into chunks of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new RangeError('size must be >= 1');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Groups items by the key returned from `getKey`. */
export function groupBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) (out[getKey(item)] ??= []).push(item);
  return out;
}
