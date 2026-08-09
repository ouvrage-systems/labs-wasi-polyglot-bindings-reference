import { BaseDriver } from './base_driver.js';
import * as jsMaths from '../maths_native.js';

// Host Native baseline JavaScript driver (hot methods run synchronously for zero-overhead FFI comparisons)
export class PureJsDriver extends BaseDriver {
  constructor() {
    super('Pure Host Native (V8 JIT) [H]', 'H');
  }

  async init() {
    return Promise.resolve();
  }

  // Purely synchronous hot FFI addition
  add(a, b) {
    return this.normalizeResult(jsMaths.jsAdd(a, b));
  }

  async addCold(a, b) {
    return this.normalizeResult(jsMaths.jsAdd(a, b));
  }

  computeSequence(u0, b, n) {
    return this.normalizeResult(jsMaths.jsComputeSequence(u0, b, n));
  }

  isPrime(n) {
    return jsMaths.jsIsPrime(n);
  }

  async isPrimeCold(n) {
    return jsMaths.jsIsPrime(n);
  }

  countPrimes(limit) {
    return this.normalizeResult(jsMaths.jsCountPrimes(limit));
  }

  // Concurrent primes spawning worker threads remains asynchronous by definition
  async concurrentCountPrimes(limit, workers) {
    return this.normalizeResult(await jsMaths.jsConcurrentCountPrimes(limit, workers));
  }

  findLastPrime(limit) {
    return this.normalizeResult(jsMaths.jsFindLastPrime(limit));
  }

  fibonacci(n) {
    return this.normalizeResult(jsMaths.jsFibonacciIterative(n));
  }

  fibonacciRecursive(n) {
    return this.normalizeResult(jsMaths.jsFibonacciRecursive(n));
  }

  async fibonacciRecursiveCold(n) {
    return this.normalizeResult(jsMaths.jsFibonacciRecursive(n));
  }
}
