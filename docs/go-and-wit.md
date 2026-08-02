# Go Core & The WIT Contract

This page explores the core Go implementation of our library and the WIT (WebAssembly Interface Types) contract that defines our module boundaries in WASI Preview 2.

---

## 1. Core Go Library Layout

To demonstrate clean decoupling, the business logic of our library is written in pure Go packages inside the `pkg/` directory. It has no knowledge of WebAssembly or WASI:

*   [`pkg/geometry/geometry.go`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/pkg/geometry/geometry.go): Contains structs (`Point`, `Rectangle`, `Circle`, `Triangle`) and calculation logic.
*   [`pkg/store/store.go`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/pkg/store/store.go): Implements a thread-safe in-memory key-value database.
*   [`pkg/text/text.go`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/pkg/text/text.go): Handles basic text formatting and string manipulation.

---

## 2. The WIT Contract (`world.wit`)

The WIT contract (located at [`bindings/wit/world.wit`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wit/world.wit)) is the single source of truth for the V2 component interface. It defines our types and exports:

```wit
package ouvrage-lab:wasi-demo;

world wasi-polyglot-reference {
    // 1. Geometry package exports
    import wasi:clocks/wall-clock@0.2.0;

    export geometry;
    export lang;
    export store;
}

interface geometry {
    record point {
        x: float64,
        y: float64,
    }

    record rectangle {
        top-left: point,
        bottom-right: point,
    }

    distance: func(p1: point, p2: point) -> float64;
    area-rectangle: func(r: rectangle) -> float64;
    ...
}

interface store {
    resource kv-store {
        constructor();
        set: func(key: string, value: string);
        get: func(key: string) -> option<string>;
        delete: func(key: string) -> bool;
    }
}
```

---

## 3. Values vs. Resources: The Architectural Distinction

A critical concept in WASI V2 is the difference between passing **values** (`record`) and passing **resource handles** (`resource`):

### A. Pass-by-Value (`record`)
In the `geometry` interface, `point` and `rectangle` are defined as `record` types.

*   **What it is**: A record is a plain data structure (similar to a struct in Go or an object literal in JS).
*   **How it behaves**: When calling `distance(p1, p2)`, the host copies the field values (`x` and `y`) directly into the WASM memory heap. The WASM component processes the calculations and returns the result.
*   **No State**: Once the function returns, the memory occupied by the record is garbage-collected. The record has no identity or handle inside WASM.

### B. Pass-by-Reference (`resource`)
In the `store` interface, `kv-store` is defined as a `resource`.

*   **What it is**: A resource is a stateful object that lives **inside the WASM component's heap memory**.
*   **How it behaves**: When the host calls `new KVStore()`, the Go WASM runtime creates an instance of the database, stores it in an internal Go map, and returns an integer index wrapper called a **resource handle**.
*   **The Handle**: The host JS or Python wrapper only holds this numeric handle (e.g., `0`, `1`). When calling `db.set("username", "gpineda")`, the host passes the handle along with the arguments. Go retrieves the database instance matching the handle and writes the state.
*   **Persistent State**: The database persists in Go's memory between function calls. When the host garbage-collects the JS/Python wrapper, the host runtime calls the resource's destructor, cleaning up the database in Go's memory.

---

## 4. Go Binding Implementation (`bindings/wasm/v2/`)

When compiling to a V2 Component, `wit-bindgen-go` generates the low-level mapping code inside `bindings/wasm/gen/`. To keep the code clean and maintainable, the Go target package is split into dedicated files inside [`bindings/wasm/v2/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wasm/v2/):

### A. The Registry Entrypoint ([`v2/main.go`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wasm/v2/main.go))
This file contains only the registration hooks to link our implementations to the generated WIT wrapper:
```go
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/wasm/gen"
)

func init() {
	// Register the interface implementations with the generated WIT bindings
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoGeometry(geometryImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoStore(storeImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoLang(langImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoNetwork(networkImpl{})
}

func main() {
	// Dummy main function required by TinyGo compiler
}
```

### B. Interface Implementation (Example: [`v2/geometry.go`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wasm/v2/geometry.go))
Each interface is implemented in a sister file belonging to `package main`. It handles structural conversion and delegates the calculation to the core library package (`pkg/geometry`):
```go
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/wasm/gen"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/geometry"
)

type geometryImpl struct{}

func (g geometryImpl) Distance(a, b wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryPoint) float64 {
	// Convert generated WIT types to internal pkg/geometry domain models
	gp1 := geometry.Point{X: a.X, Y: a.Y}
	gp2 := geometry.Point{X: b.X, Y: b.Y}
	return geometry.Distance(gp1, gp2)
}
// ...
```

This modular architecture ensures that as the library grows, the WASM entrypoint (`main.go`) remains minimal and the implementation files mirror the domain logic structure.
