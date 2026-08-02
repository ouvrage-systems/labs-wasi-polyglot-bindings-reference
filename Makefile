# Lab: WebAssembly/WASI Preview 2 component compilation Makefile
SHELL := /bin/bash

# Configuration and Paths
LAB_DIR := $(shell pwd)
BIN_DIR := $(LAB_DIR)/bin
WIT_DIR := $(LAB_DIR)/bindings/wit
WASM_DIR := $(LAB_DIR)/bindings/wasm
PY_V1_DIR := $(LAB_DIR)/bindings/py/v1
PY_V2_DIR := $(LAB_DIR)/bindings/py/v2
NODE_V1_DIR := $(LAB_DIR)/bindings/node/v1
JS_V2_DIR := $(LAB_DIR)/bindings/js/v2
JS_V0_DIR := $(LAB_DIR)/bindings/js/v0

# Executables
WIT_BINDGEN := $(BIN_DIR)/wit-bindgen
WASM_TOOLS := $(BIN_DIR)/wasm-tools
TINYGO := $(BIN_DIR)/tinygo/bin/tinygo
ADAPTER_WASM := $(BIN_DIR)/wasi_snapshot_preview1.wasm
NODE_BIN := $(BIN_DIR)/node/bin/node
NPX_BIN := $(BIN_DIR)/node/bin/npx

# Versions
WIT_BINDGEN_VER := 0.24.0
WASM_TOOLS_VER := 1.200.0
WASMTIME_VER := 18.0.2
TINYGO_VER := 0.41.1
NODE_VER := 22.12.0

.PHONY: help setup build test run-py-v1 run-py-v2 run-node-v1 run-node-v2 clean

help:
	@echo "WASI Polyglot Bindings Lab Automation"
	@echo "======================================"
	@echo "make setup    - Download local precompiled WASM tools, tinygo & node into bin/"
	@echo "make build    - Build all target packages (v1 binaries + v2 components)"
	@echo "make run-py-v1   - Run the v1 JSON-RPC Python tests"
	@echo "make run-py-v2   - Run the v2 Component Model Python tests"
	@echo "make run-node-v1 - Run the v1 JSON-RPC Node.js tests"
	@echo "make run-node-v2 - Run the v2 Component Model Node.js tests"
	@echo "make clean    - Remove local bin/ and compiled .wasm artifacts"

setup:
	@./tools/bootstrap-wasi.sh --dir $(BIN_DIR)

build: build-wasm-v0 build-wasm-v1 build-wasm-v2

test: run-py-v1 run-py-v2 run-node-v1 run-node-v2

build-wasm-v0:
	@echo "Compiling Go code to pure WASM (v0) for browser target..."
	@mkdir -p $(JS_V0_DIR)/my_lib/_generated
	@GOWORK=off $(TINYGO) build -o $(JS_V0_DIR)/my_lib/_generated/my_lib_v0.wasm -target=wasm ./bindings/wasm/v0
	@echo "v0 Compilation successful: $(JS_V0_DIR)/my_lib/_generated/my_lib_v0.wasm"

build-wasm-v1:
	@echo "Step 1: Compiling Go code to WASI Preview 1 for v1 package..."
	@mkdir -p $(PY_V1_DIR)/my_lib/_generated
	@mkdir -p $(NODE_V1_DIR)/my_lib/_generated
	@GOWORK=off GOOS=wasip1 GOARCH=wasm go build -o $(PY_V1_DIR)/my_lib/_generated/my_lib.wasm ./bindings/wasm/v1
	@cp $(PY_V1_DIR)/my_lib/_generated/my_lib.wasm $(NODE_V1_DIR)/my_lib/_generated/my_lib.wasm
	@echo "v1 Compilation successful: $(PY_V1_DIR)/my_lib/_generated/my_lib.wasm"

build-wasm-v2:
	@if [ ! -f $(WIT_BINDGEN) ] || [ ! -f $(WASM_TOOLS) ] || [ ! -f $(TINYGO) ]; then \
		echo "Error: Toolchain missing. Run 'make setup' first."; \
		exit 1; \
	fi
	
	@echo "Step 1: Generating Go WIT interfaces..."
	@mkdir -p $(WASM_DIR)/gen
	@$(WIT_BINDGEN) tiny-go $(WIT_DIR) --out-dir $(WASM_DIR)/gen
	
	@echo "Step 2: Compiling Go code via TinyGo..."
	@GOWORK=off $(TINYGO) build -o $(WASM_DIR)/my_lib_raw.wasm -target=wasi ./bindings/wasm/v2
	
	@echo "Step 3: Embedding WIT metadata..."
	@$(WASM_TOOLS) component embed $(WIT_DIR) $(WASM_DIR)/my_lib_raw.wasm \
		--world wasi-polyglot-reference \
		-o $(WASM_DIR)/my_lib_embedded.wasm
	
	@echo "Step 4: Translating to WASI Preview 2 Component..."
	@mkdir -p $(PY_V2_DIR)/my_lib/_generated
	@$(WASM_TOOLS) component new $(WASM_DIR)/my_lib_embedded.wasm \
		--adapt $(ADAPTER_WASM) \
		-o $(PY_V2_DIR)/my_lib/_generated/my_lib_component.wasm
	@echo "v2 Component compiled successfully: $(PY_V2_DIR)/my_lib/_generated/my_lib_component.wasm"
	@echo "Step 5: Transpiling WASI Preview 2 Component to ES Modules for Node.js..."
	@PATH=$(BIN_DIR)/node/bin:$$PATH $(NPX_BIN) -y @bytecodealliance/jco transpile $(PY_V2_DIR)/my_lib/_generated/my_lib_component.wasm --map "ouvrage:lab-wasi-demo/host-http=../host-http.js" -o $(JS_V2_DIR)/my_lib/_generated

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

clean:
	@rm -rf $(BIN_DIR)
	@rm -rf $(WASM_DIR)/gen $(WASM_DIR)/my_lib_raw.wasm
	@rm -f $(PY_V1_DIR)/my_lib/_generated/my_lib.wasm
	@rm -f $(PY_V2_DIR)/my_lib/_generated/my_lib_component.wasm
	@rm -f $(NODE_V1_DIR)/my_lib/_generated/my_lib.wasm
	@rm -rf $(JS_V2_DIR)/my_lib/_generated
	@rm -rf $(JS_V0_DIR)/my_lib/_generated
	@echo "Clean completed."
