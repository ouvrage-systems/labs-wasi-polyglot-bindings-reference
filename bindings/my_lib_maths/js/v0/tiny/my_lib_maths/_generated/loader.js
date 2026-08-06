let wasmMemory;
const exportsPromises = {};
let wasmByteSize = 0;
let wasmFetchDuration = 0;
let wasmCompileDuration = 0;
const cachedWasmBytesMap = {};

const mockWasiEnv = {
  proc_exit: (code) => {
    console.warn(`WASM Go called exit with code: ${code}`);
  },
  fd_write: (fd, iovs, iovs_len, nwritten) => {
    // Mock stdout (returns 0 = success)
    return 0;
  },
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

const importObject = {
  wasi_snapshot_preview1: mockWasiEnv
};

async function fetchBytes(wasmUrl) {
  const key = wasmUrl.toString();
  if (cachedWasmBytesMap[key]) return cachedWasmBytesMap[key];
  
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  if (typeof window !== 'undefined' || (wasmUrl.protocol !== 'file:' && typeof fetch === 'function')) {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    wasmFetchDuration = (t1 - t0);
    wasmByteSize = bytes.byteLength;
    cachedWasmBytesMap[key] = bytes;
    return bytes;
  }

  const fs = await import('node:fs');
  const bytes = fs.readFileSync(wasmUrl);
  const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmFetchDuration = (t1 - t0);
  wasmByteSize = bytes.byteLength;
  cachedWasmBytesMap[key] = bytes;
  return bytes;
}

async function loadWasmInstance(wasmUrl) {
  const bytes = await fetchBytes(wasmUrl);
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const { instance } = await WebAssembly.instantiate(bytes, importObject);
  const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmCompileDuration = (t1 - t0);
  return instance;
}

function getExports(binaryName = 'my_lib_maths.wasm') {
  if (exportsPromises[binaryName]) {
    return exportsPromises[binaryName];
  }

  const wasmUrl = new URL(binaryName, import.meta.url);
  exportsPromises[binaryName] = loadWasmInstance(wasmUrl).then((instance) => {
    wasmMemory = instance.exports.memory;
    return instance.exports;
  });

  return exportsPromises[binaryName];
}

export async function callWithBinary(binaryName, funcName, ...args) {
  const exports = await getExports(binaryName);
  if (!exports[funcName]) {
    throw new Error(`Exported function ${funcName} not found in WASM module ${binaryName}`);
  }
  return exports[funcName](...args);
}

export async function callColdWithBinary(binaryName, funcName, ...args) {
  const wasmUrl = new URL(binaryName, import.meta.url);
  const instance = await loadWasmInstance(wasmUrl);
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
