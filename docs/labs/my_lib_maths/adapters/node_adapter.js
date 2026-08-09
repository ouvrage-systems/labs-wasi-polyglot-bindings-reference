import { BaseAdapter } from './base_adapter.js';
import { createRequire } from 'node:module';

// Polyfill node:crypto synchronously at load time to support browser-targeted legacy Go wrappers
if (typeof globalThis.crypto === 'undefined') {
  const require = createRequire(import.meta.url);
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto;
}

// Node.js Host Adapter implementing filesystem reading and official Node WASI Preview 1
export class NodeAdapter extends BaseAdapter {
  constructor() {
    super('Node.js System Host', 'node');
    this.wasiRegistry = new Map();
  }

  // Read binary bytes synchronously from local file system
  async readBytes(url) {
    const fs = await import('node:fs');
    try {
      return fs.readFileSync(url);
    } catch (err) {
      if (err.code === 'ENOENT') {
        const path = await import('node:path');
        const fileUrl = url instanceof URL ? url : new URL(url);
        const logPath = path.join(path.dirname(fileUrl.pathname), 'build.log');
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8').trim();
          throw new Error(`TinyGo compilation failed static analysis:\n${logContent}`);
        }
      }
      throw err;
    }
  }

  // Instantiate and return Node WASI imports
  getWasiImports(wasmModule, binaryName) {
    const require = createRequire(import.meta.url);
    const { WASI } = require('node:wasi');
    
    const wasi = new WASI({
      version: 'preview1',
      args: [binaryName],
      env: process.env
    });

    const imports = wasi.getImports ? wasi.getImports(wasmModule) : { wasi_snapshot_preview1: wasi.wasiImport };
    
    // Intercept proc_exit to prevent WASI from shutting down the host Node process
    if (imports.wasi_snapshot_preview1) {
      imports.wasi_snapshot_preview1.proc_exit = (code) => {
        const err = new Error(`wasi_exit:${code}`);
        err.wasiExitCode = code;
        throw err;
      };
    }

    // Register WASI instance associated with the imports key for later boot
    this.wasiRegistry.set(imports, wasi);
    return imports;
  }

  // Boot WASI runtime loop
  start(instance, imports) {
    const wasi = this.wasiRegistry.get(imports);
    if (wasi) {
      try {
        if (instance.exports._initialize) {
          wasi.initialize(instance);
        } else {
          wasi.start(instance);
        }
      } catch (e) {
        if (e.wasiExitCode !== 0) {
          throw e;
        }
      } finally {
        this.wasiRegistry.delete(imports);
      }
    }
  }
}
