% Run from Octave: octave --no-gui --no-history --quiet /work/math/run_checks.m
% Run from MATLAB: run('math/run_checks.m') -- MATLAB execution has not been claimed.
task_dir=fileparts(mfilename('fullpath'));
addpath(task_dir);
result=horizon_checks();
result_dir=getenv('HORIZON_MATH_OUTPUT_DIR');
if isempty(result_dir), result_dir=fullfile(task_dir,'results'); end
if ~exist(result_dir,'dir'), mkdir(result_dir); end
stamp=strrep(strrep(result.generated_at_utc,':',''),'-','');
name=[stamp '.json']; suffix=0;
while exist(fullfile(result_dir,name),'file')
  suffix=suffix+1; name=sprintf('%s-%d.json',stamp,suffix);
end
fid=fopen(fullfile(result_dir,name),'w'); assert(fid>=0); fprintf(fid,'%s\n',jsonencode(result)); fclose(fid);
index=struct('schema','horizon-math-index-v1','result',name,'date_is_self_reported',true);
fid=fopen(fullfile(result_dir,'latest.json'),'w'); assert(fid>=0); fprintf(fid,'%s\n',jsonencode(index)); fclose(fid);
fprintf('%s %s: %s; %d reduced pairs; %d state transitions\n', ...
  result.runtime,result.runtime_version,result.status,result.reduced_domain.pairs,result.replay_model.transitions);
