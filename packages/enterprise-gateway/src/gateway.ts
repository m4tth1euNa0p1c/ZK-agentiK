import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ContextSchema, guardedToolHandler, hash, MemoryReplayStore, PolicySchema,
  PublicInputsSchema, randomHex, VerifierFirewall } from '@zk-mcp/sdk';
import type { Policy, PolicyFacts, PublicInputs, ZkpEnvelope, ZkVmBackend } from '@zk-mcp/sdk';
import type { EnterpriseConnectors } from './connectors.js';
import { MemoryOperationStore } from './operations.js';
import type { OperationStore } from './operations.js';

export const MergeArgsSchema = ContextSchema.pick({ project_id: true, merge_request_iid: true, head_sha: true });
export type MergeArgs = z.infer<typeof MergeArgsSchema>;

export class EnterpriseGateway {
  private readonly operations: OperationStore;
  readonly firewall: VerifierFirewall;
  private constructor(private readonly config: {
    backend: ZkVmBackend; connectors: EnterpriseConnectors; imageId: string;
    tenantId: string; audience: string; policy: Policy; allowedProjectIds: ReadonlySet<number>;
    mode: 'demo'; now: () => number; operations: OperationStore;
  }) {
    this.config = { ...config, policy: PolicySchema.parse(config.policy), allowedProjectIds: new Set(config.allowedProjectIds) };
    this.operations = config.operations;
    this.firewall = new VerifierFirewall({ backend: config.backend, trustedImageId: config.imageId,
      replayStore: new MemoryReplayStore(), allowSimulation: config.mode === 'demo', now: config.now });
  }

  static async demo(backend: ZkVmBackend, connectors: EnterpriseConnectors,
    options: { policy?: Policy; now?: () => number; operationStore?: OperationStore } = {}): Promise<EnterpriseGateway> {
    // Demo contract, not an isolation boundary against a malicious connector implementation.
    if (connectors.mode !== 'fixture') throw new Error('LIVE_CONNECTOR_FORBIDDEN_IN_DEMO');
    return new EnterpriseGateway({ backend, connectors, imageId: await backend.imageId(),
      tenantId: 'demo-tenant', audience: 'zk-mcp-local', policy: options.policy ?? { min_reviewers: 2 },
      allowedProjectIds: new Set([1]), mode: 'demo', now: options.now ?? Date.now,
      operations: options.operationStore ?? new MemoryOperationStore() });
  }

  async prepare(args: MergeArgs): Promise<{ envelope: ZkpEnvelope; expected: PublicInputs; factsHash: string }> {
    const parsed = MergeArgsSchema.parse(args);
    if (!this.config.allowedProjectIds.has(parsed.project_id)) throw new Error('PROJECT_NOT_ALLOWED');
    const context = ContextSchema.parse({ ...parsed, tenant_id: this.config.tenantId, tool: 'verifiable_gitlab_merge' });
    const snapshot = await this.config.connectors.collect(context);
    const facts = this.config.connectors.verifySnapshot(snapshot, context);
    const private_inputs = { facts, salt: randomHex() };
    const now = this.config.now();
    const expected = PublicInputsSchema.parse({ audience: this.config.audience, context,
      policy: this.config.policy, policy_hash: hash('zk-mcp/policy/v1', this.config.policy),
      input_commitment: hash('zk-mcp/witness/v1', private_inputs), nonce: randomHex(),
      issued_at_ms: now, expires_at_ms: now + 30_000 });
    const envelope = await this.config.backend.prove(structuredClone({ public_inputs: expected, private_inputs }));
    return { envelope, expected, factsHash: hash('zk-mcp/facts/v1', facts) };
  }

  private checkExecutionTime(inputs: PublicInputs, facts: PolicyFacts): void {
    const now = this.config.now();
    if (!Number.isSafeInteger(now) || now < inputs.issued_at_ms - 1_000 || inputs.expires_at_ms <= now)
      throw new Error('EXPIRED_OR_FUTURE');
    if (facts.critical && inputs.policy.critical) {
      const c = facts.critical;
      if (now >= c.approvals_expires_at_ms || now < c.change_window_start_ms || now >= c.change_window_end_ms
        || now < c.evidence_observed_at_ms || now - c.evidence_observed_at_ms > inputs.policy.critical.max_evidence_age_ms)
        throw new Error('CRITICAL_DEADLINE_EXPIRED');
    }
  }

  private async mergeVerified(inputs: PublicInputs, expectedFactsHash: string): Promise<CallToolResult> {
    const operationKey = hash('zk-mcp/operation/v1', { audience: inputs.audience, context: inputs.context });
    if (!await this.operations.reserve(operationKey)) throw new Error('OPERATION_ALREADY_RESERVED_OR_CAPACITY');
    try {
      // Read after the reservation wait: facts may change while a store responds.
      // This narrows cross-system TOCTOU; the target must still enforce its own
      // authoritative mutation preconditions.
      const latest = await this.config.connectors.collect(inputs.context);
      const facts = this.config.connectors.verifySnapshot(latest, inputs.context);
      // Compare against the trusted collector snapshot, never facts from the prover.
      if (hash('zk-mcp/facts/v1', facts) !== expectedFactsHash) throw new Error('SOURCE_CHANGED');
      // Check after both asynchronous waits, immediately before dispatch.
      this.checkExecutionTime(inputs, facts);
    } catch (error) {
      await this.operations.finish(operationKey, 'REJECTED');
      throw error;
    }
    let result: Awaited<ReturnType<EnterpriseConnectors['merge']>>;
    try {
      result = await this.config.connectors.merge(inputs.context);
      if (!result.merged || result.sha !== inputs.context.head_sha) throw new Error('UNEXPECTED_MERGE_RESULT');
    } catch (error) {
      // An operation with unknown external outcome cannot be retried with a fresh nonce.
      await this.operations.finish(operationKey, 'UNKNOWN');
      throw error;
    }
    await this.operations.finish(operationKey, 'COMPLETED');
    return { content: [{ type: 'text', text: 'SIMULATION: merge autorisé par la politique ; aucun appel GitLab réel.' }],
      structuredContent: { ...result, security_profile: 'simulation' } };
  }

  async call(args: unknown): Promise<CallToolResult> {
    const prepared = await this.prepare(MergeArgsSchema.parse(args));
    const handler = guardedToolHandler({ firewall: this.firewall,
      prepare: async (_args: MergeArgs) => prepared,
      effect: inputs => this.mergeVerified(inputs, prepared.factsHash) });
    return handler(MergeArgsSchema.parse(args));
  }
}
