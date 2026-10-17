function report = run_oracle(vector_path, output_path)
%RUN_ORACLE Run the oracle, or run its finite self-tests with zero arguments.
% Self-tests use synthetic temporary files. They do not execute any ZK system.
  if nargin == 2
    report = circuit_oracle(vector_path, output_path); return;
  end
  if nargin ~= 0, error('horizon:arguments', 'Use zero or two arguments.'); end
  folder = tempname; mkdir(folder);
  cleaner = onCleanup(@() rmdir(folder, 's'));
  input = fullfile(folder, 'vectors.json'); output = fullfile(folder, 'result.json');
  boundary = { ...
    '0', '0', false, '', '0'; ...
    '1', '0', false, '0', ''; ...
    '1', '1', true, '0', '0'; ...
    '1', '4294967296', true, '0', '4294967295'; ...
    '1', '4294967297', false, '0', '4294967296'; ...
    '4294967296', '8589934591', true, '4294967295', '4294967295'; ...
    '4294967296', '8589934592', false, '4294967295', '4294967296'; ...
    '4294967297', '4294967297', false, '4294967296', '0'; ...
    '9007199254740993', '9007199254740994', false, '9007199254740992', '1'; ...
    '18446744073709551615', '18446744073709551615', false, '18446744073709551614', '0'; ...
    '0', '18446744073709551615', false, '', '18446744073709551615'};
  vectors = cell(size(boundary, 1), 1);
  for i = 1:numel(vectors)
    vectors{i} = struct('id', sprintf('boundary-%d', i), 'category', 'boundary', ...
      'amount', boundary{i,1}, 'cap', boundary{i,2});
  end
  vectors{1}.id = '-leading-hyphen-allowed';
  write_text(input, jsonencode(vectors));
  result = circuit_oracle(input, output);
  for i = 1:numel(vectors)
    assert(result.cases{i}.accept == boundary{i,3});
    assert(strcmp(result.cases{i}.x_decimal, boundary{i,4}), sprintf('x boundary %d: %s', i, result.cases{i}.x_decimal));
    assert(strcmp(result.cases{i}.d_decimal, boundary{i,5}), sprintf('d boundary %d: %s', i, result.cases{i}.d_decimal));
  end
  before = fileread(output); rejected = false;
  try, circuit_oracle(input, output); catch err, rejected = strcmp(err.identifier, 'horizon:output_exists'); end
  assert(rejected && strcmp(before, fileread(output)));

  good = '{"id":"a","category":"boundary","amount":"1","cap":"1"}';
  invalid = {'[]', good, ['[' good ',' good ']'], ['[[' good ']]'], ...
    '[{"id":"a","category":"x","amount":"1","cap":"1","amount":"2"}]', ...
    '[{"id":"a","category":"x","amount":"1","cap":"1","expected":true}]', ...
    '[{"id":"a","category":"x","amount":1,"cap":"1"}]', ...
    '[{"id":"a","category":"x","amount":"1"}]', ...
    '[{"id":"a","category":"x","amount":"1","cap-":"1"}]', ...
    '[{"id":"a","category":"x","amount":"1","\u0063ap":"1"}]', ...
    '[{"id":"a","category":"x","amount":"\u0031","cap":"1"}]', ...
    ['[' good ',null]'], ['[' good ',[]]'], ...
    '[{"id":"","category":"x","amount":"1","cap":"1"}]', ...
    '[{"id":"a","category":42,"amount":"1","cap":"1"}]', ...
    '[{"id":"a","category":"x","amount":"1","cap":"18446744073709551616"}]'};
  bad_numbers = {'', '-1', '+1', '01', ' 1', '1 ', '1.0', '1e0', 'NaN', 'Inf', ...
    '18446744073709551616', '99999999999999999999', '100000000000000000000'};
  for i = 1:numel(bad_numbers)
    invalid{end+1} = ['[{"id":"a","category":"x","amount":"' bad_numbers{i} '","cap":"1"}]']; %#ok<AGROW>
  end
  bad_labels = {'UpperCase', 'a:b', 'a.b', 'a_b', repmat('a', 1, 65)};
  for i = 1:numel(bad_labels)
    invalid{end+1} = ['[{"id":"' bad_labels{i} '","category":"x","amount":"1","cap":"1"}]']; %#ok<AGROW>
  end
  too_many = repmat({struct('id', 'temporary', 'category', 'limit', 'amount', '1', 'cap', '1')}, 10001, 1);
  for i = 1:numel(too_many), too_many{i}.id = sprintf('limit-%d', i); end
  invalid{end+1} = jsonencode(too_many);
  invalid{end+1} = repmat(' ', 1, 4 * 1024 * 1024 + 1);
  for i = 1:numel(invalid)
    write_text(input, invalid{i}); candidate = fullfile(folder, sprintf('rejected-%d.json', i));
    rejected = false;
    try, circuit_oracle(input, candidate); catch err, rejected = strncmp(err.identifier, 'horizon:', 8); end
    assert(rejected && ~exist(candidate, 'file'));
  end

  % Exhaustive 0..63 square: no signed/unsigned underflow can be mistaken for zero.
  grid = cell(4096, 1); index = 0;
  for a = 0:63
    for c = 0:63
      index = index + 1;
      grid{index} = struct('id', sprintf('grid-%d-%d', a, c), 'category', 'reduced-grid', ...
        'amount', sprintf('%d', a), 'cap', sprintf('%d', c));
    end
  end
  write_text(input, jsonencode(grid));
  reduced = circuit_oracle(input, fullfile(folder, 'reduced.json'));
  index = 0; accepted = 0;
  for a = 0:63
    for c = 0:63
      index = index + 1; expected = a >= 1 && a <= c;
      assert(reduced.cases{index}.accept == expected); accepted = accepted + expected;
    end
  end
  assert(accepted == 2016);
  exact_q64 = uint64(1844674407) * uint64(1000000000) + uint64(370955161);
  diagnostics = struct( ...
    'native_idivide_u32_at_max_matches_floor', idivide(intmax('uint32'), uint32(10), 'floor') == uint32(429496729), ...
    'native_idivide_u64_at_max_matches_floor', idivide(intmax('uint64'), uint64(10), 'floor') == exact_q64, ...
    'oracle_uses_native_idivide', false);
  report = struct('schema', 'horizon-circuit-oracle-selftest-v1', 'status', 'pass', ...
    'runtime', result.runtime, 'runtime_version', result.runtime_version, ...
    'executed_in_matlab', result.executed_in_matlab, 'generated_at_utc', result.generated_at_utc, ...
    'boundary_cases', size(boundary, 1), 'invalid_inputs_rejected', numel(invalid), ...
    'overwrite_rejected', true, 'reduced_pairs', 4096, 'reduced_accepted', accepted, ...
    'cryptographic_verification', false, 'runtime_diagnostics', diagnostics);
  disp(jsonencode(report));
  clear cleaner;
end

function write_text(path, text)
  handle = fopen(path, 'w'); assert(handle >= 0);
  closer = onCleanup(@() fclose(handle));
  assert(fwrite(handle, text, 'char') == numel(text));
  clear closer;
end
