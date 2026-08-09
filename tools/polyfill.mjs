import { createRequire } from 'node:module';

// Polyfill crypto synchronously at module evaluation time
if (typeof globalThis.crypto === 'undefined') {
  const require = createRequire(import.meta.url);
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto;
}
