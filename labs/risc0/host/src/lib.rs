//! Real RISC Zero lab adapter. Fixture authority and historical verification only.
#![forbid(unsafe_code)]

use anyhow::{ensure, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use lab_statement::{evaluate_signed, SignedRequest};
use lab_verifier::{
    elf_image_id, export_receipt, import_receipt, reject_dev_environment, verify_receipt,
    MAX_BUNDLE_BYTES,
};
use policy_statement::{Envelope, Journal, ProveRequest};
use risc0_zkvm::{
    ExecutorEnv, ExternalProver, Prover, ProverOpts, Receipt, SessionStats, VerifierContext,
};
use zkvm_bridge::{BridgeResult, ZkVmBackend};

const MAX_INPUT_BYTES: usize = 16_384;
const MAX_PROOF_BASE64_BYTES: usize = MAX_BUNDLE_BYTES.div_ceil(3) * 4;
const R0VM_PATH: &str =
    "/root/.risc0/extensions/v3.0.6-cargo-risczero-x86_64-unknown-linux-gnu/r0vm";

/// Holds an externally supplied attestation for one public statement.
/// This adapter cannot sign or authorize a different request on its own.
pub struct Risc0LabBackend {
    authority_signature: Vec<u8>,
}

impl Risc0LabBackend {
    pub fn new(authority_signature: Vec<u8>) -> Result<Self> {
        reject_dev_environment()?;
        ensure!(authority_signature.len() == 64, "INVALID_SIGNATURE_LENGTH");
        Ok(Self {
            authority_signature,
        })
    }

    pub fn security_profile(&self) -> &'static str {
        "zk"
    }

    /// Produces a real succinct receipt and checks its complete journal before
    /// returning it. This does not check wall-clock freshness or dispatch an API.
    pub fn prove_with_stats(
        &self,
        request: &ProveRequest,
    ) -> Result<(Envelope, Receipt, SessionStats)> {
        reject_dev_environment()?;
        let input = SignedRequest {
            request: request.clone(),
            elf_image_id: elf_image_id(),
            authority_signature: self.authority_signature.clone(),
        };
        let bytes = serde_json::to_vec(&input)?;
        ensure!(bytes.len() <= MAX_INPUT_BYTES, "INPUT_TOO_LARGE");
        // Reject invalid inputs cheaply; the pinned guest independently repeats
        // signature verification, commitment checks and policy evaluation.
        let expected_journal = evaluate_signed(&input).map_err(anyhow::Error::msg)?;
        let length = u32::try_from(bytes.len())?;
        let env = ExecutorEnv::builder()
            .write(&length)?
            .write_slice(&bytes)
            .segment_limit_po2(20)
            .session_limit(Some(16_000_000))
            .build()?;
        let prover = ExternalProver::new("pinned-local-r0vm", R0VM_PATH);
        let context = VerifierContext::default().with_dev_mode(false);
        let options = ProverOpts::succinct().with_dev_mode(false);
        let info =
            prover.prove_with_ctx(env, &context, lab_methods::POLICY_PROOF_GUEST_ELF, &options)?;
        let journal = verify_receipt(&info.receipt, &request.public_inputs)?;
        ensure!(journal == expected_journal, "NATIVE_GUEST_MISMATCH");
        let bundle = serde_json::to_vec(&export_receipt(&info.receipt)?)?;
        ensure!(bundle.len() <= MAX_BUNDLE_BYTES, "BUNDLE_TOO_LARGE");
        let envelope = Envelope {
            spec_version: journal.spec_version,
            zkvm_backend: journal.zkvm_backend,
            security_profile: journal.security_profile,
            elf_image_id: journal.elf_image_id,
            public_inputs_hash: journal.public_inputs_hash,
            public_inputs: request.public_inputs.clone(),
            public_outputs: journal.public_outputs,
            proof_bytes: STANDARD.encode(bundle),
            timestamp: journal.timestamp,
        };
        Ok((envelope, info.receipt, info.stats))
    }

    fn verify_envelope(&self, envelope: &Envelope) -> Result<()> {
        reject_dev_environment()?;
        ensure!(
            envelope.proof_bytes.len() <= MAX_PROOF_BASE64_BYTES,
            "PROOF_TOO_LARGE"
        );
        let bundle = STANDARD.decode(&envelope.proof_bytes)?;
        ensure!(bundle.len() <= MAX_BUNDLE_BYTES, "BUNDLE_TOO_LARGE");
        ensure!(
            STANDARD.encode(&bundle) == envelope.proof_bytes,
            "NONCANONICAL_BASE64"
        );
        let receipt = import_receipt(&bundle)?;
        let verified = verify_receipt(&receipt, &envelope.public_inputs)?;
        ensure!(
            verified == Journal::from_envelope(envelope),
            "JOURNAL_MISMATCH"
        );
        Ok(())
    }
}

impl ZkVmBackend for Risc0LabBackend {
    fn name(&self) -> &'static str {
        "risc0"
    }

    fn image_id(&self) -> BridgeResult<String> {
        reject_dev_environment().map_err(|error| error.to_string())?;
        Ok(elf_image_id())
    }

    fn prove(&self, request: &ProveRequest) -> BridgeResult<Envelope> {
        self.prove_with_stats(request)
            .map(|(envelope, _, _)| envelope)
            .map_err(|error| error.to_string())
    }

    fn verify(&self, envelope: &Envelope) -> BridgeResult<()> {
        self.verify_envelope(envelope)
            .map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constructor_requires_an_external_signature_of_the_expected_size() {
        assert!(Risc0LabBackend::new(Vec::new()).is_err());
        assert!(Risc0LabBackend::new(vec![0; 63]).is_err());
        assert!(Risc0LabBackend::new(vec![0; 65]).is_err());
    }

    #[test]
    fn invalid_attestation_is_rejected_before_starting_a_prover() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../../../../tests/fixtures/policy-v1.json"))
                .unwrap();
        let request: ProveRequest = serde_json::from_value(fixture["request"].clone()).unwrap();
        let backend = Risc0LabBackend::new(vec![0; 64]).unwrap();
        assert_eq!(
            backend.prove_with_stats(&request).unwrap_err().to_string(),
            "INVALID_SIGNATURE"
        );
    }
}
