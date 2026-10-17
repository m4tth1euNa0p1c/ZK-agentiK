function result = horizon_checks(output_path)
%HORIZON_CHECKS Exact arithmetic and bounded state exploration, not a ZK prover.
% Compatible syntax: MATLAB (jsonencode required) and GNU Octave >= 7.
% All semantic arithmetic uses int64/uint64. Large constants use decimal strings.
  if nargin < 1, output_path = ''; end
  if exist('OCTAVE_VERSION', 'builtin')
    runtime = 'GNU Octave'; runtime_version = OCTAVE_VERSION;
    executed_in_matlab = false;
    stamp = strftime('%Y-%m-%dT%H:%M:%SZ', gmtime(time()));
  else
    runtime = 'MATLAB'; runtime_version = version;
    executed_in_matlab = true;
    stamp = char(datetime('now', 'TimeZone', 'UTC', 'Format', 'yyyy-MM-dd''T''HH:mm:ss''Z'''));
  end
  result = struct('schema', 'horizon-math-checks-v1', 'generated_at_utc', stamp, ...
    'runtime', runtime, 'runtime_version', runtime_version, ...
    'executed_in_matlab', executed_in_matlab, 'machine_checked_proof', false);

  % Exhaustive integer equivalence, including negative and out-of-range cases.
  pairs = 0; accepted = 0;
  for k = 1:6
    n = bitshift(int64(1), k);
    for ai = -2:double(2*n + 2)
      for ci = -2:double(2*n + 2)
        a = int64(ai); c = int64(ci); x = a - 1; d = c - a;
        ranges = (0 <= x && x < n && 0 <= d && d < n);
        predicate = (1 <= a && a <= n && a <= c && c <= a+n-1);
        assert(ranges == predicate);
        if ranges, assert(c <= 2*n-1); accepted = accepted + 1; end
        pairs = pairs + 1;
      end
    end
  end
  result.reduced_domain = struct('bits', [1 2 3 4 5 6], 'pairs', pairs, ...
    'accepted_pairs', accepted, 'failures', 0, 'negative_values_included', true);

  n = bitshift(uint64(1), 32); maximum = bitshift(uint64(1), 33)-uint64(1);
  cases = {uint64(0),uint64(0),false; uint64(1),uint64(1),true; ...
    n,n,true; n,maximum,true; n+uint64(1),n+uint64(1),false; ...
    uint64(1),uint64(0),false; uint64(1),n,true; uint64(1),n+uint64(1),false; ...
    n,maximum+uint64(1),false; intmax('uint64'),intmax('uint64'),false};
  boundary = cell(size(cases,1),1);
  for i=1:size(cases,1)
    a=cases{i,1}; c=cases{i,2}; ok=range_predicate(a,c,n);
    assert(ok == cases{i,3});
    boundary{i}=struct('amount',sprintf('%u',a),'cap',sprintf('%u',c),'accept',ok);
  end
  assert(maximum == uint64(8589934591));
  result.boundaries_32bit = boundary;

  % q is NEVER parsed as a double or uint64. Decimal operations have digits <= 19.
  two252='1'; for i=1:252, two252=decimal_add(two252,two252); end
  q=decimal_add(two252,'27742317777372353535851937790883648493');
  expected_q='7237005577332262213973186563042994240857116359379907606001950938285454250989';
  assert(strcmp(q,expected_q));
  max_u64='18446744073709551615';
  assert(decimal_less(sprintf('%u',maximum),two252));
  assert(decimal_less(max_u64,two252)); assert(decimal_less(two252,q));
  result.integer_injection = struct('q_decimal',q,'max_cap_decimal',sprintf('%u',maximum), ...
    'max_u64_decimal',max_u64,'q_exceeds_u64',true,'large_integer_double_conversion',false);

  % Loss of integer-domain provenance creates an alias even with sound range checks.
  toy_q=int64(101); nominal=int64(103); reduced=mod(nominal,toy_q);
  assert(reduced==2 && nominal~=reduced);
  % An explicitly known generator relation defeats commitment binding.
  assert(mod(int64(10)+int64(7)*int64(3),toy_q) == ...
         mod(int64(17)+int64(7)*int64(2),toy_q));
  result.assumption_counterexamples = struct('modular_alias',[103 2 101], ...
    'known_log_collision',[10 3 17 2 7 101], ...
    'scope','Scalar equation examples only; no group implementation or security test.');

  % Business counterexamples: each arithmetic statement can hold while a different
  % intended business statement fails. These do not bypass implemented unit checks.
  a=int64(60); cap=int64(100); assert(a<=cap && a+a>cap);
  loss=int64(15000); deductible=int64(5000); payout=loss;
  assert(payout<=int64(20000) && payout~=max(int64(0),loss-deductible));
  amount_units=int64(1000); cap_cents=int64(10000);
  assert(amount_units<=cap_cents && amount_units*int64(100)>cap_cents);
  result.business_counterexamples = struct( ...
    'aggregate_budget',struct('amounts',[60 60],'per_case_cap',100,'sum',120), ...
    'deductible',struct('loss',15000,'deductible',5000,'accepted_payout',15000,'intended_payout',10000), ...
    'scale',struct('amount',1000,'amount_exponent',0,'cap',10000,'cap_exponent',2), ...
    'currency','Equal numerals EUR/USD cannot be compared without an authenticated conversion policy.', ...
    'implemented_unit_checks','Actual profile fixes both EUR, exponent=2; counterexamples target omitted assumptions.');

  result.replay_model = replay_model();
  result.status = 'pass';
  result.not_established = {'discrete-log hardness','Bulletproofs security or implementation correctness', ...
    'signature unforgeability','source truth','durability of a real disk', ...
    'remote exactly-once semantics','MATLAB execution unless runtime says MATLAB'};
  if ~isempty(output_path)
    [folder,~,~]=fileparts(output_path); if ~isempty(folder) && ~exist(folder,'dir'), mkdir(folder); end
    assert(~exist(output_path,'file'),'Refusing to overwrite an existing result');
    fid=fopen(output_path,'w'); assert(fid>=0,'Cannot open output file');
    close_file=onCleanup(@() fclose(fid)); %#ok<NASGU>
    fprintf(fid,'%s\n',jsonencode(result));
  end
