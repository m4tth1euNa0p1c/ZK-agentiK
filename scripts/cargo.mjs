import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';

// Works on this Windows workstation even when rustup's bin is not in PATH.
const local = join(homedir(), '.cargo', 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo');
const cargo = process.env.CARGO ?? (existsSync(local) ? local : 'cargo');
const env = { ...process.env, PATH: `${dirname(cargo)}${delimiter}${process.env.PATH ?? ''}` };
const child = spawnSync(cargo, process.argv.slice(2), { env, stdio: 'inherit', shell: false });
if (child.error) console.error(child.error.message);
process.exit(child.status ?? 1);
