import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { Binding, defineVerifiedTool, ToolError } from '../src/index.js';

const Challenge = Binding.extend({ policy: z.literal('server-only') }).strict();
const Verdict = z.strictObject({ allow: z.literal(true), object: z.literal('claim-1') });
const base = { nonce: 'a'.repeat(64), tenant: 'tenant-a', audience: 'controller', action: 'record',
  operation_id: 'claim-1', issued_at_ms: 1000, expires_at_ms: 2000, policy: 'server-only' as const };
const input = () => ({ nonce: base.nonce, presentation: { seal: 'valid' } });
function fixture() {
  let now = 1100; let effects = 0; let consumed = false; let verificationCalls = 0;
  const definition = {
    name: 'record_claim', profile: 'unit-test-adapter', evidenceKind: 'simulation' as const, environment: 'sandbox' as const,
    input: z.strictObject({}), challenge: Challenge, verified: Verdict, clock: () => now, maxInFlight: 2,
    authority: {
      issue: () => structuredClone(base),
      expected: (nonce: string) => { if (nonce !== base.nonce || consumed) throw new Error('UNKNOWN'); return structuredClone(base); },
      verify: async (presentation: Readonly<Record<string, unknown>>, expected: Readonly<z.infer<typeof Challenge>>) => {
        verificationCalls++;
        assert.ok(Object.isFrozen(expected));
        if (presentation['seal'] !== 'valid') throw new Error('SECRET_DIAGNOSTIC_MUST_NOT_ESCAPE');
        return { allow: true as const, object: 'claim-1' as const };
      },
      authorize: () => {
        if (consumed || now >= base.expires_at_ms) throw new Error('CONSUMED_OR_EXPIRED');
        consumed = true; effects++; return { status: 'COMPLETED' };
      },
    },
  };
  return { definition, setNow: (value: number) => { now = value; }, effects: () => effects,
    verificationCalls: () => verificationCalls };
}

test('verified tool reaches adapter once, rejects replay and never accepts caller configuration', async () => {
  const f = fixture(); const tool = defineVerifiedTool(f.definition);
  await tool.issue({});
  for (const field of ['policy', 'backend', 'key', 'verified', 'action']) {
    await assert.rejects(tool.execute({ ...input(), [field]: 'caller' }));
  }
  assert.equal(f.effects(), 0);
  await tool.execute(input());
  await assert.rejects(tool.execute(input()));
  assert.equal(f.effects(), 1);
  assert.equal(f.verificationCalls(), 1);
});

test('invalid proof and invalid verifier output both reject before any effect, without private error details', async () => {
  const f = fixture();
  await assert.rejects(defineVerifiedTool(f.definition).execute({ ...input(), presentation: { seal: 'bad' } }),
    error => error instanceof ToolError && error.message === 'REJECTED');
  const malformed = { ...f.definition, authority: { ...f.definition.authority, verify: () => ({ allow: false }) } };
  await assert.rejects(defineVerifiedTool(malformed).execute(input()));
  assert.equal(f.effects(), 0);
});

test('expiry after async verification and invalid clocks never reach the authorization adapter', async () => {
  for (const end of [2000, 2500, 999, Number.NaN, Number.POSITIVE_INFINITY]) {
    const f = fixture();
    const original = f.definition.authority.verify;
    f.definition.authority.verify = async (proof, expected) => {
      const result = await original(proof, expected); f.setNow(end); return result;
    };
    await assert.rejects(defineVerifiedTool(f.definition).execute(input()));
    assert.equal(f.effects(), 0);
  }
});

test('wrong challenge nonce and excessive lifetime fail closed', async () => {
  for (const changed of [{ nonce: 'b'.repeat(64) }, { expires_at_ms: 40000 }]) {
    const f = fixture(); f.definition.authority.expected = () => ({ ...base, ...changed });
    await assert.rejects(defineVerifiedTool(f.definition).execute(input()));
    assert.equal(f.effects(), 0);
    assert.equal(f.verificationCalls(), 0);
  }
});

test('input snapshot prevents caller changes across awaits; adapter replacement is not observed', async () => {
  const f = fixture(); const original = f.definition.authority.expected;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const definition = { ...f.definition, authority: { ...f.definition.authority,
    expected: async (nonce: string) => { await gate; return original(nonce); } } };
  const tool = defineVerifiedTool(definition);
  definition.authority.verify = async () => { throw new Error('REPLACED'); };
  const request = input(); const pending = tool.execute(request);
  request.presentation.seal = 'bad'; request.nonce = 'b'.repeat(64);
  release(); await pending;
  assert.equal(f.effects(), 1);
});

test('concurrent calls rely on atomic adapter exclusion; capacity is bounded and released after failures', async () => {
  const f = fixture();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const verify = f.definition.authority.verify;
  f.definition.authority.verify = async (proof, expected) => { await gate; return verify(proof, expected); };
  const tool = defineVerifiedTool(f.definition);
  const one = tool.execute(input()); const two = tool.execute(input());
  await assert.rejects(tool.execute(input()), error => error instanceof ToolError && error.code === 'CAPACITY');
  release();
  const results = await Promise.allSettled([one, two]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.effects(), 1);
  await assert.rejects(tool.execute(input()), error => error instanceof ToolError && error.code === 'REJECTED');
});

test('uncertain adapter error is reported UNKNOWN with no retry', async () => {
  const f = fixture(); let calls = 0;
  const definition = { ...f.definition, authority: { ...f.definition.authority,
    authorize: () => { calls++; throw new Error('response lost'); } } };
  await assert.rejects(defineVerifiedTool(definition).execute(input()),
    error => error instanceof ToolError && error.code === 'RESULT_UNKNOWN');
  assert.equal(calls, 1);
});

test('cyclic, oversized, non-JSON and deep input reject without verification', async () => {
  const f = fixture(); const tool = defineVerifiedTool(f.definition);
  const cyclic: Record<string, unknown> = {}; cyclic['self'] = cyclic;
  let deep: unknown = 'end'; for (let i = 0; i < 40; i++) deep = { next: deep };
  for (const presentation of [cyclic, { data: 'x'.repeat(65536) }, { secret: undefined }, { date: new Date() }, { deep },
    { hugeSparseArray: new Array<unknown>(1_000_000_000) }, { smallSparseArray: new Array<unknown>(2) }]) {
    await assert.rejects(tool.execute({ nonce: base.nonce, presentation }));
  }
  assert.equal(f.effects(), 0); assert.equal(f.verificationCalls(), 0);
  await tool.execute(input()); assert.equal(f.effects(), 1);
});

test('production cannot select simulation and caller cannot replace a server input schema', async () => {
  const f = fixture();
  assert.throws(() => defineVerifiedTool({ ...f.definition, environment: 'production' }), /SIMULATION_FORBIDDEN/);
  const tool = defineVerifiedTool(f.definition);
  await assert.rejects(tool.issue({ policy: 'weakened' }));
  assert.equal(f.effects(), 0);
});
