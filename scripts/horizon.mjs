import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Command failed: node ${args.join(' ')}`);
};
const command = process.argv[2] ?? 'demo';
const directory = resolve(process.argv[3] ?? '.tools/horizon/demo');
if (command === 'build') {
  run(['scripts/cargo.mjs', 'build', '--release', '--locked', '--manifest-path', 'labs/horizon/Cargo.toml']);
  run(['node_modules/typescript/bin/tsc', '-p', 'packages/horizon-demo/tsconfig.json']);
} else {
  const { ProofWorker } = await import('../packages/horizon-demo/dist/worker.js');
  const { createHorizonServer } = await import('../packages/horizon-demo/dist/server.js');
  async function initialize(destination) {
    mkdirSync(destination, { recursive: true });
    if (existsSync(join(destination, 'public.json')) || existsSync(join(destination, 'private.json'))) {
      throw new Error('Configuration exists. Use a NEW directory to preserve evidence and durable authorization state.');
    }
    const worker = new ProofWorker();
    try {
      const fixture = await worker.request({ op: 'init', now_ms: Date.now() });
      const { trust, evidence, challenge, policy, witness, holder_secret_hex } = fixture;
      // Only this public configuration is readable by the separate verifier UID.
      // The witness and signing key remain owner-only in private.json below.
      writeFileSync(join(destination, 'public.json'), JSON.stringify({ trust, evidence, challenge, policy }, null, 2), { mode: 0o644, flag: 'wx' });
      chmodSync(join(destination, 'public.json'), 0o644); // Public-only; also handles a restrictive host umask.
      writeFileSync(join(destination, 'private.json'), JSON.stringify({ evidence, witness, holder_secret_hex, policy,
        client_id: challenge.client_id, audience: challenge.audience, action: challenge.action }, null, 2), { mode: 0o600, flag: 'wx' });
    } finally { worker.close(); }
  }
  const post = async (url, data) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  };
  const listen = (app, port) => new Promise((done, reject) => {
    app.server.once('error', reject); app.server.listen(port, '127.0.0.1', done);
  });
  if (command === 'init') {
    await initialize(directory); console.log(`Synthetic configuration created in ${directory}. Private file must remain local.`);
  } else if (command === 'serve') {
    if (!existsSync(join(directory, 'public.json'))) await initialize(directory);
    const children = ['prover', 'verifier'].map(role => spawn(process.execPath,
      ['packages/horizon-demo/dist/server.js', role, join(directory, role === 'prover' ? 'private.json' : 'public.json')],
      { stdio: 'inherit', windowsHide: true, env: { ...process.env, HORIZON_DB: join(directory, 'authorization.sqlite') } }));
    console.log('Horizon sandbox: http://127.0.0.1:38080 — Ctrl+C to stop. State persists; revocation is irreversible.');
    let closing = false;
    const stop = () => { if (closing) return; closing = true; children.forEach(child => child.kill()); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    for (const child of children) { child.once('error', stop); child.once('exit', stop); }
  } else if (command === 'demo') {
    const fresh = mkdtempSync(join(tmpdir(), 'horizon-demo-'));
    await initialize(fresh);
    const origin = 'http://127.0.0.1:38080';
    const prover = createHorizonServer({ role: 'prover', configPath: join(fresh, 'private.json'), origin });
    const verifier = createHorizonServer({ role: 'verifier', configPath: join(fresh, 'public.json'), databasePath: join(fresh, 'authorization.sqlite'), origin });
    try {
      await listen(prover, 0); await listen(verifier, 0);
      const p = `http://127.0.0.1:${prover.server.address().port}`;
      const v = `http://127.0.0.1:${verifier.server.address().port}`;
      const { body: { challenge } } = await post(`${v}/api/challenge`, {});
      const forbidden = await post(`${p}/api/prove`, { challenge: { ...challenge, method: 'disclosure' } });
      if (forbidden.status === 200) throw new Error('Confidentiality downgrade accepted');
      const { body: { presentation }, status } = await post(`${p}/api/prove`, { challenge });
      if (status !== 200) throw new Error('Real proof generation failed');
      const invalid = structuredClone(presentation);
      invalid.holder_signature_hex = '00'.repeat(64);
      const rejected = await post(`${v}/api/execute`, { nonce: challenge.nonce, presentation: invalid });
      if (rejected.status === 200) throw new Error('Altered presentation accepted');
      const before = await (await fetch(`${v}/api/state`)).json();
      if (before.effects.length !== 0) throw new Error('Unauthorized mutation');
      const accepted = await post(`${v}/api/execute`, { nonce: challenge.nonce, presentation });
      if (accepted.status !== 200) throw new Error('Valid proof rejected');
      const replay = await post(`${v}/api/execute`, { nonce: challenge.nonce, presentation });
      if (replay.status === 200) throw new Error('Replay accepted');
      const after = await (await fetch(`${v}/api/state`)).json();
      if (after.effects.length !== 1) throw new Error('Unexpected mutation count');
      console.log(JSON.stringify({ profile: 'horizon-range-v1', proof: 'real Bulletproofs + Ed25519',
        source_data: 'synthetic', action: 'record_claim_authorization (local SQLite)',
        independent_verifier: true, unauthorized_effects: 0, authorized_effects: after.effects.length,
        disclosure_downgrade_rejected: true, alteration_rejected: true, replay_rejected: true,
        artifacts_local_only: fresh }, null, 2));
    } finally { await prover.close(); await verifier.close(); }
  } else if (command === 'request') {
    // CLI receives a JSONL operation from a file: init, prepare, prove, present, verify, select.
    const worker = new ProofWorker();
    try { console.log(JSON.stringify(await worker.request(JSON.parse(readFileSync(directory, 'utf8'))), null, 2)); }
    finally { worker.close(); }
  } else throw new Error('Usage: node scripts/horizon.mjs build|init|serve|demo|request [directory or request.json]');
}
