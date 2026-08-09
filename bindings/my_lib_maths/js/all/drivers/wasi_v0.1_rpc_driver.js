import { BaseDriver } from './base_driver.js';

// WASI Preview 1 Subprocess JSON-RPC IPC Driver (v0.1)
export class WasiV01RpcDriver extends BaseDriver {
  constructor(name, id, loader) {
    super(name, id);
    this.loader = loader;
    this.meta = null;
  }

  async init() {
    this.meta = await this.loader.getExports(); // Resolves binaryPath and byteSize
  }

  async _callRpc(method, params) {
    const { spawn } = await import('node:child_process');
    const { binaryPath } = this.meta;

    const runnerScript = `
      const { WASI } = require("wasi");
      const fs = require("fs");
      const wasi = new WASI({ version: "preview1" });
      WebAssembly.instantiate(fs.readFileSync(process.argv[1]), { wasi_snapshot_preview1: wasi.wasiImport })
        .then(({ instance }) => wasi.start(instance))
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    `;

    return new Promise((resolve, reject) => {
      const child = spawn('node', ['-e', runnerScript, binaryPath]);
      let stdoutData = '';
      let stderrData = '';

      child.stdin.write(JSON.stringify({ method, params, id: 1 }));
      child.stdin.end();

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        const str = data.toString();
        if (!str.includes("ExperimentalWarning")) {
          stderrData += str;
        }
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`WASM RPC process exited with code ${code}. Stderr: ${stderrData}`));
        }
        try {
          const response = JSON.parse(stdoutData.trim());
          if (response.error) {
            return reject(new Error(`WASM RPC Error: ${response.error}`));
          }
          resolve(response.result);
        } catch (err) {
          reject(new Error(`WASM RPC parse error: ${err.message}. Raw: ${stdoutData}`));
        }
      });
    });
  }

  async add(a, b) {
    return this.normalizeResult(await this._callRpc("maths.add", { a: Number(a), b: Number(b) }));
  }

  async addCold(a, b) {
    return this.add(a, b);
  }

  async computeSequence(u0, b, n) {
    return this.normalizeResult(await this._callRpc("maths.computeSequence", { u0: Number(u0), b: Number(b), n: Number(n) }));
  }

  async findLastPrime(limit) {
    return this.normalizeResult(await this._callRpc("maths.findLastPrime", { limit: Number(limit) }));
  }

  async findLastPrimeCold(limit) {
    return this.findLastPrime(limit);
  }

  async concurrentCountPrimes(limit, workers) {
    return this.normalizeResult(await this._callRpc("maths.concurrentCountPrimes", { limit: Number(limit), workers: Number(workers) }));
  }

  async concurrentCountPrimesCold(limit, workers) {
    return this.concurrentCountPrimes(limit, workers);
  }

  async fibonacci(n) {
    return this.normalizeResult(await this._callRpc("maths.fibonacci", { n: Number(n) }));
  }

  async fibonacciCold(n) {
    return this.fibonacci(n);
  }

  async fibonacciRecursive(n) {
    return this.normalizeResult(await this._callRpc("maths.fibonacciRecursive", { n: Number(n) }));
  }

  async fibonacciRecursiveCold(n) {
    return this.fibonacciRecursive(n);
  }

  getByteSize() {
    return this.loader.getByteSize();
  }

  getFetchDuration() {
    return 0;
  }

  getCompileDuration() {
    return 0;
  }
}
