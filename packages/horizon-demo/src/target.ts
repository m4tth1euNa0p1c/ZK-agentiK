import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * H14 remote sandbox target. A SEPARATE durable process from the controller: its own
 * SQLite file, an idempotency key (the business operation id), an exact version
 * precondition per object, a status endpoint and a fence primitive for reconciliation.
 * It records synthetic claim decisions only; no payment, provision or external system.
 */
const token = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:/-]+$/);
const hex64 = z.string().regex(/^[0-9a-f]{64}$/);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
/** Operation and object identifiers never contain a slash: the routes are unambiguous. */
const identifier = /^[A-Za-z0-9._:-]{1,128}$/;
export const TargetRecordRequest = z.strictObject({ object_id: token.regex(identifier), tenant: token, bundle_hash: hex64,
  /** Authorization deadline carried to the target: a late write is refused there, by the target's own clock. */
  expires_at_ms: uint });
export type TargetRecordRequest = z.infer<typeof TargetRecordRequest>;

/** Every outcome the controller can rely on. `unknown` is never inferred from a business answer. */
export type RecordOutcome =
  | { outcome: 'recorded'; version: number }
  | { outcome: 'replayed'; version: number }
  | { outcome: 'conflict' }
  | { outcome: 'stale'; version: number }
  | { outcome: 'expired' }
  | { outcome: 'fenced' }
  | { outcome: 'unknown'; reason: string };
export type FenceOutcome =
  | { outcome: 'recorded'; bundle_hash: string }
  | { outcome: 'fenced' }
  | { outcome: 'unknown'; reason: string };
const RecordAnswer = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('recorded'), version: z.number().int().min(0) }),
  z.strictObject({ outcome: z.literal('replayed'), version: z.number().int().min(0) }),
  z.strictObject({ outcome: z.literal('conflict') }),
  z.strictObject({ outcome: z.literal('stale'), version: z.number().int().min(0) }),
  z.strictObject({ outcome: z.literal('expired') }),
  z.strictObject({ outcome: z.literal('fenced') }),
]);
const FenceAnswer = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('recorded'), bundle_hash: hex64 }),
  z.strictObject({ outcome: z.literal('fenced') }),
]);
const VersionAnswer = z.strictObject({ version: z.number().int().min(0) });

/** Server-side fault injection for tests. Never reachable from a request. */
export type TargetFault = 'drop_ack' | 'crash_before_commit';

export interface SandboxTargetOptions { databasePath: string; clock?: () => number }

function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.length; if (bytes > 4096) throw new Error('BODY_TOO_LARGE');
    chunks.push(buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown : {};
}

