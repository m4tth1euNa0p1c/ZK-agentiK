import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deserializeMessage } from '@modelcontextprotocol/sdk/shared/stdio.js';
import { z } from 'zod';
import { BoundedStdioServerTransport, type StdioBudget } from '../../packages/horizon-demo/src/bounded-stdio.js';

function pair(options: Partial<StdioBudget> = {}) {
  const input = new PassThrough();
  const output = new PassThrough({ highWaterMark: 32 });
  const transport = new BoundedStdioServerTransport(input, output,
    { maxInputBytes: 128 * 1024, maxOutputBytes: 4096, maxPendingMessages: 8,
      maxInFlightRequests: 8, writeTimeoutMs: 100, ...options });
  const errors: string[] = []; transport.onerror = error => { errors.push(error.message); };
  return { input, output, transport, errors };
}
const response = (id: number, length = 256) => ({ jsonrpc: '2.0' as const, id, result: { text: 'x'.repeat(length) } });

test('stdio non-consumed output bounds messages/bytes, closes and rejects all pending sends', { timeout: 3000 }, async () => {
  const { input, output, transport, errors } = pair(); await transport.start();
  const sends = Array.from({ length: 1000 }, (_, i) => transport.send(response(i)));
  const settled = await Promise.allSettled(sends); await nextTurn();
  assert(settled.every(s => s.status === 'rejected'));
  assert.equal(transport.snapshot().closed, true); assert(transport.snapshot().peakPendingBytes <= 4096);
  assert.equal(transport.snapshot().pendingBytes, 0); assert.equal(transport.snapshot().pendingMessages, 0);
  assert.equal(transport.snapshot().inFlightRequests, 0);
  assert(output.readableLength + output.writableLength < 1024);
  assert.equal(input.listenerCount('data'), 0); assert.equal(input.listenerCount('error'), 0);
  assert.equal(output.listenerCount('drain'), 0); assert.equal(output.listenerCount('error'), 0);
  assert.equal(output.listenerCount('close'), 0); assert(errors.includes('STDIO_OUTPUT_BUDGET'));
  await assert.rejects(transport.send(response(1001)), /STDIO_CLOSED/);
});

test('stdio byte budget rejects an oversized response before write', async () => {
  const { output, transport, errors } = pair({ maxOutputBytes: 100 }); await transport.start();
  await assert.rejects(transport.send(response(1, 1000)), /STDIO_OUTPUT_BUDGET/);
  assert.equal(transport.snapshot().peakPendingBytes, 0); assert.equal(output.readableLength, 0);
  assert.deepEqual(errors, ['STDIO_OUTPUT_BUDGET']); await nextTurn();
});

test('stdio counts unread Duplex bytes even when its highWaterMark exceeds the output budget', async () => {
  const input = new PassThrough(); const output = new PassThrough({ highWaterMark: 64 * 1024 });
  const transport = new BoundedStdioServerTransport(input, output, { maxOutputBytes: 1024 });
  transport.onerror = () => {}; await transport.start();
  let accepted = 0;
  for (let id = 0; id < 1000; id++) {
    try { await transport.send(response(id)); accepted++; }
    catch { break; }
  }
  assert(accepted > 0 && accepted < 10); assert.equal(transport.snapshot().closed, true);
  assert(output.readableLength <= 1024); assert.equal(transport.snapshot().pendingMessages, 0);
  await nextTurn();
});

test('stdio blocked write times out and settles promises without drain', { timeout: 3000 }, async () => {
  const { transport, errors, output } = pair({ writeTimeoutMs: 25 }); await transport.start();
  await assert.rejects(transport.send(response(1)), /STDIO_CLOSED/); await nextTurn();
  assert.deepEqual(errors, ['STDIO_WRITE_TIMEOUT']); assert.equal(transport.snapshot().pendingBytes, 0);
  assert.equal(output.listenerCount('drain'), 0); assert.equal(output.listenerCount('error'), 0);
});

test('stdio normal drain preserves official framing and releases request slots', async () => {
  const { input, output, transport } = pair(); const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));
  const sends: Promise<void>[] = [];
  transport.onmessage = message => {
    if ('method' in message && 'id' in message) sends.push(transport.send(response(Number(message.id))));
  };
  await transport.start();
  input.write(Array.from({ length: 8 }, (_, id) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/list' }) + '\n').join(''));
  await Promise.all(sends);
  const messages = Buffer.concat(chunks).toString().trim().split('\n').map(deserializeMessage);
  assert.equal(messages.length, 8); assert.deepEqual(messages.map(m => 'id' in m ? m.id : undefined), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(transport.snapshot().inFlightRequests, 0); assert.equal(transport.snapshot().pendingMessages, 0);
  assert.equal(transport.snapshot().closed, false); await transport.close(); await nextTurn();
});

test('stdio preparse 128KiB bound and invalid framing close before dispatch', async () => {
  for (const payload of [' '.repeat(128 * 1024 + 1), '{broken-json}\n']) {
    const { input, transport, errors } = pair(); let messages = 0;
    transport.onmessage = () => { messages++; }; await transport.start();
    input.write(payload); await nextTurn();
    assert.equal(messages, 0); assert.equal(transport.snapshot().closed, true);
    assert(errors.includes('STDIO_INVALID_OR_OVERSIZED_INPUT'));
    input.write('{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n');
    assert.equal(messages, 0);
  }
});

test('stdio EOF/input error/output error close once and settle active output', async () => {
  for (const event of ['eof', 'input-error', 'output-error'] as const) {
    const { input, output, transport } = pair(); let closes = 0; transport.onclose = () => { closes++; };
    await transport.start();
    const result = transport.send(response(1)); const rejected = assert.rejects(result, /STDIO_CLOSED/);
    if (event === 'eof') input.end();
    else if (event === 'input-error') input.destroy(new Error('synthetic'));
    else output.destroy(new Error('synthetic'));
    await rejected; await nextTurn(); await transport.close(); await nextTurn();
    assert.equal(closes, 1); assert.equal(transport.snapshot().pendingMessages, 0);
    assert.equal(input.listenerCount('data'), 0); assert.equal(output.listenerCount('drain'), 0);
    assert.equal(output.listenerCount('error'), 0); assert.equal(output.listenerCount('close'), 0);
  }
});

test('official MCP tools/list flood is bounded outside tool maxInFlight; later mutation is never admitted', async () => {
  const { input, output, transport } = pair(); let effects = 0;
  const server = new McpServer({ name: 'stdio-budget-test', version: '0.0.0' });
  server.registerTool('synthetic_mutation', { inputSchema: z.strictObject({}) }, () => {
    effects++; return { content: [{ type: 'text', text: 'synthetic' }] };
  });
  await server.connect(transport);
  const flood = Array.from({ length: 1000 }, (_, id) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/list' }) + '\n').join('');
  input.write(flood + JSON.stringify({ jsonrpc: '2.0', id: 1001, method: 'tools/call',
    params: { name: 'synthetic_mutation', arguments: {} } }) + '\n');
  await nextTurn(); await nextTurn();
  assert.equal(transport.snapshot().closed, true); assert.equal(effects, 0);
  assert(transport.snapshot().peakPendingBytes <= 4096);
  assert(output.readableLength + output.writableLength <= 4096);
  assert.equal(transport.snapshot().pendingMessages, 0); assert.equal(transport.snapshot().inFlightRequests, 0);
  await server.close();
});
