function result = circuit_oracle(vector_path, output_path)
%CIRCUIT_ORACLE Exact integer oracle for Horizon's two 32-bit ranges.
% This is arithmetic validation, not a cryptographic verifier. MATLAB syntax
% (jsondecode/jsonencode required) and GNU Octave >= 7 are supported.
% Inputs are a JSON array of {id,category,amount,cap}; the integers are strings.
  if nargin ~= 2 || ~ischar(vector_path) || ~isrow(vector_path) || ...
      ~ischar(output_path) || ~isrow(output_path) || isempty(output_path)
    error('horizon:arguments', 'Two nonempty character-vector paths are required.');
  end
  if exist(output_path, 'file') || exist(output_path, 'dir')
    error('horizon:output_exists', 'Refusing to overwrite an existing output.');
  end
  info = dir(vector_path);
  max_bytes = 4 * 1024 * 1024;
  if numel(info) ~= 1 || info.isdir || info.bytes > max_bytes
    error('horizon:input_file', 'Input must be one regular file of at most 4 MiB.');
  end
  raw = fileread(vector_path);
  text = strtrim(raw);
  % The flat schema needs no escaped strings. Refusing escapes also prevents
  % duplicate/renamed keys being hidden by jsondecode's name normalization.
  if numel(raw) > max_bytes || any(double(raw) > 127) || ...
      any(raw == char(92)) || isempty(text) || text(1) ~= '[' || text(end) ~= ']'
    error('horizon:encoding', 'Expected an ASCII JSON array without string escapes.');
  end
  try
    decoded = jsondecode(raw);
  catch
    error('horizon:json', 'Input is not decodable JSON.');
  end
  count = numel(decoded);
  if count < 1 || count > 10000 || ~(isstruct(decoded) || iscell(decoded))
    error('horizon:case_count', 'Expected 1 to 10000 case objects.');
  end
  % Some decoders collapse singleton/nested arrays. Check the flat structural
  % shape independently; decoding and string syntax still belong to jsondecode.
  skeleton = regexprep(raw, '"[^"]*"', 'S');
  skeleton = regexprep(skeleton, '[ \t\r\n]', '');
  object_shape = '{S:S,S:S,S:S,S:S}';
  expected_shape = ['[' repmat([object_shape ','], 1, count - 1) object_shape ']'];
  if ~strcmp(skeleton, expected_shape)
    error('horizon:structure', 'Expected a flat array of four-string-member objects.');
  end
  required = sort({'id'; 'category'; 'amount'; 'cap'});
  % jsondecode may discard duplicate members. Count the literal keys before
  % accepting its result; every decoded object must also have exactly 4 keys.
  keys = regexp(raw, '"([^"]*)"\s*:', 'tokens');
  if numel(keys) ~= 4 * count
    error('horizon:members', 'Duplicate, missing or nested JSON members.');
  end
  for i = 1:numel(keys)
    if ~any(strcmp(keys{i}{1}, required))
      error('horizon:members', 'Unknown JSON member.');
    end
  end
  cases = cell(count, 1);
  ids = cell(count, 1);
  n = bitshift(uint64(1), 32);
  for i = 1:count
    if iscell(decoded), item = decoded{i}; else, item = decoded(i); end
    if ~isstruct(item) || numel(item) ~= 1 || ~isequal(sort(fieldnames(item)), required)
      error('horizon:members', 'Each case must have exactly id, category, amount and cap.');
    end
    check_label(item.id); check_label(item.category);
    ids{i} = item.id;
    a = parse_u64(item.amount); c = parse_u64(item.cap);
    x_text = ''; d_text = '';
    if a >= uint64(1), x_text = decimal_u64(a - uint64(1)); end
    % Unsigned subtraction saturates in these runtimes: guard BEFORE subtracting.
    if c >= a, d_text = decimal_u64(c - a); end
    accepted = false;
    if a >= uint64(1) && a <= n && c >= a
      accepted = c - a < n;
    end
    cases{i} = struct('id', item.id, 'amount', item.amount, 'cap', item.cap, ...
      'accept', logical(accepted), 'x_decimal', x_text, 'd_decimal', d_text);
  end
  if numel(unique(ids)) ~= count
    error('horizon:duplicate_id', 'Case ids must be unique.');
  end
  if exist('OCTAVE_VERSION', 'builtin')
    runtime = 'GNU Octave'; runtime_version = OCTAVE_VERSION;
    executed_in_matlab = false;
    stamp = strftime('%Y-%m-%dT%H:%M:%SZ', gmtime(time()));
  else
    runtime = 'MATLAB'; runtime_version = version;
    executed_in_matlab = true;
    stamp = char(datetime('now', 'TimeZone', 'UTC', 'Format', 'yyyy-MM-dd''T''HH:mm:ss''Z'''));
  end
  result = struct('schema', 'horizon-circuit-oracle-v1', ...
    'runtime', runtime, 'runtime_version', runtime_version, ...
    'executed_in_matlab', executed_in_matlab, 'generated_at_utc', stamp, ...
    'clock_attestation', 'local-clock-unattested', 'case_count', count, ...
    'cases', {cases}, 'status', 'pass', 'integer_arithmetic', 'uint64-guarded', ...
    'negative_difference_encoding', 'empty-string', ...
    'cryptographic_verification', false, 'machine_checked_proof', false);
  % The caller owns an isolated output directory. This existence check is not
  % a defense against a concurrent hostile filesystem writer replacing paths.
  if exist(output_path, 'file') || exist(output_path, 'dir')
    error('horizon:output_exists', 'Refusing to overwrite an existing output.');
  end
  [handle, message] = fopen(output_path, 'w');
  if handle < 0, error('horizon:output_open', '%s', message); end
  closer = onCleanup(@() fclose(handle));
  encoded = [jsonencode(result) sprintf('\n')];
  written = fwrite(handle, encoded, 'char');
  if written ~= numel(encoded), error('horizon:output_write', 'Incomplete output.'); end
  clear closer;
