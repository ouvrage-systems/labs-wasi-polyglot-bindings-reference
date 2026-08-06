# Lab: WebAssembly/WASI Preview 2 component compilation Makefile
SHELL := /bin/bash

# Configuration and Paths
LAB_DIR := $(shell pwd)
BIN_DIR := $(LAB_DIR)/bin
BUILD_DIR := bindings/build
BUILD_V0_DIR := $(LAB_DIR)/bindings/build/v0
BUILD_V0_TINY_DIR := $(BUILD_V0_DIR)/tiny
BUILD_V0_LEGACY_DIR := $(BUILD_V0_DIR)/legacy


WIT_DIR := $(LAB_DIR)/bindings/wit
WASM_DIR := $(LAB_DIR)/bindings/wasm
PY_V1_DIR := $(LAB_DIR)/bindings/py/v1
PY_V2_DIR := $(LAB_DIR)/bindings/py/v2
NODE_V1_DIR := $(LAB_DIR)/bindings/node/v1
JS_V2_DIR := $(LAB_DIR)/bindings/js/v2



JS_V0_DIR := $(LAB_DIR)/bindings/js/v0
JS_V0_TINY_DIR := $(JS_V0_DIR)/tiny
JS_V0_LEGACY_DIR := $(JS_V0_DIR)/legacy

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

build: build-wasm-v0-tiny build-wasm-v0-legacy build-wasm-v1 build-wasm-v2

test: run-py-v1 run-py-v2 run-node-v1 run-node-v2

build-wasm-v0-tiny:
	@echo "Compiling Go code to pure WASM (v0-tinygo) for browser target..."
	@mkdir -p $(BUILD_V0_TINY_DIR)
	@GOWORK=off $(TINYGO) build -scheduler=none -tags noscheduler -o $(BUILD_V0_TINY_DIR)/my_lib_maths.wasm -target=wasm ./bindings/wasm/v0/tiny
	@GOWORK=off $(TINYGO) build -scheduler=asyncify -o $(BUILD_V0_TINY_DIR)/my_lib_maths_asyncify.wasm -target=wasm ./bindings/wasm/v0/tiny
	@mkdir -p $(JS_V0_TINY_DIR)/my_lib/_generated
	@cd $(JS_V0_TINY_DIR)/my_lib/_generated && ln -sf ../../../../../build/v0/tiny/my_lib_maths.wasm .
	@cd $(JS_V0_TINY_DIR)/my_lib/_generated && ln -sf ../../../../../build/v0/tiny/my_lib_maths_asyncify.wasm .
	@echo "v0-tiny Compilation successful: none     - $(BUILD_V0_TINY_DIR)/my_lib_maths.wasm"
	@echo "v0-tiny Compilation successful: asyncify - $(BUILD_V0_TINY_DIR)/my_lib_maths_asyncify.wasm"



build-wasm-v0-legacy:
	@echo "Compiling Go code to pure WASM (v0-legacy) for browser target..."
	@mkdir -p $(BUILD_V0_LEGACY_DIR)
	@GOWORK=off GOOS=js GOARCH=wasm go build -o $(BUILD_V0_LEGACY_DIR)/my_lib_maths.wasm ./bindings/wasm/v0/legacy
	@mkdir -p $(JS_V0_LEGACY_DIR)/my_lib/_generated
	@cd $(JS_V0_LEGACY_DIR)/my_lib/_generated && ln -sf ../../../../../build/v0/legacy/my_lib_maths.wasm .
	@echo "v0-legacy Compilation successful: $(BUILD_V0_LEGACY_DIR)/my_lib_maths.wasm"
	@echo "v0-legacy JS lnk = $(JS_V0_LEGACY_DIR)/my_lib/_generated/my_lib_maths.wasm -> bindings/wasm/v0/legacy/my_lib_maths.wasm"


build-wasm-v0: build-wasm-v0-tiny build-wasm-v0-legacy


build-wasm-v1:
	@echo "Step 1: Compiling Go code to WASI Preview 1 for v1 package..."
	@mkdir -p $(BUILD_DIR)/v1
	@GOWORK=off GOOS=wasip1 GOARCH=wasm go build -o $(BUILD_DIR)/v1/my_lib.wasm ./bindings/wasm/v1
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
	@GOWORK=off $(TINYGO) build -o $(BUILD_DIR)/v2/my_lib_raw.wasm -target=wasi ./bindings/wasm/v2
	
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

clean:
	@rm -rf $(BIN_DIR)
	@rm -rf $(LAB_DIR)/$(BUILD_DIR)
	@rm -rf $(WASM_DIR)/gen
	@find $(LAB_DIR)/bindings -name "*.wasm" -delete
	@rm -rf $(JS_V2_DIR)/my_lib/_generated/interfaces
	@rm -f $(JS_V2_DIR)/my_lib/_generated/my_lib_component*
	@echo "Clean completed."

