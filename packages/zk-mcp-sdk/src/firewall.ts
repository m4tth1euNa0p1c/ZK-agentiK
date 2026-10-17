import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZkVmBackend } from './backend.js';
import { canonical, hash } from './canonical.js';
import { EnvelopeSchema, PublicInputsSchema } from './schema.js';
import type { PublicInputs, ZkpEnvelope } from './schema.js';

export interface ReplayStore {
  /** Atomic insert-if-absent; durable and shared across replicas in production. */
  consume(key: string, expiresAt: number, now: number): Promise<boolean>;
}

/** Development-only, single-process replay protection; never use across replicas. */
export class MemoryReplayStore implements ReplayStore {
  private consumed = new Map<string, number>();
  constructor(private readonly capacity = 10_000) {}
  async consume(key: string, expiresAt: number, now: number): Promise<boolean> {
    for (const [entry, expiry] of this.consumed) if (expiry <= now) this.consumed.delete(entry);
    if (expiresAt <= now || this.consumed.has(key) || this.consumed.size >= this.capacity) return false;
    this.consumed.set(key, expiresAt); // No await between test and insert.
    return true;
  }
}

export class VerifierFirewall {
  constructor(private readonly config: {
    backend: ZkVmBackend;
    trustedImageId: string;
    replayStore: ReplayStore;
    allowSimulation?: boolean;
    now?: () => number;
  }) {
    if (config.backend.securityProfile === 'simulation' && config.allowSimulation !== true)
      throw new Error('SIMULATION_FORBIDDEN');
    // Snapshot the operator configuration; a caller cannot change it after construction.
    this.config = { ...config };
  }

  private now(): number { return this.config.now?.() ?? Date.now(); }
  private checkTime(p: PublicInputs): void {
    const now = this.now();
    if (!Number.isSafeInteger(now) || p.issued_at_ms > now + 1_000 || p.expires_at_ms <= now)
      throw new Error('EXPIRED_OR_FUTURE');
  }

  async verify(proof: unknown, expectedInputs: PublicInputs): Promise<ZkpEnvelope> {
    const envelope = EnvelopeSchema.parse(proof); // Deep clone eliminates mutation during awaits.
    const expected = PublicInputsSchema.parse(expectedInputs);
    const p = envelope.public_inputs;
    if (envelope.zkvm_backend !== this.config.backend.name
        || envelope.security_profile !== this.config.backend.securityProfile
        || (envelope.security_profile === 'simulation' && this.config.allowSimulation !== true))
      throw new Error('BACKEND_NOT_ALLOWED');
    if (envelope.elf_image_id !== this.config.trustedImageId) throw new Error('IMAGE_NOT_ALLOWED');
    if (canonical(p) !== canonical(expected)) throw new Error('CONTEXT_MISMATCH');
    if (hash('zk-mcp/public-inputs/v1', p) !== envelope.public_inputs_hash
        || hash('zk-mcp/policy/v1', p.policy) !== p.policy_hash
        || envelope.timestamp !== p.issued_at_ms) throw new Error('STATEMENT_MISMATCH');
    this.checkTime(p);
    // An untrusted deny can safely stop work. An untrusted allow cannot authorize it.
    if (!envelope.public_outputs.allow || envelope.public_outputs.violations_mask !== 0
      || envelope.public_outputs.critical_violations !== undefined)
      throw new Error('POLICY_DENIED');
    await this.config.backend.verify(envelope);
    this.checkTime(p);
    return envelope;
  }

  async execute<T>(proof: unknown, expected: PublicInputs,
    sideEffect: (inputs: PublicInputs) => Promise<T>): Promise<{ value: T; envelope: ZkpEnvelope }> {
    const envelope = await this.verify(proof, expected);
    const p = envelope.public_inputs;
    const replayKey = hash('zk-mcp/replay/v1', { audience: p.audience, tenant_id: p.context.tenant_id, nonce: p.nonce });
    if (!await this.config.replayStore.consume(replayKey, p.expires_at_ms, this.now())) throw new Error('REPLAY_OR_CAPACITY');
    this.checkTime(p);
    // Reservation stays consumed on timeout/API failure: never blindly retry a mutation.
    const value = await sideEffect(PublicInputsSchema.parse(p));
    return { value, envelope };
  }
}

export function attachProof(result: CallToolResult, envelope: ZkpEnvelope): CallToolResult {
  return { ...result, _meta: { ...result._meta, zkp: envelope } };
}

/** prepare MUST be read-only. The effect is called only after successful verification. */
export function guardedToolHandler<T>(options: {
  firewall: VerifierFirewall;
  prepare: (args: T) => Promise<{ envelope: ZkpEnvelope; expected: PublicInputs }>;
  effect: (inputs: PublicInputs) => Promise<CallToolResult>;
}): (args: T) => Promise<CallToolResult> {
  return async args => {
    const prepared = await options.prepare(args);
    const result = await options.firewall.execute(prepared.envelope, prepared.expected, options.effect);
    return attachProof(result.value, result.envelope);
  };
}

/** For aware MCP clients. Legacy clients still receive ordinary content. */
export async function verifyToolResult(result: CallToolResult, expected: PublicInputs,
  firewall: VerifierFirewall): Promise<ZkpEnvelope> {
  if (result.isError || result._meta?.zkp === undefined) throw new Error('MISSING_SUCCESS_PROOF');
  return firewall.verify(result._meta.zkp, expected);
}
