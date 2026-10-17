use anyhow::{ensure, Context, Result};
use ed25519_dalek::{Signer, SigningKey};
use lab_host::Risc0LabBackend;
use lab_statement::{attestation_message, evaluate_signed, SignedRequest, LAB_AUTHORITY_KEY};
use lab_verifier::{
    authorize_historical, elf_image_id, export_receipt, import_receipt, reject_dev_environment,
    verify_receipt,
};
use policy_statement::{input_commitment, ProveRequest};
use risc0_zkvm::{Executor, ExecutorEnv, ExternalProver, InnerReceipt, Receipt, VerifierContext};
use serde_json::{json, Value};
use std::{fs, path::PathBuf, time::Instant};
use zkvm_bridge::ZkVmBackend;

fn fixture(name: &str) -> Result<ProveRequest> {
    let text = match name {
        "base" => include_str!("../../../../tests/fixtures/policy-v1.json"),
        "critical" | "denied" => include_str!("../../../../tests/fixtures/policy-critical-v1.json"),
        _ => anyhow::bail!("scenario must be base, critical, or denied"),
    };
    let value: Value = serde_json::from_str(text)?;
    let mut request: ProveRequest = serde_json::from_value(value["request"].clone())?;
    if name == "denied" {
        request
            .private_inputs
            .facts
            .critical
            .as_mut()
            .context("critical facts")?
            .emergency_stop = true;
        request.public_inputs.input_commitment =
            input_commitment(&request.private_inputs).map_err(anyhow::Error::msg)?;
    }
    Ok(request)
}

fn signed(request: ProveRequest) -> Result<SignedRequest> {
    // PUBLIC TEST SEED. Never use this authority for real attestations.
    let key = SigningKey::from_bytes(&[7; 32]);
    ensure!(
        key.verifying_key().to_bytes() == LAB_AUTHORITY_KEY,
        "fixture key mismatch"
    );
    let signature = key.sign(
        attestation_message(&request)
            .map_err(anyhow::Error::msg)?
            .as_bytes(),
    );
    Ok(SignedRequest {
        request,
        elf_image_id: elf_image_id(),
        authority_signature: signature.to_bytes().to_vec(),
    })
}

fn env(input: &SignedRequest) -> Result<ExecutorEnv<'static>> {
    let bytes = serde_json::to_vec(input)?;
    ensure!(bytes.len() <= 16_384, "INPUT_TOO_LARGE");
    ExecutorEnv::builder()
        .write(&(bytes.len() as u32))?
        .write_slice(&bytes)
        .segment_limit_po2(20)
        .session_limit(Some(16_000_000))
        .build()
}

fn summarize(mut timings: Vec<f64>) -> Value {
    timings.sort_by(f64::total_cmp);
    json!({"samples":timings.len(),"p50_ms":timings[timings.len()/2],
        "p95_ms":timings[(timings.len()*95/100).min(timings.len()-1)],"max_ms":timings.last()})
}

