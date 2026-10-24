import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES,parseArgs,tasksFrom,requiredChecks} from '../scripts/agent-routine.mjs';

test('strict commands and profiles',()=>{
 assert.deepEqual(parseArgs(['plan']),{command:'plan'});
 assert.deepEqual(parseArgs(['check','--profile','quick']),{command:'check',profile:'quick'});
 for(const args of [[],['check'],['check','--profile','gpu'],['plan','--execute'],['check','--profile','quick',';bad']])assert.throws(()=>parseArgs(args));
});
test('validation profiles cannot deploy, push or trigger expensive CUDA proving',()=>{
 for(const commands of Object.values(PROFILES))for(const command of commands){
  assert.ok(['node','npm'].includes(command[0]));
  assert.doesNotMatch(command.join(' '),/(?:git\s+(?:push|reset|clean|merge)|deploy|risc0-gpu-lab\.mjs|gh\s+workflow)/i);
 }
 assert.ok(PROFILES.full.some(c=>c.includes('test:risc0:gpu'))); // unit tests, not an actual receipt
});
test('backlog refuses duplicate or unsupported tasks',()=>{
 const task={id:'H14',status:'ready',priority:'P0',title:'Remote target',acceptance:'zero unauthorized effects'};
 assert.equal(tasksFrom([task])[0].id,'H14');
 assert.throws(()=>tasksFrom([task,task]));
 assert.throws(()=>tasksFrom([{...task,id:'H99'}]));
 assert.throws(()=>tasksFrom([{...task,status:'done'}]));
});
test('source changes require strict validation',()=>{
 assert.equal(requiredChecks(['docs/development/WORK_ROUTINE.md']),'docs');
 assert.equal(requiredChecks(['scripts/agent-routine.mjs']),'quick');
 assert.equal(requiredChecks(['.github/workflows/ci.yml']),'quick');
 assert.equal(requiredChecks(['packages/proofkit-sdk/src/index.ts']),'full');
 assert.equal(requiredChecks(['labs/horizon/proof/src/lib.rs']),'full');
});
