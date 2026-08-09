import * as jsMaths from './maths_native.js';
import * as xWasmMaths from './maths_xwasm.js';
import { setNomenclature, setHostAdapter } from './driver_manager.js';
import { nomenclature as sharedNomenclature, initMatrix as sharedInitMatrix } from './nomenclature_helpers.js';

export let nomenclature = null;

// Load and decode nomenclature.json dynamically using the platform adapter
export async function initMatrix(hostAdapter) {
  setHostAdapter(hostAdapter);
  await sharedInitMatrix(hostAdapter);
  nomenclature = sharedNomenclature;
  setNomenclature(nomenclature);
}

export {
  getToolchainName,
  getFunctionName,
  getFunctionFocus,
  getMethodName,
  getPrimitive,
  getModeName,
  getModeDesc,
  getMethods,
  getMathMetadata,
  getInputDescriptor,
  estimateComplexity
} from './nomenclature_helpers.js';

// Internal helper to route and execute the function workload based on target configuration
async function _executeTarget(driver, route, fn, args, modeCode) {
  const { target, name } = route;

  if (target === 'wasm') {
    const isAsync = name.endsWith('Cold') || fn.async;
    return isAsync ? await driver[name](...args) : driver[name](...args);
  }

  if (target === 'native') {
    return jsMaths[name](...args);
  }

  if (target === 'xwasm') {
    // Construct derived cold driver wrapper if Mode is 4 (Cold)
    const activeDriver = (modeCode === '4') ? {
      add: (x, y) => driver.addCold(x, y),
      isPrime: (x) => driver.isPrimeCold(x),
      countPrimes: (x, y) => driver.countPrimesCold(x, y)
    } : driver;
    return await xWasmMaths[name](activeDriver, ...args);
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
  if (route.target === 'xwasm' && c > 0) {
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
export { parseSeed, generateSeed } from './nomenclature_helpers.js';
