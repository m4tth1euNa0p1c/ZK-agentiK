//! Raw single-process wall-clock observations; not a service SLA or Vega ratio.
use anyhow::{ensure, Context, Result};
use bulletproofs::{BulletproofGens, RangeProof};
use curve25519_dalek::scalar::Scalar;
use horizon_proof::{
    prepare, present_reusable, prove, verify, Challenge, Fixture, Method, Payload, ReusableProof,
};
use rand::{rngs::OsRng, RngCore};
use serde_json::json;
use std::{collections::BTreeMap, fs, io::Write, time::Instant};

#[derive(Default)]
struct Records {
    durations: BTreeMap<&'static str, Vec<u64>>,
    envelopes: BTreeMap<&'static str, Vec<usize>>,
    proofs: Vec<usize>,
}

fn timed<T>(operation: impl FnOnce() -> Result<T>) -> Result<(T, u64)> {
    let start = Instant::now();
    let result = operation()?;
    Ok((result, u64::try_from(start.elapsed().as_nanos())?))
}

impl Records {
    fn record<T>(
        &mut self,
        phase: &'static str,
        operation: impl FnOnce() -> Result<T>,
    ) -> Result<T> {
        let (result, nanos) = timed(operation)?;
        self.durations.entry(phase).or_default().push(nanos);
        Ok(result)
    }
    fn size(&mut self, mode: &'static str, size: usize) {
        self.envelopes.entry(mode).or_default().push(size);
    }
}

fn tampered(prepared: &ReusableProof) -> Result<ReusableProof> {
    let mut modified = prepared.clone();
    let mut bytes = hex::decode(&modified.proof_hex)?;
    let encoded: [u8; 32] = bytes[128..160].try_into()?;
    let value =
        Option::<Scalar>::from(Scalar::from_canonical_bytes(encoded)).context("scalar encoding")?;
    bytes[128..160].copy_from_slice(&(value + Scalar::ONE).to_bytes());
    RangeProof::from_bytes(&bytes).context("tamper must preserve parse validity")?;
    modified.proof_hex = hex::encode(bytes);
    Ok(modified)
}

fn sample_a(f: &Fixture, challenge: &Challenge, now: u64, records: &mut Records) -> Result<()> {
    let a = records.record("prove_a", || {
        prove(&f.evidence, &f.witness, &f.holder_secret_hex, challenge)
    })?;
    records.record("verify_a", || {
        verify(&a, challenge, &f.trust, &f.policy, now)
    })?;
    let encoded = records.record("serialize_a", || Ok(serde_json::to_vec(&a)?))?;
    records.size("a", encoded.len());
    if let Payload::ChallengeBound { proof_hex } = &a.payload {
        records.proofs.push(proof_hex.len() / 2);
    }
    Ok(())
}

fn sample_b(
    f: &Fixture,
    static_proof: &ReusableProof,
    bad_static: &ReusableProof,
    challenge: &Challenge,
    now: u64,
    records: &mut Records,
) -> Result<()> {
    let b = records.record("present_b", || {
        present_reusable(&f.evidence, static_proof, &f.holder_secret_hex, challenge)
    })?;
    ensure!(
        matches!(&b.payload, Payload::Reusable { prepared } if prepared == static_proof),
        "reused proof changed"
    );
    records.record("verify_b_full", || {
        verify(&b, challenge, &f.trust, &f.policy, now)
    })?;
    let encoded = records.record("serialize_b", || Ok(serde_json::to_vec(&b)?))?;
    records.size("b", encoded.len());
    let bad = present_reusable(&f.evidence, bad_static, &f.holder_secret_hex, challenge)?;
    records.record("reject_tampered_algebraic_b", || {
        let error = verify(&bad, challenge, &f.trust, &f.policy, now)
            .expect_err("tampered range must never authorize");
        ensure!(
            error.to_string() == "INVALID_RANGE_PROOF",
            "wrong rejection stage: {error}"
        );
        Ok(())
    })?;
    Ok(())
}

