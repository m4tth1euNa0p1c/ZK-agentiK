FROM rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922 AS rust
# CUDA 12.8 is the first toolkit supporting Blackwell compute capability 12.0.
# Pinned linux/amd64 manifest of 12.8.1-devel-ubuntu24.04.
FROM nvidia/cuda@sha256:4b9ed5fa8361736996499f64ecebf25d4ec37ff56e4d11323ccde10aa36e0c43
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates curl git libssl-dev pkg-config clang cmake python3 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=rust /usr/local/cargo /usr/local/cargo
COPY --from=rust /usr/local/rustup /usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo RUSTUP_HOME=/usr/local/rustup RUSTUP_TOOLCHAIN=1.98.0 \
    PATH=/usr/local/cargo/bin:/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    CARGO_BUILD_JOBS=1 RAYON_NUM_THREADS=8 NVCC_APPEND_FLAGS=-arch=sm_120 \
    RISC0_DEV_MODE=0 RISC0_DEFAULT_PROVER_NUM_GPUS=1
WORKDIR /lab
CMD ["sleep", "infinity"]
