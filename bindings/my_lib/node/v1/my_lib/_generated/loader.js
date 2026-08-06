const { spawn } = require('child_process');
const path = require('path');

const _WASM_PATH = path.join(__dirname, 'my_lib.wasm');
const _RUNNER_SCRIPT = `
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

function call(method, params) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['-e', _RUNNER_SCRIPT, _WASM_PATH]);
    let stdoutData = '';
    let stderrData = '';

    child.stdin.write(JSON.stringify({ method, params }));
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
        return reject(new Error(`WASM exited with code ${code}. Stderr: ${stderrData}`));
      }
      try {
        const response = JSON.parse(stdoutData.trim());
        if (response.error) {
          return reject(new Error(`WASM RPC Error: ${response.error}`));
        }
        resolve(response.result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { call };
