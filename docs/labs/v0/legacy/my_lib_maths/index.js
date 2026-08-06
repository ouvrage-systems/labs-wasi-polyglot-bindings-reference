import { callLegacy, getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration } from './_generated/loader.js';

function normalizeResult(res) {
  if (typeof res === 'bigint') {
    if (res >= BigInt(Number.MIN_SAFE_INTEGER) && res <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(res);
    }
  }
  return res;
}

export async function add(a, b) {
  const res = await callLegacy('goAdd', Number(a), Number(b));
  return normalizeResult(res);
}

export async function computeSequence(u0, b, n) {
  const res = await callLegacy('goComputeSequence', Number(u0), Number(b), Number(n));
  return normalizeResult(res);
}

export async function isPrime(n) {
  const res = await callLegacy('goIsPrime', Number(n));
  return res !== 0 && res !== false;
}

export async function countPrimes(limit) {
  const res = await callLegacy('goCountPrimes', Number(limit));
  return normalizeResult(res);
}

export async function concurrentCountPrimes(limit, numWorkers = 4) {
  const res = await callLegacy('goConcurrentCountPrimes', Number(limit), Number(numWorkers));
  return normalizeResult(res);
}

export async function findLastPrime(limit) {
  const res = await callLegacy('goFindLastPrime', Number(limit));
  return normalizeResult(res);
}

export async function fibonacci(n) {
  const res = await callLegacy('goFibonacci', Number(n));
  return normalizeResult(res);
}

export async function fibonacciRecursive(n) {
  const res = await callLegacy('goFibonacciRecursive', Number(n));
  return normalizeResult(res);
}

export { getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration };
