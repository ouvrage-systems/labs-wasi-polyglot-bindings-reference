#!/usr/bin/env bash
set -euo pipefail

# Default configuration
DEST_DIR="./bin"
WIT_BINDGEN_VER="0.24.0"
WASM_TOOLS_VER="1.200.0"
WASMTIME_VER="18.0.2"
TINYGO_VER="0.41.1"
NODE_VER="22.12.0"

# Target installation flags
INSTALL_WIT_BINDGEN=false
INSTALL_WASM_TOOLS=false
INSTALL_ADAPTER=false
INSTALL_TINYGO=false
INSTALL_NODE=false
ANY_SPECIFIC=false

# Helper to check if next argument is a version string or a new flag
parse_version() {
  local default_ver="$1"
  local val="${2:-}"
  if [[ -n "${val}" && ! "${val}" =~ ^- ]]; then
    echo "${val}"
  else
    echo "${default_ver}"
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      DEST_DIR="$2"
      shift 2
      ;;
    --wit-bindgen)
      INSTALL_WIT_BINDGEN=true
      ANY_SPECIFIC=true
      WIT_BINDGEN_VER=$(parse_version "${WIT_BINDGEN_VER}" "${2:-}")
      if [[ $# -gt 1 && ! "$2" =~ ^- ]]; then shift 2; else shift; fi
      ;;
    --wasm-tools)
      INSTALL_WASM_TOOLS=true
      ANY_SPECIFIC=true
      WASM_TOOLS_VER=$(parse_version "${WASM_TOOLS_VER}" "${2:-}")
      if [[ $# -gt 1 && ! "$2" =~ ^- ]]; then shift 2; else shift; fi
      ;;
    --adapter)
      INSTALL_ADAPTER=true
      ANY_SPECIFIC=true
      WASMTIME_VER=$(parse_version "${WASMTIME_VER}" "${2:-}")
      if [[ $# -gt 1 && ! "$2" =~ ^- ]]; then shift 2; else shift; fi
      ;;
    --tinygo)
      INSTALL_TINYGO=true
      ANY_SPECIFIC=true
      TINYGO_VER=$(parse_version "${TINYGO_VER}" "${2:-}")
      if [[ $# -gt 1 && ! "$2" =~ ^- ]]; then shift 2; else shift; fi
      ;;
    --node)
      INSTALL_NODE=true
      ANY_SPECIFIC=true
      NODE_VER=$(parse_version "${NODE_VER}" "${2:-}")
      if [[ $# -gt 1 && ! "$2" =~ ^- ]]; then shift 2; else shift; fi
      ;;
    --all)
      INSTALL_WIT_BINDGEN=true
      INSTALL_WASM_TOOLS=true
      INSTALL_ADAPTER=true
      INSTALL_TINYGO=true
      INSTALL_NODE=true
      ANY_SPECIFIC=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dir <destination_directory>] [--wit-bindgen [version]] [--wasm-tools [version]] [--adapter [version]] [--tinygo [version]] [--node [version]] [--all]"
      exit 1
      ;;
  esac
done

# If no specific tools were requested, install everything (default behavior)
if [ "${ANY_SPECIFIC}" = false ]; then
  INSTALL_WIT_BINDGEN=true
  INSTALL_WASM_TOOLS=true
  INSTALL_ADAPTER=true
  INSTALL_TINYGO=true
  INSTALL_NODE=true
fi

echo "Setting up requested WASI/WASM tools inside: ${DEST_DIR}..."
mkdir -p "${DEST_DIR}"

# Packages cache layout inside the destination directory
PKG_DIR="${DEST_DIR}/packages"
mkdir -p "${PKG_DIR}"

# Detect OS & Architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Normalize architecture names
case "${ARCH}" in
  x86_64|amd64)
    ARCH_WIT="x86_64"
    ARCH_WASM="x86_64"
    ARCH_TINYGO="amd64"
    ARCH_NODE="x64"
    ;;
  aarch64|arm64)
    ARCH_WIT="aarch64"
    ARCH_WASM="aarch64"
    ARCH_TINYGO="arm64"
    ARCH_NODE="arm64"
    ;;
  *)
    echo "Unsupported architecture: ${ARCH}"
    exit 1
    ;;
esac

# Normalize OS names
case "${OS}" in
  linux)
    OS_WIT="linux"
    OS_WASM="linux"
    OS_TINYGO="linux"
    OS_NODE="linux"
    NODE_EXT="tar.xz"
    ;;
  darwin)
    OS_WIT="macos"
    OS_WASM="macos"
    OS_TINYGO="darwin"
    OS_NODE="darwin"
    NODE_EXT="tar.gz"
    ;;
  *)
    echo "Unsupported OS: ${OS}"
    exit 1
    ;;
esac

