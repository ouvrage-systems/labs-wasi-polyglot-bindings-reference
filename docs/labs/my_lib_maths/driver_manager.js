import { PureJsDriver } from './drivers/pure_js_driver.js';
import { WasmDriver } from './drivers/wasm_driver.js';
import { WasiV01RpcDriver } from './drivers/wasi_v0.1_rpc_driver.js';
import { WasiV02Driver } from './drivers/wasi_v0.2_driver.js';
import { V0TinyLoader } from './loaders/v0_tiny_loader.js';
import { V01WasiLoader } from './loaders/v0.1_wasi_loader.js';
import { V0LegacyLoader } from './loaders/v0_legacy_loader.js';
import { V01LegacyLoader } from './loaders/v0.1_legacy_loader.js';
import { V02TinyLoader } from './loaders/v0.2_tiny_loader.js';
import { getToolchainName } from './nomenclature_helpers.js';

// Host Adapter will be set dynamically via initMatrix during startup
let hostAdapter = null;

export function setHostAdapter(adapter) {
  hostAdapter = adapter;
}

const driversCache = {};
let nomenclature = null;

export function setNomenclature(n) {
  nomenclature = n;
}

// Helper to construct toolchain label dynamically like getToolchainName does
function buildToolchainName(target) {
  return getToolchainName(target.code);
}

// Factory registry to retrieve and cache singletons of composed drivers based on nomenclature configurations
export function getMathsImplementation(toolchain) {
  if (driversCache[toolchain]) {
    return driversCache[toolchain];
  }

  if (!nomenclature) {
    throw new Error("Nomenclature config must be loaded before instantiating drivers. Call initMatrix first.");
  }

  const target = nomenclature.targets.find(t => t.code === toolchain);
  if (!target) {
    throw new Error(`Unsupported toolchain code: ${toolchain}`);
  }

  let driver;
  const name = buildToolchainName(target);

  switch (target.loader) {
    case 'native':
      driver = new PureJsDriver();
      break;
    case 'v0-legacy':
      driver = new WasmDriver(name, target.code, new V0LegacyLoader(target.binary, hostAdapter));
      break;
    case 'v0-tiny':
      driver = new WasmDriver(name, target.code, new V0TinyLoader(target.binary, hostAdapter));
      break;
    case 'v0.1-wasi':
      driver = new WasmDriver(name, target.code, new V01WasiLoader(target.binary, hostAdapter));
      break;
    case 'v0.1-legacy':
      driver = new WasiV01RpcDriver(name, target.code, new V01LegacyLoader(target.binary, hostAdapter));
      break;
    case 'v0.2-tiny':
      driver = new WasiV02Driver(name, target.code, new V02TinyLoader(target.paths, target.scheduler, hostAdapter));
      break;
    case 'v0.2-stdgo':
      driver = new WasiV02Driver(name, target.code, new V02TinyLoader(target.paths, target.scheduler, hostAdapter));
      break;
    default:
      throw new Error(`Unsupported loader configuration: ${target.loader}`);
  }

  driversCache[toolchain] = driver;
  return driver;
}
