/** @module Interface ouvrage:lab-wasi-demo/maths **/
export function add(a: bigint, b: bigint): bigint;
export function computeSequence(u0: bigint, b: bigint, n: bigint): bigint;
export function isPrime(n: bigint): boolean;
export function countPrimes(limit: bigint, start: bigint): bigint;
export function findLastPrime(limit: bigint): bigint;
export function concurrentCountPrimes(limit: bigint, workers: number): bigint;
export function fibonacci(n: bigint): bigint;
export function fibonacciRecursive(n: bigint): bigint;
