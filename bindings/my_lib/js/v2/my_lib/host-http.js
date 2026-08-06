// Pre-load Node.js require helper asynchronously during module initialization
let nodeRequire = null;

if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
  // Use Webpack magic comment to prevent compile-time bundler resolution errors
  import(/* webpackIgnore: true */ 'module')
    .then(({ createRequire }) => {
      nodeRequire = createRequire(import.meta.url);
    })
    .catch(() => {});
}

// Synchronous host HTTP fetch capability
export function fetchUrl(url) {
  try {
    // 1. Resolve local files inside Node.js testing environment
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      if (nodeRequire) {
        const fs = nodeRequire('fs');
        return fs.readFileSync(filePath, 'utf-8');
      }
      // Native fallback if async import is not resolved yet
      if (typeof process !== 'undefined' && process.binding) {
        const fs = process.binding('fs');
        return fs.readFileUtf8(filePath, 0);
      }
    }
    
    // 2. Resolve HTTP/HTTPS requests synchronously in Node.js via curl
    if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
      if (nodeRequire) {
        const { execSync } = nodeRequire('child_process');
        return execSync(`curl -sL "${url}"`, { encoding: 'utf-8' });
      }
      throw new Error("Node.js require helper not initialized yet");
    }
    
    // 3. Resolve HTTP/HTTPS requests synchronously in Browser via XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // false makes it synchronous
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      return xhr.responseText;
    }
    throw new Error(`HTTP status ${xhr.status}`);
  } catch (err) {
    throw err;
  }
}
