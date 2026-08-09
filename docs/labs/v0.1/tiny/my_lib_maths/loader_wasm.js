let wasmMemory;
const exportsPromises = {};
let wasmByteSize = 0;
let wasmFetchDuration = 0;
let wasmCompileDuration = 0;
const cachedWasmBytesMap = {};

// Helper to fetch or read WASM binary bytes depending on the platform (Node vs Browser)
async function fetchBytes(wasmUrl) {
  const key = wasmUrl.toString();
  if (cachedWasmBytesMap[key]) return cachedWasmBytesMap[key];

  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  
  // Browser check (or fetch supported environments)
  if (typeof window !== 'undefined' || (wasmUrl.protocol !== 'file:' && typeof fetch === 'function')) {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    wasmFetchDuration = (t1 - t0);
    wasmByteSize = bytes.byteLength;
    cachedWasmBytesMap[key] = bytes;
    return bytes;
  }

  // Node.js environment: dynamic import to prevent browser bundling issues
  const fs = await import('node:fs');
  const bytes = fs.readFileSync(wasmUrl);
  const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmFetchDuration = (t1 - t0);
  wasmByteSize = bytes.byteLength;
  cachedWasmBytesMap[key] = bytes;
  return bytes;
}

// Instantiate WASM module, dynamically resolving standard WASI on Node.js
async function loadWasmInstance(wasmUrl, binaryName) {
  const bytes = await fetchBytes(wasmUrl);
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  
  // Compile the module structure
  const wasmModule = await WebAssembly.compile(bytes);
  let instance;

  if (typeof window !== 'undefined') {
    // 1. Browser: Inject fallback mock WASI snapshot preview1 environment
    const mockWasi = {
      proc_exit: (code) => console.warn(`WASM exit called: ${code}`),
      fd_write: (fd, iovs, iovs_len, nwritten) => 0,
      random_get: (buf, buf_len) => {
        if (wasmMemory) {
          const array = new Uint8Array(wasmMemory.buffer, buf, buf_len);
          if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
          }
        }
        return 0;
      }
    };
    instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: mockWasi
    });
    wasmMemory = instance.exports.memory;
  } else {
    // 2. Node.js: Dynamic load and initialization of the official WASI context
    const { WASI } = await import('node:wasi');
    const wasi = new WASI({
      version: 'preview1',
      args: [binaryName],
      env: process.env
    });

    const imports = wasi.getImports(wasmModule);
    instance = await WebAssembly.instantiate(wasmModule, imports);
    wasmMemory = instance.exports.memory;

    // Boot WASI runtime lifecycle (runs main entry point internally to init Go runtime)
    wasi.start(instance);
  }

  const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmCompileDuration = (t1 - t0);
  return instance;
}

// Retrieve cached module exports
function getExports(binaryName = 'my_lib_maths.wasm') {
  if (exportsPromises[binaryName]) {
    return exportsPromises[binaryName];
  }

  const wasmUrl = new URL('./_generated/' + binaryName, import.meta.url);
  exportsPromises[binaryName] = loadWasmInstance(wasmUrl, binaryName).then((instance) => {
    wasmMemory = instance.exports.memory;
    return instance.exports;
  });

  return exportsPromises[binaryName];
}

// Exported dynamic wrapper functions
export async function callWithBinary(binaryName, funcName, ...args) {
  const exports = await getExports(binaryName);
  if (!exports[funcName]) {
    throw new Error(`Exported function ${funcName} not found in WASM module ${binaryName}`);
  }
  return exports[funcName](...args);
}

export async function callColdWithBinary(binaryName, funcName, ...args) {
  const wasmUrl = new URL('./_generated/' + binaryName, import.meta.url);
  const instance = await loadWasmInstance(wasmUrl, binaryName);
  if (!instance.exports[funcName]) {
    throw new Error(`Exported function ${funcName} not found in WASM module ${binaryName}`);
  }
  return instance.exports[funcName](...args);
}

export async function call(funcName, ...args) {
  return callWithBinary('my_lib_maths.wasm', funcName, ...args);
}

export async function callCold(funcName, ...args) {
  return callColdWithBinary('my_lib_maths.wasm', funcName, ...args);
}

export async function getWasmByteSize(binaryName = 'my_lib_maths.wasm') {
  await getExports(binaryName);
  return wasmByteSize;
}

export async function getWasmFetchDuration() {
  await getExports();
  return wasmFetchDuration;
}

export async function getWasmCompileDuration() {
  await getExports();
  return wasmCompileDuration;
}
