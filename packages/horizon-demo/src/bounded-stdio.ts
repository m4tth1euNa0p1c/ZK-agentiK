import type { Readable, Writable } from 'node:stream';
import { ReadBuffer, serializeMessage } from '@modelcontextprotocol/sdk/shared/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';

export interface StdioBudget {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxPendingMessages: number;
  maxInFlightRequests: number;
  writeTimeoutMs: number;
}
type Pending = { serialized: string; bytes: number; requestId: RequestId | undefined;
  resolve: () => void; reject: (error: Error) => void;
  returned: boolean; written: boolean; drained: boolean };

/** Resource-bounded stdio using the official SDK framing/parser and serializer.
 * One output write is active at a time. All requests, including tools/list,
 * consume a slot until their response is flushed. Overflow closes the session.
 * This cannot roll back an already committed application effect.
 */
export class BoundedStdioServerTransport implements Transport {
  onclose?: NonNullable<Transport['onclose']>;
  onerror?: NonNullable<Transport['onerror']>;
  onmessage?: NonNullable<Transport['onmessage']>;
  private readonly budget: StdioBudget;
  private readonly reader: ReadBuffer;
  private readonly requests = new Set<RequestId>();
  private readonly queue: Pending[] = [];
  private active: Pending | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pendingBytes = 0;
  private pendingMessages = 0;
  private peakBytes = 0;
  private started = false;
  private closed = false;

  constructor(private readonly input: Readable = process.stdin,
    private readonly output: Writable = process.stdout, options: Partial<StdioBudget> = {}) {
    this.budget = { maxInputBytes: 128 * 1024, maxOutputBytes: 256 * 1024,
      maxPendingMessages: 16, maxInFlightRequests: 16, writeTimeoutMs: 5000, ...options };
    for (const value of Object.values(this.budget)) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_STDIO_BUDGET');
    }
    this.reader = new ReadBuffer({ maxBufferSize: this.budget.maxInputBytes });
  }

  snapshot(): Readonly<{ closed: boolean; pendingBytes: number; pendingMessages: number;
    inFlightRequests: number; peakPendingBytes: number }> {
    return Object.freeze({ closed: this.closed, pendingBytes: this.pendingBytes,
      pendingMessages: this.pendingMessages, inFlightRequests: this.requests.size,
      peakPendingBytes: this.peakBytes });
  }

  private fail(code: string): void {
    if (this.closed) return;
    try { this.onerror?.(new Error(code)); } catch { /* Closure must not depend on a diagnostic callback. */ }
    finally { void this.close(); }
  }
  private readonly onData = (chunk: Buffer | string): void => {
    if (this.closed) return;
    try {
      this.reader.append(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      while (!this.closed) {
        const message = this.reader.readMessage();
        if (message === null) break;
        if ('method' in message && 'id' in message) {
          if (this.requests.has(message.id) || this.requests.size >= this.budget.maxInFlightRequests) {
            this.fail('STDIO_REQUEST_BUDGET'); break;
          }
          this.requests.add(message.id);
        }
        this.onmessage?.(message);
      }
    } catch { this.fail('STDIO_INVALID_OR_OVERSIZED_INPUT'); }
  };
  private readonly onInputError = (): void => { this.fail('STDIO_INPUT_ERROR'); };
  private readonly onOutputError = (): void => { this.fail('STDIO_OUTPUT_ERROR'); };
  private readonly onEnd = (): void => { void this.close(); };
  private readonly onDrain = (): void => {
    if (this.active) { this.active.drained = true; this.finishWrite(); }
  };

  private readableOutputBytes(): number {
    // Duplex test/adaptor streams can acknowledge writes while retaining bytes
    // on their unread readable side. Do not let a large highWaterMark evade us.
    return 'readableLength' in this.output && typeof this.output.readableLength === 'number'
      ? this.output.readableLength : 0;
  }

  async start(): Promise<void> {
    if (this.started || this.closed) throw new Error('STDIO_ALREADY_STARTED_OR_CLOSED');
    this.started = true;
    this.input.on('data', this.onData);
    this.input.on('error', this.onInputError);
    this.input.on('end', this.onEnd);
    this.input.on('close', this.onEnd);
    this.output.on('error', this.onOutputError);
    this.output.on('close', this.onEnd);
    this.output.on('drain', this.onDrain);
    if (this.input.readableEnded || this.input.destroyed || this.output.destroyed) await this.close();
  }

  send(message: JSONRPCMessage): Promise<void> {
    if (this.closed || !this.started) return Promise.reject(new Error('STDIO_CLOSED'));
    let serialized: string;
    try { serialized = serializeMessage(message); }
    catch { this.fail('STDIO_SERIALIZATION_ERROR'); return Promise.reject(new Error('STDIO_SERIALIZATION_ERROR')); }
    const bytes = Buffer.byteLength(serialized);
    if (bytes > this.budget.maxOutputBytes
      || this.pendingBytes + bytes + this.readableOutputBytes() > this.budget.maxOutputBytes
      || this.pendingMessages >= this.budget.maxPendingMessages) {
      this.fail('STDIO_OUTPUT_BUDGET');
      return Promise.reject(new Error('STDIO_OUTPUT_BUDGET'));
    }
    return new Promise<void>((resolve, reject) => {
      const pending: Pending = { serialized, bytes,
        requestId: 'id' in message && !('method' in message) ? message.id : undefined,
        resolve, reject, returned: false, written: false, drained: false };
      this.queue.push(pending); this.pendingBytes += bytes; this.pendingMessages++;
      this.peakBytes = Math.max(this.peakBytes, this.pendingBytes);
      this.pump();
    });
  }

  private pump(): void {
    if (this.closed || this.active) return;
    const pending = this.queue.shift(); if (!pending) return;
    this.active = pending;
    this.timer = setTimeout(() => this.fail('STDIO_WRITE_TIMEOUT'), this.budget.writeTimeoutMs);
    try {
      const accepted = this.output.write(pending.serialized, error => {
        if (this.closed || this.active !== pending) return;
        if (error) { this.fail('STDIO_WRITE_ERROR'); return; }
        pending.written = true; this.finishWrite();
      });
      pending.returned = true;
      if (accepted) pending.drained = true;
      this.finishWrite();
    } catch { this.fail('STDIO_WRITE_ERROR'); }
  }

  private finishWrite(): void {
    const pending = this.active;
    if (this.closed || !pending || !pending.returned || !pending.written || !pending.drained) return;
    if (this.timer) clearTimeout(this.timer); this.timer = undefined;
    this.active = undefined;
    this.pendingBytes -= pending.bytes; this.pendingMessages--;
    if (pending.requestId !== undefined) this.requests.delete(pending.requestId);
    pending.resolve(); this.pump();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer); this.timer = undefined;
    this.input.off('data', this.onData); this.input.off('error', this.onInputError);
    this.input.off('end', this.onEnd); this.input.off('close', this.onEnd);
    if (this.input.listenerCount('data') === 0) this.input.pause();
    this.output.off('drain', this.onDrain);
    this.output.off('close', this.onEnd);
    // Keep our error listener until destroy finishes; remove it on the final close.
    if (this.output.closed) this.output.off('error', this.onOutputError);
    else this.output.once('close', () => this.output.off('error', this.onOutputError));
    this.reader.clear(); this.requests.clear();
    const pending = this.active ? [this.active, ...this.queue] : [...this.queue];
    this.active = undefined; this.queue.length = 0;
    this.pendingBytes = 0; this.pendingMessages = 0;
    for (const item of pending) item.reject(new Error('STDIO_CLOSED'));
    this.output.destroy();
    this.onclose?.();
  }
}
