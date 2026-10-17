import { readFileSync } from 'node:fs';
import { hash, PublicInputsSchema, PrivateInputsSchema } from '@zk-mcp/sdk';
import type { ProveRequest } from '@zk-mcp/sdk';

export const vector = JSON.parse(readFileSync(new URL('./policy-v1.json', import.meta.url), 'utf8')) as {
  request: ProveRequest;
  expected: { policy_hash: string; input_commitment: string; public_inputs_hash: string;
    public_outputs: { allow: boolean; violations_mask: number } };
};
export function request(now = Date.now()): ProveRequest {
  const private_inputs = PrivateInputsSchema.parse(vector.request.private_inputs);
  const public_inputs = PublicInputsSchema.parse({ ...vector.request.public_inputs, issued_at_ms: now,
    expires_at_ms: now + 30_000, input_commitment: hash('zk-mcp/witness/v1', private_inputs) });
  return { public_inputs, private_inputs };
}
export const mergeArgs = { project_id: 1, merge_request_iid: 7, head_sha: 'a'.repeat(40) };
