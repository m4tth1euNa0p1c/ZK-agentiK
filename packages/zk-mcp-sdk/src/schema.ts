import { z } from 'zod';

export const U32 = z.number().int().min(0).max(0xffff_ffff);
export const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const Token = z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:/-]+$/);
const Milliseconds = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const CriticalPolicySchema = z.object({
  max_evidence_age_ms: Milliseconds,
  max_canary_error_rate_ppm: U32,
  max_canary_p99_latency_ms: U32,
  min_canary_duration_ms: Milliseconds,
  max_canary_traffic_percent: U32,
}).strict();
export const CriticalFactsSchema = z.object({
  emergency_stop: z.boolean(), requester_id: U32, security_approver_id: U32,
  operations_approver_id: U32, service_owner_approver_id: U32, approvers_mfa_verified: z.boolean(),
  approvals_expires_at_ms: Milliseconds, approved_revision: z.array(z.number().int().min(0).max(255)).length(32),
  evidence_observed_at_ms: Milliseconds, change_window_start_ms: Milliseconds, change_window_end_ms: Milliseconds,
  artifact_signature_verified: z.boolean(), sbom_verified: z.boolean(), provenance_verified: z.boolean(),
  vulnerability_scan_complete: z.boolean(), high_vulnerabilities: U32, secrets_detected: U32,
  backup_restore_tested: z.boolean(), rollback_tested: z.boolean(), canary_duration_ms: Milliseconds,
  canary_traffic_percent: U32, canary_error_rate_ppm: U32, canary_p99_latency_ms: U32,
  active_sev1_incidents: U32, dependencies_healthy: z.boolean(), policy_override_requested: z.boolean(),
}).strict();

export const FactsSchema = z.object({
  sonar_quality_gate: z.string().max(64).regex(/^[\x20-\x7e]*$/),
  jira_status: z.string().max(64).regex(/^[\x20-\x7e]*$/),
  critical_vulnerabilities: U32,
  approvals: U32,
  critical: CriticalFactsSchema.optional(),
}).strict();
export const PolicySchema = z.object({ min_reviewers: U32.min(1), critical: CriticalPolicySchema.optional() }).strict();
export const ContextSchema = z.object({
  tenant_id: Token,
  tool: z.literal('verifiable_gitlab_merge'),
  project_id: U32.min(1),
  merge_request_iid: U32.min(1),
  head_sha: z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/),
}).strict();
export const PrivateInputsSchema = z.object({ facts: FactsSchema, salt: Hash }).strict();
export const PublicInputsSchema = z.object({
  audience: Token,
  context: ContextSchema,
  policy: PolicySchema,
  policy_hash: Hash,
  input_commitment: Hash,
  nonce: Hash,
  issued_at_ms: Milliseconds,
  expires_at_ms: Milliseconds,
}).strict().refine(p => p.expires_at_ms > p.issued_at_ms && p.expires_at_ms - p.issued_at_ms <= 60_000,
  'Invalid authorization lifetime');
export const DecisionSchema = z.object({
  allow: z.boolean(), violations_mask: z.number().int().min(0).max(63),
  critical_violations: z.number().int().min(1).max(16383).optional(),
}).strict();
export const EnvelopeSchema = z.object({
  spec_version: z.literal('1.0'),
  zkvm_backend: z.enum(['native-simulator', 'sp1', 'risc0', 'magnetar']),
  security_profile: z.enum(['simulation', 'zk']),
  elf_image_id: z.string().regex(/^(?:sim-sha256|sha256):[0-9a-f]{64}$/),
  public_inputs_hash: Hash,
  public_inputs: PublicInputsSchema,
  public_outputs: DecisionSchema,
  proof_bytes: z.string().min(4).max(1_400_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  timestamp: Milliseconds,
}).strict();

export type PolicyFacts = z.infer<typeof FactsSchema>;
export type CriticalFacts = z.infer<typeof CriticalFactsSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type ActionContext = z.infer<typeof ContextSchema>;
export type PrivateInputs = z.infer<typeof PrivateInputsSchema>;
export type PublicInputs = z.infer<typeof PublicInputsSchema>;
export type ZkpEnvelope = z.infer<typeof EnvelopeSchema>;
export type ProveRequest = { public_inputs: PublicInputs; private_inputs: PrivateInputs };