end

function check_label(value)
  if ~ischar(value) || ~isrow(value) || isempty(regexp(value, '^[a-z0-9-]{1,64}$', 'once'))
    error('horizon:label', 'Id/category must match [a-z0-9-]{1,64}.');
  end
end

function value = parse_u64(text)
  if ~ischar(text) || ~isrow(text) || numel(text) > 20 || ...
      isempty(regexp(text, '^(0|[1-9][0-9]*)$', 'once'))
    error('horizon:integer_encoding', 'Expected a canonical unsigned decimal string.');
  end
  value = uint64(0); ten = uint64(10);
  % UINT64_MAX = 10 * 1844674407370955161 + 5. Build the threshold from
  % exactly representable small literals; do not divide a large uint64.
  quotient = uint64(1844674407) * uint64(1000000000) + uint64(370955161);
  remainder = uint64(5);
  for i = 1:numel(text)
    digit = uint64(double(text(i)) - double('0')); % only integers 0..9
    if value > quotient || (value == quotient && digit > remainder)
      error('horizon:integer_overflow', 'Decimal integer exceeds uint64.');
    end
    value = value * ten + digit; % proven <= UINT64_MAX before either operation
  end
end

function text = decimal_u64(value)
  % Do not route large uint64 values through double, num2str or str2double.
  if value == uint64(0), text = '0'; return; end
  text = ''; ten = uint64(10);
  while value > uint64(0)
    quotient = divide_ten(value);
    digit = value - quotient * ten;
    text = [char(double(digit) + double('0')) text]; %#ok<AGROW>
    value = quotient;
  end
end

function quotient = divide_ten(value)
  % Avoid integer idivide rounding/saturation at the type maximum in Octave.
  % The fast path uses only values <= 2^32-1: binary64 represents these
  % integers exactly, and the quotient error is far below the 0.1 gap to
  % the next integer. No large uint64 is converted to double.
  if value <= uint64(intmax('uint32'))
    quotient = uint64(floor(double(value) / 10)); return;
  end
  quotient = uint64(0); remainder = uint64(0);
  for bit = 64:-1:1
    remainder = bitshift(remainder, 1) + uint64(bitget(value, bit)); % <= 19
    if remainder >= uint64(10)
      remainder = remainder - uint64(10);
      quotient = bitset(quotient, bit);
    end
  end
end
