import { BaseDriver } from './base_driver.js';

// WASI Preview 2 Component Model Driver (v0.2-tiny)
export class WasiV02Driver extends BaseDriver {
  constructor(name, id, loader) {
    super(name, id);
    this.loader = loader;
    this.exports = null;
  }

  async init() {
    this.exports = await this.loader.getExports(); // Resolves the component.maths namespace
    return this.exports;
  }

  add(a, b) {
    return this.normalizeResult(this.exports.add(BigInt(a), BigInt(b)));
  }

  async addCold(a, b) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.add(BigInt(a), BigInt(b)));
  }

  computeSequence(u0, b, n) {
    return this.normalizeResult(this.exports.computeSequence(BigInt(u0), BigInt(b), BigInt(n)));
  }

  isPrime(n) {
    const res = this.exports.isPrime(BigInt(n));
    return res !== 0 && res !== false;
  }

  async isPrimeCold(n) {
    const exports = await this.loader.instantiateCold();
    const res = exports.isPrime(BigInt(n));
    return res !== 0 && res !== false;
  }

  countPrimes(limit, start = 2) {
    return this.normalizeResult(this.exports.countPrimes(BigInt(limit), BigInt(start)));
  }

  async countPrimesCold(limit, start = 2) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.countPrimes(BigInt(limit), BigInt(start)));
  }

  async concurrentCountPrimes(limit, workers) {
    return this.normalizeResult(await this.exports.concurrentCountPrimes(BigInt(limit), Number(workers)));
  }

  async concurrentCountPrimesCold(limit, workers) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.concurrentCountPrimes(BigInt(limit), Number(workers)));
  }

  findLastPrime(limit) {
    return this.normalizeResult(this.exports.findLastPrime(BigInt(limit)));
  }

  async findLastPrimeCold(limit) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.findLastPrime(BigInt(limit)));
  }

  fibonacci(n) {
    return this.normalizeResult(this.exports.fibonacci(BigInt(n)));
  }

  async fibonacciCold(n) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.fibonacci(BigInt(n)));
  }

  fibonacciRecursive(n) {
    return this.normalizeResult(this.exports.fibonacciRecursive(BigInt(n)));
  }

  async fibonacciRecursiveCold(n) {
    const exports = await this.loader.instantiateCold();
    return this.normalizeResult(exports.fibonacciRecursive(BigInt(n)));
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
