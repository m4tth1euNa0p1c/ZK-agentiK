import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { createClaimTool } from './tool.js';

/** Transport adapter only. No private prover input, trust registry or operator route is exposed. */
export function createClaimMcpServer(tool: ReturnType<typeof createClaimTool>): McpServer {
  const server = new McpServer({ name: 'zk-agentik-horizon-sandbox', version: '0.1.0' });
  const blocked = () => ({ isError: true, content: [{ type: 'text' as const,
    text: 'REQUEST_REJECTED_OR_UNKNOWN: reconcile before any retry; sandbox only.' }] });
  server.registerTool('horizon_issue_challenge', {
    description: 'Issue a verifier-controlled challenge for one configured synthetic claim. No payment.',
    inputSchema: z.strictObject({}),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async input => {
    try {
      const challenge = await tool.issue(input);
      return { content: [{ type: 'text', text: 'Synthetic challenge issued.' }], structuredContent: { challenge } };
    } catch { return blocked(); }
  });
  server.registerTool('horizon_authorize_claim', {
    description: 'Verify a real Horizon presentation and record at most one local synthetic claim authorization. No financial API.',
    inputSchema: z.strictObject({ nonce: z.string().regex(/^[0-9a-f]{64}$/),
      presentation: z.record(z.string(), z.unknown()) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async input => {
    try {
      const result = await tool.execute(input);
      return { ...(result.status === 'COMPLETED' ? {} : { isError: true }),
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: { ...result, target: 'synthetic-local-sqlite' } };
    } catch { return blocked(); }
  });
  return server;
}
