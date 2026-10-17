import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const fixture = JSON.parse(readFileSync('tests/fixtures/horizon/public-presentation.json', 'utf8'));
const result = spawnSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
  '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--memory', '256m', '--cpus', '1',
  '--pids-limit', '32', '-i', '--entrypoint', '/usr/local/bin/horizon-proof-worker', 'zk-agentik/horizon-demo:local'],
{ input: JSON.stringify(fixture) + '\n', encoding: 'utf8', windowsHide: true, timeout: 30000 });
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(result.stdout).ok, true);
console.log(JSON.stringify({ independent_container_verification: true, network: 'none', mounts: [],
  input: 'public preoptimization fixture only', live_authorization: false }));
