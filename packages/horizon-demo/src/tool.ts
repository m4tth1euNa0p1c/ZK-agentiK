import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { defineVerifiedTool } from '@m4tth1euna0p1c/proofkit-sdk';
import type { AuthorizationStore } from './store.js';
import type { ProofWorker } from './worker.js';
import { Challenge, Verified, type PublicConfig } from './types.js';

/** Reference adapter: real cryptography; the only target is the store's synthetic SQLite action. */
export function createClaimTool(store: AuthorizationStore, worker: ProofWorker, config: PublicConfig, clock = Date.now) {
  return defineVerifiedTool({
    name: 'record_claim_authorization', profile: 'horizon-range-v1',
    evidenceKind: config.policy.require_private ? 'zk' : 'signed-attestation', environment: 'sandbox',
    input: z.strictObject({}), challenge: Challenge, verified: Verified, clock,
    maxChallengeTtlMs: Math.min(30000, config.policy.max_challenge_ttl_ms),
    authority: {
      issue: () => store.issue(),
      expected: nonce => store.expected(nonce),
      verify: async (presentation, expected) => {
        const state = store.state();
        if (state.revoked) throw new Error('REVOKED');
        if (!isDeepStrictEqual(presentation['evidence'], config.evidence)) throw new Error('EVIDENCE_SUBSTITUTION');
        return worker.request({ op: 'verify', presentation, expected,
          trust: { ...config.trust, epoch: state.trust_epoch },
          policy: { ...config.policy, policy_epoch: state.policy_epoch }, now_ms: clock() });
      },
      // Store rechecks time/epochs and consumes nonce + business operation under its own transaction.
      authorize: (expected, verified) => store.authorize(expected, verified),
    },
  });
}
