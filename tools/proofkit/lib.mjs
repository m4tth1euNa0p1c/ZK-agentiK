import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync,
  readSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { profiles } from './profiles.mjs';

export const CATALOG_PATH = 'evidence/catalog.json';
const MAX_ARTIFACT = 128 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const text = z.string().min(1).max(4000);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const date = z.string().datetime({ offset: true });

export function safeRelative(path) {
  if (typeof path !== 'string' || path.length > 240 || isAbsolute(path)
      || !/^[A-Za-z0-9._/-]+$/.test(path)) throw new Error('UNSAFE_PATH');
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)
      || /^\.tools$/i.test(p) || /^private(?:[.-]|$)/i.test(p)
      || /^\.env/i.test(p) || /^(id_rsa|id_ed25519)$/i.test(p)
      || /\.(key|pem|pfx|p12|db|db3|sqlite|sqlite3)(?:[-.]|$)/i.test(p))) {
    throw new Error('UNSAFE_PATH');
  }
  return path;
}
const relativePath = z.string().superRefine((value, ctx) => {
  try { safeRelative(value); } catch { ctx.addIssue({ code: 'custom', message: 'UNSAFE_PATH' }); }
});
const artifact = z.strictObject({ path: relativePath, bytes: z.number().int().nonnegative().max(MAX_ARTIFACT), sha256: digest });
const source = z.strictObject({ url: z.string().url().refine(v => {
  const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password;
}), accessed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v =>
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v) });
const claim = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  kind: z.enum(['mathematical-derivation', 'numerical-check', 'cryptographic-proof', 'adversarial-test', 'benchmark', 'deployment', 'limitation']),
  status: z.enum(['measured', 'reproduced', 'derived', 'not-demonstrated', 'blocked']),
  relation: text, limitations: z.array(text).min(1).max(40),
  artifacts: z.array(relativePath).min(1).max(128), sources: z.array(source).max(40),
}).superRefine((value, ctx) => {
  if (new Set(value.artifacts).size !== value.artifacts.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_ARTIFACT' });
});
export const Catalog = z.strictObject({ schema: z.literal('proofkit-catalog-v1'), title: text,
  claims: z.array(claim).min(1).max(128) }).superRefine((value, ctx) => {
  if (new Set(value.claims.map(c => c.id)).size !== value.claims.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_CLAIM' });
});
export const Manifest = z.strictObject({
  schema: z.literal('proofkit-manifest-v1'), created_at_utc: date,
  timestamp_authority: z.literal('local-clock-unattested'), semantic_validation: z.literal(false),
  catalog: artifact,
  source: z.strictObject({ git_available: z.boolean(), commit: z.string().regex(/^[0-9a-f]{40,64}$/).nullable(),
    dirty: z.boolean().nullable(), untracked_paths: z.array(z.string().max(4096)).max(10000) }),
  artifacts: z.array(artifact).min(1).max(512),
}).superRefine((value, ctx) => {
  if (new Set(value.artifacts.map(a => a.path)).size !== value.artifacts.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_ARTIFACT' });
});

function inside(root, path) {
  const r = relative(root, path);
  if (r === '..' || r.startsWith(`..${sep}`) || isAbsolute(r)) throw new Error('OUTSIDE_REPOSITORY');
}

/** Refuse all symlinks/junctions, including those which point back into the repository. */
function walk(root, path, createParents = false) {
  const base = realpathSync(root); let current = base;
  for (const [i, part] of path.split('/').entries()) {
    current = join(current, part); inside(base, current);
    const last = i === path.split('/').length - 1;
    let stat;
    try { stat = lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!last && createParents) mkdirSync(current, { mode: 0o700 });
      else if (!last) throw new Error('MISSING_PATH');
      else return current;
      stat = lstatSync(current);
    }
    if (stat.isSymbolicLink()) throw new Error('SYMLINK_FORBIDDEN');
    if (!last && !stat.isDirectory()) throw new Error('PARENT_NOT_DIRECTORY');
    inside(base, realpathSync(current));
  }
  return current;
}

export function readArtifact(root, path, limit = MAX_ARTIFACT) {
  safeRelative(path); const absolute = walk(root, path);
  const before = lstatSync(absolute);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > limit) throw new Error('INVALID_ARTIFACT');
  const fd = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size > limit) throw new Error('ARTIFACT_CHANGED');
    // A concurrent append cannot turn a bounded artifact into an unbounded read.
    const buffer = Buffer.alloc(opened.size + 1); let count = 0;
    while (count < buffer.length) {
      const amount = readSync(fd, buffer, count, buffer.length - count, null);
      if (amount === 0) break;
      count += amount;
    }
    const bytes = buffer.subarray(0, count);
    const after = lstatSync(walk(root, path));
    if (bytes.length !== opened.size || opened.size !== after.size || opened.ino !== after.ino
      || opened.dev !== after.dev || after.mtimeMs !== before.mtimeMs) throw new Error('ARTIFACT_CHANGED');
    return bytes;
  } finally { closeSync(fd); }
}

