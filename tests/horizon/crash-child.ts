import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { PublicConfig, Challenge, Verified } from '../../packages/horizon-demo/src/types.js';
import { AuthorizationStore } from '../../packages/horizon-demo/src/store.js';
const path = process.argv[2]; if (!path) throw new Error('INPUT_REQUIRED');
const input = z.strictObject({ config: PublicConfig, challenge: Challenge, verified: Verified,
  database: z.string(), now: z.number() }).parse(JSON.parse(readFileSync(path, 'utf8')));
const store = new AuthorizationStore(input.database, input.config, () => input.now);
try { store.authorize(input.challenge, input.verified, 'after_reservation'); }
catch { process.exit(73); } // Intentionally no store.close: process terminates after committed reservation.
process.exit(74);
