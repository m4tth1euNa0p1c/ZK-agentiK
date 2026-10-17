import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { EnvelopeSchema } from '../packages/zk-mcp-sdk/dist/schema.js';

const path = 'docs/schemas/zkp-envelope.schema.json';
const schema = { $id: 'urn:zk-mcp:envelope:1.0-draft-01', ...z.toJSONSchema(EnvelopeSchema, { target: 'draft-2020-12' }) };
const content = JSON.stringify(schema, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== content) throw new Error('Schema drift: npm run schema');
  console.log('Schema matches the implementation; relational rules are in the RFC.');
} else {
  mkdirSync('docs/schemas', { recursive: true });
  writeFileSync(path, content);
  console.log(path);
}
