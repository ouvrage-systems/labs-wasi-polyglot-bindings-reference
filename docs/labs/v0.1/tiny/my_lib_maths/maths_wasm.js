import { callWithBinary, callColdWithBinary, getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration } from './loader_wasm.js';

function normalizeResult(res) {
  if (typeof res === 'bigint') {
    if (res >= BigInt(Number.MIN_SAFE_INTEGER) && res <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(res);
    }
  }
  return res;
}

export async function wasmAdd(a, b, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'Add', BigInt(a), BigInt(b));
  return normalizeResult(res);
}

export async function wasmColdAdd(a, b, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'Add', BigInt(a), BigInt(b));
  return normalizeResult(res);
}

export async function wasmComputeSequence(u0, b, n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'ComputeSequence', BigInt(u0), BigInt(b), BigInt(n));
  return normalizeResult(res);
}

export async function wasmIsPrime(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'IsPrime', BigInt(n));
  return res !== 0 && res !== false;
}

export async function wasmIsPrimeCold(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'IsPrime', BigInt(n));
  return res !== 0 && res !== false;
}

export async function wasmCountPrimes(limit, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'CountPrimes', BigInt(limit));
  return normalizeResult(res);
}

export async function wasmConcurrentCountPrimes(limit, numWorkers = 4, targetBinary = 'my_lib_maths_asyncify.wasm') {
  const res = await callWithBinary(targetBinary, 'ConcurrentCountPrimes', BigInt(limit), numWorkers);
  return normalizeResult(res);
}

export async function wasmFindLastPrime(limit, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'FindLastPrime', BigInt(limit));
  return normalizeResult(res);
}

export async function wasmFibonacci(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'Fibonacci', BigInt(n));
  return normalizeResult(res);
}

export async function wasmFibonacciRecursive(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callWithBinary(targetBinary, 'FibonacciRecursive', BigInt(n));
  return normalizeResult(res);
}

export async function wasmFibonacciRecursiveCold(n, targetBinary = 'my_lib_maths.wasm') {
  const res = await callColdWithBinary(targetBinary, 'FibonacciRecursive', BigInt(n));
  return normalizeResult(res);
}

export { getWasmByteSize, getWasmFetchDuration, getWasmCompileDuration };
