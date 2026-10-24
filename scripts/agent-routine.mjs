#!/usr/bin/env node
/** Safe local validation orchestrator; does not push, deploy, modify git, or launch agents. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const PROFILES=Object.freeze({
 docs:[['node','--test','tests/agent-routine.test.mjs'],['npm','run','proofkit','--','check']],
 quick:[['node','--test','tests/agent-routine.test.mjs'],['npm','run','typecheck'],['npm','run','test:proofkit'],['npm','run','test:circuit'],['npm','run','proofkit','--','check']],
 crypto:[['node','scripts/cargo.mjs','test','--manifest-path','labs/horizon/Cargo.toml','--locked'],['npm','run','horizon:build'],['npm','run','test:horizon'],['npm','run','test:proofkit']],
 full:[['node','--test','tests/agent-routine.test.mjs'],['node','scripts/cargo.mjs','test','--workspace','--locked'],['node','scripts/cargo.mjs','test','--manifest-path','labs/horizon/Cargo.toml','--locked'],['npm','run','horizon:build'],['npm','test'],['npm','run','typecheck'],['npm','run','test:horizon'],['npm','run','test:proofkit'],['npm','run','test:circuit'],['npm','run','test:risc0:gpu'],['npm','run','proofkit','--','check']]
});
// Fixed commands only. On Windows, npm is a .cmd shim and needs a shell; a pre-joined string avoids
// Node's DEP0190 warning about concatenating an argument array under shell:true.
const spawnStep=(step,options)=>process.platform==='win32'
 ?spawnSync(step.join(' '),{cwd:ROOT,shell:true,...options})
 :spawnSync(step[0],step.slice(1),{cwd:ROOT,...options});
const git=args=>{const r=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:5000});return r.status===0?r.stdout.trim():null;};
export function parseArgs(argv){
 if(!argv.length||!['plan','doctor','check','help'].includes(argv[0]))throw Error('USAGE: plan|doctor|help|check --profile docs|quick|crypto|full');
 const command=argv[0];
 if(command!=='check'){if(argv.length!==1)throw Error('UNEXPECTED_ARGUMENT');return {command};}
 if(argv.length!==3||argv[1]!=='--profile'||!Object.hasOwn(PROFILES,argv[2]))throw Error('INVALID_CHECK_PROFILE');
 return {command,profile:argv[2]};
}
export function tasksFrom(source){
 if(!Array.isArray(source)||!source.length)throw Error('BACKLOG_EMPTY');
 const seen=new Set();
 return source.map(t=>{
  if(!t||typeof t!=='object'||!(/^(H1[1234567]|SEC-[0-9]+)$/.test(t.id||''))||seen.has(t.id))throw Error('INVALID_TASK_ID');
  if(!['ready','blocked','research'].includes(t.status)||!['P0','P1','P2'].includes(t.priority)||typeof t.title!=='string'||!t.title.trim()||typeof t.acceptance!=='string'||!t.acceptance.trim())throw Error('INVALID_TASK');
  seen.add(t.id);return t;
 });
}
export function requiredChecks(files){
 const paths=[...new Set(files.map(String))];
 if(paths.some(p=>/^(labs\/|crates\/|packages\/|tests\/horizon\/|tests\/circuit\/)/.test(p)))return 'full';
 if(paths.some(p=>/^(scripts\/|tools\/|tests\/|package\.json$|\.github\/workflows\/)/.test(p)))return 'quick';
 return 'docs';
}
function plan(){
 const tasks=tasksFrom(JSON.parse(readFileSync(join(ROOT,'docs/development/TASKS.json'),'utf8')).tasks);
 const head=git(['rev-parse','HEAD']),branch=git(['branch','--show-current']),dirty=git(['status','--porcelain']);
 process.stdout.write('ZK-agentic session plan\nHEAD: '+(head??'unavailable')+'\nBranch: '+(branch??'unavailable')+'\nWorking tree: '+(dirty===null?'unavailable':dirty?'DIRTY (preserve changes)':'clean')+'\n');
 for(const t of [...tasks].sort((a,b)=>['P0','P1','P2'].indexOf(a.priority)-['P0','P1','P2'].indexOf(b.priority)))process.stdout.write(t.priority+' '+t.id+' ['+t.status+'] '+t.title+'\nDone when: '+t.acceptance+'\n');
 process.stdout.write('Choose ONE ready task, test it and document actual results. Never silently push, merge or deploy.\n');
}
function doctor(){
 // Cargo is probed through the repository wrapper, as the check profiles use it (Windows PATH may lack cargo).
 for(const [name,cmd,args] of [['Node','node',['--version']],['npm','npm',['--version']],['git','git',['--version']],['Cargo','node',['scripts/cargo.mjs','--version']],['Docker','docker',['--version']]]){
  const r=spawnStep([cmd,...args],{encoding:'utf8',timeout:6000});
  process.stdout.write(name+': '+(r.status===0?r.stdout.trim():'unavailable (check PATH)')+'\n');
 }
 process.stdout.write('Offline check only; cannot establish CUDA, MATLAB, cloud or ZK proof availability.\n');
}
export function check(profile){
 if(!Object.hasOwn(PROFILES,profile))throw Error('INVALID_CHECK_PROFILE');
 const steps=PROFILES[profile],report={schema:'zk-agentic-agent-routine/1',date_utc:new Date().toISOString(),commit:git(['rev-parse','HEAD']),profile,steps:[],status:'FAILED'};
 const directory=join(ROOT,'.tools','agent-sessions');mkdirSync(directory,{recursive:true});
 const path=join(directory,report.date_utc.replace(/[:.]/g,'-')+'-'+process.pid+'.json');
 try{
  for(const step of steps){
   process.stdout.write('\n> '+step.join(' ')+'\n');
   const start=Date.now(),r=spawnStep(step,{stdio:'inherit',timeout:15*60*1000});
   const status=r.status===0?'PASS':'FAIL';report.steps.push({command:step,status,exit_code:r.status,elapsed_ms:Date.now()-start,error:r.error?.code??null});
   if(status==='FAIL'){process.stderr.write('FAIL: '+step.join(' ')+'\n');break;}
  }
  report.status=report.steps.length===steps.length&&report.steps.every(s=>s.status==='PASS')?'PASS':'FAILED';
 }finally{
  writeFileSync(path,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('Local report: '+path+'\nOverall: '+report.status+'\n');
 }
 return report.status==='PASS'?0:1;
}
function main(){
 try{
  const a=parseArgs(process.argv.slice(2));
  if(a.command==='help')process.stdout.write('plan | doctor | check --profile docs|quick|crypto|full\n');
  else if(a.command==='plan')plan();else if(a.command==='doctor')doctor();
  else process.exitCode=check(a.profile);
 }catch(err){process.stderr.write(err.message+'\n');process.exitCode=2;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
