import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NativeSimulatorBackend } from '@zk-mcp/sdk';
import { FixtureConnectors } from './connectors.js';
import { EnterpriseGateway } from './gateway.js';
import { createMcpServer } from './server.js';
import { criticalFixture, CRITICAL_POLICY } from './critical.js';

if (process.env.NODE_ENV === 'production' || process.env.ZK_MCP_MODE === 'production') {
  throw new Error('Production is unavailable until a real verifier and live controls are implemented.');
}
const backend = new NativeSimulatorBackend();
try {
  const critical = process.env.ZK_MCP_SCENARIO === 'critical';
  const gateway = critical
    ? await EnterpriseGateway.demo(backend, criticalFixture(), { policy: CRITICAL_POLICY })
    : await EnterpriseGateway.demo(backend, new FixtureConnectors());
  const server = createMcpServer(gateway);
  server.server.onclose = () => backend.close();
  process.once('SIGINT', () => { backend.close(); void server.close(); });
  process.once('SIGTERM', () => { backend.close(); void server.close(); });
  await server.connect(new StdioServerTransport());
} catch (error) { backend.close(); throw error; }