function writeNew(root, path, value) {
  safeRelative(path); const absolute = walk(root, path, true);
  const fd = openSync(absolute, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); }
  finally { closeSync(fd); }
  return path;
}

export function loadCatalog(root) {
  return Catalog.parse(JSON.parse(readArtifact(root, CATALOG_PATH, 1024 * 1024).toString('utf8')));
}
export function artifactPaths(catalog) {
  const paths = [...new Set(catalog.claims.flatMap(c => c.artifacts))].sort();
  if (paths.includes(CATALOG_PATH) || paths.length > 512) throw new Error('INVALID_ARTIFACT_SET');
  return paths;
}
function metadata(root, path) { const bytes = readArtifact(root, path); return { path, bytes: bytes.length, sha256: hash(bytes) }; }
export function checkCatalog(root) {
  const catalog = loadCatalog(root); const artifacts = artifactPaths(catalog).map(path => metadata(root, path));
  return { status: 'integrity-readable', semantic_validation: false, claims: catalog.claims.length, artifacts };
}

function gitSnapshot(root) {
  const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
  const commit = git(['rev-parse', 'HEAD']);
  const work = git(['diff', '--quiet']); const staged = git(['diff', '--cached', '--quiet']);
  const files = git(['ls-files', '--others', '--exclude-standard', '-z']);
  if (commit.status !== 0 || ![0, 1].includes(work.status) || ![0, 1].includes(staged.status) || files.status !== 0)
    return { git_available: false, commit: null, dirty: null, untracked_paths: [] };
  const untracked = files.stdout.split('\0').filter(Boolean);
  return { git_available: true, commit: commit.stdout.trim(), dirty: work.status === 1 || staged.status === 1 || untracked.length > 0,
    untracked_paths: untracked };
}

export function seal(root, output = `evidence/manifests/${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.json`) {
  // Validate destination before reading a catalogue or creating directories.
  safeRelative(output);
  const catalog = loadCatalog(root);
  const manifest = Manifest.parse({ schema: 'proofkit-manifest-v1', created_at_utc: new Date().toISOString(),
    timestamp_authority: 'local-clock-unattested', semantic_validation: false,
    catalog: metadata(root, CATALOG_PATH), source: gitSnapshot(root),
    artifacts: artifactPaths(catalog).map(path => metadata(root, path)) });
  writeNew(root, output, manifest);
  return { manifest: output, artifact_count: manifest.artifacts.length, semantic_validation: false,
    timestamp_authority: manifest.timestamp_authority };
}

