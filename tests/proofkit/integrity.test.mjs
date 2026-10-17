import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { artifactPaths, Catalog, checkCatalog, loadCatalog, readArtifact, runProfile, safeRelative, seal, verifyManifest } from '../../tools/proofkit/lib.mjs';
import { profiles } from '../../tools/proofkit/profiles.mjs';

function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), 'proofkit-test-'));
  t.after(() => {
    // Resolve and verify the exact temporary workspace before recursive cleanup.
    const target = resolve(root); const parent = resolve(tmpdir());
    const rel = relative(parent, target);
    assert(!rel.startsWith(`..${sep}`) && !rel.includes(sep) && rel.startsWith('proofkit-test-'));
    rmSync(target, { recursive: true, force: true });
  });
  const write = (path, value) => { const output = join(root, path); mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, typeof value === 'string' ? value : JSON.stringify(value)); };
  const catalog = { schema: 'proofkit-catalog-v1', title: 'Synthetic test', claims: [{
    id: 'test-claim', kind: 'numerical-check', status: 'derived', relation: 'Test-only relation',
    limitations: ['No semantic guarantee.'], artifacts: ['public/result.json'], sources: [] }] };
  write('public/result.json', { status: 'UNKNOWN', value: 42 });
  write('evidence/catalog.json', catalog);
  return { root, write, catalog };
}

test('seal and verify preserve UNKNOWN and explicit non-semantic provenance', t => {
  const { root } = sandbox(t);
  const before = readArtifact(root, 'public/result.json');
  const sealed = seal(root, 'evidence/test-manifest.json');
  const verified = verifyManifest(root, sealed.manifest);
  assert.equal(verified.status, 'integrity-verified'); assert.equal(verified.semantic_validation, false);
  assert.equal(verified.timestamp_authority, 'local-clock-unattested');
  assert.deepEqual(readArtifact(root, 'public/result.json'), before);
  assert.equal(JSON.parse(before).status, 'UNKNOWN');
  assert.equal(loadCatalog(root).claims[0].status, 'derived');
});

test('reject traversal, absolute, alternate streams, reserved names and sensitive paths', () => {
  for (const path of ['../outside.json', '/etc/passwd', 'C:/secret', 'C:\\secret', 'public/../file',
    'public//file', 'public/./file', 'public/x:stream', '.tools/a', 'public/private/key.json',
    'private.json', '.env', '.env.local', 'public/a.key', 'public/a.sqlite-wal', 'public/a.db',
    'public/a.pem', 'public/NUL.txt', 'public/file.', 'public/%2e%2e/a', 'public/日本.json']) {
    assert.throws(() => safeRelative(path), /UNSAFE_PATH/, path);
  }
});

test('reject outside symlink/junction and hardlink without reading target', t => {
  const { root, write, catalog } = sandbox(t); const outside = sandbox(t);
  outside.write('hidden.txt', 'not an artifact');
  symlinkSync(outside.root, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => readArtifact(root, 'linked/hidden.txt'), /SYMLINK/);
  assert.throws(() => seal(root, 'linked/new.json'), /SYMLINK/);
  linkSync(join(outside.root, 'hidden.txt'), join(root, 'public', 'hardlink.txt'));
  assert.throws(() => readArtifact(root, 'public/hardlink.txt'), /INVALID_ARTIFACT/);
  catalog.claims[0].artifacts = ['linked/hidden.txt']; write('evidence/catalog.json', catalog);
  assert.throws(() => checkCatalog(root), /SYMLINK/);
});

test('fail on modified catalogue bytes even if parsed claims are unchanged', t => {
  const { root, write, catalog } = sandbox(t); seal(root, 'evidence/manifest.json');
  write('evidence/catalog.json', JSON.stringify(catalog, null, 2));
  assert.throws(() => verifyManifest(root, 'evidence/manifest.json'), /CATALOG_MISMATCH/);
});

test('fail on modified artifact or missing proof, never generate a replacement', t => {
  const { root, write } = sandbox(t); seal(root, 'evidence/manifest.json');
  write('public/result.json', { status: 'UNKNOWN', value: 43 });
  assert.throws(() => verifyManifest(root, 'evidence/manifest.json'), /ARTIFACT_MISMATCH/);
  for (const path of profiles['risc0-public'].required) {
    if (path !== 'tests/fixtures/risc0/critical-proof.json') write(path, '{}');
  }
  assert.throws(() => runProfile(root, 'risc0-public'), /ENOENT|MISSING_PATH/);
  assert.equal(existsSync(join(root, '.tools')), false);
});

