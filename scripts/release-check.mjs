import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, constants, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Build and inspect a package, then exercise the packed bytes outside all workspaces.
// This command has no publish or GitHub mutation step.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'proofkit-sdk');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = json(join(packageDir, 'package.json'));
const rootManifest = json(join(root, 'package.json'));
const lock = json(join(root, 'package-lock.json'));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--out-dir' && args[1]),
  'Usage: npm run release:check [-- --out-dir <directory>]');
const outDir = args.length ? resolve(args[1]) : undefined;
const expectedName = '@m4tth1euna0p1c/proofkit-sdk';
const repository = 'https://github.com/m4tth1euNa0p1c/ZP3ntiProof';
assert.equal(manifest.name, expectedName);
assert.match(manifest.version, /^\d+\.\d+\.\d+-alpha\.\d+$/);
assert.equal(rootManifest.version, manifest.version);
assert.equal(lock.version, manifest.version);
assert.equal(lock.packages[''].version, manifest.version);
assert.equal(lock.packages['packages/proofkit-sdk'].version, manifest.version);
assert.equal(lock.packages['packages/proofkit-sdk'].name, expectedName);
assert.equal(lock.packages['packages/horizon-demo'].dependencies[expectedName], manifest.version);
assert.equal(lock.packages[`node_modules/${expectedName}`].resolved, 'packages/proofkit-sdk');
assert.equal(manifest.private, undefined);
assert.equal(manifest.type, 'module');
assert.equal(manifest.license, 'MIT');
assert.equal(manifest.engines.node, '>=24.11');
assert.deepEqual(manifest.repository, { type: 'git', url: `${repository}.git`, directory: 'packages/proofkit-sdk' });
assert.deepEqual(manifest.publishConfig, { registry: 'https://npm.pkg.github.com', tag: 'alpha' });
assert.deepEqual(manifest.exports, { '.': { types: './dist/index.d.ts', import: './dist/index.js' } });
assert.deepEqual(manifest.files, ['dist/*.js', 'dist/*.d.ts', 'README.md', 'LICENSE']);
assert.equal(manifest.scripts, undefined, 'The distributed SDK must not require lifecycle scripts');
assert.equal(manifest.bundledDependencies, undefined);
assert.equal(manifest.bundleDependencies, undefined);
assert.deepEqual(manifest.dependencies, { zod: '4.6.7' });
assert.equal(readFileSync(join(packageDir, 'LICENSE'), 'utf8'), readFileSync(join(root, 'LICENSE'), 'utf8'));
const readme = readFileSync(join(packageDir, 'README.md'), 'utf8');
assert.ok(readme.includes(`${repository}/blob/v${manifest.version}/`), 'README must link to the version being packed');
assert.doesNotMatch(readme, /\]\((?:\.\.?\/|(?:docs|packages|tools)\/)/, 'README links must work outside the repo');