export function verifyManifest(root, path) {
  const manifest = Manifest.parse(JSON.parse(readArtifact(root, path, 4 * 1024 * 1024).toString('utf8')));
  if (manifest.catalog.path !== CATALOG_PATH) throw new Error('CATALOG_PATH_MISMATCH');
  const actualCatalog = metadata(root, CATALOG_PATH);
  if (actualCatalog.bytes !== manifest.catalog.bytes || actualCatalog.sha256 !== manifest.catalog.sha256) throw new Error('CATALOG_MISMATCH');
  const paths = artifactPaths(loadCatalog(root));
  const declared = manifest.artifacts.map(a => a.path).sort();
  if (JSON.stringify(paths) !== JSON.stringify(declared)) throw new Error('ARTIFACT_SET_MISMATCH');
  for (const entry of manifest.artifacts) {
    const actual = metadata(root, entry.path);
    if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) throw new Error('ARTIFACT_MISMATCH');
  }
  return { status: 'integrity-verified', semantic_validation: false, artifact_count: paths.length,
    timestamp_authority: manifest.timestamp_authority, recorded_source: manifest.source };
}

export function doctor(root) {
  const check = (command, args) => {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 15000, windowsHide: true });
    return { available: !result.error && result.status === 0,
      version: result.status === 0 ? result.stdout.trim().slice(0, 256) : null };
  };
  const [major, minor] = process.versions.node.split('.').map(Number);
  return { node: process.version, node_required: '>=24.11.0',
    node_supported: major > 24 || (major === 24 && minor >= 11),
    git: check('git', ['--version']), docker: check('docker', ['version', '--format', '{{.Server.Version}}']),
    rust: check(process.execPath, ['scripts/cargo.mjs', '--version']),
    note: 'Availability only; no profile was executed and no security guarantee was validated.' };
}

export function runProfile(root, id, { requirePostQuantum = false, executor } = {}) {
  const profile = Object.hasOwn(profiles, id) ? profiles[id] : undefined;
  if (!profile) throw new Error('UNKNOWN_PROFILE');
  if (requirePostQuantum && !profile.postQuantum) throw new Error('POST_QUANTUM_PROFILE_UNAVAILABLE');
  // Missing fixtures fail before execution; no generated substitute or success marker.
  for (const path of profile.required) readArtifact(root, path);
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const localDirectory = `.tools/proofkit/runs/${stamp}-${randomUUID()}`;
  // This fixed private output is the only exception to artifact .tools exclusion.
  const directory = walk(root, `${localDirectory}/sentinel`, true);
  const outputDirectory = dirname(directory);
  const report = { schema: 'proofkit-run-v1', profile: id, relation: profile.relation,
    started_at_utc: new Date().toISOString(), date_is_self_reported: true,
    post_quantum: profile.postQuantum, outcome: 'unknown', steps: [],
    semantics: 'Process outcomes only; no automatic claim promotion, percentile or semantic certification.',
    privacy: 'Raw logs stay local under .tools; POSIX mode 0600/0700 is not a Windows ACL guarantee.' };
  const launch = executor ?? ((args, log) => {
    const fd = openSync(log, 'wx', 0o600);
    try { return spawnSync(process.execPath, args, { cwd: root, stdio: ['ignore', fd, fd], windowsHide: true, timeout: 3600000 }); }
    finally { closeSync(fd); }
  });
  try {
    for (const step of profile.steps(root, outputDirectory)) {
      const started = performance.now();
      let result;
      try { result = launch(step.args, join(outputDirectory, `${step.id}.log`)); }
      catch { result = { status: null, error: { code: 'UNKNOWN_EXECUTION_ERROR' } }; }
      const outcome = result.error?.code === 'ENOENT' ? 'unavailable' :
        result.status === 0 && !result.error && !result.signal ? 'passed' :
          result.status === null || result.status === undefined || result.signal ? 'unknown' : 'failed';
      report.steps.push({ id: step.id, outcome, exit_code: Number.isInteger(result.status) ? result.status : null,
        elapsed_ms: performance.now() - started });
      if (outcome !== 'passed') { report.outcome = outcome; break; }
    }
    if (report.steps.length && report.steps.every(s => s.outcome === 'passed')) report.outcome = 'passed';
  } finally {
    report.finished_at_utc = new Date().toISOString();
    writeFileSync(join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  return { ...report, report: `${localDirectory}/report.json` };
}
