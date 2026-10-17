FROM debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC
# Build tools only. No cryptographic implementation or runtime is replaced.
RUN apt-get update && apt-get install -y --no-install-recommends \
    octave texlive-latex-base texlive-latex-recommended texlive-fonts-recommended \
    lmodern poppler-utils python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /work