test('fail on manifest omission, duplication, added artifact and size tampering', t => {
  const { root, write } = sandbox(t); seal(root, 'evidence/manifest.json');
  const original = JSON.parse(readFileSync(join(root, 'evidence/manifest.json')));
  for (const mutate of [m => { m.artifacts = []; }, m => { m.artifacts.push(m.artifacts[0]); },
    m => { m.artifacts.push({ ...m.artifacts[0], path: 'public/extra.json' }); },
    m => { m.artifacts[0].bytes++; }]) {
    const m = structuredClone(original); mutate(m); write('evidence/altered.json', m);
    assert.throws(() => verifyManifest(root, 'evidence/altered.json'));
  }
});

test('strict catalogue rejects arbitrary commands, duplicate claims/paths, unknown status and unsafe URLs', t => {
  const { catalog } = sandbox(t);
  for (const mutate of [c => { c.command = 'evil'; }, c => { c.claims[0].command = 'evil'; },
    c => { c.claims.push(c.claims[0]); }, c => { c.claims[0].artifacts.push('public/result.json'); },
    c => { c.claims[0].status = 'perfect'; }, c => { c.claims[0].artifacts = ['.env']; },
    c => { c.claims[0].sources = [{ url: 'http://example.org', accessed_on: '2026-10-17' }]; },
    c => { c.claims[0].sources = [{ url: 'https://user:pass@example.org', accessed_on: '2026-10-17' }]; },
    c => { c.claims[0].sources = [{ url: 'https://example.org', accessed_on: '2026-02-31' }]; }]) {
    const c = structuredClone(catalog); mutate(c); assert.throws(() => Catalog.parse(c));
  }
});

test('existing manifests and unsafe destinations cannot be overwritten', t => {
  const { root } = sandbox(t); seal(root, 'evidence/manifest.json');
  const original = readFileSync(join(root, 'evidence/manifest.json'));
  assert.throws(() => seal(root, 'evidence/manifest.json'), /EEXIST/);
  assert.throws(() => seal(root, '../elsewhere.json'), /UNSAFE_PATH/);
  assert.throws(() => seal(root, '.tools/secret.json'), /UNSAFE_PATH/);
  assert.deepEqual(readFileSync(join(root, 'evidence/manifest.json')), original);
});

test('require-post-quantum rejects every profile before prerequisites or process launch', t => {
  const { root } = sandbox(t); let calls = 0;
  for (const id of Object.keys(profiles)) assert.throws(() => runProfile(root, id,
    { requirePostQuantum: true, executor: () => { calls++; } }), /POST_QUANTUM_PROFILE_UNAVAILABLE/);
  assert.equal(calls, 0); assert.equal(existsSync(join(root, '.tools')), false);
  assert.throws(() => runProfile(root, '__proto__'), /UNKNOWN_PROFILE/);
});

test('process failure, missing executable and uncertain termination remain non-success', t => {
  const { root, write } = sandbox(t);
  for (const path of profiles.horizon.required) write(path, '{}');
  for (const [child, expected] of [[{ status: 1 }, 'failed'], [{ status: null, error: { code: 'ENOENT' } }, 'unavailable'],
    [{ status: null, signal: 'SIGTERM' }, 'unknown'], [{ status: 0, error: { code: 'ETIMEDOUT' } }, 'failed']]) {
    let calls = 0; const report = runProfile(root, 'horizon', { executor: () => { calls++; return child; } });
    assert.equal(report.outcome, expected); assert.equal(calls, 1); assert.equal(report.steps.length, 1);
    assert.equal(JSON.parse(readFileSync(join(root, report.report))).outcome, expected);
    assert(!JSON.stringify(report).includes('stderr')); assert(!JSON.stringify(report).includes('p95'));
  }
});

test('only complete fixed profile execution returns passed', t => {
  const { root, write } = sandbox(t); for (const path of profiles.horizon.required) write(path, '{}');
  const args = []; const report = runProfile(root, 'horizon', { executor: argv => { args.push(argv); return { status: 0 }; } });
  assert.equal(report.outcome, 'passed'); assert.equal(report.steps.length, 3);
  assert.deepEqual(args, [['scripts/horizon.mjs', 'build'], ['scripts/horizon-fixture.mjs', 'verify'], ['scripts/horizon.mjs', 'demo']]);
});

test('catalogue artifact union permits explicit sharing but excludes self-reference', t => {
  const { catalog } = sandbox(t); const second = structuredClone(catalog.claims[0]); second.id = 'second-claim';
  catalog.claims.push(second); assert.deepEqual(artifactPaths(Catalog.parse(catalog)), ['public/result.json']);
  catalog.claims[0].artifacts = ['evidence/catalog.json'];
  assert.throws(() => artifactPaths(Catalog.parse(catalog)), /INVALID_ARTIFACT_SET/);
});