fn sample(
    index: usize,
    f: &Fixture,
    prepared: &ReusableProof,
    bad: &ReusableProof,
    now: u64,
    records: &mut Records,
) -> Result<()> {
    records.record("fixture_issuance", || {
        Fixture::with_values(now, f.witness.amount, f.witness.cap)
    })?;
    records.record("parameters_standalone", || Ok(BulletproofGens::new(32, 2)))?;
    records.record("prepare", || prepare(&f.evidence, &f.witness))?;
    let mut a = f.challenge.clone();
    let mut nonce = [0_u8; 32];
    OsRng.fill_bytes(&mut nonce);
    a.nonce = hex::encode(nonce);
    a.operation_id = format!("benchmark-{index}");
    let mut b = a.clone();
    b.method = Method::Reusable;
    if index.is_multiple_of(2) {
        sample_a(f, &a, now, records)?;
        sample_b(f, prepared, bad, &b, now, records)?;
    } else {
        sample_b(f, prepared, bad, &b, now, records)?;
        sample_a(f, &a, now, records)?;
    }
    let mut public_challenge = a;
    public_challenge.method = Method::Disclosure;
    let mut public_policy = f.policy.clone();
    public_policy.require_private = false;
    let public = records.record("present_disclosure", || {
        prove(
            &f.evidence,
            &f.witness,
            &f.holder_secret_hex,
            &public_challenge,
        )
    })?;
    records.record("verify_disclosure", || {
        verify(&public, &public_challenge, &f.trust, &public_policy, now)
    })?;
    let encoded = records.record("serialize_disclosure", || Ok(serde_json::to_vec(&public)?))?;
    records.size("disclosure", encoded.len());
    Ok(())
}

fn main() -> Result<()> {
    ensure!(!cfg!(debug_assertions), "run this benchmark with --release");
    let mut samples_count = 500_usize;
    let mut warmup = 30_usize;
    let mut output = None;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--samples" => samples_count = args.next().context("missing --samples")?.parse()?,
            "--warmup" => warmup = args.next().context("missing --warmup")?.parse()?,
            "--output" => output = Some(args.next().context("missing --output")?),
            _ => anyhow::bail!("unknown benchmark argument"),
        }
    }
    ensure!(
        (1..=10_000).contains(&samples_count) && warmup <= 1000,
        "invalid sample count"
    );
    // Fixed public time and synthetic values; this benchmark grants no live authorization.
    let now = 1_800_000_000_000;
    let range = 1_u64 << 32;
    let values = [
        (1, 1),
        (125_000, 250_000),
        (7_250_000, 9_999_999),
        (range, range),
        (range, 2 * range - 1),
    ];
    let mut cases = Vec::new();
    let mut initial_issuance = Vec::new();
    let mut initial_prepare = Vec::new();
    for (amount, cap) in values {
        let (fixture, duration) = timed(|| Fixture::with_values(now, amount, cap))?;
        initial_issuance.push(duration);
        let (prepared, duration) = timed(|| prepare(&fixture.evidence, &fixture.witness))?;
        initial_prepare.push(duration);
        let bad = tampered(&prepared)?;
        cases.push((fixture, prepared, bad));
    }
    for index in 0..warmup {
        let (fixture, prepared, bad) = &cases[index % cases.len()];
        sample(index, fixture, prepared, bad, now, &mut Records::default())?;
    }
    let mut records = Records::default();
    for index in 0..samples_count {
        let (fixture, prepared, bad) = &cases[index % cases.len()];
        sample(index + warmup, fixture, prepared, bad, now, &mut records)?;
    }
    ensure!(
        records
            .durations
            .values()
            .all(|values| values.len() == samples_count),
        "incomplete timing phase"
    );
    let report = json!({
        "format":"horizon-benchmark-v1", "profile":horizon_proof::PROFILE, "samples":samples_count,
        "warmup":warmup, "corpus_size":cases.len(), "case_schedule":"round_robin", "ab_order":"alternating",
        "units":"nanoseconds", "initial_fixture_issuance_ns":initial_issuance, "initial_prepare_ns":initial_prepare,
        "durations":records.durations, "proof_bytes_a":records.proofs, "proof_bytes_b":cases[0].1.proof_hex.len()/2,
        "envelope_json_bytes":records.envelopes,
        "verification_cache":false, "b_reuses_exact_proof":true, "valid_encoding_tamper_rejections":samples_count,
        "parameter_cost_note":"Public generators are constructed within current library prove/verify calls. parameters_standalone is diagnostic and must not be subtracted or added twice.",
        "scope":"Five synthetic value pairs with random keys/blinds; no network/SQLite/dispatch; IID independence not established; no performance ratio against the different Vega credential relation."
    });
    let bytes = serde_json::to_vec_pretty(&report)?;
    if let Some(path) = output {
        fs::write(path, bytes)?;
    } else {
        std::io::stdout().lock().write_all(&bytes)?;
    }
    Ok(())
}