export function createSandboxTarget(options: SandboxTargetOptions) {
  const clock = options.clock ?? Date.now;
  const db = new DatabaseSync(options.databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS records(operation_id TEXT PRIMARY KEY, object_id TEXT NOT NULL, tenant TEXT NOT NULL,
      bundle_hash TEXT NOT NULL, version INTEGER NOT NULL, at_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS objects(object_id TEXT PRIMARY KEY, version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS fences(operation_id TEXT PRIMARY KEY, at_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS requests(sequence INTEGER PRIMARY KEY, method TEXT NOT NULL, path TEXT NOT NULL,
      outcome TEXT NOT NULL, at_ms INTEGER NOT NULL);`);
  const faults = new Map<string, TargetFault>();
  const transaction = <T>(work: () => T): T => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const log = (method: string, path: string, outcome: string) =>
    db.prepare('INSERT INTO requests(method,path,outcome,at_ms) VALUES(?,?,?,?)').run(method, path, outcome, clock());
  const version = (objectId: string) => Number(db.prepare('SELECT version FROM objects WHERE object_id=?').get(objectId)?.['version'] ?? 0);

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const url = request.url ?? ''; const method = request.method ?? '';
    try {
      const record = /^\/records\/([A-Za-z0-9._:-]{1,128})$/.exec(url);
      const fence = /^\/records\/([A-Za-z0-9._:-]{1,128})\/fence$/.exec(url);
      const object = /^\/objects\/([A-Za-z0-9._:-]{1,128})$/.exec(url);
      if (method === 'GET' && url === '/health') return send(response, 200, { role: 'target', sandbox: true });
      if (method === 'GET' && object?.[1]) return send(response, 200, { version: version(object[1]) });
      if (method === 'GET' && record?.[1]) {
        const row = db.prepare('SELECT bundle_hash,version,at_ms FROM records WHERE operation_id=?').get(record[1]);
        return row ? send(response, 200, { outcome: 'recorded', bundle_hash: row['bundle_hash'], version: row['version'] })
          : send(response, 404, { outcome: 'absent' });
      }
      if (method === 'PUT' && record?.[1]) {
        const operationId = record[1];
        if (request.headers['content-type'] !== 'application/json') throw new Error('CONTENT_TYPE');
        const input = TargetRecordRequest.parse(await body(request));
        const precondition = Number(z.string().regex(/^(0|[1-9][0-9]{0,11})$/).parse(request.headers['if-match']));
        const fault = faults.get(operationId);
        if (fault === 'crash_before_commit') { faults.delete(operationId); log(method, url, 'crash_before_commit'); return response.destroy(); }
        const [status, answer] = transaction((): [number, RecordOutcome] => {
          if (db.prepare('SELECT operation_id FROM fences WHERE operation_id=?').get(operationId)) return [409, { outcome: 'fenced' }];
          const existing = db.prepare('SELECT bundle_hash,version FROM records WHERE operation_id=?').get(operationId);
          if (existing) return existing['bundle_hash'] === input.bundle_hash
            ? [200, { outcome: 'replayed', version: Number(existing['version']) }] : [409, { outcome: 'conflict' }];
          if (clock() >= input.expires_at_ms) return [410, { outcome: 'expired' }];
          const current = version(input.object_id);
          if (current !== precondition) return [412, { outcome: 'stale', version: current }];
          const next = current + 1;
          db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)').run(operationId, input.object_id, input.tenant, input.bundle_hash, next, clock());
          db.prepare('INSERT INTO objects VALUES(?,?) ON CONFLICT(object_id) DO UPDATE SET version=excluded.version').run(input.object_id, next);
          return [201, { outcome: 'recorded', version: next }];
        });
        log(method, url, answer.outcome);
        if (fault === 'drop_ack') { faults.delete(operationId); return response.destroy(); } // committed, acknowledgement lost
        return send(response, status, answer);
      }
      if (method === 'POST' && fence?.[1]) {
        const operationId = fence[1];
        const answer = transaction((): FenceOutcome => {
          const existing = db.prepare('SELECT bundle_hash FROM records WHERE operation_id=?').get(operationId);
          if (existing) return { outcome: 'recorded', bundle_hash: String(existing['bundle_hash']) };
          db.prepare('INSERT OR IGNORE INTO fences VALUES(?,?)').run(operationId, clock());
          return { outcome: 'fenced' };
        });
        log(method, url, answer.outcome);
        return send(response, 200, answer);
      }
      send(response, 404, { error: 'NOT_FOUND' });
    } catch { if (!response.headersSent) send(response, 400, { error: 'REQUEST_REJECTED' }); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000;
  const count = (sql: string) => Number(db.prepare(sql).get()?.['n']);
  return {
    server, db, faults,
    /** Observable counters for tests: durable effects and received mutation attempts. */
    effects: () => count('SELECT count(*) AS n FROM records'),
    attempts: () => count("SELECT count(*) AS n FROM requests WHERE method='PUT'"),
    close: async () => { await new Promise<void>(resolve => server.close(() => resolve())); db.close(); },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const databasePath = process.argv[2] ?? process.env['HORIZON_TARGET_DB'] ?? '.tools/horizon/demo/target.sqlite';
  const target = createSandboxTarget({ databasePath });
  const port = Number(process.env['PORT'] ?? 38082);
  target.server.listen(port, process.env['HORIZON_BIND'] ?? '127.0.0.1', () => process.stdout.write(`Horizon sandbox target on port ${port}\n`));
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { void target.close().then(() => process.exit(0)); });
}

/** Controller-side client. One attempt per call; every transport failure is `unknown`. Never retries. */
export class RemoteTarget {
  constructor(private readonly baseUrl: string, private readonly timeoutMs = 5000) {
    z.string().url().parse(baseUrl); z.number().int().min(100).max(60000).parse(timeoutMs);
  }
  private async call(method: string, path: string, init: { body?: unknown; headers?: Record<string, string> } = {}): Promise<{ status: number; value: unknown } | undefined> {
    try {
      const response = await fetch(this.baseUrl + path, { method, signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'Content-Type': 'application/json', ...init.headers },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }) });
      const text = await response.text();
      return { status: response.status, value: text ? JSON.parse(text) as unknown : {} };
    } catch { return undefined; }
  }
  /** Current object version, or undefined when the target cannot be read. */
  async version(objectId: string): Promise<number | undefined> {
    const answer = await this.call('GET', `/objects/${encodeURIComponent(objectId)}`);
    if (!answer || answer.status !== 200) return undefined;
    const parsed = VersionAnswer.safeParse(answer.value); return parsed.success ? parsed.data.version : undefined;
  }
  async record(operationId: string, request: TargetRecordRequest, ifMatch: number): Promise<RecordOutcome> {
    const answer = await this.call('PUT', `/records/${encodeURIComponent(operationId)}`, { body: request, headers: { 'If-Match': String(ifMatch) } });
    if (!answer) return { outcome: 'unknown', reason: 'TRANSPORT' };
    const parsed = RecordAnswer.safeParse(answer.value);
    if (!parsed.success || ![200, 201, 409, 410, 412].includes(answer.status)) return { outcome: 'unknown', reason: `STATUS_${answer.status}` };
    return parsed.data;
  }
  /** Identity of the target a reservation was dispatched to; persisted by the controller. */
  get url(): string { return this.baseUrl; }
  async fence(operationId: string): Promise<FenceOutcome> {
    const answer = await this.call('POST', `/records/${encodeURIComponent(operationId)}/fence`);
    if (!answer) return { outcome: 'unknown', reason: 'TRANSPORT' };
    const parsed = FenceAnswer.safeParse(answer.value);
    if (!parsed.success || answer.status !== 200) return { outcome: 'unknown', reason: `STATUS_${answer.status}` };
    return parsed.data;
  }
}
