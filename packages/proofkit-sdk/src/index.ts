import { z } from 'zod';

const token = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:/-]+$/);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const Binding = z.object({ nonce: z.string().regex(/^[0-9a-f]{64}$/),
  tenant: token, audience: token, action: token, operation_id: token,
  issued_at_ms: uint, expires_at_ms: uint });
export type Binding = z.infer<typeof Binding>;
const Invocation = z.strictObject({ nonce: z.string().regex(/^[0-9a-f]{64}$/),
  presentation: z.record(z.string(), z.unknown()) });

export type Awaitable<T> = T | Promise<T>;
export type EvidenceKind = 'zk' | 'signed-attestation' | 'simulation';

/** These adapters are trusted server code, never deserialized from tool arguments.
 * authorize MUST atomically recheck freshness/revocation, consume nonce AND operation,
 * and retain uncertain outcomes. This generic API cannot supply a remote API's atomicity.
 */
export interface ToolAuthority<I, E extends Binding, V, R> {
  issue(input: I): Awaitable<unknown>;
  expected(nonce: string): Awaitable<unknown>;
  verify(presentation: Readonly<Record<string, unknown>>, expected: Readonly<E>): Awaitable<unknown>;
  authorize(expected: Readonly<E>, verified: Readonly<V>): Awaitable<R>;
}

export interface ToolDefinition<I, E extends Binding, V, R> {
  name: string;
  profile: string;
  evidenceKind: EvidenceKind;
  environment: 'sandbox' | 'production';
  input: z.ZodType<I>;
  challenge: z.ZodType<E>;
  verified: z.ZodType<V>;
  authority: ToolAuthority<I, E, V, R>;
  clock?: () => number;
  maxInFlight?: number;
  maxInputBytes?: number;
  maxChallengeTtlMs?: number;
}

export class ToolError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'CAPACITY' | 'EXPIRED' | 'REJECTED' | 'RESULT_UNKNOWN') {
    super(code); this.name = 'ToolError';
  }
}

/** Reject non-JSON values and resource abuse before copying across asynchronous steps. */
function snapshot<T>(value: T, maxBytes: number): T {
  let nodes = 0; let lowerBoundBytes = 0;
  const ancestors = new Set<object>();
  const walk = (item: unknown, depth: number): void => {
    if (++nodes > 10000 || depth > 32) throw new ToolError('INVALID_INPUT');
    if (item === null || typeof item === 'boolean') lowerBoundBytes += 4;
    else if (typeof item === 'string') lowerBoundBytes += Buffer.byteLength(item) + 2;
    else if (typeof item === 'number' && Number.isFinite(item)) lowerBoundBytes += String(item).length;
    else if (typeof item === 'object') {
      if (ancestors.has(item)) throw new ToolError('INVALID_INPUT');
      // Sparse arrays can serialize to gigabytes despite having almost no enumerable elements.
      if (Array.isArray(item) && (item.length > 10000 || Object.keys(item).length !== item.length))
        throw new ToolError('INVALID_INPUT');
      if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype
        && Object.getPrototypeOf(item) !== null) throw new ToolError('INVALID_INPUT');
      ancestors.add(item);
      lowerBoundBytes += 2;
      for (const [key, child] of Object.entries(item)) {
        lowerBoundBytes += Buffer.byteLength(key) + 3;
        if (lowerBoundBytes > maxBytes) throw new ToolError('INVALID_INPUT');
        walk(child, depth + 1);
      }
      ancestors.delete(item);
    } else throw new ToolError('INVALID_INPUT');
    if (lowerBoundBytes > maxBytes) throw new ToolError('INVALID_INPUT');
  };
  walk(value, 0);
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded) > maxBytes) throw new ToolError('INVALID_INPUT');
  const copied = JSON.parse(encoded) as T;
  const freeze = (item: unknown): void => {
    if (item !== null && typeof item === 'object') {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
  };
  freeze(copied);
  return copied;
}

/** Define a transport-independent tool. No caller-supplied backend, key or policy is accepted.
 * Descriptors document configured guarantees, they are not cryptographic certificates.
 */
export function defineVerifiedTool<I, E extends Binding, V, R>(definition: ToolDefinition<I, E, V, R>) {
  const name = z.string().regex(/^[a-z][a-z0-9_]{2,63}$/).parse(definition.name);
  const profile = token.parse(definition.profile);
  const evidenceKind = z.enum(['zk', 'signed-attestation', 'simulation']).parse(definition.evidenceKind);
  const environment = z.enum(['sandbox', 'production']).parse(definition.environment);
  if (environment === 'production' && evidenceKind === 'simulation') throw new Error('SIMULATION_FORBIDDEN');
  const maxInFlight = z.number().int().min(1).max(256).parse(definition.maxInFlight ?? 8);
  const maxInputBytes = z.number().int().min(256).max(2 ** 20).parse(definition.maxInputBytes ?? 65535);
  const maxTtl = z.number().int().min(1).max(300000).parse(definition.maxChallengeTtlMs ?? 30000);
  const clock = definition.clock ?? Date.now;
  // Capture adapters at construction: changing a definition object must not swap authorization code.
  const authority = definition.authority;
  const issue = authority.issue.bind(authority);
  const expected = authority.expected.bind(authority);
  const verify = authority.verify.bind(authority);
  const authorize = authority.authorize.bind(authority);
  const inputSchema = definition.input; const challengeSchema = definition.challenge; const verifiedSchema = definition.verified;
  let inFlight = 0;

  const current = (challenge: E): void => {
    const binding = Binding.parse(challenge);
    const now = clock();
    if (!Number.isSafeInteger(now) || now < 0 || binding.expires_at_ms <= binding.issued_at_ms
      || binding.expires_at_ms - binding.issued_at_ms > maxTtl
      || now < binding.issued_at_ms || now >= binding.expires_at_ms) throw new ToolError('EXPIRED');
  };
  const bounded = async <T>(task: () => Promise<T>): Promise<T> => {
    if (inFlight >= maxInFlight) throw new ToolError('CAPACITY');
    inFlight++;
    try { return await task(); }
    finally { inFlight--; }
  };

  return Object.freeze({
    describe: () => Object.freeze({ name, profile, evidenceKind, environment,
      authorization: 'trusted-adapter-required', automaticRetries: false as const }),
    issue: (input: unknown): Promise<E> => bounded(async () => {
      try {
        const parsed = inputSchema.parse(snapshot(input, maxInputBytes));
        const challenge = snapshot(challengeSchema.parse(await issue(parsed)), maxInputBytes);
        current(challenge);
        return challenge;
      } catch (error) { throw error instanceof ToolError ? error : new ToolError('REJECTED'); }
    }),
    execute: (input: unknown): Promise<R> => bounded(async () => {
      let authorizationStarted = false;
      try {
        const request = Invocation.parse(snapshot(input, maxInputBytes));
        const challenge = snapshot(challengeSchema.parse(await expected(request.nonce)), maxInputBytes);
        if (challenge.nonce !== request.nonce) throw new ToolError('REJECTED');
        current(challenge);
        const result = snapshot(verifiedSchema.parse(await verify(request.presentation, challenge)), maxInputBytes);
        current(challenge); // Recheck after the verifier's asynchronous work, before authorization.
        authorizationStarted = true;
        return await authorize(challenge, result);
      } catch (error) {
        // Once the adapter starts, an exception cannot establish that a remote effect did not occur.
        if (authorizationStarted) throw new ToolError('RESULT_UNKNOWN');
        throw error instanceof ToolError ? error : new ToolError('REJECTED');
      }
    }),
  });
}
