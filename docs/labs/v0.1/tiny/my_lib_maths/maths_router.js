import * as jsMaths from './maths_native.js';
import * as wasmMaths from './maths_wasm.js';

export async function getMathsImplementation(mode) {
  if (mode === 'H') {
    return {
      add: jsMaths.jsAdd,
      addCold: jsMaths.jsAdd,
      computeSequence: jsMaths.jsComputeSequence,
      isPrime: jsMaths.jsIsPrime,
      isPrimeCold: jsMaths.jsIsPrime,
      countPrimes: jsMaths.jsCountPrimes,
      concurrentCountPrimes: jsMaths.jsConcurrentCountPrimes,
      findLastPrime: jsMaths.jsFindLastPrime,
      fibonacci: jsMaths.jsFibonacciIterative,
      fibonacciRecursive: jsMaths.jsFibonacciRecursive,
      fibonacciRecursiveCold: jsMaths.jsFibonacciRecursive,
      getWasmByteSize: async () => 0,
      getWasmFetchDuration: async () => 0,
      getWasmCompileDuration: async () => 0
    };
  } else if (mode === 'A' || mode === 'B' || mode === 'A1' || mode === 'B1') {
    const binaryName = (mode === 'B' || mode === 'B1') ? 'my_lib_maths_asyncify.wasm' : 'my_lib_maths.wasm';
    return {
      add: (a, b) => wasmMaths.wasmAdd(a, b, binaryName),
      addCold: (a, b) => wasmMaths.wasmColdAdd(a, b, binaryName),
      computeSequence: (u0, b, n) => wasmMaths.wasmComputeSequence(u0, b, n, binaryName),
      isPrime: (n) => wasmMaths.wasmIsPrime(n, binaryName),
      isPrimeCold: (n) => wasmMaths.wasmIsPrimeCold(n, binaryName),
      countPrimes: (limit) => wasmMaths.wasmCountPrimes(limit, binaryName),
      concurrentCountPrimes: (limit, numWorkers) => wasmMaths.wasmConcurrentCountPrimes(limit, numWorkers, binaryName),
      findLastPrime: (limit) => wasmMaths.wasmFindLastPrime(limit, binaryName),
      fibonacci: (n) => wasmMaths.wasmFibonacci(n, binaryName),
      fibonacciRecursive: (n) => wasmMaths.wasmFibonacciRecursive(n, binaryName),
      fibonacciRecursiveCold: (n) => wasmMaths.wasmFibonacciRecursiveCold(n, binaryName),
      getWasmByteSize: () => wasmMaths.getWasmByteSize(binaryName),
      getWasmFetchDuration: () => wasmMaths.getWasmFetchDuration(),
      getWasmCompileDuration: () => wasmMaths.getWasmCompileDuration()
    };
  }
  throw new Error(`Unsupported mode ${mode} inside v0.1/tiny maths_router`);
}