end

function yes=range_predicate(a,c,n)
  yes = a>=uint64(1) && a<=n && c>=a;
  if yes, yes=(c-a)<n; end % Never allow unsigned saturation to replace a sign check.
end

function out=decimal_add(a,b)
  width=max(length(a),length(b));
  a=[repmat('0',1,width-length(a)) a]; b=[repmat('0',1,width-length(b)) b];
  out=repmat('0',1,width); carry=uint8(0);
  for i=width:-1:1
    digit=uint8(a(i))-uint8('0')+uint8(b(i))-uint8('0')+carry;
    out(i)=char(uint8('0')+rem(digit,uint8(10)));
    carry=idivide(digit,uint8(10),'floor');
  end
  if carry>0, out=['1' out]; end
end

function yes=decimal_less(a,b)
  if length(a)~=length(b), yes=length(a)<length(b); return; end
  first=find(a~=b,1); yes=~isempty(first) && a(first)<b(first);
end

function out=replay_model()
  % State: operation 0=absent,1=reserved,2=completed,3=unknown,4=rejected;
  % two nonce used bits; effect count; validity. Every transition is atomic.
  states=int64([0 0 0 1]); cursor=1; edges=0;
  while cursor<=size(states,1)
    s=states(cursor,:); cursor=cursor+1;
    for event=1:8
      t=s;
      if event<=2 % reserve with either fresh challenge, but one business key
        bit=bitshift(int64(1),event-1);
        if s(1)==0 && bitand(s(2),bit)==0 && s(4)==1
          t(1)=1; t(2)=bitor(s(2),bit);
        end
      elseif event==3 || event==4 % dispatch / ambiguous response, same local transaction
        if s(1)==1
          if s(4)==1, t(3)=s(3)+1; t(1)=2;
            if event==4, t(1)=3; end
          else, t(1)=4; end
        end
      elseif event==5 % process stop: reservation and effect stay persisted
        t=s;
      elseif event==6 % expiry/revocation: no later recovery in this model
        t(4)=0;
      elseif event==7 % reconciliation never dispatches
        if s(1)~=0, if s(3)==1, t(1)=2; else, t(1)=3; end, end
      else % failed delivery before local effect may leave unknown
        if s(1)==1, t(1)=3; end
      end
      assert(t(3)<=1); assert(t(3)>=s(3));
      assert(bitand(t(2),s(2))==s(2));
      if s(1)~=0, assert(t(1)~=0); end
      if s(4)==0, assert(t(3)==s(3)); end
      edges=edges+1;
      if ~any(all(bsxfun(@eq,states,t),2)), states(end+1,:)=t; end %#ok<AGROW>
    end
  end
  % Countermodel: nonce-only guard allows two fresh nonces for the same object.
  nonce_only_effects=0; for nonce=1:2, nonce_only_effects=nonce_only_effects+1; end %#ok<NASGU>
  assert(nonce_only_effects==2);
  out=struct('reachable_states',size(states,1),'transitions',edges,'max_effects',max(states(:,3)), ...
    'nonces',2,'business_keys',1,'nonce_only_counterexample_effects',nonce_only_effects, ...
    'assumptions','Atomic persisted transitions; common business key; trusted verification result; no deletion/rollback/admin bypass; local target.', ...
    'scope','Complete reachable-state exploration of this finite abstraction, not model checking the TypeScript implementation.');
end
