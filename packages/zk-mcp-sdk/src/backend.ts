import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EnvelopeSchema, PrivateInputsSchema, PublicInputsSchema } from './schema.js';
import type { ProveRequest, ZkpEnvelope } from './schema.js';

export interface ZkVmBackend {
  readonly name: ZkpEnvelope['zkvm_backend'];
  readonly securityProfile: ZkpEnvelope['security_profile'];
  imageId(): Promise<string>;
  prove(request: ProveRequest): Promise<ZkpEnvelope>;
  verify(envelope: ZkpEnvelope): Promise<void>;
}

type Pending = { resolve: (result: unknown) => void; reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> };

/** Trusted local process, no network, no shell, no caller-supplied command. */
export class NativeSimulatorBackend implements ZkVmBackend {
  readonly name = 'native-simulator';
  readonly securityProfile = 'simulation';
  private readonly process: ChildProcessWithoutNullStreams;
  private pending = new Map<number, Pending>();
  private buffer = Buffer.alloc(0);
  private sequence = 0;
  private stopped = false;

  constructor(options: { binaryPath?: string; release?: boolean; timeoutMs?: number } = {}) {
    const profile = options.release ? 'release' : 'debug';
    const extension = process.platform === 'win32' ? '.exe' : '';
    const binaryPath = options.binaryPath ?? fileURLToPath(new URL(`../../../target/${profile}/zkvm-bridge${extension}`, import.meta.url));
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.process = spawn(binaryPath, [], { stdio: 'pipe', windowsHide: true, shell: false });
    this.process.stdout.on('data', (chunk: Buffer) => this.receive(chunk));
    this.process.stderr.resume(); // Never log potentially sensitive worker payloads.
    this.process.on('error', () => this.fail(new Error('WORKER_UNAVAILABLE: run npm run build:rust')));
    this.process.on('exit', () => this.fail(new Error('WORKER_EXITED')));
    this.process.stdin.on('error', () => this.fail(new Error('WORKER_PIPE_ERROR')));
  }
  private readonly timeoutMs: number;

  private fail(error: Error): void {
    this.stopped = true;
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    this.pending.clear();
    this.process.kill();
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > 2_097_152) { this.fail(new Error('WORKER_RESPONSE_TOO_LARGE')); return; }
    let newline: number;
    while ((newline = this.buffer.indexOf(10)) !== -1) {
      const line = this.buffer.subarray(0, newline).toString('utf8');
      this.buffer = this.buffer.subarray(newline + 1);
      try {
        const message = JSON.parse(line) as { request_id: number; ok: boolean; result?: unknown; error?: string };
        const entry = this.pending.get(message.request_id);
        if (!entry) throw new Error('UNEXPECTED_RESPONSE');
        clearTimeout(entry.timer);
        this.pending.delete(message.request_id);
        if (message.ok === true) entry.resolve(message.result);
        else entry.reject(new Error(typeof message.error === 'string' ? message.error : 'WORKER_ERROR'));
      } catch { this.fail(new Error('INVALID_WORKER_RESPONSE')); return; }
    }
  }

  private request(op: string, payload: unknown): Promise<unknown> {
    if (this.stopped) return Promise.reject(new Error('WORKER_CLOSED'));
    if (this.pending.size >= 64) return Promise.reject(new Error('WORKER_BUSY'));
    const request_id = ++this.sequence;
    const wire = JSON.stringify({ request_id, op, payload }) + '\n';
    if (Buffer.byteLength(wire) > 2_097_152) return Promise.reject(new Error('REQUEST_TOO_LARGE'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('WORKER_TIMEOUT')), this.timeoutMs);
      this.pending.set(request_id, { resolve, reject, timer });
      this.process.stdin.write(wire);
    });
  }
  async imageId(): Promise<string> {
    const result = await this.request('image_id', null);
    if (typeof result !== 'string' || !/^sim-sha256:[0-9a-f]{64}$/.test(result)) throw new Error('INVALID_IMAGE');
    return result;
  }
  async prove(request: ProveRequest): Promise<ZkpEnvelope> {
    return EnvelopeSchema.parse(await this.request('prove', {
      public_inputs: PublicInputsSchema.parse(request.public_inputs),
      private_inputs: PrivateInputsSchema.parse(request.private_inputs),
    }));
  }
  async verify(envelope: ZkpEnvelope): Promise<void> {
    if (await this.request('verify', EnvelopeSchema.parse(envelope)) !== true) throw new Error('INVALID_PROOF');
  }
  close(): void { this.fail(new Error('WORKER_CLOSED')); }
}

export class UnavailableBackend implements ZkVmBackend {
  readonly securityProfile = 'zk';
  constructor(readonly name: 'sp1' | 'risc0' | 'magnetar') {}
  async imageId(): Promise<string> { throw new Error(`BACKEND_UNAVAILABLE:${this.name}`); }
  async prove(_request: ProveRequest): Promise<ZkpEnvelope> { throw new Error(`BACKEND_UNAVAILABLE:${this.name}`); }
  async verify(_envelope: ZkpEnvelope): Promise<void> { throw new Error(`BACKEND_UNAVAILABLE:${this.name}`); }
}
