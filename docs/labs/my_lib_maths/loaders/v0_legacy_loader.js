import { BaseLoader } from './base_loader.js';
import '../_generated/wasm_exec.js';

// Loader for standard Go (syscall/js) legacy targets
export class V0LegacyLoader extends BaseLoader {
  constructor(binaryName, hostAdapter) {
    super(binaryName, hostAdapter);
  }

  async instantiateModule() {
    const wasmUrl = new URL('../_generated/' + this.binaryName, import.meta.url);
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const bytes = await this.hostAdapter.readBytes(wasmUrl);
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const fetchDuration = t1 - t0;

    // Use global Go helper class provided by wasm_exec.js
    const go = new globalThis.Go();
    
    const t2 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const result = await WebAssembly.instantiate(bytes, go.importObject);
    const t3 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const compileDuration = t3 - t2;

    go.run(result.instance);

    const exportsProxy = {
      Add: (a, b) => globalThis.goAdd(Number(a), Number(b)),
      ComputeSequence: (u0, b, n) => globalThis.goComputeSequence(Number(u0), Number(b), Number(n)),
      IsPrime: (n) => globalThis.goIsPrime(Number(n)),
      CountPrimes: (limit, start = 2) => globalThis.goCountPrimes(Number(limit), Number(start)),
      ConcurrentCountPrimes: (limit, workers) => globalThis.goConcurrentCountPrimes(Number(limit), Number(workers)),
      FindLastPrime: (limit) => globalThis.goFindLastPrime(Number(limit)),
      Fibonacci: (n) => globalThis.goFibonacci(Number(n)),
      FibonacciRecursive: (n) => globalThis.goFibonacciRecursive(Number(n))
    };

    return {
      exports: exportsProxy,
      byteSize: bytes.byteLength,
      fetchDuration,
      compileDuration
    };
  }
}
