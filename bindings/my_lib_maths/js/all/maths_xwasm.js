// Pure JavaScript / WebAssembly hybrid implementations of Ouvrage Math workloads.
// Loops and scheduling are handled in JS, while mathematical primitives are delegated to WASM.
// Shared across Node.js CLI benchmarks and Web Browser Studio HTML pages.

export async function xwasmComputeSequence(driver, u0, b, n) {
  let curr = BigInt(u0);
  const step = BigInt(b);
  const count = BigInt(n);
  for (let i = 0n; i < count; i++) {
    const res = driver.add(curr, step);
    curr = (res instanceof Promise) ? await res : res;
  }
  return curr;
}

export async function xwasmFindLastPrime(driver, limit) {
  let last = 0n;
  const max = BigInt(limit);
  for (let i = 2n; i <= max; i++) {
    const res = driver.isPrime(i);
    const isP = (res instanceof Promise) ? await res : res;
    if (isP) {
      last = i;
    }
  }
  return last;
}

export async function xwasmConcurrentCountPrimes(driver, limit, workers) {
  const max = BigInt(limit);
  if (max < 2n) return 0n;
  const numWorkers = Math.max(1, workers);
  const chunkSize = (max - 1n) / BigInt(numWorkers);
  const tasks = [];

  for (let w = 0; w < numWorkers; w++) {
    const start = 2n + BigInt(w) * chunkSize;
    const end = (w === numWorkers - 1) ? max : (start + chunkSize - 1n);
    tasks.push((async () => {
      const res = driver.countPrimes(end, start);
      return (res instanceof Promise) ? BigInt(await res) : BigInt(res);
    })());
  }

  const results = await Promise.all(tasks);
  return results.reduce((acc, curr) => acc + curr, 0n);
}

export async function xwasmFibonacci(driver, n) {
  const term = BigInt(n);
  if (term <= 0n) return 0n;
  if (term === 1n) return 1n;
  let a = 0n, b = 1n;
  for (let i = 2n; i <= term; i++) {
    const nextRes = driver.add(a, b);
    const next = (nextRes instanceof Promise) ? await nextRes : nextRes;
    a = b;
    b = next;
  }
  return b;
}

export async function xwasmFibonacciRecursive(driver, n) {
  const term = BigInt(n);
  async function recurse(t) {
    if (t <= 0n) return 0n;
    if (t === 1n) return 1n;
    const left = await recurse(t - 1n);
    const right = await recurse(t - 2n);
    const res = driver.add(left, right);
    return (res instanceof Promise) ? await res : res;
  }
  return recurse(term);
}
