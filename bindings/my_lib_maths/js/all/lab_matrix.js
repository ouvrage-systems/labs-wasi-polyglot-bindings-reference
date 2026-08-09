import * as jsMaths from './maths_native.js';
import * as jsWasmMaths from './maths_jswasm.js';
import { setNomenclature, setHostAdapter } from './driver_manager.js';

let nomenclature = null;

// Load and decode nomenclature.json dynamically using the platform adapter
export async function initMatrix(hostAdapter) {
  setHostAdapter(hostAdapter);
  if (nomenclature) return;
  const url = new URL('./data/nomenclature.json', import.meta.url);
  const bytes = await hostAdapter.readBytes(url);
  const text = new TextDecoder().decode(bytes);
  nomenclature = JSON.parse(text);
  setNomenclature(nomenclature);
}

export function getToolchainName(code) {
  const target = nomenclature.targets.find(t => t.code === code);
  if (!target) return code;
  const ver = nomenclature.versions[target.version] || target.version;
  const comp = nomenclature.compilers[target.compiler] || target.compiler;
  const sched = nomenclature.schedulers[target.scheduler] || target.scheduler;
  if (target.compiler === 'native') {
    return `${ver} | ${comp}`;
  }
  return `${ver} | ${comp} (${sched})`;
}

export function getFunctionName(code) {
  return nomenclature.functions[code]?.name || code;
}

export function getFunctionFocus(code) {
  return nomenclature.functions[code]?.focus || '';
}

export function getMethodName(code) {
  return nomenclature.functions[code]?.method || '';
}

export function getPrimitive(code) {
  return nomenclature.functions[code]?.primitive || null;
}

export function getModeName(code) {
  return nomenclature.modes[code]?.name || code;
}

export function getModeDesc(code) {
  return nomenclature.modes[code]?.desc || '';
}

export function getMethods(code) {
  return nomenclature?.functions[code]?.methods || {};
}

export function getMathMetadata(code) {
  return nomenclature?.functions[code]?.math || { expression: '', mapping: '', explanation: '' };
}

// Return dynamic descriptor mapping inputs and defaults read directly from JSON metadata
export function getInputDescriptor(functionCode) {
  const fn = nomenclature.functions[functionCode];
  if (!fn || !fn.inputs) {
    throw new Error(`Invalid function code in matrix mapping: ${functionCode}`);
  }
  return {
    labelA: fn.inputs.A.label,
    labelB: fn.inputs.B.label,
    labelC: fn.inputs.C.label,
    disableA: fn.inputs.A.disable,
    disableB: fn.inputs.B.disable,
    disableC: fn.inputs.C.disable,
    defaultA: fn.inputs.A.default,
    defaultB: fn.inputs.B.default,
    defaultC: fn.inputs.C.default
  };
}

// Internal helper to route and execute the function workload based on target configuration
async function _executeTarget(driver, route, fn, args, modeCode) {
  const { target, name } = route;

  if (target === 'driver') {
    const isAsync = name.endsWith('Cold') || fn.async;
    return isAsync ? await driver[name](...args) : driver[name](...args);
  }

  if (target === 'native') {
    return jsMaths[name](...args);
  }

  if (target === 'jswasm') {
    // Construct derived cold driver wrapper if Mode is 4 (Cold)
    const activeDriver = (modeCode === '4') ? {
      add: (x, y) => driver.addCold(x, y),
      isPrime: (x) => driver.isPrimeCold(x),
      countPrimes: (x, y) => driver.countPrimesCold(x, y)
    } : driver;
    return await jsWasmMaths[name](activeDriver, ...args);
  }

  throw new Error(`Unknown method target router: ${target}`);
}

// Internal helper to verify correctness against reference JS JIT implementation
async function _verifyResult(fn, args, result) {
  if (!fn.verify) return 'TO_VERIFY';
  try {
    const verifyFn = jsMaths[fn.verify];
    let expected = verifyFn(...args);
    if (expected instanceof Promise) {
      expected = await expected;
    }
    return (BigInt(result) === BigInt(expected)) ? 'SUCCESS' : 'FAILED';
  } catch (err) {
    return 'FAILED';
  }
}

// Internal helper to calculate average execution duration per loop iteration
function _calculateAvgNs(route, elapsed, c) {
  if (route.target === 'jswasm' && c > 0) {
    return `${Math.round((elapsed * 1000000) / c)} ns`;
  }
  return 'N/A';
}

