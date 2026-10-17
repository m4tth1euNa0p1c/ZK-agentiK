#![forbid(unsafe_code)]
use anyhow::{bail, ensure, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use bincode::Options;
use policy_statement::{canonical_bytes, hash, Journal, PublicInputs};
use risc0_zkvm::{InnerReceipt, Receipt, ReceiptClaim, SuccinctReceipt, VerifierContext};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAX_BUNDLE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProofBundle {
    pub format: String,
    pub succinct_receipt: String,
    pub journal: String,
}

pub fn elf_image_id() -> String {
    static ID: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    ID.get_or_init(|| {
        format!(
            "sha256:{:x}",
            Sha256::digest(lab_methods::POLICY_PROOF_GUEST_ELF)
        )
    })
    .clone()
}

pub fn reject_dev_environment() -> Result<()> {
    if std::env::var("RISC0_DEV_MODE").is_ok_and(|s| !s.is_empty() && s != "0" && s != "false") {
        bail!("DEV_MODE_FORBIDDEN");
    }
    Ok(())
}

pub fn export_receipt(receipt: &Receipt) -> Result<ProofBundle> {
    let InnerReceipt::Succinct(succinct) = &receipt.inner else {
        bail!("NON_SUCCINCT_RECEIPT")
    };
    Ok(ProofBundle {
        format: "zk-agentik-risc0-lab/1".into(),
        succinct_receipt: STANDARD.encode(bincode::serialize(succinct)?),
        journal: STANDARD.encode(&receipt.journal.bytes),
    })
}

/// Decode ONLY the succinct type: fake/composite/recursive Receipt variants cannot be selected.
pub fn import_receipt(bytes: &[u8]) -> Result<Receipt> {
    ensure!(bytes.len() <= MAX_BUNDLE_BYTES, "BUNDLE_TOO_LARGE");
    let bundle: ProofBundle = serde_json::from_slice(bytes)?;
    ensure!(bundle.format == "zk-agentik-risc0-lab/1", "UNKNOWN_PROFILE");
    let seal = STANDARD.decode(&bundle.succinct_receipt)?;
    let journal = STANDARD.decode(&bundle.journal)?;
    ensure!(journal.len() <= 4096, "JOURNAL_TOO_LARGE");
    ensure!(
        STANDARD.encode(&seal) == bundle.succinct_receipt
            && STANDARD.encode(&journal) == bundle.journal,
        "NONCANONICAL_BASE64"
    );
    let succinct: SuccinctReceipt<ReceiptClaim> = bincode::DefaultOptions::new()
        .with_fixint_encoding()
        .with_limit(1_048_576)
        .reject_trailing_bytes()
        .deserialize(&seal)?;
    Ok(Receipt::new(InnerReceipt::Succinct(succinct), journal))
}

/// Historical verification: freshness is intentionally NOT claimed by this lab API.
/// expected comes from the verifier's challenge file, never from the proof bundle.
pub fn verify_receipt(receipt: &Receipt, expected: &PublicInputs) -> Result<Journal> {
    reject_dev_environment()?;
    ensure!(
        matches!(receipt.inner, InnerReceipt::Succinct(_)),
        "NON_SUCCINCT_RECEIPT"
    );
    receipt.verify_with_context(
        &VerifierContext::default().with_dev_mode(false),
        lab_methods::POLICY_PROOF_GUEST_ID,
    )?;
    let journal: Journal = serde_json::from_slice(&receipt.journal.bytes)?;
    ensure!(
        canonical_bytes(&journal).map_err(anyhow::Error::msg)? == receipt.journal.bytes,
        "NONCANONICAL_JOURNAL"
    );
    ensure!(
        journal.spec_version == "1.0"
            && journal.zkvm_backend == "risc0"
            && journal.security_profile == "zk",
        "PROFILE_MISMATCH"
    );
    ensure!(journal.elf_image_id == elf_image_id(), "ELF_MISMATCH");
    ensure!(
        journal.public_inputs_hash
            == hash("zk-mcp/public-inputs/v1", expected).map_err(anyhow::Error::msg)?
            && journal.timestamp == expected.issued_at_ms,
        "STATEMENT_MISMATCH"
    );
    Ok(journal)
}

pub fn authorize_historical(receipt: &Receipt, expected: &PublicInputs) -> Result<()> {
    let journal = verify_receipt(receipt, expected)?;
    ensure!(
        journal.public_outputs.allow
            && journal.public_outputs.violations_mask == 0
            && journal.public_outputs.critical_violations.is_none(),
        "POLICY_DENIED"
    );
    Ok(())
}