fn measure(mut f: impl FnMut() -> Result<()>, count: usize) -> Result<Value> {
    let mut timings = Vec::new();
    for _ in 0..count {
        let start = Instant::now();
        f()?;
        timings.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    Ok(summarize(timings))
}

fn assert_rejected(result: Result<()>, category: &str) -> Result<()> {
    ensure!(result.is_err(), "attack unexpectedly accepted: {category}");
    Ok(())
}

fn main() -> Result<()> {
    reject_dev_environment()?;
    let args: Vec<String> = std::env::args().collect();
    let scenario = args.get(1).map(String::as_str).unwrap_or("critical");
    let output = PathBuf::from(args.get(2).map(String::as_str).unwrap_or("/lab/results"));
    let proof_samples: usize = args.get(3).map(String::as_str).unwrap_or("3").parse()?;
    ensure!(
        (1..=20).contains(&proof_samples),
        "proof samples out of bounds"
    );
    fs::create_dir_all(&output)?;
    let input = signed(fixture(scenario)?)?;
    let expected = &input.request.public_inputs;
    let expected_journal = evaluate_signed(&input).map_err(anyhow::Error::msg)?;
    // Explicit local executable: no default prover, Bonsai or network prover selection.
    let prover = ExternalProver::new(
        "pinned-local-r0vm",
        "/root/.risc0/extensions/v3.0.6-cargo-risczero-x86_64-unknown-linux-gnu/r0vm",
    );
    let ctx = VerifierContext::default().with_dev_mode(false);
    let backend = Risc0LabBackend::new(input.authority_signature.clone())?;
    let mut proof_timings = Vec::new();
    let mut receipts = Vec::new();
    let mut stats = Vec::new();
    let mut envelopes = Vec::new();
    for i in 0..proof_samples {
        eprintln!(
            "Proving {scenario} sample {}/{proof_samples} (real succinct STARK)...",
            i + 1
        );
        let start = Instant::now();
        let (envelope, receipt, session_stats) = backend.prove_with_stats(&input.request)?;
        proof_timings.push(start.elapsed().as_secs_f64() * 1000.0);
        ensure!(
            verify_receipt(&receipt, expected)? == expected_journal,
            "native/guest mismatch"
        );
        backend.verify(&envelope).map_err(anyhow::Error::msg)?;
        stats.push(serde_json::to_value(session_stats)?);
        receipts.push(receipt);
        envelopes.push(envelope);
    }
    let receipt = &receipts[0];
    let mut forged_envelope = envelopes[0].clone();
    forged_envelope.public_outputs.allow = !forged_envelope.public_outputs.allow;
    ensure!(
        backend.verify(&forged_envelope).is_err(),
        "forged envelope accepted"
    );
    let bundle = serde_json::to_vec(&export_receipt(receipt)?)?;
    let roundtrip = import_receipt(&bundle)?;
    ensure!(
        verify_receipt(&roundtrip, expected)? == expected_journal,
        "export mismatch"
    );
    if scenario == "denied" {
        let error = authorize_historical(receipt, expected).unwrap_err();
        ensure!(
            error.to_string() == "POLICY_DENIED",
            "wrong denial reason: {error}"
        );
    } else {
        authorize_historical(receipt, expected)?;
    }

    let mut tampered = receipt.clone();
    let InnerReceipt::Succinct(inner) = &mut tampered.inner else {
        anyhow::bail!("not succinct")
    };
    let offset = inner.seal.len() / 2;
    inner.seal[offset] ^= 1; // Full proof remains framed correctly; attack hits the cryptographic seal.
    let mut changed_journal = receipt.clone();
    changed_journal.journal.bytes[0] ^= 1;
    let mut other_context = expected.clone();
    other_context.context.project_id += 1;
    assert_rejected(
        receipt
            .verify_with_context(&ctx, [0u32; 8])
            .map_err(Into::into),
        "wrong image",
    )?;
    assert_rejected(
        verify_receipt(&changed_journal, expected).map(|_| ()),
        "changed journal",
    )?;
    let wrong_context_error = verify_receipt(receipt, &other_context).unwrap_err();
    ensure!(
        wrong_context_error.to_string() == "STATEMENT_MISMATCH",
        "wrong statement rejection"
    );
    let fake = Receipt::new(
        InnerReceipt::Fake(risc0_zkvm::FakeReceipt::new(receipt.claim()?)),
        receipt.journal.bytes.clone(),
    );
    assert_rejected(
        fake.verify_with_context(&ctx, lab_methods::POLICY_PROOF_GUEST_ID)
            .map_err(Into::into),
        "fake receipt",
    )?;

    let mut invalid_signature = input.clone();
    invalid_signature.authority_signature[0] ^= 1;
    let mut invalid_witness = input.clone();
    invalid_witness.request.private_inputs.facts.approvals += 1;
    for (code, bad) in [
        ("INVALID_SIGNATURE", invalid_signature),
        ("COMMITMENT_MISMATCH", invalid_witness),
    ] {
        let error = prover
            .execute(env(&bad)?, lab_methods::POLICY_PROOF_GUEST_ELF)
            .expect_err("guest accepted invalid input");
        ensure!(
            format!("{error:#}").contains(code),
            "unexpected VM rejection for {code}: {error:#}"
        );
    }

    // Warm verifier separately. No expiry clock or gateway error can satisfy these measurements.
    for _ in 0..10 {
        verify_receipt(receipt, expected)?;
    }
    let verify = measure(|| verify_receipt(receipt, expected).map(|_| ()), 100)?;
    let reject = measure(
        || {
            // Direct crypto verifier: no schema/context/time checks can mask a valid seal.
            assert_rejected(
                tampered
                    .verify_with_context(&ctx, lab_methods::POLICY_PROOF_GUEST_ID)
                    .map_err(Into::into),
                "bit-flipped seal",
            )
        },
        100,
    )?;
    let native = measure(
        || {
            evaluate_signed(&input).map_err(anyhow::Error::msg)?;
            Ok(())
        },
        100,
    )?;
    let report = json!({"backend":"risc0", "version":"3.0.6", "proof_kind":"succinct",
        "scenario":scenario, "dev_mode":false, "fixture_authority":true, "historical_verification":true,
        "image_id":format!("{:?}",lab_methods::POLICY_PROOF_GUEST_ID), "elf_sha256":elf_image_id(),
        "proof_samples_in_order_ms":proof_timings, "prove_local_process":summarize(proof_timings.clone()),
        "verify_warm":verify, "reject_full_seal_bitflip":reject, "native_signed_policy":native,
        "receipt_bundle_bytes":bundle.len(), "seal_bytes":receipt.inner.seal_size(), "journal_bytes":receipt.journal.bytes.len(),
        "session_stats":stats, "negative_checks":["seal_bitflip","wrong_image","journal_tamper","wrong_context","fake_receipt","signature_in_guest","witness_commitment_in_guest"],
        "independent_proofs_differ":receipts.len()>1 && export_receipt(&receipts[0])?.succinct_receipt != export_receipt(&receipts[1])?.succinct_receipt,
        "scope":"real CPU proof; local r0vm subprocess overhead included; no gateway/network/side effect; fixture authority only; no critical-privacy claim"});
    fs::write(output.join(format!("{scenario}-proof.json")), &bundle)?;
    fs::write(
        output.join(format!("{scenario}-envelope.json")),
        serde_json::to_vec(&envelopes[0])?,
    )?;
    fs::write(
        output.join(format!("{scenario}-expected.json")),
        serde_json::to_vec_pretty(expected)?,
    )?;
    fs::write(
        output.join(format!("{scenario}-report.json")),
        serde_json::to_vec_pretty(&report)?,
    )?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
