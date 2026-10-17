import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseArgs, redactPaths, smallSampleSummary, validateContainer } from '../../../scripts/risc0-gpu-lab.mjs';

test('public logs redact plain, slash and JSON-escaped local repository paths', () => {
  const repo = 'C:\\Users\\operator\\repo';
  for (const value of [repo, repo.replaceAll('\\', '/'), JSON.stringify(repo)]) {
    const clean = redactPaths(value, repo);
    assert.ok(!clean.includes('operator')); assert.ok(clean.includes('<repository>'));
  }
});

test('runner refuses development mode before Docker or any filesystem artifact', () => {
  for (const mode of ['1', 'true', '', 'yes']) assert.throws(() => parseArgs([], { RISC0_DEV_MODE: mode }), /DEV_MODE_FORBIDDEN/);
  const result = spawnSync(process.execPath, ['scripts/risc0-gpu-lab.mjs', 'probe'], {
    env: { ...process.env, RISC0_DEV_MODE: '1' }, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DEV_MODE_FORBIDDEN/);
  assert.equal(result.stdout, '');
});

test('runner bounds samples, scenarios and retained container names', () => {
  assert.deepEqual(parseArgs([], {}), { scenario: 'critical', samples: 1, resume: undefined });
  assert.equal(parseArgs(['critical', '3'], { RISC0_DEV_MODE: '0' }).samples, 3);
  for (const args of [['critical', '0'], ['critical', '4'], ['fake'], ['base', '1', 'unrelated'], ['base', '1', 'a;rm']])
    assert.throws(() => parseArgs(args, {}), /Usage/);
});

test('container reuse rejects writable mount, wrong image and unbounded resources', () => {
  const config = { Image: 'sha256:fixture', Config: { Labels: { 'org.zk-agentik.role': 'risc0-gpu-lab' }, Cmd: ['sleep', 'infinity'] },
    Mounts: [{ Destination: '/workspace', Source: 'C:/repo', Type: 'bind', RW: false }],
    HostConfig: { Memory: 12 * 1024 ** 3, NanoCpus: 8e9, PidsLimit: 512, Privileged: false,
      CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges'], DeviceRequests: [{ Capabilities: [['gpu']] }] } };
  validateContainer(config, 'C:/repo', 'sha256:fixture');
  for (const mutate of [c => { c.Mounts[0].RW = true; }, c => { c.Image = 'wrong'; },
    c => { c.HostConfig.Memory = 0; }, c => { c.HostConfig.Privileged = true; },
    c => { c.Mounts.push({ Destination: '/secrets' }); }, c => { c.HostConfig.DeviceRequests = []; }]) {
    const bad = structuredClone(config); mutate(bad);
    assert.throws(() => validateContainer(bad, 'C:/repo', 'sha256:fixture'), /UNTRUSTED/);
  }
});

test('small sample observations do not invent tail estimates', () => {
  const result = smallSampleSummary([30, 10, 20]);
  assert.equal(result.n, 3); assert.equal(result.mean_ms, 20);
  assert.equal(result.min_ms, 10); assert.equal(result.max_ms, 30);
  assert.equal(result.p95_ms, null); assert.equal(result.p99_ms, null);
  assert.deepEqual(result.samples_in_order_ms, [30, 10, 20]);
  for (const values of [[], [NaN], [-1], [Infinity]]) assert.throws(() => smallSampleSummary(values), /INVALID_TIMINGS/);
});
