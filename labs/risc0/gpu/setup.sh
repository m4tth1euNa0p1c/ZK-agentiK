#!/usr/bin/env bash
set -euo pipefail
export CARGO_BUILD_JOBS=1
test "${RISC0_DEV_MODE:-0}" = 0 || { echo DEV_MODE_FORBIDDEN >&2; exit 1; }
mkdir -p /lab/provenance
dpkg-query -W -f='${Package}\t${Version}\n' > /lab/provenance/packages.txt
nvcc --version > /lab/provenance/nvcc.txt
rustc --version --verbose > /lab/provenance/rust-host.txt
nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader > /lab/provenance/gpu.txt
# Reuse the unchanged lab and pinned guest toolchain. Only this container's
# r0vm executable will be replaced; historical CPU containers/files stay intact.
if [ ! -f /lab/provenance/cpu-lab-built ]; then
  CARGO_TARGET_DIR=/lab/target bash /workspace/labs/risc0/setup.sh
  touch /lab/provenance/cpu-lab-built
fi
cd /lab/source
find crates labs/risc0 -type f -not -path '*/target/*' -print0 | sort -z | xargs -0 sha256sum > /lab/provenance/copied-source.sha256
if [ ! -d /lab/upstream/.git ]; then
  git clone --depth 1 --branch v3.0.6 https://github.com/risc0/risc0.git /lab/upstream
fi
cd /lab/upstream
test "$(git rev-parse HEAD)" = 1cc70cf05033a79ebc90f07c679cb4bd1cd301b9
git diff --exit-code
git rev-parse HEAD > /lab/provenance/upstream-commit.txt
# CUDA is a compile-time branch for segment proving (no CPU fallback).
# disable-dev-mode is also compiled into the actual external prover.
CARGO_TARGET_DIR=/lab/cuda-target cargo build --release --locked \
  -p risc0-r0vm --features cuda,disable-dev-mode
cp /lab/cuda-target/release/r0vm /root/.risc0/extensions/v3.0.6-cargo-risczero-x86_64-unknown-linux-gnu/r0vm
sha256sum Cargo.lock /lab/cuda-target/release/r0vm \
  /lab/target/release/lab-host /lab/target/release/lab-verifier \
  /lab/source/labs/risc0/Cargo.lock > /lab/provenance/binaries.sha256
cargo tree --locked -p risc0-r0vm --features cuda,disable-dev-mode -e features > /lab/provenance/prover-features.txt
find /lab/target -type f -name '*.elf' -exec sha256sum '{}' + > /lab/provenance/guest-elf.sha256
touch /lab/provenance/setup-complete
