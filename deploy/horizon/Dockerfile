# The root repository uses Rust 1.93; this isolated laboratory is reproduced
# with the already measured Rust 1.98.0 image. No configuration enters a build.
FROM rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922 AS rust-build
WORKDIR /build/labs/horizon
COPY labs/horizon/Cargo.toml labs/horizon/Cargo.lock ./
COPY labs/horizon/proof ./proof
RUN cargo build --release --locked --package horizon-proof --bin horizon-proof-worker

# Docker Hub manifest index checked on 2026-10-17 with buildx imagetools inspect.
FROM node:24.11.1-bookworm-slim@sha256:48abc13a19400ca3985071e287bd405a1d99306770eb81d61202fb6b65cf0b57 AS node-build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/zk-mcp-sdk/package.json ./packages/zk-mcp-sdk/package.json
COPY packages/enterprise-gateway/package.json ./packages/enterprise-gateway/package.json
COPY packages/horizon-demo/package.json ./packages/horizon-demo/package.json
COPY packages/proofkit-sdk/package.json ./packages/proofkit-sdk/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY packages/proofkit-sdk/tsconfig.json ./packages/proofkit-sdk/tsconfig.json
COPY packages/proofkit-sdk/src ./packages/proofkit-sdk/src
COPY packages/horizon-demo/tsconfig.json ./packages/horizon-demo/tsconfig.json
COPY packages/horizon-demo/src ./packages/horizon-demo/src
COPY packages/horizon-demo/public ./packages/horizon-demo/public
RUN ./node_modules/.bin/tsc --project packages/proofkit-sdk/tsconfig.json && ./node_modules/.bin/tsc --project packages/horizon-demo/tsconfig.json

# Keep only this service's locked production dependency tree in the final image.
FROM node-build AS production-dependencies
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund --workspace=@zk-mcp/horizon-demo --include-workspace-root=false

FROM node:24.11.1-bookworm-slim@sha256:48abc13a19400ca3985071e287bd405a1d99306770eb81d61202fb6b65cf0b57 AS runtime
ENV NODE_ENV=production \
    HORIZON_WORKER=/usr/local/bin/horizon-proof-worker \
    HORIZON_BIND=0.0.0.0 \
    HORIZON_ORIGIN=http://127.0.0.1:38080 \
    HORIZON_DB=/data/authorization.sqlite \
    TZ=Etc/UTC
WORKDIR /app
RUN install -d -o node -g node /data /config
COPY --from=rust-build /build/labs/horizon/target/release/horizon-proof-worker /usr/local/bin/horizon-proof-worker
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=node-build /app/packages/proofkit-sdk/package.json ./packages/proofkit-sdk/package.json
COPY --from=node-build /app/packages/proofkit-sdk/dist ./packages/proofkit-sdk/dist
COPY --from=node-build /app/packages/horizon-demo/package.json ./packages/horizon-demo/package.json
COPY --from=node-build /app/packages/horizon-demo/dist ./packages/horizon-demo/dist
COPY --from=node-build /app/packages/horizon-demo/public ./packages/horizon-demo/public
COPY deploy/horizon/relay.mjs ./deploy/horizon/relay.mjs
USER node:node
EXPOSE 38080 38081
ENTRYPOINT ["node", "packages/horizon-demo/dist/server.js"]
CMD ["verifier", "/config/public.json"]
