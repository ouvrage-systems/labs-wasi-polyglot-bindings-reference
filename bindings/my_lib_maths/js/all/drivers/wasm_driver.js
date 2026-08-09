import { BaseDriver } from './base_driver.js';

// Generic WebAssembly driver exposing synchronous hot math calls directly from cached exports
export class WasmDriver extends BaseDriver {
  constructor(name, id, loader) {
    super(name, id);
    this.loader = loader;
    this.exports = null;
  }

  async init() {
    this.exports = await this.loader.getExports();
    return this.exports;
  }

  // Synchronous hot FFI addition (no Promise overhead)
  add(a, b) {
    return this.normalizeResult(this.exports.Add(BigInt(a), BigInt(b)));
  }

  async addCold(a, b) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.Add(BigInt(a), BigInt(b)));
  }

  computeSequence(u0, b, n) {
    return this.normalizeResult(this.exports.ComputeSequence(BigInt(u0), BigInt(b), BigInt(n)));
  }

  isPrime(n) {
    const res = this.exports.IsPrime(BigInt(n));
    return res !== 0 && res !== false;
  }

  async isPrimeCold(n) {
    const exports = await this.loader.instantiateCold();
    const res = exports.IsPrime(BigInt(n));
    return res !== 0 && res !== false;
  }

  countPrimes(limit, start = 2) {
    return this.normalizeResult(this.exports.CountPrimes(BigInt(limit), BigInt(start)));
  }

  async countPrimesCold(limit, start = 2) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.CountPrimes(BigInt(limit), BigInt(start)));
  }

  // Concurrent primes testing requires asynchronous worker threads
  async concurrentCountPrimes(limit, workers) {
    return this.normalizeResult(await this.exports.ConcurrentCountPrimes(BigInt(limit), workers));
  }

  async concurrentCountPrimesCold(limit, workers) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.ConcurrentCountPrimes(BigInt(limit), workers));
  }

  findLastPrime(limit) {
    return this.normalizeResult(this.exports.FindLastPrime(BigInt(limit)));
  }

  async findLastPrimeCold(limit) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.FindLastPrime(BigInt(limit)));
  }

  fibonacci(n) {
    return this.normalizeResult(this.exports.Fibonacci(BigInt(n)));
  }

  async fibonacciCold(n) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.Fibonacci(BigInt(n)));
  }

  fibonacciRecursive(n) {
    return this.normalizeResult(this.exports.FibonacciRecursive(BigInt(n)));
  }

  async fibonacciRecursiveCold(n) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.FibonacciRecursive(BigInt(n)));
  }

  getByteSize() {
    return this.loader.getByteSize();
  }

  getFetchDuration() {
    return this.loader.getFetchDuration();
  }

  getCompileDuration() {
    return this.loader.getCompileDuration();
  }
}
