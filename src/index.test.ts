import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunk, groupBy, limitConcurrency, retry, sleep, TimeoutError, withTimeout } from './index.js';

describe('retry', () => {
  it('returns the first successful result', async () => {
    assert.equal(await retry(async () => 'ok', { attempts: 3, baseMs: 1 }), 'ok');
  });

  it('retries until it succeeds', async () => {
    let calls = 0;
    const result = await retry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('flaky');
        return calls;
      },
      { attempts: 5, baseMs: 1 },
    );
    assert.equal(result, 3);
  });

  it('throws the last error after the final attempt', async () => {
    let calls = 0;
    await assert.rejects(
      retry(
        async () => {
          calls++;
          throw new Error(`fail ${calls}`);
        },
        { attempts: 3, baseMs: 1 },
      ),
      /fail 3/,
    );
    assert.equal(calls, 3);
  });

  it('stops early when shouldRetry returns false', async () => {
    let calls = 0;
    await assert.rejects(
      retry(
        async () => {
          calls++;
          throw new Error('fatal');
        },
        { attempts: 5, baseMs: 1, shouldRetry: () => false },
      ),
      /fatal/,
    );
    assert.equal(calls, 1);
  });

  it('rejects invalid attempts', async () => {
    await assert.rejects(retry(async () => 1, { attempts: 0, baseMs: 1 }), RangeError);
  });
});

describe('withTimeout', () => {
  it('resolves when the promise is fast enough', async () => {
    assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
  });

  it('rejects with TimeoutError when too slow', async () => {
    await assert.rejects(withTimeout(sleep(100), 10), TimeoutError);
  });
});

describe('limitConcurrency', () => {
  it('never runs more than the limit at once and keeps every result', async () => {
    const limit = limitConcurrency(2);
    let active = 0;
    let peak = 0;
    const task = (value: number) => async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
      return value;
    };
    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => limit(task(n))));
    assert.deepEqual(results, [1, 2, 3, 4, 5]);
    assert.equal(peak, 2);
  });

  it('keeps going after a task fails', async () => {
    const limit = limitConcurrency(1);
    await assert.rejects(
      limit(async () => Promise.reject(new Error('boom'))),
      /boom/,
    );
    assert.equal(await limit(async () => 'after'), 'after');
  });

  it('rejects invalid concurrency', () => {
    assert.throws(() => limitConcurrency(0), RangeError);
  });
});

describe('chunk', () => {
  it('splits into groups with a smaller last group', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(chunk([], 3), []);
  });

  it('rejects a size below 1', () => {
    assert.throws(() => chunk([1], 0), RangeError);
  });
});

describe('groupBy', () => {
  it('groups by the returned key', () => {
    assert.deepEqual(groupBy(['apple', 'avocado', 'banana'], (word) => word[0]!), {
      a: ['apple', 'avocado'],
      b: ['banana'],
    });
  });
});
