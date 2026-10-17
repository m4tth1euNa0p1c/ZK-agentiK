FROM debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC MPLCONFIGDIR=/tmp/matplotlib
# Numerical oracle and standard scientific plotting only; no cryptographic implementation.
RUN apt-get update && apt-get install -y --no-install-recommends \
    octave python3 python3-matplotlib ca-certificates fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /work
