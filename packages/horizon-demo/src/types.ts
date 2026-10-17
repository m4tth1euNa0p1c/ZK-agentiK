import { z } from 'zod';

const token = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:/-]+$/);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const Method = z.enum(['challenge_bound', 'reusable', 'disclosure']);
export const Challenge = z.strictObject({
  tenant: token, client_id: token, audience: token, action: token,
  operation_id: token, object_id: token, subject: token, policy_id: token,
  policy_epoch: uint, trust_epoch: uint, nonce: z.string().regex(/^[0-9a-f]{64}$/),
  issued_at_ms: uint, expires_at_ms: uint, method: Method,
});
export type Challenge = z.infer<typeof Challenge>;
export const Policy = z.strictObject({ policy_id: token, policy_epoch: uint,
  require_private: z.boolean(), allow_reuse: z.boolean(), max_challenge_ttl_ms: uint });
export type Policy = z.infer<typeof Policy>;
export const Verified = z.strictObject({ bundle_hash: z.string().regex(/^[0-9a-f]{64}$/),
  method: Method, tenant: token, subject: token, operation_id: token, object_id: token,
  not_before_ms: uint, expires_at_ms: uint });
export type Verified = z.infer<typeof Verified>;
export const PublicConfig = z.strictObject({ trust: z.record(z.string(), z.unknown()),
  evidence: z.record(z.string(), z.unknown()), challenge: Challenge, policy: Policy });
export type PublicConfig = z.infer<typeof PublicConfig>;
export const PrivateConfig = z.strictObject({ evidence: z.record(z.string(), z.unknown()),
  witness: z.record(z.string(), z.unknown()), holder_secret_hex: z.string().regex(/^[0-9a-f]{64}$/),
  policy: Policy, client_id: token, audience: token, action: token });
export type PrivateConfig = z.infer<typeof PrivateConfig>;

/** Selection is configured by the verifier; a proof request cannot weaken it. */
export function selectMethod(policy: Policy): Challenge['method'] {
  return !policy.require_private ? 'disclosure' : policy.allow_reuse ? 'reusable' : 'challenge_bound';
}
