#!/usr/bin/env bash
set -euo pipefail
mkdir -p /lab /root/.risc0/bin
if [ ! -x /root/.risc0/bin/rzup ]; then
  curl -fsSL --retry 3 https://risc0-artifacts.s3.us-west-2.amazonaws.com/rzup/prod/Linux-X64/rzup -o /root/.risc0/bin/rzup
fi
# Observed official installer artifact pinned for reproducibility. If upstream
# moves the URL, fail closed and review the new release instead of silently updating.
printf '%s  %s\n' 7cdc1dd5d4b8ef38ea6170c45bd29ba65d389f0e96b365da61631d1fc5c6c1ca /root/.risc0/bin/rzup | sha256sum -c -
chmod +x /root/.risc0/bin/rzup
/root/.risc0/bin/rzup install rust 1.97.0
/root/.risc0/bin/rzup install r0vm 3.0.6
printf '%s  %s\n' 751b9b188d341e8bec5e02060086b7b1dc3f7289e90f726c38589bb6735dd6d7 /root/.risc0/extensions/v3.0.6-cargo-risczero-x86_64-unknown-linux-gnu/r0vm | sha256sum -c -
rustup component add clippy
mkdir -p /lab/source/tests
cp /workspace/Cargo.toml /workspace/Cargo.lock /lab/source/
cp -r /workspace/crates /workspace/labs /lab/source/
cp -r /workspace/tests/fixtures /lab/source/tests/
cd /lab/source/labs/risc0
RISC0_BUILD_LOCKED=1 cargo build --release --locked -p lab-host -p lab-verifier
