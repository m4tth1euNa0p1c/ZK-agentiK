import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EnterpriseGateway, MergeArgsSchema } from './gateway.js';

export function createMcpServer(gateway: EnterpriseGateway): McpServer {
  const server = new McpServer({ name: 'zk-mcp-enterprise-gateway-demo', version: '0.1.0' });
  server.registerTool('verifiable_gitlab_merge', {
    title: 'Verifiable GitLab merge (local simulation)',
    description: 'Évalue une politique DevSecOps en Rust, vérifie le reçu et simule le merge. Aucune preuve ZK réelle.',
    inputSchema: MergeArgsSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async args => {
    try { return await gateway.call(args); }
    catch {
      // Avoid returning raw upstream responses, witnesses or credentials to the LLM.
      return { isError: true, content: [{ type: 'text', text: 'MERGE_BLOCKED: vérification ou précondition refusée.' }] };
    }
  });
  return server;
}
