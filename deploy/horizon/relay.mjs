import { createServer, request as upstreamRequest } from 'node:http';
import { Transform, pipeline } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// No upstream URL, hostname or port is read from a client or environment.
// This process owns no source configuration, witness, database or credentials.
const TARGETS = Object.freeze({
  verifier: Object.freeze({ hostname: 'verifier', port: 38080, routes: Object.freeze({
    GET: ['/', '/app.js', '/style.css', '/api/state', '/health'],
    POST: ['/api/challenge', '/api/execute', '/api/revoke', '/api/rotate-policy', '/api/reconcile'],
  }) }),
  prover: Object.freeze({ hostname: 'prover', port: 38081, routes: Object.freeze({
    GET: ['/health'], POST: ['/api/prove'],
  }) }),
});
const MAX_BODY = 65535;
const MAX_RESPONSE = 4 * 1024 * 1024;
const MAX_IN_FLIGHT = 8;
const TOTAL_TIMEOUT_MS = 32000;
const EXPECTED_ORIGIN = 'http://127.0.0.1:38080';
const REQUEST_HEADERS = ['accept', 'content-type', 'origin', 'authorization', 'cookie',
  'access-control-request-method', 'access-control-request-headers', 'cache-control',
  'if-none-match', 'if-modified-since'];
const HOP_HEADERS = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade'];

function responseHeaders(headers) {
  const blocked = new Set(HOP_HEADERS);
  for (const token of String(headers.connection ?? '').split(',')) blocked.add(token.trim().toLowerCase());
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !blocked.has(name.toLowerCase())));
}

/** Only the two named roles are selectable by trusted startup code. */
export function createRelayServer(role) {
  if (!Object.hasOwn(TARGETS, role)) throw new Error('UNKNOWN_RELAY_ROLE');
  const target = TARGETS[role];
  let inFlight = 0;
  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    let upstream;
    let upstreamResponse;
    let forwarded = false;
    let completed = false;
    let counted = false;
    let timer;

    const finish = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      if (counted) inFlight--;
      upstream?.destroy();
      upstreamResponse?.destroy();
    };
    const reject = (status, code) => {
      if (response.destroyed || response.writableEnded) return;
      if (response.headersSent) { response.destroy(); return; }
      const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', Connection: 'close' };
      if (request.headers.origin === EXPECTED_ORIGIN) headers['Access-Control-Allow-Origin'] = EXPECTED_ORIGIN;
      response.writeHead(status, headers);
      // The backend may have committed an operation before the connection failed.
      // A transport error never permits retrying the mutation automatically.
      response.end(JSON.stringify({ error: code, result_unknown: forwarded && request.method === 'POST' }));
    };
    response.once('finish', finish);
    response.once('close', finish);
    request.once('aborted', () => { response.destroy(); finish(); });

    const path = request.url ?? '';
    const allowed = ((request.method === 'GET' || request.method === 'POST') && target.routes[request.method].includes(path))
      || (request.method === 'OPTIONS' && target.routes.POST.includes(path));
    // Exact paths reject absolute-form URLs, queries, fragments and CONNECT tunnels.
    if (!allowed) { request.resume(); reject(404, 'RELAY_ROUTE_REJECTED'); return; }
    if (inFlight >= MAX_IN_FLIGHT) { request.resume(); reject(429, 'RELAY_CAPACITY_REACHED'); return; }
    const length = request.headers['content-length'];
    if (length !== undefined && (!/^(0|[1-9][0-9]*)$/.test(length) || Number(length) > MAX_BODY)) {
      request.resume(); reject(413, 'RELAY_BODY_TOO_LARGE'); return;
    }
    counted = true;
    inFlight++;
    timer = setTimeout(() => {
      reject(504, 'RELAY_TIMEOUT');
      upstream?.destroy();
      upstreamResponse?.destroy();
    }, TOTAL_TIMEOUT_MS);

    try {
      // Read at most 64 KiB before opening an upstream request. Incomplete or
      // over-limit bodies cannot partially dispatch an operation to a backend.
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY) { reject(413, 'RELAY_BODY_TOO_LARGE'); return; }
        chunks.push(chunk);
      }
      if (completed || response.writableEnded || response.destroyed) return;
      const body = Buffer.concat(chunks, size);
      const headers = {};
      for (const name of REQUEST_HEADERS) {
        if (request.headers[name] !== undefined) headers[name] = request.headers[name];
      }
      headers.host = `${target.hostname}:${target.port}`;
      headers['content-length'] = String(body.length);
      upstream = upstreamRequest({ hostname: target.hostname, port: target.port,
        method: request.method, path, headers, agent: false }, source => {
        upstreamResponse = source;
        const declaredSize = source.headers['content-length'];
        if (declaredSize !== undefined && Number(declaredSize) > MAX_RESPONSE) {
          reject(502, 'RELAY_RESPONSE_TOO_LARGE'); source.destroy(); return;
        }
        if (completed || response.destroyed || response.writableEnded) { source.destroy(); return; }
        response.writeHead(source.statusCode ?? 502, responseHeaders(source.headers));
        let received = 0;
        const limiter = new Transform({ transform(chunk, _encoding, callback) {
          received += chunk.length;
          callback(received > MAX_RESPONSE ? new Error('RELAY_RESPONSE_TOO_LARGE') : null, chunk);
        } });
        // pipeline propagates downstream backpressure and closes all streams on
        // truncation/disconnect; it does not buffer an entire response in memory.
        pipeline(source, limiter, response, error => { if (error) response.destroy(); });
      });
      upstream.once('error', () => reject(502, 'RELAY_UPSTREAM_UNAVAILABLE'));
      forwarded = true;
      upstream.end(body);
    } catch {
      reject(400, 'RELAY_REQUEST_INCOMPLETE');
      upstream?.destroy();
    }
  });
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.keepAliveTimeout = 1000;
  server.maxRequestsPerSocket = 100;
  server.maxConnections = 64;
  const refuseTunnel = (_request, socket) => socket.end('HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  server.on('connect', refuseTunnel);
  server.on('upgrade', refuseTunnel);
  server.on('checkContinue', (_request, response) => {
    response.writeHead(417, { Connection: 'close' }); response.end();
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const servers = Object.keys(TARGETS).map(role => {
    const server = createRelayServer(role);
    server.listen(TARGETS[role].port, '0.0.0.0', () => {
      process.stdout.write(`Horizon local relay ${role} on port ${TARGETS[role].port}\n`);
    });
    return server;
  });
  const close = () => {
    for (const server of servers) server.close();
    setTimeout(() => {
      for (const server of servers) server.closeAllConnections();
    }, 8000).unref();
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
}