# 1. Download wit-bindgen-cli
if [ "${INSTALL_WIT_BINDGEN}" = true ]; then
  echo "Downloading wit-bindgen-cli v${WIT_BINDGEN_VER}..."
  WIT_EXTRACT_DIR="${PKG_DIR}/wit-bindgen/${WIT_BINDGEN_VER}"
  mkdir -p "${WIT_EXTRACT_DIR}"
  WIT_TAR="wit-bindgen-${WIT_BINDGEN_VER}-${ARCH_WIT}-${OS_WIT}.tar.gz"
  curl -sSfL "https://github.com/bytecodealliance/wit-bindgen/releases/download/v${WIT_BINDGEN_VER}/${WIT_TAR}" \
    | tar -xz --strip-components=1 -C "${WIT_EXTRACT_DIR}" "wit-bindgen-${WIT_BINDGEN_VER}-${ARCH_WIT}-${OS_WIT}/wit-bindgen"
  chmod +x "${WIT_EXTRACT_DIR}/wit-bindgen"
  
  # Link active binary in root bin/ directory
  ln -sf "./packages/wit-bindgen/${WIT_BINDGEN_VER}/wit-bindgen" "${DEST_DIR}/wit-bindgen"
fi

# 2. Download wasm-tools
if [ "${INSTALL_WASM_TOOLS}" = true ]; then
  echo "Downloading wasm-tools v${WASM_TOOLS_VER}..."
  WASM_TOOLS_EXTRACT_DIR="${PKG_DIR}/wasm-tools/${WASM_TOOLS_VER}"
  mkdir -p "${WASM_TOOLS_EXTRACT_DIR}"
  WASM_TOOLS_TAR="wasm-tools-${WASM_TOOLS_VER}-${ARCH_WASM}-${OS_WASM}.tar.gz"
  curl -sSfL "https://github.com/bytecodealliance/wasm-tools/releases/download/v${WASM_TOOLS_VER}/${WASM_TOOLS_TAR}" \
    | tar -xz --strip-components=1 -C "${WASM_TOOLS_EXTRACT_DIR}" "wasm-tools-${WASM_TOOLS_VER}-${ARCH_WASM}-${OS_WASM}/wasm-tools"
  chmod +x "${WASM_TOOLS_EXTRACT_DIR}/wasm-tools"
  
  # Link active binary in root bin/ directory
  ln -sf "./packages/wasm-tools/${WASM_TOOLS_VER}/wasm-tools" "${DEST_DIR}/wasm-tools"
fi

# 3. Download WASI Reactor Adapter
if [ "${INSTALL_ADAPTER}" = true ]; then
  echo "Downloading WASI Preview 1 -> Preview 2 Reactor Adapter v${WASMTIME_VER}..."
  ADAPTER_EXTRACT_DIR="${PKG_DIR}/adapter/${WASMTIME_VER}"
  mkdir -p "${ADAPTER_EXTRACT_DIR}"
  curl -sSfL -o "${ADAPTER_EXTRACT_DIR}/wasi_snapshot_preview1.reactor.wasm" \
    "https://github.com/bytecodealliance/wasmtime/releases/download/v${WASMTIME_VER}/wasi_snapshot_preview1.reactor.wasm"
  
  # Link active binary in root bin/ directory
  ln -sf "./packages/adapter/${WASMTIME_VER}/wasi_snapshot_preview1.reactor.wasm" "${DEST_DIR}/wasi_snapshot_preview1.wasm"
fi

# 4. Download TinyGo
if [ "${INSTALL_TINYGO}" = true ]; then
  echo "Downloading TinyGo v${TINYGO_VER}..."
  TINYGO_EXTRACT_DIR="${PKG_DIR}/tinygo/${TINYGO_VER}"
  rm -rf "${TINYGO_EXTRACT_DIR}"
  mkdir -p "${TINYGO_EXTRACT_DIR}"
  TINYGO_TAR="tinygo${TINYGO_VER}.${OS_TINYGO}-${ARCH_TINYGO}.tar.gz"
  curl -sSfL "https://github.com/tinygo-org/tinygo/releases/download/v${TINYGO_VER}/${TINYGO_TAR}" \
    | tar -xz --strip-components=1 -C "${TINYGO_EXTRACT_DIR}"
  
  # Link active directory in root bin/ directory
  ln -sf "./packages/tinygo/${TINYGO_VER}" "${DEST_DIR}/tinygo"
fi

# 5. Download Node.js
if [ "${INSTALL_NODE}" = true ]; then
  echo "Downloading Node.js v${NODE_VER}..."
  NODE_EXTRACT_DIR="${PKG_DIR}/node/${NODE_VER}"
  rm -rf "${NODE_EXTRACT_DIR}"
  mkdir -p "${NODE_EXTRACT_DIR}"
  NODE_TAR="node-v${NODE_VER}-${OS_NODE}-${ARCH_NODE}.${NODE_EXT}"
  if [ "${NODE_EXT}" = "tar.xz" ]; then
    curl -sSfL "https://nodejs.org/dist/v${NODE_VER}/${NODE_TAR}" | tar -xJ --strip-components=1 -C "${NODE_EXTRACT_DIR}"
  else
    curl -sSfL "https://nodejs.org/dist/v${NODE_VER}/${NODE_TAR}" | tar -xz --strip-components=1 -C "${NODE_EXTRACT_DIR}"
  fi
  
  # Link active directory in root bin/ directory
  ln -sf "./packages/node/${NODE_VER}" "${DEST_DIR}/node"
fi

echo "WASI/WASM Toolchain Setup Complete inside: ${DEST_DIR}"
