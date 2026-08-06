// Pure JavaScript implementations of Ouvrage Math workloads.
// Shared across Node.js CLI benchmarks and Web Browser Studio HTML pages.

export function jsAdd(a, b) {
  return BigInt(a) + BigInt(b);
}

export function jsComputeSequence(u0, b, n) {
  let curr = BigInt(u0);
  const step = BigInt(b);
  const count = BigInt(n);
  for (let i = 0n; i < count; i++) {
    curr += step;
  }
  return curr;
}

export function jsIsPrime(n) {
  const val = BigInt(n);
  if (val <= 1n) return false;
  if (val <= 3n) return true;
  if (val % 2n === 0n || val % 3n === 0n) return false;
  for (let i = 5n; i * i <= val; i += 6n) {
    if (val % i === 0n || val % (i + 2n) === 0n) return false;
  }
  return true;
}

export function jsCountPrimes(limit) {
  let count = 0n;
  const max = BigInt(limit);
  for (let i = 2n; i <= max; i++) {
    if (jsIsPrime(i)) count++;
  }
  return count;
}

export async function jsConcurrentCountPrimes(limit, workers = 4, onProgress = null) {
  const max = BigInt(limit);
  const numWorkers = Math.max(1, workers);
  const chunkSize = (max - 1n) / BigInt(numWorkers);
  const tasks = [];

  for (let w = 0; w < numWorkers; w++) {
    const start = 2n + BigInt(w) * chunkSize;
    const end = (w === numWorkers - 1) ? max : (start + chunkSize - 1n);
    tasks.push((async () => {
      let count = 0n;
      for (let i = start; i <= end; i++) {
        if (jsIsPrime(i)) count++;
      }
      return count;
    })());
  }

  const results = await Promise.all(tasks);
  const total = results.reduce((acc, curr) => acc + curr, 0n);
  if (onProgress) onProgress(total, numWorkers);
  return total;
}

export function jsFindLastPrime(limit) {
  let last = 0n;
  const max = BigInt(limit);
  for (let i = 2n; i <= max; i++) {
    if (jsIsPrime(i)) last = i;
  }
  return last;
}

export function jsFibonacciIterative(n) {
  const term = BigInt(n);
  if (term <= 0n) return 0n;
  if (term === 1n) return 1n;
  let a = 0n, b = 1n;
  for (let i = 2n; i <= term; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

export function jsFibonacciRecursive(n) {
  const term = BigInt(n);
  if (term <= 0n) return 0n;
  if (term === 1n) return 1n;
  return jsFibonacciRecursive(term - 1n) + jsFibonacciRecursive(term - 2n);
}
