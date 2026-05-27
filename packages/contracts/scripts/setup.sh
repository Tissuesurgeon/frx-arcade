#!/usr/bin/env bash
set -euo pipefail

if ! command -v forge &>/dev/null; then
  echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"
  exit 1
fi

cd "$(dirname "$0")/.."

if [ ! -d lib/forge-std ]; then
  mkdir -p lib
  git clone --depth 1 https://github.com/foundry-rs/forge-std lib/forge-std
fi

if [ ! -d lib/openzeppelin-contracts ]; then
  git clone --depth 1 --branch v5.1.0 https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts
fi

if [ ! -d lib/v4-core ]; then
  git clone --depth 1 https://github.com/Uniswap/v4-core lib/v4-core
  (cd lib/v4-core && git submodule update --init --recursive)
fi

if [ ! -d lib/v4-periphery ]; then
  git clone --depth 1 https://github.com/Uniswap/v4-periphery lib/v4-periphery
fi

forge build
forge test
