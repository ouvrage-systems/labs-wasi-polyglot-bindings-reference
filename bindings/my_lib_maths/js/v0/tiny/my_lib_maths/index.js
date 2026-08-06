import { callWithBinary, callColdWithBinary, getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration } from './_generated/loader.js';

function normalizeResult(res) {
  if (typeof res === 'bigint') {
    if (res >= BigInt(Number.MIN_SAFE_INTEGER) && res <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(res);
    }
  }
  return res;
}

export async function add(a, b, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'Add', BigInt(a), BigInt(b));
  return normalizeResult(res);
}

export async function addCold(a, b, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'Add', BigInt(a), BigInt(b));
  return normalizeResult(res);
}

export async function computeSequence(u0, b, n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'ComputeSequence', BigInt(u0), BigInt(b), BigInt(n));
  return normalizeResult(res);
}

export async function isPrime(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'IsPrime', BigInt(n));
  return res !== 0 && res !== false;
}

export async function isPrimeCold(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'IsPrime', BigInt(n));
  return res !== 0 && res !== false;
}

export async function countPrimes(limit, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'CountPrimes', BigInt(limit));
  return normalizeResult(res);
}

export async function concurrentCountPrimes(limit, numWorkers = 4, targetBinary = 'my_lib_maths_asyncify.wasm') {
  const res = await callWithBinary(targetBinary, 'ConcurrentCountPrimes', BigInt(limit), numWorkers);
  return normalizeResult(res);
}

export async function findLastPrime(limit, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'FindLastPrime', BigInt(limit));
  return normalizeResult(res);
}

export async function fibonacci(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'Fibonacci', BigInt(n));
  return normalizeResult(res);
}

export async function fibonacciRecursive(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'FibonacciRecursive', BigInt(n));
  return normalizeResult(res);
}

export async function fibonacciRecursiveCold(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'FibonacciRecursive', BigInt(n));
  return normalizeResult(res);
}

export { getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration };
