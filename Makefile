# Lab: WebAssembly/WASI Preview 2 component compilation Makefile
SHELL := /bin/bash

# Configuration and Paths
LAB_DIR := $(shell pwd)
BIN_DIR := $(LAB_DIR)/bin
export GOROOT := $(BIN_DIR)/go

# my_lib_maths namespace paths
MATHS_BINDINGS_DIR := $(LAB_DIR)/bindings/my_lib_maths
BUILD_V0_DIR := $(MATHS_BINDINGS_DIR)/build/v0
BUILD_V0_TINY_DIR := $(BUILD_V0_DIR)/tiny
BUILD_V0_LEGACY_DIR := $(BUILD_V0_DIR)/legacy

JS_V0_DIR := $(MATHS_BINDINGS_DIR)/js/v0
JS_V0_TINY_DIR := $(JS_V0_DIR)/tiny
JS_V0_LEGACY_DIR := $(JS_V0_DIR)/legacy

# my_lib namespace paths
MY_LIB_BINDINGS_DIR := $(LAB_DIR)/bindings/my_lib
WIT_DIR := $(MY_LIB_BINDINGS_DIR)/wit
WASM_DIR := $(MY_LIB_BINDINGS_DIR)/wasm
BUILD_DIR := $(MY_LIB_BINDINGS_DIR)/build
PY_V1_DIR := $(MY_LIB_BINDINGS_DIR)/py/v1
PY_V2_DIR := $(MY_LIB_BINDINGS_DIR)/py/v2
NODE_V1_DIR := $(MY_LIB_BINDINGS_DIR)/node/v1
JS_V2_DIR := $(MY_LIB_BINDINGS_DIR)/js/v2

# Executables
WIT_BINDGEN := $(BIN_DIR)/wit-bindgen
WASM_TOOLS := $(BIN_DIR)/wasm-tools
TINYGO := $(BIN_DIR)/tinygo/bin/tinygo
TINYGO_CMD := PATH=$(BIN_DIR)/go/bin:$$PATH GOTOOLCHAIN=local $(TINYGO)
GO := $(BIN_DIR)/go/bin/go
GO_CMD := PATH=$(BIN_DIR)/go/bin:$$PATH GOTOOLCHAIN=local $(GO)
ADAPTER_WASM := $(BIN_DIR)/wasi_snapshot_preview1.wasm
NODE_BIN := $(BIN_DIR)/node/bin/node
NPX_BIN := $(BIN_DIR)/node/bin/npx

# Versions
WIT_BINDGEN_VER := 0.24.0
WASM_TOOLS_VER := 1.200.0
WASMTIME_VER := 18.0.2
TINYGO_VER := 0.41.1
NODE_VER := 22.12.0
GO_VER := 1.24.0

.PHONY: help setup build test run-py-v1 run-py-v2 run-node-v1 run-node-v2 clean

help:
	@echo "WASI Polyglot Bindings Lab Automation"
	@echo "======================================"
	@echo "make setup    - Download local precompiled WASM tools, tinygo, node & go into bin/"
	@echo "make build    - Build all target packages (v1 binaries + v2 components)"
	@echo "make run-py-v1   - Run the v1 JSON-RPC Python tests"
	@echo "make run-py-v2   - Run the v2 Component Model Python tests"
	@echo "make run-node-v1 - Run the v1 JSON-RPC Node.js tests"
	@echo "make run-node-v2 - Run the v2 Component Model Node.js tests"
	@echo "make clean    - Remove local bin/ and compiled .wasm artifacts"

setup:
	@./tools/bootstrap-wasi.sh --dir $(BIN_DIR)

build: build-wasm-v0-tiny build-wasm-v0-legacy build-wasm-v0.1 build-wasm-v0.2 build-wasm-v1 build-wasm-v2 copy-js-all

test: run-py-v1 run-py-v2 run-node-v1 run-node-v2

build-wasm-v0-tiny:
	@echo "Compiling Go code to pure WASM (v0-tinygo) for browser target..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/none
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/asyncify
	@GOWORK=off $(TINYGO_CMD) build -scheduler=none -tags noscheduler -o $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/none/my_lib_maths.wasm -target=wasm $(MATHS_BINDINGS_DIR)/wasm/v0/tiny/v0/export
	@GOWORK=off $(TINYGO_CMD) build -scheduler=asyncify -o $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/asyncify/my_lib_maths.wasm -target=wasm $(MATHS_BINDINGS_DIR)/wasm/v0/tiny/v0/export
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/tasks
	-@GOWORK=off $(TINYGO_CMD) build -scheduler=tasks -o $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/tasks/my_lib_maths.wasm -target=wasm $(MATHS_BINDINGS_DIR)/wasm/v0/tiny/v0/export 2> $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/tasks/build.log
	@mkdir -p $(JS_V0_TINY_DIR)/my_lib_maths/_generated
	@cd $(JS_V0_TINY_DIR)/my_lib_maths/_generated && ln -sf ../../../../../build/v0/tiny/v0/export/none/my_lib_maths.wasm .
	@cd $(JS_V0_TINY_DIR)/my_lib_maths/_generated && ln -sf ../../../../../build/v0/tiny/v0/export/asyncify/my_lib_maths.wasm .
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated
	@rm -rf $(MATHS_BINDINGS_DIR)/js/all/_generated/build
	@ln -sf ../../../build $(MATHS_BINDINGS_DIR)/js/all/_generated/build
	@cd $(JS_V0_TINY_DIR)/my_lib_maths && ln -sf ../../../../pkg/js/maths.js maths_native.js
	@mkdir -p docs/labs/v0
	@rm -rf docs/labs/v0/tiny
	@cp -rL $(JS_V0_TINY_DIR) docs/labs/v0/
	@cp -L $(JS_V0_DIR)/index.html docs/labs/v0/
	@mkdir -p docs/pkg
	@cp -rL $(MATHS_BINDINGS_DIR)/pkg/* docs/pkg/
	@echo "v0-tiny Compilation successful: none     - $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/none/my_lib_maths.wasm"
	@echo "v0-tiny Compilation successful: asyncify - $(MATHS_BINDINGS_DIR)/build/v0/tiny/v0/export/asyncify/my_lib_maths.wasm"

build-wasm-v0-legacy:
	@echo "Compiling Go code to pure WASM (v0-legacy) for browser target..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0/stdgo/v0/jssyscall/native
	@GOWORK=off GOOS=js GOARCH=wasm $(GO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0/stdgo/v0/jssyscall/native/my_lib_maths.wasm $(MATHS_BINDINGS_DIR)/wasm/v0/stdgo/v0/jssyscall
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated
	@cp -f $$($(GO_CMD) env GOROOT)/lib/wasm/wasm_exec.js $(MATHS_BINDINGS_DIR)/js/all/_generated/wasm_exec.js
	@mkdir -p $(JS_V0_LEGACY_DIR)/my_lib_maths/_generated
	@cd $(JS_V0_LEGACY_DIR)/my_lib_maths/_generated && ln -sf ../../../../../build/v0/stdgo/v0/jssyscall/native/my_lib_maths.wasm .
	@cd $(JS_V0_LEGACY_DIR)/my_lib_maths && ln -sf ../../../../pkg/js/maths.js maths_native.js
	@mkdir -p docs/labs/v0
	@rm -rf docs/labs/v0/legacy
	@cp -rL $(JS_V0_LEGACY_DIR) docs/labs/v0/
	@cp -L $(JS_V0_DIR)/index.html docs/labs/v0/
	@mkdir -p docs/pkg
	@cp -rL $(MATHS_BINDINGS_DIR)/pkg/* docs/pkg/
	@echo "v0-legacy Compilation successful: $(MATHS_BINDINGS_DIR)/build/v0/stdgo/v0/jssyscall/native/my_lib_maths.wasm"

build-wasm-v0: build-wasm-v0-tiny build-wasm-v0-legacy

build-wasm-v0.1-tiny:
	@echo "Compiling Maths Go code to WASI Preview 1 via TinyGo..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/export/none
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/export/asyncify
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/jsonrpc/asyncify
	@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/export/none/my_lib_maths.wasm -scheduler=none -tags noscheduler -target=wasi $(MATHS_BINDINGS_DIR)/wasm/v0.1/tiny/v0.1/export
	@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/export/asyncify/my_lib_maths.wasm -scheduler=asyncify -target=wasi $(MATHS_BINDINGS_DIR)/wasm/v0.1/tiny/v0.1/export
	@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/jsonrpc/asyncify/my_lib_maths.wasm -scheduler=asyncify -target=wasi $(MATHS_BINDINGS_DIR)/wasm/v0.1/stdgo/v0.1/jsonrpc
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/jsonrpc/tasks
	-@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/jsonrpc/tasks/my_lib_maths.wasm -scheduler=tasks -target=wasi $(MATHS_BINDINGS_DIR)/wasm/v0.1/stdgo/v0.1/jsonrpc 2> $(MATHS_BINDINGS_DIR)/build/v0.1/tiny/v0.1/jsonrpc/tasks/build.log
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated

build-wasm-v0.1-legacy:
	@echo "Compiling Maths Go code to WASI Preview 1 (direct exports)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/stdgo/v0.1/export/native
	@GOWORK=off GOOS=wasip1 GOARCH=wasm $(GO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/stdgo/v0.1/export/native/my_lib_maths.wasm $(MATHS_BINDINGS_DIR)/wasm/v0.1/stdgo/v0.1/export
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated

	@echo "Compiling Maths Go code to WASI Preview 1 (JSON-RPC subprocess)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.1/stdgo/v0.1/jsonrpc/native
	@GOWORK=off GOOS=wasip1 GOARCH=wasm $(GO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.1/stdgo/v0.1/jsonrpc/native/my_lib_maths.wasm $(MATHS_BINDINGS_DIR)/wasm/v0.1/stdgo/v0.1/jsonrpc

build-wasm-v0.1: build-wasm-v0.1-tiny build-wasm-v0.1-legacy

build-wasm-v0.2: build-wasm-v0.2-none build-wasm-v0.2-asyncify build-wasm-v0.2-stdgo
	@echo "Step 6: Installing ES Module dependencies in js/all..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NODE_BIN) $(BIN_DIR)/node/bin/npm install --prefix $(MATHS_BINDINGS_DIR)/js/all

build-wasm-v0.2-none:
	@if [ ! -f $(WIT_BINDGEN) ] || [ ! -f $(WASM_TOOLS) ] || [ ! -f $(TINYGO) ]; then \
		echo "Error: Toolchain missing. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "Step 1: Generating Go WIT interfaces for Maths (v0.2)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export/gen
	@$(WIT_BINDGEN) tiny-go $(MATHS_BINDINGS_DIR)/wit/v0.2/tiny --out-dir $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export/gen
	@echo "Step 2: Compiling Maths Go code via TinyGo (none)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none
	@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_raw.wasm -target=wasi -scheduler=none -tags noscheduler $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export
	@echo "Step 3: Embedding WIT metadata (none)..."
	@$(WASM_TOOLS) component embed $(MATHS_BINDINGS_DIR)/wit/v0.2/tiny $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_raw.wasm \
		--world wasi-maths-reference \
		-o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_embedded.wasm
	@echo "Step 4: Translating to WASI Preview 2 Component (none)..."
	@$(WASM_TOOLS) component new $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_embedded.wasm \
		--adapt $(ADAPTER_WASM) \
		-o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_component.wasm
	@echo "v0.2 Component compiled successfully (none): $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_component.wasm"
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y @bytecodealliance/jco transpile $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/none/my_lib_maths_component.wasm --tla-compat -o $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/none
	@PATH=$(BIN_DIR)/node/bin:$$PATH node -e "const fs = require('fs'); const file = '$(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/none/my_lib_maths_component.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('fetch(url).then(WebAssembly.compileStreaming)', 'fetch(url).then(res => res.arrayBuffer()).then(WebAssembly.compile)'); fs.writeFileSync(file, content);"
	@echo "Step 6: Bundling WASI Preview 2 Component for browser (none)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/none
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y esbuild $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/none/my_lib_maths_component.js --bundle --format=esm --platform=browser --external:node:* --minify --outfile=$(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/none/my_lib_maths_component.js
	@cd $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/none && ln -sf ../../../../../../jco/v0.2/tiny/v0.1/export/none/*.wasm .

build-wasm-v0.2-asyncify:
	@if [ ! -f $(WIT_BINDGEN) ] || [ ! -f $(WASM_TOOLS) ] || [ ! -f $(TINYGO) ]; then \
		echo "Error: Toolchain missing. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "Step 1: Generating Go WIT interfaces for Maths (v0.2)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export/gen
	@$(WIT_BINDGEN) tiny-go $(MATHS_BINDINGS_DIR)/wit/v0.2/tiny --out-dir $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export/gen
	@echo "Step 2: Compiling Maths Go code via TinyGo (asyncify)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify
	@GOWORK=off $(TINYGO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_raw.wasm -target=wasi -scheduler=asyncify $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export
	@echo "Step 3: Embedding WIT metadata (asyncify)..."
	@$(WASM_TOOLS) component embed $(MATHS_BINDINGS_DIR)/wit/v0.2/tiny $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_raw.wasm \
		--world wasi-maths-reference \
		-o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_embedded.wasm
	@echo "Step 4: Translating to WASI Preview 2 Component (asyncify)..."
	@$(WASM_TOOLS) component new $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_embedded.wasm \
		--adapt $(ADAPTER_WASM) \
		-o $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.wasm
	@echo "v0.2 Component compiled successfully (asyncify): $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.wasm"
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y @bytecodealliance/jco transpile $(MATHS_BINDINGS_DIR)/build/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.wasm --tla-compat -o $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/asyncify
	@PATH=$(BIN_DIR)/node/bin:$$PATH node -e "const fs = require('fs'); const file = '$(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('fetch(url).then(WebAssembly.compileStreaming)', 'fetch(url).then(res => res.arrayBuffer()).then(WebAssembly.compile)'); fs.writeFileSync(file, content);"
	@echo "Step 6: Bundling WASI Preview 2 Component for browser (asyncify)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/asyncify
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y esbuild $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.js --bundle --format=esm --platform=browser --external:node:* --minify --outfile=$(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/asyncify/my_lib_maths_component.js
	@cd $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/tiny/v0.1/export/asyncify && ln -sf ../../../../../../jco/v0.2/tiny/v0.1/export/asyncify/*.wasm .

build-wasm-v0.2-stdgo:
	@echo "Compiling Maths Go code to WASI Preview 1 via Standard Go..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native
	@GOWORK=off GOOS=wasip1 GOARCH=wasm $(GO_CMD) build -o $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_raw.wasm $(MATHS_BINDINGS_DIR)/wasm/v0.2/stdgo/v0.1/export
	@echo "Embedding WIT metadata (stdgo)..."
	@$(WASM_TOOLS) component embed $(MATHS_BINDINGS_DIR)/wit/v0.2/tiny $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_raw.wasm \
		--world wasi-maths-reference -o $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_embedded.wasm
	@echo "Translating to WASI Preview 2 Component (stdgo)..."
	@$(WASM_TOOLS) component new $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_embedded.wasm \
		--adapt $(ADAPTER_WASM) \
		-o $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.wasm
	@echo "v0.2 Standard Go Component compiled successfully: $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.wasm"
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y @bytecodealliance/jco transpile $(MATHS_BINDINGS_DIR)/build/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.wasm --tla-compat -o $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/stdgo/v0.1/export/native
	@PATH=$(BIN_DIR)/node/bin:$$PATH node -e "const fs = require('fs'); const file = '$(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('args_get: exports0[\'18\'],', 'args_get: (argvPtr, argvBufPtr) => 0,'); content = content.replace('args_sizes_get: exports0[\'19\'],', 'args_sizes_get: (argcPtr, argvBufSizePtr) => { const view = new DataView(exports1.memory.buffer); view.setUint32(argcPtr, 0, true); view.setUint32(argvBufSizePtr, 0, true); return 0; },'); content = content.replace('environ_get: exports0[\'21\'],', 'environ_get: (environPtr, environBufPtr) => 0,'); content = content.replace('environ_sizes_get: exports0[\'22\'],', 'environ_sizes_get: (envCountPtr, envBufSizePtr) => { const view = new DataView(exports1.memory.buffer); view.setUint32(envCountPtr, 0, true); view.setUint32(envBufSizePtr, 0, true); return 0; },'); content = content.replace('exports1FibonacciRecursive = exports1[\'fibonacci-recursive\'];', 'exports1FibonacciRecursive = exports1[\'fibonacci-recursive\']; if (exports1._initialize) exports1._initialize(); else if (exports1._start) exports1._start();'); content = content.replace('fetch(url).then(WebAssembly.compileStreaming)', 'fetch(url).then(res => res.arrayBuffer()).then(WebAssembly.compile)'); fs.writeFileSync(file, content);"
	@echo "Step 6: Bundling WASI Preview 2 Component for browser (stdgo)..."
	@mkdir -p $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/stdgo/v0.1/export/native
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y esbuild $(MATHS_BINDINGS_DIR)/js/all/_generated/jco/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.js --bundle --format=esm --platform=browser --external:node:* --minify --outfile=$(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/stdgo/v0.1/export/native/my_lib_maths_component.js
	@cd $(MATHS_BINDINGS_DIR)/js/all/_generated/standalone/v0.2/stdgo/v0.1/export/native && ln -sf ../../../../../../jco/v0.2/stdgo/v0.1/export/native/*.wasm .

build-wasm-v1:
	@echo "Step 1: Compiling Go code to WASI Preview 1 for v1 package..."
	@mkdir -p $(BUILD_DIR)/v1
	@GOWORK=off GOOS=wasip1 GOARCH=wasm $(GO_CMD) build -o $(BUILD_DIR)/v1/my_lib.wasm $(WASM_DIR)/v1
	@mkdir -p $(PY_V1_DIR)/my_lib/_generated
	@cd $(PY_V1_DIR)/my_lib/_generated && ln -sf ../../../../build/v1/my_lib.wasm .
	@mkdir -p $(NODE_V1_DIR)/my_lib/_generated
	@cd $(NODE_V1_DIR)/my_lib/_generated && ln -sf ../../../../build/v1/my_lib.wasm .
	@echo "v1 Compilation successful: $(BUILD_DIR)/v1/my_lib.wasm"

build-wasm-v2:
	@if [ ! -f $(WIT_BINDGEN) ] || [ ! -f $(WASM_TOOLS) ] || [ ! -f $(TINYGO) ]; then \
		echo "Error: Toolchain missing. Run 'make setup' first."; \
		exit 1; \
	fi
	
	@echo "Step 1: Generating Go WIT interfaces..."
	@mkdir -p $(WASM_DIR)/gen
	@$(WIT_BINDGEN) tiny-go $(WIT_DIR) --out-dir $(WASM_DIR)/gen
	
	@echo "Step 2: Compiling Go code via TinyGo..."
	@mkdir -p $(BUILD_DIR)/v2
	@GOWORK=off $(TINYGO) build -o $(BUILD_DIR)/v2/my_lib_raw.wasm -target=wasi $(WASM_DIR)/v2
	
	@echo "Step 3: Embedding WIT metadata..."
	@$(WASM_TOOLS) component embed $(WIT_DIR) $(BUILD_DIR)/v2/my_lib_raw.wasm \
		--world wasi-polyglot-reference \
		-o $(BUILD_DIR)/v2/my_lib_embedded.wasm
	
	@echo "Step 4: Translating to WASI Preview 2 Component..."
	@$(WASM_TOOLS) component new $(BUILD_DIR)/v2/my_lib_embedded.wasm \
		--adapt $(ADAPTER_WASM) \
		-o $(BUILD_DIR)/v2/my_lib_component.wasm
	@echo "v2 Component compiled successfully: $(BUILD_DIR)/v2/my_lib_component.wasm"
	@mkdir -p $(PY_V2_DIR)/my_lib/_generated
	@cd $(PY_V2_DIR)/my_lib/_generated && ln -sf ../../../../build/v2/my_lib_component.wasm .
	@echo "Step 5: Transpiling WASI Preview 2 Component to ES Modules for Node.js..."
	@mkdir -p $(JS_V2_DIR)/my_lib/_generated
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y @bytecodealliance/jco transpile $(BUILD_DIR)/v2/my_lib_component.wasm --map "ouvrage:lab-wasi-demo/host-http=../host-http.js" -o $(JS_V2_DIR)/my_lib/_generated

run: run-py-v1

run-py-v1:
	@echo "Running WASI Preview 1 JSON-RPC Python Unit Tests (pytest)..."
	@uv run --project $(PY_V1_DIR) pytest -v $(PY_V1_DIR)/tests

run-py-v2:
	@echo "Running WASI Preview 2 Component Model Python Unit Tests (pytest)..."
	@uv run --project $(PY_V2_DIR) pytest -v $(PY_V2_DIR)/tests

run-node-v1:
	@echo "Running WASI Preview 1 JSON-RPC Node.js Unit Tests (node --test)..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NODE_BIN) $(BIN_DIR)/node/bin/npm test --prefix $(NODE_V1_DIR)

run-node-v2:
	@echo "Running WASI Preview 2 Component Model Node.js Unit Tests (node --test)..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NODE_BIN) $(BIN_DIR)/node/bin/npm test --prefix $(JS_V2_DIR)

run-vite-sample:
	@echo "Installing Vite sample dependencies..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NODE_BIN) $(BIN_DIR)/node/bin/npm install --prefix $(JS_V2_DIR)/samples/vite
	@echo "Starting Vite development server..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) --prefix $(JS_V2_DIR)/samples/vite vite

run-webpack-sample:
	@echo "Installing Webpack sample dependencies..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NODE_BIN) $(BIN_DIR)/node/bin/npm install --prefix $(JS_V2_DIR)/samples/webpack
	@echo "Starting Webpack development server..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) --prefix $(JS_V2_DIR)/samples/webpack webpack serve --config $(JS_V2_DIR)/samples/webpack/webpack.config.js --mode development

copy-js-all:
	@echo "Copying unified js/all to docs/labs/my_lib_maths..."
	@mkdir -p docs/labs/my_lib_maths
	@rm -rf docs/labs/my_lib_maths/*
	@cp -rL $(MATHS_BINDINGS_DIR)/js/all/* docs/labs/my_lib_maths/
	@echo "Post-processing: Rewriting preview2-shim imports for browser Web Worker compatibility..."
	@find docs/labs/my_lib_maths/_generated/jco/v0.2/ -name "*.js" -type f -exec sed -i "s|@bytecodealliance/preview2-shim/|https://esm.sh/@bytecodealliance/preview2-shim@0.19.0/|g" {} +

clean:
	@rm -rf $(BIN_DIR)
	@rm -rf $(MY_LIB_BINDINGS_DIR)/build
	@rm -rf $(MATHS_BINDINGS_DIR)/build
	@rm -rf $(WASM_DIR)/gen
	@find $(LAB_DIR)/bindings -name "*.wasm" -delete
	@rm -rf $(JS_V2_DIR)/my_lib/_generated/interfaces
	@rm -f $(JS_V2_DIR)/my_lib/_generated/my_lib_component*
	@rm -rf $(MATHS_BINDINGS_DIR)/js/all/_generated
	@rm -rf $(MATHS_BINDINGS_DIR)/wasm/v0.2/tiny/v0.1/export/gen
	@rm -rf docs/labs/my_lib_maths
	@rm -f docs/labs/index.html
	@echo "Clean completed."
