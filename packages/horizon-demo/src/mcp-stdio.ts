import { readFileSync } from 'node:fs';
import { BoundedStdioServerTransport } from './bounded-stdio.js';
import { PublicConfig } from './types.js';
import { ProofWorker } from './worker.js';
import { AuthorizationStore } from './store.js';
import { createClaimTool } from './tool.js';
import { createClaimMcpServer } from './mcp.js';

const configPath = process.argv[2]; const databasePath = process.argv[3];
if (!configPath || !databasePath) throw new Error('Usage: horizon:mcp <public.json> <dedicated-sandbox.sqlite>');
const config = PublicConfig.parse(JSON.parse(readFileSync(configPath, 'utf8')) as unknown);
const store = new AuthorizationStore(databasePath, config);
const worker = new ProofWorker();
try {
  const server = createClaimMcpServer(createClaimTool(store, worker, config));
  // Bound the framing buffer before JSON.parse; the SDK then bounds the presentation itself.
  const transport = new BoundedStdioServerTransport(process.stdin, process.stdout);
  let closed = false;
  const close = () => { if (!closed) { closed = true; worker.close(); store.close(); } };
  transport.onclose = close;
  await server.connect(transport);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { close(); void server.close(); });
} catch (error) { worker.close(); store.close(); throw error; }
