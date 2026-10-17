//! Synthetic offline campaign. This is not an authorization server or a benchmark SLA.
#![forbid(unsafe_code)]

use anyhow::{ensure, Context, Result};
use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek::scalar::Scalar;
use ed25519_dalek::{Signer, SigningKey};
use horizon_proof::{
    evidence_hash, prepare, present_reusable, prove, verify, Challenge, EvidencePair, Fixture,
    Method, Payload, Presentation, ReusableProof, TrustRegistry, VerificationPolicy, PROFILE,
};
use merlin::Transcript;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Read, Write},
    path::{Component, Path, PathBuf},
    time::Instant,
};

const NOW: u64 = 1_800_000_000_000;
const RANGE: u64 = 1 << 32;
const MAX_CASES: usize = 10_000;
const MAX_VECTOR_BYTES: u64 = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_LINE_BYTES: usize = 65_536;
const MAX_REQUESTS: usize = 200_000;
const MAX_SAFE_JSON_INTEGER: u128 = (1_u128 << 53) - 1;

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Vector {
    id: String,
    category: String,
    amount: String,
    cap: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct VerificationInput {
    presentation: Presentation,
    expected: Challenge,
    trust: TrustRegistry,
    policy: VerificationPolicy,
    now_ms: u64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct RequestRecord {
    id: String,
    test: String,
    // Experiment annotation only. Never consulted by verify_record.
    expected_accept: bool,
    request: VerificationInput,
}

#[derive(Serialize)]
struct GenerationTimes {
    a_ns: u64,
    b_ns: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    direct_a_ns: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    direct_b_ns: Option<u64>,
}

#[derive(Serialize)]
struct CaseResult {
    id: String,
    category: String,
    amount: String,
    cap: String,
    native_accept: bool,
    native_a_accept: bool,
    native_b_accept: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    native_a_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    native_b_error: Option<String>,
    generation: GenerationTimes,
    request_count: usize,
}

#[derive(Serialize)]
struct VerificationResult {
    id: String,
    test: String,
    accepted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    duration_ns: u64,
}

fn label(value: &str) -> Result<()> {
    ensure!(
        !value.is_empty()
            && value.len() <= 64
            && value
                .bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-'),
        "INVALID_CAMPAIGN_LABEL"
    );
    Ok(())
}

fn decimal(value: &str) -> Result<u64> {
    ensure!(
        !value.is_empty() && value.len() <= 20 && value.bytes().all(|b| b.is_ascii_digit()),
        "INVALID_U64_DECIMAL"
    );
    let number: u64 = value.parse().context("U64_OVERFLOW")?;
    ensure!(number.to_string() == value, "NONCANONICAL_U64_DECIMAL");
    Ok(number)
}

fn test_label(value: &str) -> Result<()> {
    ensure!(
        !value.is_empty()
            && value.len() <= 64
            && value
                .bytes()
                .all(|b| { b.is_ascii_lowercase() || b.is_ascii_digit() || b"_-".contains(&b) }),
        "INVALID_TEST_LABEL"
    );
    Ok(())
}

fn vectors(bytes: &[u8]) -> Result<Vec<Vector>> {
    ensure!(bytes.len() as u64 <= MAX_VECTOR_BYTES, "VECTORS_TOO_LARGE");
    let values: Vec<Vector> = serde_json::from_slice(bytes).context("INVALID_VECTOR_JSON")?;
    ensure!(
        !values.is_empty() && values.len() <= MAX_CASES,
        "CASE_LIMIT"
    );
    let mut ids = BTreeSet::new();
    for value in &values {
        label(&value.id)?;
        label(&value.category)?;
        ensure!(ids.insert(value.id.as_str()), "DUPLICATE_CASE_ID");
        decimal(&value.amount)?;
        decimal(&value.cap)?;
    }
    Ok(values)
}

// Only used to annotate synthetic requests; native and cryptographic outcomes
// are recorded separately and must be cross-checked by independent arithmetic.
fn arithmetic_accept(amount: u64, cap: u64) -> bool {
    (1..=RANGE).contains(&amount) && cap.checked_sub(amount).is_some_and(|d| d < RANGE)
}

fn elapsed(start: Instant) -> Result<u64> {
    let nanos = start.elapsed().as_nanos();
    ensure!(nanos <= MAX_SAFE_JSON_INTEGER, "DURATION_NOT_JSON_EXACT");
    Ok(nanos as u64)
}

fn timed<T>(operation: impl FnOnce() -> Result<T>) -> Result<(Result<T>, u64)> {
    let started = Instant::now();
    let result = operation();
    Ok((result, elapsed(started)?))
}

fn scalar(encoded: &str) -> Result<Scalar> {
    let bytes: [u8; 32] = hex::decode(encoded)?
        .try_into()
        .map_err(|_| anyhow::anyhow!("SCALAR_LENGTH"))?;
    Option::<Scalar>::from(Scalar::from_canonical_bytes(bytes)).context("NONCANONICAL_SCALAR")
}

// These encodings deliberately duplicate the fixed library domains to model an
// adversarial prover independently of its private preflight/present helpers.
// No new cryptographic primitive is implemented here. Tests exercise parity.
fn message<T: Serialize>(domain: &[u8], value: &T) -> Result<Vec<u8>> {
    let mut result = domain.to_vec();
    result.push(0);
    result.extend(serde_json::to_vec(value)?);
    Ok(result)
}

fn resign(fixture: &Fixture, presentation: &mut Presentation) -> Result<()> {
    let secret: [u8; 32] = hex::decode(&fixture.holder_secret_hex)?
        .try_into()
        .map_err(|_| anyhow::anyhow!("SECRET_LENGTH"))?;
    let body = (
        &presentation.profile,
        &presentation.evidence,
        &presentation.challenge,
        &presentation.payload,
    );
    let digest = hex::encode(Sha256::digest(message(b"horizon/presentation/v1", &body)?));
    presentation.holder_signature_hex = hex::encode(
        SigningKey::from_bytes(&secret)
            .sign(&message(b"horizon/holder-authorization/v1", &digest)?)
            .to_bytes(),
    );
    Ok(())
}

fn transcript(evidence: &EvidencePair, challenge: Option<&Challenge>) -> Result<Transcript> {
    let mut transcript = Transcript::new(b"horizon-range-v1");
    transcript.append_message(
        b"evidence",
        &message(b"horizon/evidence-pair/v1", evidence)?,
    );
    if let Some(challenge) = challenge {
        transcript.append_message(b"mode", b"challenge_bound");
        transcript.append_message(b"challenge", &message(b"horizon/challenge/v1", challenge)?);
    } else {
        transcript.append_message(b"mode", b"reusable");
    }
    Ok(transcript)
}

fn direct_candidate(fixture: &Fixture, method: Method) -> Result<Presentation> {
    ensure!(method != Method::Disclosure, "PUBLIC_REQUESTS_ONLY");
    let mut challenge = fixture.challenge.clone();
    challenge.method = method;
    let amount_blinding = scalar(&fixture.witness.amount_blinding_hex)?;
    let cap_blinding = scalar(&fixture.witness.cap_blinding_hex)?;
    let bound = (method == Method::ChallengeBound).then_some(&challenge);
    // Deliberately malicious arithmetic: subtraction wraps in u64, NOT modulo
    // the Ristretto scalar order. The verifier still derives A-G and C-A from
    // the issuer-signed original commitments. No native preflight is invoked.
    let values = [
        fixture.witness.amount.wrapping_sub(1),
        fixture.witness.cap.wrapping_sub(fixture.witness.amount),
    ];
    let (proof, _) = RangeProof::prove_multiple_with_rng(
        &BulletproofGens::new(32, 2),
        &PedersenGens::default(),
        &mut transcript(&fixture.evidence, bound)?,
        &values,
        &[amount_blinding, cap_blinding - amount_blinding],
        32,
        &mut OsRng,
    )
    .context("DIRECT_CANDIDATE_GENERATION_FAILED")?;
    let bytes = proof.to_bytes();
    RangeProof::from_bytes(&bytes).context("DIRECT_CANDIDATE_NOT_PARSEABLE")?;
    let proof_hex = hex::encode(bytes);
    let payload = match method {
        Method::ChallengeBound => Payload::ChallengeBound { proof_hex },
        Method::Reusable => Payload::Reusable {
            prepared: ReusableProof {
                evidence_hash: evidence_hash(&fixture.evidence)?,
                proof_hex,
            },
        },
        Method::Disclosure => unreachable!("checked above"),
    };
    let mut presentation = Presentation {
        profile: PROFILE.into(),
        evidence: fixture.evidence.clone(),
        challenge,
        payload,
        holder_signature_hex: String::new(),
    };
    resign(fixture, &mut presentation)?;
    Ok(presentation)
}

fn request(id: &str, test: &str, fixture: &Fixture, presentation: Presentation) -> RequestRecord {
    RequestRecord {
        id: id.into(),
        test: test.into(),
        expected_accept: false,
        request: VerificationInput {
            expected: presentation.challenge.clone(),
            presentation,
            trust: fixture.trust.clone(),
            policy: fixture.policy.clone(),
            now_ms: NOW,
        },
    }
}

fn mutate_scalar(presentation: &mut Presentation) -> Result<()> {
    let Payload::Reusable { prepared } = &mut presentation.payload else {
        anyhow::bail!("EXPECTED_REUSABLE_PROOF");
    };
    let mut bytes = hex::decode(&prepared.proof_hex)?;
    ensure!(bytes.len() == 672, "PROOF_LENGTH");
    // Four compressed points precede canonical t_x in Bulletproofs 5.0.0.
    let value = scalar(&hex::encode(&bytes[128..160]))?;
    bytes[128..160].copy_from_slice(&(value + Scalar::ONE).to_bytes());
    RangeProof::from_bytes(&bytes).context("CORRUPTION_NOT_PARSEABLE")?;
    prepared.proof_hex = hex::encode(bytes);
    Ok(())
}

fn valid_requests(
    id: &str,
    fixture: &Fixture,
    a: Presentation,
    b: Presentation,
) -> Result<Vec<RequestRecord>> {
    let mut requests = Vec::with_capacity(16);
    let mut valid_a = request(id, "a_valid", fixture, a.clone());
    valid_a.expected_accept = true;
    requests.push(valid_a);
    let mut valid_b = request(id, "b_valid", fixture, b.clone());
    valid_b.expected_accept = true;
    requests.push(valid_b);

    let mut corrupted = request(id, "b_scalar_corruption", fixture, b.clone());
    mutate_scalar(&mut corrupted.request.presentation)?;
    resign(fixture, &mut corrupted.request.presentation)?;
    requests.push(corrupted);

    let mut transplanted = request(id, "a_challenge_transplant", fixture, a);
    let mut nonce = [0_u8; 32];
    OsRng.fill_bytes(&mut nonce);
    // Guarantee a distinct nonce even in the negligible event of RNG collision.
    if hex::encode(nonce) == transplanted.request.expected.nonce {
        nonce[0] ^= 1;
    }
    transplanted.request.expected.nonce = hex::encode(nonce);
    transplanted.request.presentation.challenge = transplanted.request.expected.clone();
    resign(fixture, &mut transplanted.request.presentation)?;
    requests.push(transplanted);

    for name in [
        "b_authority_key_substitution",
        "b_issuer_signature_corruption",
        "b_holder_signature_corruption",
        "b_policy_epoch",
        "b_reuse_forbidden",
        "b_expected_context",
        "b_subject_transplant",
        "b_expired_challenge",
        "b_future_challenge",
        "b_expired_evidence",
        "b_trust_epoch",
        "b_evidence_join",
    ] {
        let mut record = request(id, name, fixture, b.clone());
        let r = &mut record.request;
        match name {
            "b_authority_key_substitution" => {
                r.trust.amount_issuer.public_key_hex =
                    hex::encode(SigningKey::generate(&mut OsRng).verifying_key().to_bytes());
            }
            "b_issuer_signature_corruption" => {
                r.presentation.evidence.amount.signature_hex = "00".repeat(64);
                resign(fixture, &mut r.presentation)?;
            }
            "b_holder_signature_corruption" => {
                r.presentation.holder_signature_hex = "00".repeat(64)
            }
            "b_policy_epoch" => r.policy.policy_epoch += 1,
            "b_reuse_forbidden" => r.policy.allow_reuse = false,
            "b_expected_context" => r.expected.audience.push_str("-other"),
            "b_subject_transplant" => {
                r.expected.subject.push_str("-other");
                r.presentation.challenge = r.expected.clone();
                resign(fixture, &mut r.presentation)?;
            }
            "b_expired_challenge" => r.now_ms = r.expected.expires_at_ms,
            "b_future_challenge" => r.now_ms = r.expected.issued_at_ms - 1,
            "b_expired_evidence" => {
                r.now_ms = r.presentation.evidence.amount.body.valid_until_ms;
                r.expected.issued_at_ms = r.now_ms;
                r.expected.expires_at_ms = r.now_ms + 30_000;
                r.presentation.challenge = r.expected.clone();
                resign(fixture, &mut r.presentation)?;
            }
            "b_trust_epoch" => r.trust.epoch += 1,
            "b_evidence_join" => {
                r.presentation.evidence.cap.body.subject.push_str("-other");
                resign(fixture, &mut r.presentation)?;
            }
            _ => unreachable!("fixed family list"),
        }
        requests.push(record);
    }
    Ok(requests)
}

fn generate_case(vector: &Vector) -> Result<(CaseResult, Vec<RequestRecord>)> {
    let amount = decimal(&vector.amount)?;
    let cap = decimal(&vector.cap)?;
    let fixture = Fixture::with_values(NOW, amount, cap)?;
    let (a, a_ns) = timed(|| {
        prove(
            &fixture.evidence,
            &fixture.witness,
            &fixture.holder_secret_hex,
            &fixture.challenge,
        )
    })?;
    let (b, b_ns) = timed(|| {
        let prepared = prepare(&fixture.evidence, &fixture.witness)?;
        let mut challenge = fixture.challenge.clone();
        challenge.method = Method::Reusable;
        present_reusable(
            &fixture.evidence,
            &prepared,
            &fixture.holder_secret_hex,
            &challenge,
        )
    })?;
    let native_a_accept = a.is_ok();
    let native_b_accept = b.is_ok();
    let native_a_error = a.as_ref().err().map(ToString::to_string);
    let native_b_error = b.as_ref().err().map(ToString::to_string);
    let mut times = GenerationTimes {
        a_ns,
        b_ns,
        direct_a_ns: None,
        direct_b_ns: None,
    };
    // Selection follows the independent integer predicate, not the native outcome.
    // Thus a native false positive/negative cannot silently select another family.
    let requests = if arithmetic_accept(amount, cap) {
        valid_requests(
            &vector.id,
            &fixture,
            a.context("VALID_NATIVE_A_FAILED")?,
            b.context("VALID_NATIVE_B_FAILED")?,
        )?
    } else {
        let (direct_a, nanos) = timed(|| direct_candidate(&fixture, Method::ChallengeBound))?;
        times.direct_a_ns = Some(nanos);
        let (direct_b, nanos) = timed(|| direct_candidate(&fixture, Method::Reusable))?;
        times.direct_b_ns = Some(nanos);
        vec![
            request(&vector.id, "a_direct_bypass", &fixture, direct_a?),
            request(&vector.id, "b_direct_bypass", &fixture, direct_b?),
        ]
    };
    let result = CaseResult {
        id: vector.id.clone(),
        category: vector.category.clone(),
        amount: vector.amount.clone(),
        cap: vector.cap.clone(),
        native_accept: native_a_accept && native_b_accept,
        native_a_accept,
        native_b_accept,
        native_a_error,
        native_b_error,
        generation: times,
        request_count: requests.len(),
    };
    Ok((result, requests))
}

fn verify_record(record: &RequestRecord) -> Result<VerificationResult> {
    let r = &record.request;
    let (result, duration_ns) = timed(|| {
        ensure!(
            !matches!(r.presentation.payload, Payload::Disclosure { .. }),
            "PUBLIC_REQUESTS_ONLY"
        );
        verify(&r.presentation, &r.expected, &r.trust, &r.policy, r.now_ms)
    })?;
    Ok(VerificationResult {
        id: record.id.clone(),
        test: record.test.clone(),
        accepted: result.is_ok(),
        error: result.err().map(|error| error.to_string()),
        duration_ns,
    })
}

fn checked_path(path: &Path, allow_missing_last: bool) -> Result<PathBuf> {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()?.join(path)
    };
    let components: Vec<_> = absolute.components().collect();
    let mut visited = PathBuf::new();
    for (index, component) in components.iter().enumerate() {
        ensure!(
            !matches!(component, Component::ParentDir),
            "PARENT_PATH_FORBIDDEN"
        );
        visited.push(component.as_os_str());
        if !matches!(component, Component::Normal(_)) {
            continue;
        }
        match fs::symlink_metadata(&visited) {
            Ok(metadata) => {
                ensure!(!metadata.file_type().is_symlink(), "SYMLINK_FORBIDDEN");
                if index + 1 < components.len() {
                    ensure!(metadata.is_dir(), "PARENT_NOT_DIRECTORY");
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::NotFound
                    && allow_missing_last
                    && index + 1 == components.len() => {}
            Err(error) => return Err(error).context("PATH_UNAVAILABLE"),
        }
    }
    Ok(absolute)
}

fn input(path: &Path, max: u64) -> Result<File> {
    let file = File::open(checked_path(path, false)?)?;
    ensure!(file.metadata()?.is_file(), "INPUT_NOT_FILE");
    ensure!(file.metadata()?.len() <= max, "INPUT_TOO_LARGE");
    Ok(file)
}

fn new_output(path: &Path) -> Result<File> {
    Ok(OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(checked_path(path, true)?)?)
}

fn generate(vector_path: &Path, directory: &Path) -> Result<()> {
    let mut bytes = Vec::new();
    input(vector_path, MAX_VECTOR_BYTES)?
        .take(MAX_VECTOR_BYTES + 1)
        .read_to_end(&mut bytes)?;
    let values = vectors(&bytes)?;
    let output = checked_path(directory, true)?;
    fs::create_dir(&output).context("OUTPUT_DIRECTORY_MUST_BE_NEW")?;
    let report_file = new_output(&output.join("prover-results.json"))?;
    let mut requests_file =
        BufWriter::new(new_output(&output.join("verification-requests.ndjson"))?);
    let mut cases = Vec::with_capacity(values.len());
    let mut hash = Sha256::new();
    let mut written = 0_u64;
    let mut request_count = 0;
    for vector in &values {
        let (case, requests) = generate_case(vector)?;
        for record in requests {
            let mut line = serde_json::to_vec(&record)?;
            line.push(b'\n');
            ensure!(line.len() <= MAX_LINE_BYTES, "REQUEST_LINE_TOO_LARGE");
            written += line.len() as u64;
            ensure!(written <= MAX_REQUEST_BYTES, "REQUEST_FILE_TOO_LARGE");
            requests_file.write_all(&line)?;
            hash.update(&line);
            request_count += 1;
        }
        requests_file.flush()?;
        cases.push(case);
    }
    requests_file.flush()?;
    requests_file.get_ref().sync_all()?;
    let report = serde_json::json!({
        "schema": "horizon-circuit-prover-v1", "status": "complete", "profile": PROFILE,
        "vectors_sha256": hex::encode(Sha256::digest(&bytes)),
        "requests_sha256": hex::encode(hash.finalize()), "requests_bytes": written,
        "logical_now_ms": NOW, "case_count": cases.len(), "request_count": request_count,
        "randomness": "OsRng; fresh synthetic issuer and holder keys and blindings per case",
        "privacy": "Amounts/caps are deliberately public synthetic test vectors. No blindings, private keys or Disclosure payloads exported.",
        "timing_scope": "Raw per-case wall-clock nanoseconds, no warmup or percentile/SLA claim; issuance and serialization excluded; B includes prepare and holder presentation; direct includes fresh generator construction.",
        "authorization_effects": 0, "cases": cases,
    });
    let mut writer = BufWriter::new(report_file);
    serde_json::to_writer(&mut writer, &report)?;
    writer.write_all(b"\n")?;
    writer.flush()?;
    writer.get_ref().sync_all()?;
    Ok(())
}

fn read_line(reader: &mut impl BufRead) -> Result<Option<Vec<u8>>> {
    let mut bytes = Vec::new();
    let count = reader
        .take(MAX_LINE_BYTES as u64 + 1)
        .read_until(b'\n', &mut bytes)?;
    if count == 0 {
        return Ok(None);
    }
    ensure!(count <= MAX_LINE_BYTES, "REQUEST_LINE_TOO_LARGE");
    Ok(Some(bytes))
}

fn verify_requests(request_path: &Path, output_path: &Path) -> Result<()> {
    let mut reader = BufReader::new(input(request_path, MAX_REQUEST_BYTES)?);
    let report_file = new_output(output_path)?;
    let mut ids = BTreeSet::new();
    let mut cases = Vec::new();
    let mut hash = Sha256::new();
    let mut bytes_read = 0_u64;
    while let Some(bytes) = read_line(&mut reader)? {
        bytes_read += bytes.len() as u64;
        ensure!(bytes_read <= MAX_REQUEST_BYTES, "REQUEST_FILE_TOO_LARGE");
        ensure!(cases.len() < MAX_REQUESTS, "REQUEST_COUNT_LIMIT");
        hash.update(&bytes);
        let record: RequestRecord =
            serde_json::from_slice(&bytes).context("INVALID_REQUEST_JSON")?;
        label(&record.id)?;
        test_label(&record.test)?;
        ensure!(
            ids.insert((record.id.clone(), record.test.clone())),
            "DUPLICATE_REQUEST_ID_TEST"
        );
        cases.push(verify_record(&record)?);
    }
    ensure!(!cases.is_empty(), "EMPTY_REQUESTS");
    let accepted = cases.iter().filter(|case| case.accepted).count();
    let report = serde_json::json!({
        "schema": "horizon-circuit-verifier-v1", "status": "complete", "profile": PROFILE,
        "requests_sha256": hex::encode(hash.finalize()), "requests_bytes": bytes_read,
        "request_count": cases.len(), "accepted_count": accepted, "rejected_count": cases.len() - accepted,
        "expected_accept_used_for_decision": false, "authorization_effects": 0,
        "trust_scope": "Synthetic harness expectations, registry, policy and clock supplied in each request. Not an untrusted-client authorization service.",
        "timing_scope": "Only real library verify (or explicit Disclosure refusal); JSON parsing, IPC and output excluded. No warmup, percentile or SLA claim.",
        "cases": cases,
    });
    let mut writer = BufWriter::new(report_file);
    serde_json::to_writer(&mut writer, &report)?;
    writer.write_all(b"\n")?;
    writer.flush()?;
    writer.get_ref().sync_all()?;
    Ok(())
}

fn main() -> Result<()> {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    ensure!(arguments.len() == 5 && arguments[3] == "--output", "USAGE: circuit_campaign generate --vectors <json> --output <newdir> | verify --requests <ndjson> --output <new-json>");
    if arguments[0] == "generate" && arguments[1] == "--vectors" {
        generate(Path::new(&arguments[2]), Path::new(&arguments[4]))
    } else if arguments[0] == "verify" && arguments[1] == "--requests" {
        verify_requests(Path::new(&arguments[2]), Path::new(&arguments[4]))
    } else {
        anyhow::bail!("UNKNOWN_COMMAND_OR_ARGUMENTS")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vector(amount: u64, cap: u64) -> Vector {
        Vector {
            id: "case-1".into(),
            category: "test".into(),
            amount: amount.to_string(),
            cap: cap.to_string(),
        }
    }

    #[test]
    fn canonical_vectors_and_bounded_inputs() {
        for invalid in [
            "",
            "UPPER",
            "under_score",
            "dot.name",
            "colon:name",
            "has space",
        ] {
            assert!(label(invalid).is_err(), "{invalid}");
        }
        assert!(label(&"a".repeat(65)).is_err());
        assert!(label("case-1").is_ok());
        assert!(test_label("b_scalar_corruption").is_ok());
        for amount in [
            "",
            "01",
            "+1",
            "-1",
            " 1",
            "1.0",
            "1e1",
            "18446744073709551616",
        ] {
            assert!(decimal(amount).is_err(), "{amount}");
        }
        assert_eq!(decimal("18446744073709551615").unwrap(), u64::MAX);
        for text in [
            "[]",
            "{}",
            "null",
            r#"[{"id":"x","category":"test","amount":1,"cap":"2"}]"#,
            r#"[{"id":"x","category":"test","amount":"1","cap":"2","expected":true}]"#,
        ] {
            assert!(vectors(text.as_bytes()).is_err(), "{text}");
        }
        let one = vector(1, 1);
        assert!(vectors(&serde_json::to_vec(&vec![one.clone(), one.clone()]).unwrap()).is_err());
        assert!(vectors(&vec![b' '; MAX_VECTOR_BYTES as usize + 1]).is_err());
        assert!(vectors(&serde_json::to_vec(&vec![one; MAX_CASES + 1]).unwrap()).is_err());
        let oversized_bytes = vec![b'x'; MAX_LINE_BYTES + 1];
        let mut oversized = BufReader::new(&oversized_bytes[..]);
        assert!(read_line(&mut oversized).is_err());
    }

    #[test]
    fn real_valid_proofs_and_all_resigned_attacks_have_exact_errors() {
        let (case, records) = generate_case(&vector(RANGE, 2 * RANGE - 1)).unwrap();
        assert!(case.native_accept);
        let families = [
            ("a_valid", None),
            ("b_valid", None),
            ("b_scalar_corruption", Some("INVALID_RANGE_PROOF")),
            ("a_challenge_transplant", Some("INVALID_RANGE_PROOF")),
            ("b_authority_key_substitution", Some("INVALID_SIGNATURE")),
            ("b_issuer_signature_corruption", Some("INVALID_SIGNATURE")),
            ("b_holder_signature_corruption", Some("INVALID_SIGNATURE")),
            ("b_policy_epoch", Some("POLICY_MISMATCH")),
            ("b_reuse_forbidden", Some("REUSE_FORBIDDEN")),
            ("b_expected_context", Some("CHALLENGE_MISMATCH")),
            ("b_subject_transplant", Some("SUBJECT_MISMATCH")),
            ("b_expired_challenge", Some("CHALLENGE_EXPIRED")),
            ("b_future_challenge", Some("CHALLENGE_EXPIRED")),
            ("b_expired_evidence", Some("EVIDENCE_EXPIRED")),
            ("b_trust_epoch", Some("TRUST_EPOCH_MISMATCH")),
            ("b_evidence_join", Some("EVIDENCE_JOIN")),
        ];
        assert_eq!(records.len(), families.len());
        for (record, (family, error)) in records.iter().zip(families) {
            assert_eq!(record.test, family);
            let result = verify_record(record).unwrap();
            assert_eq!(result.accepted, error.is_none(), "{family}");
            assert_eq!(result.error.as_deref(), error, "{family}");
            let mut lied = record.clone();
            lied.expected_accept = !record.expected_accept;
            assert_eq!(
                verify_record(&lied).unwrap().accepted,
                result.accepted,
                "expectation flag must not decide {family}"
            );
        }
        let public = serde_json::to_string(&records).unwrap();
        for forbidden in ["blinding", "holder_secret", "witness", "disclosure"] {
            assert!(!public.contains(forbidden), "{forbidden}");
        }
    }

    #[test]
    fn direct_upstream_candidates_match_domains_and_invalids_reach_range_verifier() {
        let valid = Fixture::with_values(NOW, 1, 1).unwrap();
        for method in [Method::ChallengeBound, Method::Reusable] {
            let p = direct_candidate(&valid, method).unwrap();
            assert!(
                verify_record(&request("control", "direct-valid", &valid, p))
                    .unwrap()
                    .accepted
            );
        }
        for (amount, cap) in [
            (0, 0),
            (1, 0),
            (RANGE + 1, RANGE + 1),
            (1, RANGE + 1),
            (u64::MAX, u64::MAX),
        ] {
            let (case, records) = generate_case(&vector(amount, cap)).unwrap();
            assert!(!case.native_a_accept && !case.native_b_accept);
            assert_eq!(records.len(), 2);
            assert_eq!(records[0].test, "a_direct_bypass");
            assert_eq!(records[1].test, "b_direct_bypass");
            for record in records {
                let result = verify_record(&record).unwrap();
                assert!(!result.accepted, "{amount}/{cap}");
                assert_eq!(result.error.as_deref(), Some("INVALID_RANGE_PROOF"));
            }
        }
    }

    #[test]
    fn append_only_outputs_duplicate_and_malformed_requests() {
        let mut random = [0_u8; 16];
        OsRng.fill_bytes(&mut random);
        let directory = std::env::temp_dir().join(format!(
            "horizon-public-campaign-test-{}",
            hex::encode(random)
        ));
        fs::create_dir(&directory).unwrap();
        let output = directory.join("result.json");
        fs::write(&output, b"preserve-existing").unwrap();
        assert!(new_output(&output).is_err());
        assert_eq!(fs::read(&output).unwrap(), b"preserve-existing");
        let source = directory.join("vectors.json");
        fs::write(&source, serde_json::to_vec(&vec![vector(1, 1)]).unwrap()).unwrap();
        assert!(generate(&source, &directory).is_err());
        assert!(checked_path(&directory.join("../escaped"), true).is_err());

        let fixture = Fixture::generate(NOW).unwrap();
        let prepared = prepare(&fixture.evidence, &fixture.witness).unwrap();
        let mut challenge = fixture.challenge.clone();
        challenge.method = Method::Reusable;
        let p = present_reusable(
            &fixture.evidence,
            &prepared,
            &fixture.holder_secret_hex,
            &challenge,
        )
        .unwrap();
        let record = request("case", "valid", &fixture, p);
        let line = serde_json::to_string(&record).unwrap();
        let requests = directory.join("requests.ndjson");
        fs::write(&requests, format!("{line}\n{line}\n")).unwrap();
        assert_eq!(
            verify_requests(&requests, &directory.join("duplicate-result.json"))
                .unwrap_err()
                .to_string(),
            "DUPLICATE_REQUEST_ID_TEST"
        );
        fs::write(&requests, b"{invalid}\n").unwrap();
        assert!(verify_requests(&requests, &directory.join("malformed-result.json")).is_err());
        let mut disclosed = record;
        disclosed.request.presentation.payload = Payload::Disclosure {
            witness: fixture.witness.clone(),
        };
        assert_eq!(
            verify_record(&disclosed).unwrap().error.as_deref(),
            Some("PUBLIC_REQUESTS_ONLY")
        );
        // Only this test-created, random, public-data directory is removed.
        assert!(directory.starts_with(std::env::temp_dir()));
        fs::remove_dir_all(directory).unwrap();
    }
}
