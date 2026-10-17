#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { checkCatalog, doctor, loadCatalog, runProfile, seal, verifyManifest } from './lib.mjs';
import { profileList } from './profiles.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const [command, ...args] = process.argv.slice(2);
try {
  let result;
  if (command === 'doctor' && args.length === 0) result = doctor(root);
  else if (command === 'list' && args.length === 0) result = { profiles: profileList(), claims: loadCatalog(root).claims };
  else if (command === 'check' && args.length === 0) result = checkCatalog(root);
  else if (command === 'seal' && args.length <= 1) result = seal(root, args[0]);
  else if (command === 'verify' && args.length === 1) result = verifyManifest(root, args[0]);
  else if (command === 'run' && args.length >= 1 && args.length <= 2
      && (args.length === 1 || args[1] === '--require-post-quantum')) {
    result = runProfile(root, args[0], { requirePostQuantum: args[1] === '--require-post-quantum' });
    if (result.outcome !== 'passed') process.exitCode = 1;
  } else throw new Error('Usage: proofkit doctor|list|check|seal [new-relative-path]|verify <relative-manifest>|run <profile> [--require-post-quantum]');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Never echo malformed input, raw child output or candidate file contents.
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const code = /^[A-Z_]+$/.test(message) || message.startsWith('Usage:') ? message : 'PROOFKIT_REJECTED';
  console.error(JSON.stringify({ error: code, semantic_validation: false }));
  process.exitCode = 1;
}
