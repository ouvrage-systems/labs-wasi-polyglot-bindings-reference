// world root:component/root
export type * as WasiCliEnvironment020 from './interfaces/wasi-cli-environment.js'; // import wasi:cli/environment@0.2.0
export type * as WasiCliExit020 from './interfaces/wasi-cli-exit.js'; // import wasi:cli/exit@0.2.0
export type * as WasiCliStderr020 from './interfaces/wasi-cli-stderr.js'; // import wasi:cli/stderr@0.2.0
export type * as WasiCliStdin020 from './interfaces/wasi-cli-stdin.js'; // import wasi:cli/stdin@0.2.0
export type * as WasiCliStdout020 from './interfaces/wasi-cli-stdout.js'; // import wasi:cli/stdout@0.2.0
export type * as WasiClocksMonotonicClock020 from './interfaces/wasi-clocks-monotonic-clock.js'; // import wasi:clocks/monotonic-clock@0.2.0
export type * as WasiClocksWallClock020 from './interfaces/wasi-clocks-wall-clock.js'; // import wasi:clocks/wall-clock@0.2.0
export type * as WasiFilesystemPreopens020 from './interfaces/wasi-filesystem-preopens.js'; // import wasi:filesystem/preopens@0.2.0
export type * as WasiFilesystemTypes020 from './interfaces/wasi-filesystem-types.js'; // import wasi:filesystem/types@0.2.0
export type * as WasiIoError020 from './interfaces/wasi-io-error.js'; // import wasi:io/error@0.2.0
export type * as WasiIoPoll020 from './interfaces/wasi-io-poll.js'; // import wasi:io/poll@0.2.0
export type * as WasiIoStreams020 from './interfaces/wasi-io-streams.js'; // import wasi:io/streams@0.2.0
export type * as WasiRandomRandom020 from './interfaces/wasi-random-random.js'; // import wasi:random/random@0.2.0
export function add(a: bigint, b: bigint): bigint;
export function computeSequence(u0: bigint, b: bigint, n: bigint): bigint;
export function isPrime(n: bigint): boolean;
export function countPrimes(limit: bigint, start: bigint): bigint;
export function findLastPrime(limit: bigint): bigint;
export function concurrentCountPrimes(limit: bigint, workers: number): bigint;
export function fibonacci(n: bigint): bigint;
export function fibonacciRecursive(n: bigint): bigint;

export const $init: Promise<void>;
