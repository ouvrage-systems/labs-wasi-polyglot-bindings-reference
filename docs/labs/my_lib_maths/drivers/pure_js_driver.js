import { BaseDriver } from './base_driver.js';
import * as jsMaths from '../maths_native.js';

// Host Native baseline JavaScript driver (hot methods run synchronously for zero-overhead FFI comparisons)
export class PureJsDriver extends BaseDriver {
  constructor() {
    super('Pure Host Native (V8 JIT) [h.N.h.N.N.0]', 'h.N.h.N.N.0');
  }

  async init() {
    return Promise.resolve();
  }

  // Purely synchronous hot FFI addition
  add(a, b) {
    return this.normalizeResult(jsMaths.nativeAdd(a, b));
  }

  async addCold(a, b) {
    return this.normalizeResult(jsMaths.nativeAdd(a, b));
  }

  computeSequence(u0, b, n) {
    return this.normalizeResult(jsMaths.nativeComputeSequence(u0, b, n));
  }

  isPrime(n) {
    return jsMaths.nativeIsPrime(n);
  }

  async isPrimeCold(n) {
    return jsMaths.nativeIsPrime(n);
  }

  countPrimes(limit) {
    return this.normalizeResult(jsMaths.nativeCountPrimes(limit));
  }

  // Concurrent primes spawning worker threads remains asynchronous by definition
  async concurrentCountPrimes(limit, workers) {
    return this.normalizeResult(await jsMaths.nativeConcurrentCountPrimes(limit, workers));
  }

  findLastPrime(limit) {
    return this.normalizeResult(jsMaths.nativeFindLastPrime(limit));
  }

  fibonacci(n) {
    return this.normalizeResult(jsMaths.nativeFibonacciIterative(n));
  }

  fibonacciRecursive(n) {
    return this.normalizeResult(jsMaths.nativeFibonacciRecursive(n));
  }

  async fibonacciRecursiveCold(n) {
    return this.normalizeResult(jsMaths.nativeFibonacciRecursive(n));
  }
}
