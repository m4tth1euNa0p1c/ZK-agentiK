import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const verifier = 'http://127.0.0.1:38080';
const prover = 'http://127.0.0.1:38081';
const saved = '.tools/horizon/demo/docker-presentation.json';
async function post(url, input) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(10000) });
  return { status: r.status, value: await r.json() };
}
const state = async () => (await fetch(`${verifier}/api/state`)).json();
assert.equal((await fetch(`${verifier}/unapproved-target`)).status, 404);
const beforeOperatorRequests = await state();
assert.equal((await post(`${verifier}/api/revoke`, {})).status, 403);
assert.equal((await post(`${verifier}/api/rotate-policy`, {})).status, 403);
assert.equal((await post(`${verifier}/api/reconcile`, { operation_id: '0'.repeat(64) })).status, 403);
assert.deepEqual(await state(), beforeOperatorRequests);
assert.equal((await fetch(`${prover}/api/execute`, { method: 'POST' })).status, 404);
assert.equal((await fetch(`${verifier}/api/challenge`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: 'x'.repeat(65536) })).status, 413);
assert.equal((await fetch(`${verifier}/api/state`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
if (process.argv[2] === 'replay') {
  const { challenge, presentation } = JSON.parse(readFileSync(saved, 'utf8'));
  assert.equal((await post(`${verifier}/api/execute`, { nonce: challenge.nonce, presentation })).status, 400);
  assert.equal((await post(`${verifier}/api/challenge`, {})).status, 400);
  assert.equal((await state()).effects.length, 1);
  console.log(JSON.stringify({ restarted_replay_rejected: true, new_nonce_rejected: true, effects: 1 }));
} else {
  assert.equal((await state()).effects.length, 0, 'Use a fresh sandbox; never reset prior evidence implicitly');
  const { value: { challenge } } = await post(`${verifier}/api/challenge`, {});
  assert.ok(challenge);
  assert.equal((await post(`${prover}/api/prove`, { challenge: { ...challenge, method: 'disclosure' } })).status, 400);
  const { status, value: { presentation } } = await post(`${prover}/api/prove`, { challenge });
  assert.equal(status, 200);
  assert.equal(JSON.stringify(presentation).includes('blinding_hex'), false);
  const forged = { ...presentation, holder_signature_hex: '00'.repeat(64) };
  assert.equal((await post(`${verifier}/api/execute`, { nonce: challenge.nonce, presentation: forged })).status, 400);
  assert.equal((await state()).effects.length, 0);
  assert.equal((await post(`${verifier}/api/execute`, { nonce: challenge.nonce, presentation })).status, 200);
  assert.equal((await post(`${verifier}/api/execute`, { nonce: challenge.nonce, presentation })).status, 400);
  assert.equal((await state()).effects.length, 1);
  writeFileSync(saved, JSON.stringify({ challenge, presentation }), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ sandbox_http: true, real_proof: true, private_witness_transmitted: false,
    downgrade_rejected: true, alteration_rejected: true, replay_rejected: true, unauthorized_effects: 0, authorized_effects: 1 }));
}