// Unified coordinator executing workloads based on dynamic metadata target routing
export async function runWorkload(driver, functionCode, modeCode, inputs, cancelCheck) {
  const fn = nomenclature.functions[functionCode];
  if (!fn) {
    throw new Error(`Nomenclature function code not found: ${functionCode}`);
  }

  const route = fn.methods[modeCode];
  if (!route) {
    throw new Error(`Mode ${modeCode} not supported for function ${functionCode}`);
  }

  const args = fn.signature.map(key => inputs[key.toLowerCase()]);
  let result;
  let elapsed = 0;
  let status = 'SUCCESS';

  const t0 = performance.now();

  try {
    result = await _executeTarget(driver, route, fn, args, modeCode);
    const t1 = performance.now();
    elapsed = t1 - t0;

    let skipVerification = false;
    if (functionCode === 'F' && inputs.c >= 35) {
      skipVerification = true;
    } else if ((functionCode === 'C' || functionCode === 'D') && inputs.c >= 1000000) {
      skipVerification = true;
    }

    if (skipVerification) {
      status = 'TO_VERIFY';
    } else {
      status = await _verifyResult(fn, args, result);
    }
  } catch (e) {
    status = `Error: ${e.message}`;
    result = 'N/A';
    const t1 = performance.now();
    elapsed = t1 - t0;
  }

  return {
    result,
    elapsedMs: Number(elapsed.toFixed(3)),
    avgNs: _calculateAvgNs(route, elapsed, inputs.c),
    status
  };
}

export async function verifyResult(functionCode, inputs, result) {
  const fn = nomenclature.functions[functionCode];
  if (!fn) return 'FAILED';
  const args = fn.signature.map(key => inputs[key.toLowerCase()]);
  return _verifyResult(fn, args, result);
}

// Parse a shareable seed string (Query String format) into toolchain, op, mode, and inputs
export function parseSeed(seed) {
  const raw = seed.startsWith('#') ? seed.substring(1) : seed;
  const params = new URLSearchParams(raw);
  
  const toolchain = params.get('toolchain') || '';
  const op = params.get('op') || '';
  const mode = params.get('mode') || '';
  const a = parseInt(params.get('a'), 10) || 0;
  const b = parseInt(params.get('b'), 10) || 0;
  const c = parseInt(params.get('c'), 10) || 0;
  
  return {
    toolchain,
    op,
    mode,
    inputs: { a, b, c }
  };
}

// Generate a shareable seed string from toolchain, op, mode, and inputs
export function generateSeed(toolchain, op, mode, inputs) {
  const params = new URLSearchParams();
  params.set('toolchain', toolchain);
  params.set('op', op);
  params.set('mode', mode);
  params.set('a', inputs.a !== undefined ? inputs.a : 0);
  params.set('b', inputs.b !== undefined ? inputs.b : 0);
  params.set('c', inputs.c !== undefined ? inputs.c : 0);
  return params.toString();
}

function calculateFibonacciRecursiveCalls(n) {
  if (n <= 0) return 1n;
  if (n === 1) return 1n;
  let a = 0n, b = 1n;
  for (let i = 2; i <= n + 1; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return 2n * b - 1n;
}

function formatComplexityNumber(num) {
  if (num >= 1000000000000n) {
    return `${(Number(num) / 1000000000000).toFixed(2)} trillion`;
  }
  if (num >= 1000000000n) {
    return `${(Number(num) / 1000000000).toFixed(2)} billion`;
  }
  if (num >= 1000000n) {
    return `${(Number(num) / 1000000).toFixed(2)} million`;
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Predict recursive depth or operation complexity before executing long-running algorithms
export function estimateComplexity(functionCode, inputs) {
  const c = inputs.c || 0;
  switch (functionCode) {
    case 'F': { // FibonacciRecursive
      const calls = calculateFibonacciRecursiveCalls(c);
      return {
        label: "Estimated recursive stack calls",
        value: calls,
        formatted: formatComplexityNumber(calls),
        warning: c >= 40 ? `⚠️ WARNING: High recursive depth (N=${c}). This execution requires deep stack transitions and may take several minutes or lock the process!` : null
      };
    }
    case 'C': { // FindLastPrime
      const ops = BigInt(Math.round(c * Math.sqrt(c) / 4));
      return {
        label: "Estimated divisions (worst-case approximation)",
        value: ops,
        formatted: formatComplexityNumber(ops),
        warning: c >= 10000000 ? `⚠️ WARNING: Very high division count. This execution may take several minutes!` : null
      };
    }
    case 'D': { // ConcurrentCountPrimes
      const ops = BigInt(Math.round(c * Math.sqrt(c) / 4));
      return {
        label: "Estimated divisions (across all workers)",
        value: ops,
        formatted: formatComplexityNumber(ops),
        warning: c >= 10000000 ? `⚠️ WARNING: Very high division count. This execution may take several minutes!` : null
      };
    }
    default:
      return null;
  }
}
