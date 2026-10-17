import { writeFileSync } from 'node:fs';
import { hash } from '@zk-mcp/sdk';
import { CRITICAL_POLICY, criticalFixture } from '@zk-mcp/enterprise-gateway';
import { request } from '../../tests/fixtures/helpers.js';

const input = request();
const at = 1_800_000_000_000;
input.public_inputs.issued_at_ms = at;
input.public_inputs.expires_at_ms = at + 30_000;
input.public_inputs.policy = CRITICAL_POLICY;
input.private_inputs.facts = criticalFixture(() => at).facts;
input.public_inputs.policy_hash = hash('zk-mcp/policy/v1', input.public_inputs.policy);
input.public_inputs.input_commitment = hash('zk-mcp/witness/v1', input.private_inputs);
writeFileSync('tests/fixtures/policy-critical-v1.json', JSON.stringify({ request: input }, null, 2) + '\n');
