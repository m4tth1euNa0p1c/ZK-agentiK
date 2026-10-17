import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';

/** Bounded, serial JSONL connection. A timeout kills the process and never authorizes. */
export class ProofWorker {
  private readonly child: ChildProcessWithoutNullStreams;
  private queue: Promise<void> = Promise.resolve();
  private buffer = '';
  private closed = false;
  private queued = 0;
  private pending: { resolve: (value: unknown) => void; reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout> } | undefined;

  constructor(binary = process.env['HORIZON_WORKER'] ?? resolve('labs/horizon/target/release',
    process.platform === 'win32' ? 'horizon-proof-worker.exe' : 'horizon-proof-worker')) {
    this.child = spawn(binary, [], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      if (Buffer.byteLength(this.buffer) > 131072) return this.fail();
      const end = this.buffer.indexOf('\n');
      if (end < 0) return;
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      const pending = this.pending;
      if (!pending || this.buffer.trim()) return this.fail();
      clearTimeout(pending.timer); this.pending = undefined;
      try {
        const value: unknown = JSON.parse(line);
        if (!value || typeof value !== 'object' || !('ok' in value)) throw new Error('WORKER_PROTOCOL');
        if (value.ok !== true || !('result' in value)) throw new Error('CRYPTO_REJECTED');
        pending.resolve(value.result);
      } catch { pending.reject(new Error('CRYPTO_REJECTED')); }
    });
    this.child.stderr.resume(); // Never forward possible private diagnostics to HTTP/logs.
    this.child.stdin.on('error', () => this.fail());
    this.child.on('error', () => this.fail());
    this.child.on('exit', () => this.fail());
  }

  private fail(): void {
    this.closed = true;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new Error('WORKER_UNAVAILABLE')); }
    this.pending = undefined;
    this.child.kill();
  }

  request(payload: unknown): Promise<unknown> {
    if (this.queued >= 8) return Promise.reject(new Error('WORKER_CAPACITY'));
    this.queued++;
    const result = this.queue.then(() => new Promise<unknown>((resolveRequest, reject) => {
      if (this.closed) return reject(new Error('WORKER_UNAVAILABLE'));
      const line = JSON.stringify(payload);
      if (Buffer.byteLength(line) > 65535) return reject(new Error('REQUEST_TOO_LARGE'));
      const timer = setTimeout(() => this.fail(), 30000);
      this.pending = { resolve: resolveRequest, reject, timer };
      this.child.stdin.write(line + '\n', error => { if (error) this.fail(); });
    }));
    this.queue = result.then(() => { this.queued--; }, () => { this.queued--; });
    return result;
  }

  close(): void { this.fail(); }
}
