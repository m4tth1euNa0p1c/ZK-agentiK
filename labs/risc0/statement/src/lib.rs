#![no_std]
#![forbid(unsafe_code)]
extern crate alloc;

use alloc::{string::String, vec::Vec};
use ed25519_dalek::{Signature, VerifyingKey};
use policy_statement::{hash, journal_for, Journal, ProveRequest, StatementResult};
use serde::{Deserialize, Serialize};

/// PUBLIC FIXTURE AUTHORITY ONLY. The corresponding seed is public in the runner.
/// A production deployment must build a new guest with its own trust registry.
pub const LAB_AUTHORITY_KEY: [u8; 32] = [
    234, 74, 108, 99, 226, 156, 82, 10, 190, 245, 80, 123, 19, 46, 197, 249, 149, 71, 118, 174,
    190, 190, 123, 146, 66, 30, 234, 105, 20, 70, 210, 44,
];

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SignedRequest {
    pub request: ProveRequest,
    pub elf_image_id: String,
    pub authority_signature: Vec<u8>,
}

/// Attests the full challenge, including the salted witness commitment.
/// It authenticates a fixture collector's assertion, not real Jira/Sonar/GitLab.
pub fn attestation_message(request: &ProveRequest) -> StatementResult<String> {
    hash("zk-mcp/lab-source-attestation/v1", &request.public_inputs)
}

pub fn evaluate_signed(input: &SignedRequest) -> StatementResult<Journal> {
    let key = VerifyingKey::from_bytes(&LAB_AUTHORITY_KEY).map_err(|_| "INVALID_AUTHORITY")?;
    let signature =
        Signature::from_slice(&input.authority_signature).map_err(|_| "INVALID_SIGNATURE")?;
    key.verify_strict(attestation_message(&input.request)?.as_bytes(), &signature)
        .map_err(|_| "INVALID_SIGNATURE")?;
    // Recomputes witness and policy commitments INSIDE the guest before evaluation.
    journal_for(&input.request, "risc0", "zk", &input.elf_image_id)
}
