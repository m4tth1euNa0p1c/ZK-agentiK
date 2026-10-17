use anyhow::{ensure, Result};
use ed25519_dalek::{Signer, SigningKey};
use lab_statement::{attestation_message, evaluate_signed, SignedRequest};
use lab_verifier::elf_image_id;
use policy_statement::{canonical_bytes, ProveRequest};
use risc0_zkvm::{Executor, ExecutorEnv, ExternalProver};
use serde_json::Value;

fn execute(input: &SignedRequest) -> Result<risc0_zkvm::SessionInfo> {
    let bytes = serde_json::to_vec(input)?;
    ensure!(bytes.len() <= 16_384, "input limit");
    let env = ExecutorEnv::builder()
        .write(&(bytes.len() as u32))?
        .write_slice(&bytes)
        .session_limit(Some(16_000_000))
        .build()?;
    ExternalProver::new(
        "pinned-local-r0vm",
        "/root/.risc0/extensions/v3.0.6-cargo-risczero-x86_64-unknown-linux-gnu/r0vm",
    )
    .execute(env, lab_methods::POLICY_PROOF_GUEST_ELF)
}

fn main() -> Result<()> {
    lab_verifier::reject_dev_environment()?;
    for (name, fixture) in [
        (
            "base",
            include_str!("../../../../../tests/fixtures/policy-v1.json"),
        ),
        (
            "critical",
            include_str!("../../../../../tests/fixtures/policy-critical-v1.json"),
        ),
    ] {
        let value: Value = serde_json::from_str(fixture)?;
        let request: ProveRequest = serde_json::from_value(value["request"].clone())?;
        let signature = SigningKey::from_bytes(&[7; 32]).sign(
            attestation_message(&request)
                .map_err(anyhow::Error::msg)?
                .as_bytes(),
        );
        let input = SignedRequest {
            request,
            elf_image_id: elf_image_id(),
            authority_signature: signature.to_bytes().to_vec(),
        };
        let expected = canonical_bytes(&evaluate_signed(&input).map_err(anyhow::Error::msg)?)
            .map_err(anyhow::Error::msg)?;
        ensure!(
            execute(&input)?.journal.bytes == expected,
            "VM/native mismatch"
        );
        println!("{name}: VM/native journal agrees");
        let mut bad_signature = input.clone();
        bad_signature.authority_signature[0] ^= 1;
        let mut bad_witness = input.clone();
        bad_witness.request.private_inputs.facts.approvals += 1;
        for (code, bad) in [
            ("INVALID_SIGNATURE", bad_signature),
            ("COMMITMENT_MISMATCH", bad_witness),
        ] {
            ensure!(
                evaluate_signed(&bad).unwrap_err() == code,
                "wrong native rejection"
            );
            let error = execute(&bad).expect_err("invalid guest input accepted");
            let reason = format!("{error:#}");
            // Require the guest's fixed diagnostic. Infrastructure errors are not test successes.
            ensure!(
                reason.contains(code),
                "unexpected VM rejection for {code}: {reason}"
            );
            println!("{name}: guest rejected {code}");
        }
    }
    Ok(())
}
