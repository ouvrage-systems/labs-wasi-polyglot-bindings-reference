export let nomenclature = null;

function resolveLoader(target) {
  const host = target.dimensions.host_sandbox;
  const compiler = target.dimensions.compiler;
  const entrypoint = target.dimensions.entrypoint;

  if (host === "host") return "native";
  
  if (host === "wasm") {
    return (compiler === "tinygo") ? "v0-tiny" : "v0-legacy";
  }
  
  if (host === "wasip1") {
    return (entrypoint === "jsonrpc") ? "v0.1-legacy" : "v0.1-wasi";
  }
  
  if (host === "wasip2") {
    return (compiler === "tinygo") ? "v0.2-tiny" : "v0.2-stdgo";
  }
  
  throw new Error(`Unsupported host/loader mapping for sandbox: ${host}`);
}

// Load and decode nomenclature.json dynamically using the platform adapter
export async function initMatrix(hostAdapter) {
  if (nomenclature) return;
  const url = new URL('./data/nomenclature.json', import.meta.url);
  const bytes = await hostAdapter.readBytes(url);
  const text = new TextDecoder().decode(bytes);
  nomenclature = JSON.parse(text);

  const matrix = nomenclature.targets.matrix;
  const dimensions = nomenclature.targets.dimensions;
  for (const target of matrix) {
    const host_sandbox = dimensions.host_sandbox[target.dimensions.host_sandbox];
    const compiler = dimensions.compiler[target.dimensions.compiler];
    const guest_target = dimensions.guest_target[target.dimensions.guest_target];
    const scheduler = dimensions.scheduler[target.dimensions.scheduler];
    const entrypoint = dimensions.entrypoint[target.dimensions.entrypoint];
    const variant = dimensions.variant[target.dimensions.variant];

    target.code = [
      host_sandbox.code,
      compiler.code,
      guest_target.code,
      scheduler.code,
      entrypoint.code,
      variant.code
    ].join('.');

    // Backward compatibility properties:
    target.version = host_sandbox.code;
    target.compiler = compiler.code;
    target.scheduler = scheduler.code;
    target.entrypoint = entrypoint.code;
    target.variant = variant.code;

    // Resolve loader and binary paths dynamically
    target.loader = target.loader || resolveLoader(target);
    target.binary = target.paths.wasm;
  }

  nomenclature.dimensions = dimensions;
  nomenclature.targets = matrix;
}

export function getToolchainName(code) {
  const target = nomenclature.targets.find(t => t.code === code);
  if (!target) return code;

  const dims = target.dimensions;
  const sandbox = nomenclature.dimensions.host_sandbox[dims.host_sandbox];
  const compiler = nomenclature.dimensions.compiler[dims.compiler];
  const guest = nomenclature.dimensions.guest_target[dims.guest_target];
  const scheduler = nomenclature.dimensions.scheduler[dims.scheduler];
  const entrypoint = nomenclature.dimensions.entrypoint[dims.entrypoint];

  if (compiler.code === 'N') {
    return `${sandbox.label} | JS V8 Engine`;
  }

  if (sandbox.code !== guest.code) {
    return `${sandbox.label} Component (Guest compiled ${guest.label}) | ${compiler.label} (${scheduler.label})`;
  }

  return `${sandbox.label} | ${compiler.label} | ${entrypoint.label} (${scheduler.label})`;
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
