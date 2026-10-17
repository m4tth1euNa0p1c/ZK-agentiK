import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { canonical, ContextSchema, FactsSchema, U32 } from '@zk-mcp/sdk';
import type { ActionContext, PolicyFacts } from '@zk-mcp/sdk';

export function normalizeJira(raw: unknown): string {
  return z.object({ fields: z.object({ status: z.object({ name: z.string() }) }) }).parse(raw).fields.status.name;
}
export function normalizeSonar(raw: unknown): string {
  return z.object({ projectStatus: z.object({ status: z.string() }) }).parse(raw).projectStatus.status;
}
export function normalizeGitlabApprovals(raw: unknown): number {
  const parsed = z.object({ approved_by: z.array(z.object({ user: z.object({ id: U32.min(1) }) })).max(10_000) }).parse(raw);
  return new Set(parsed.approved_by.map(a => a.user.id)).size;
}

const SnapshotBodySchema = z.object({
  collector_id: z.literal('local-fixture-collector'),
  context: ContextSchema,
  facts: FactsSchema,
  observed_at_ms: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
const SnapshotSchema = SnapshotBodySchema.extend({ signature: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
export type SignedSnapshot = z.infer<typeof SnapshotSchema>;

export interface EnterpriseConnectors {
  readonly mode: 'fixture' | 'live';
  collect(context: ActionContext): Promise<SignedSnapshot>;
  verifySnapshot(snapshot: SignedSnapshot, context: ActionContext): PolicyFacts;
  merge(context: ActionContext): Promise<{ merged: boolean; sha: string; simulated: boolean }>;
}

/** Local fixture collector attests what it observed; this is NOT a vendor signature. */
export class FixtureConnectors implements EnterpriseConnectors {
  readonly mode = 'fixture';
  private readonly key = randomBytes(32);
  facts: PolicyFacts = { sonar_quality_gate: normalizeSonar({ projectStatus: { status: 'OK' } }),
    jira_status: normalizeJira({ fields: { status: { name: 'APPROVED' } } }),
    critical_vulnerabilities: 0,
    approvals: normalizeGitlabApprovals({ approved_by: [{ user: { id: 1 } }, { user: { id: 2 } }] }) };
  headSha = 'a'.repeat(40);
  mergeCalls = 0;
  constructor(private readonly now: () => number = Date.now) {}

  private signature(body: z.infer<typeof SnapshotBodySchema>): string {
    return createHmac('sha256', this.key).update('zk-mcp/collector/v1\0').update(canonical(body)).digest('hex');
  }
  async collect(context: ActionContext): Promise<SignedSnapshot> {
    if (context.head_sha !== this.headSha) throw new Error('HEAD_CHANGED');
    const body = SnapshotBodySchema.parse({ collector_id: 'local-fixture-collector',
      context, facts: this.facts, observed_at_ms: this.now() });
    return { ...body, signature: this.signature(body) };
  }
  verifySnapshot(snapshot: SignedSnapshot, context: ActionContext): PolicyFacts {
    const { signature, ...body } = SnapshotSchema.parse(snapshot);
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(this.signature(body), 'hex')))
      throw new Error('INVALID_SOURCE_ATTESTATION');
    const age = this.now() - body.observed_at_ms;
    if (canonical(body.context) !== canonical(context) || age < 0 || age > 30_000)
      throw new Error('STALE_OR_WRONG_SOURCE');
    return body.facts;
  }
  async merge(context: ActionContext): Promise<{ merged: boolean; sha: string; simulated: boolean }> {
    // In the live connector, GitLab's sha parameter is the atomic HEAD precondition.
    if (context.head_sha !== this.headSha) throw new Error('HEAD_CHANGED');
    this.mergeCalls++;
    return { merged: true, sha: context.head_sha, simulated: true };
  }
}
