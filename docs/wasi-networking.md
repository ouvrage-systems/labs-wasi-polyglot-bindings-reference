# WASI Sockets & Outbound HTTP Networking

> [!NOTE]
> While this reference laboratory focuses on Geometry calculations and Stateful Key-Value memory execution, this page serves as an architectural guide on how WASI Preview 2 manages networking and outbound HTTP communication in Go.

This page explores the networking capabilities of WebAssembly under the WASI Preview 2 paradigm, explaining capabilities-based socket connections and outbound HTTP client requests.

---

## 1. The Sandbox Security Model: Capabilities-Based Sockets

In a traditional operating system, any binary can attempt to bind a port or open a socket to any IP address. Security is managed globally (firewalls, user permissions).

In **WASI Preview 2**, WebAssembly enforces a **capabilities-based security model**:

*   A WASM component has **no ambient authority** to make network connections. It cannot call native Go/Rust socket APIs (`net.Dial` or standard sockets) directly.
*   The component must explicitly import network capabilities in its WIT contract (e.g., `wasi:sockets/tcp` or `wasi:http/outgoing-handler`).
*   The host runtime (e.g., Wasmtime) must grant permissions when instantiating the module, explicitly listing which hosts or ports the component is allowed to access.
*   Attempts to connect to unauthorized hosts will throw immediate, sandboxed network errors inside WASM, without reaching the host's OS socket layers.

---

## 2. Low-Level Sockets vs. High-Level Protocols

WASI Preview 2 splits networking into two standardized worlds:

### A. WASI Sockets (`wasi:sockets`)
For low-level network interactions, WASI provides raw TCP and UDP socket capabilities (defined in `wasi:sockets/tcp` and `wasi:sockets/udp`).

*   **Use Case**: Implementing custom binary protocols, database clients (PostgreSQL, Redis), or raw socket streaming.
*   **Mechanism**: The component imports TCP sockets and calls `connect` or `listen`. This is mapped by the host runtime to native OS sockets.

### B. WASI HTTP (`wasi:http`)
For standard web-based API clients, WASI defines a high-level HTTP client interface (`wasi:http/outgoing-handler`).

*   **Use Case**: Querying microservices, consuming REST APIs, or interacting with SaaS platforms.
*   **Motivation**: Standard outbound HTTP allows host runtimes (like Cloudflare Workers or Web Browsers) to optimize requests. In the browser, `wasi:http` translates directly to native `fetch()` calls, keeping the execution completely secure and non-blocking.

---

## 3. Go Outbound HTTP Client Integration

When compiling Go code to a WASI Component, the standard Go `net/http` client does not work natively out-of-the-box because Go's standard library tries to call low-level POSIX sockets that the WASM sandbox blocks.

To make outbound HTTP calls in Go inside a WASI component, we use the `wasi-http` bindings.

Here is how you make a request in Go using the standard Preview 2 interfaces:

```go
package main

import (
	"fmt"
	"io"
	"net/http"
	
	// Import the standard preview2 WASI HTTP round tripper wrapper
	"github.com/stealthrocket/wasi-go/imports/wasi/http/client"
)

func FetchData() (string, error) {
	// Configure http.Client to use WASI Outgoing Handler instead of POSIX sockets
	c := &http.Client{
		Transport: &client.RoundTripper{},
	}

	resp, err := c.Get("https://api.example.com/data")
	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	return string(body), nil
}
```

---

## 4. Host Permission Configuration (Wasmtime Example)

To execute the compiled component with network access, the host launcher must grant explicit permissions. 

For the Wasmtime CLI, we pass the network configuration flags:
```bash
# Grant access to call outbound HTTP endpoints on port 443
wasmtime run --wasi-modules=experimental-wasi-http \
             --tcplisten=127.0.0.1:0 \
             my_component.wasm
```

This strict decoupling ensures that even if the WASM binary contains malicious code, it cannot execute arbitrary port scans or connect to unauthorized external servers, resolving a major security concern of serverless architectures.
