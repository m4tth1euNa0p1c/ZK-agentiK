import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const path = 'target/riscv32im-unknown-none-elf/release/policy-guest-riscv';
const elf = readFileSync(path);
assert.equal(elf.subarray(0, 4).toString('hex'), '7f454c46');
assert.equal(elf[4], 1, 'ELF32');
assert.equal(elf[5], 1, 'little endian');
assert.equal(elf.readUInt16LE(18), 243, 'RISC-V machine');
assert.notEqual(elf.readUInt32LE(24), 0, 'entry point');
console.log(JSON.stringify({ path, bytes: elf.length, machine: 'RISC-V ELF32',
  sha256: createHash('sha256').update(elf).digest('hex'), entry: elf.readUInt32LE(24),
  scope: 'Freestanding compilation probe only; no zkVM execution or proof.' }, null, 2));