const npmCli = process.env.npm_execpath;
assert.ok(npmCli && existsSync(npmCli), 'Run this check with npm run release:check');
const compiler = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
assert.ok(existsSync(compiler), 'Run npm ci --ignore-scripts first');
function run(command, commandArgs, cwd) {
  const env = { ...process.env };
  delete env.NODE_PATH;
  const result = spawnSync(command, commandArgs, { cwd, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${commandArgs.join(' ')} failed:\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}
function npm(npmArgs, cwd) { return run(process.execPath, [npmCli, ...npmArgs], cwd); }
function inside(parent, child) {
  const path = relative(parent, child);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
function fileList(path) {
  return readdirSync(path, { recursive: true }).filter(entry => lstatSync(join(path, entry)).isFile())
    .map(entry => entry.split(sep).join('/')).sort();
}

const tempRoot = realpathSync(tmpdir());
const work = mkdtempSync(join(tempRoot, 'proofkit-release-check-'));
assert.ok(inside(tempRoot, work));
assert.ok(!inside(root, work), 'Consumer must live outside the monorepo');
let succeeded = false;
try {
  run(process.execPath, [compiler, '-p', join(packageDir, 'tsconfig.json')], root);
  const packDir = join(work, 'pack');
  mkdirSync(packDir);
  const packed = JSON.parse(npm(['pack', '--workspace', expectedName, '--ignore-scripts', '--json',
    '--pack-destination', packDir], root));
  assert.equal(packed.length, 1);
  const pack = packed[0];
  const filename = `m4tth1euna0p1c-proofkit-sdk-${manifest.version}.tgz`;
  assert.equal(pack.filename, filename);
  assert.equal(pack.name, expectedName);
  assert.equal(pack.version, manifest.version);
  const expectedFiles = ['LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js', 'package.json'].sort();
  assert.deepEqual(pack.files.map(file => file.path).sort(), expectedFiles, 'Unexpected or missing archive file');
  assert.deepEqual(pack.bundled, [], 'Dependencies must be installed separately, never bundled');
  for (const path of ['dist/index.js', 'dist/index.d.ts']) {
    assert.doesNotMatch(readFileSync(join(packageDir, path), 'utf8'), /sourceMappingURL=/,
      'Source map references would point outside the distribution');
  }

  const consumer = join(work, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'proofkit-release-consumer',
    version: '0.0.0', private: true, type: 'module' }, null, 2));
  // A Node consumer type-checks against the Node globals (zod's declarations reference URL);
  // pin the same @types/node as the monorepo lockfile so the registry cannot move the target.
  const nodeTypes = lock.packages['node_modules/@types/node'];
  assert.equal(nodeTypes.version, rootManifest.devDependencies['@types/node']);
  npm(['install', join(packDir, filename), `@types/node@${nodeTypes.version}`, '--ignore-scripts', '--no-audit',
    '--no-fund', '--workspaces=false', '--registry=https://registry.npmjs.org'], consumer);
  const installedDir = join(consumer, 'node_modules', ...expectedName.split('/'));
  assert.ok(!lstatSync(installedDir).isSymbolicLink(), 'Consumer must install a real tarball, not a workspace symlink');
  assert.deepEqual(fileList(installedDir), expectedFiles);
  assert.deepEqual(json(join(installedDir, 'package.json')), manifest);
  for (const path of expectedFiles) {
    assert.deepEqual(readFileSync(join(installedDir, path)), readFileSync(join(packageDir, path)),
      `Installed bytes differ: ${path}`);
  }
  const installedLock = json(join(consumer, 'package-lock.json'));
  assert.equal(installedLock.packages['node_modules/zod'].version, manifest.dependencies.zod);
  assert.equal(installedLock.packages['node_modules/zod'].integrity, lock.packages['node_modules/zod'].integrity);
  assert.ok(existsSync(join(consumer, 'node_modules', 'zod', 'LICENSE')));
  assert.equal(installedLock.packages['node_modules/@types/node'].version, nodeTypes.version);
  assert.equal(installedLock.packages['node_modules/@types/node'].integrity, nodeTypes.integrity);

  writeFileSync(join(consumer, 'runtime.mjs'), `import assert from 'node:assert/strict';
import { z } from 'zod';
import { Binding, defineVerifiedTool, ToolError } from '${expectedName}';
assert.ok(import.meta.resolve('${expectedName}').includes('node_modules/'));
let effects = 0;
const challenge = { nonce: 'a'.repeat(64), tenant: 'fixture', audience: 'fixture', action: 'record',
  operation_id: 'fixture', issued_at_ms: 1000, expires_at_ms: 2000 };
const tool = defineVerifiedTool({ name: 'package_fixture', profile: 'package-test', evidenceKind: 'simulation',
  environment: 'sandbox', input: z.strictObject({}), challenge: Binding, verified: z.literal(true), clock: () => 1100,
  authority: { issue: () => challenge, expected: () => challenge,
    verify: p => { if (p.seal !== 'fixture') throw new Error('REJECTED'); return true; },
    authorize: () => { effects++; return { status: 'fixture' }; } } });
assert.deepEqual(await tool.issue({}), challenge);
await assert.rejects(tool.execute({ nonce: challenge.nonce, presentation: { seal: 'invalid' } }), ToolError);
assert.equal(effects, 0);
assert.deepEqual(await tool.execute({ nonce: challenge.nonce, presentation: { seal: 'fixture' } }), { status: 'fixture' });
assert.equal(effects, 1);
console.log('Packed ESM consumer passed; synthetic adapter only.');
`);
  run(process.execPath, ['runtime.mjs'], consumer);
  writeFileSync(join(consumer, 'consumer.ts'), `import { z } from 'zod';
import { Binding, defineVerifiedTool, ToolError, type ToolAuthority, type EvidenceKind } from '${expectedName}';
const evidenceKind: EvidenceKind = 'simulation';
const authority: ToolAuthority<Record<string, never>, Binding, true, number> = {
  issue: () => ({}), expected: () => ({}), verify: () => true, authorize: () => 1,
};
const tool = defineVerifiedTool({ name: 'type_fixture', profile: 'package-test', evidenceKind,
  environment: 'sandbox', input: z.strictObject({}), challenge: Binding, verified: z.literal(true), authority });
const expectedResult: Promise<number> = tool.execute({});
const expectedBinding: Promise<Binding> = tool.issue({});
const error: Error = new ToolError('REJECTED');
// @ts-expect-error evidence descriptors are a closed union.
const wrongKind: EvidenceKind = 'unverified';
// @ts-expect-error the result type must survive the distributed declarations.
const wrongResult: Promise<string> = tool.execute({});
void [expectedResult, expectedBinding, error, wrongKind, wrongResult];
`);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2023', lib: ['ES2024'], module: 'NodeNext', moduleResolution: 'NodeNext',
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noEmit: true, skipLibCheck: false, types: ['node'],
  }, include: ['consumer.ts'] }, null, 2));
  run(process.execPath, [compiler, '-p', join(consumer, 'tsconfig.json')], consumer);
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    copyFileSync(join(packDir, filename), join(outDir, filename), constants.COPYFILE_EXCL);
  }
  console.log(JSON.stringify({ package: expectedName, version: manifest.version, files: expectedFiles,
    shasum: pack.shasum, integrity: pack.integrity, checks: ['metadata', 'archive-allowlist',
      'external-tarball-install', 'dependency-integrity', 'esm-import', 'typescript-consumer'],
    ...(outDir ? { tarball: join(outDir, filename) } : {}), published: false }, null, 2));
  succeeded = true;
} finally {
  if (succeeded) {
    // Delete only this command's own resolved temporary directory.
    assert.ok(inside(tempRoot, realpathSync(work)));
    rmSync(work, { recursive: true, force: true });
  } else {
    console.error(`Release check failed; diagnostic consumer retained at ${work}`);
  }
}
