# async-kit

[![CI](https://github.com/amirmiller-22/async-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/amirmiller-22/async-kit/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Tiny, dependency-free TypeScript helpers for async code. Six functions, fully typed, tested with `node:test`.

## Use

Copy `src/index.ts` into your project, or clone the repo and build it.

```ts
import { retry, withTimeout, limitConcurrency, chunk, groupBy, sleep } from './index.js';

// Retry a flaky call with exponential backoff (200ms, 400ms, 800ms)
const data = await retry(() => fetchJson(url), { attempts: 4, baseMs: 200 });

// Fail fast instead of hanging
const result = await withTimeout(fetchJson(url), 5_000); // throws TimeoutError

// Run at most 3 tasks at once
const limit = limitConcurrency(3);
const pages = await Promise.all(urls.map((u) => limit(() => fetchJson(u))));

// Batch work
for (const batch of chunk(ids, 100)) await processBatch(batch);

// Group items
const byType = groupBy(events, (e) => e.type);
```

## API

| Function | What it does |
| --- | --- |
| `sleep(ms)` | Resolves after `ms` milliseconds |
| `withTimeout(promise, ms)` | Rejects with `TimeoutError` if the promise is too slow |
| `retry(fn, { attempts, baseMs, shouldRetry? })` | Retries failures with exponential backoff; `shouldRetry` can stop early |
| `limitConcurrency(n)` | Returns a runner that keeps at most `n` tasks in flight |
| `chunk(items, size)` | Splits an array into groups of at most `size` |
| `groupBy(items, getKey)` | Groups items into a record by key |

## Develop

```bash
npm install
npm test
```

## License

MIT
