//! Deterministic statement relation shared by native execution and zkVM guests.
#![no_std]

extern crate alloc;

use alloc::{
    format,
    string::{String, ToString},
    vec::Vec,
};
use policy_engine_core::{
    critical::{CriticalFacts, ExecutionContext},
    Policy, PolicyDecision, PolicyFacts,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
pub type StatementResult<T> = Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Facts {
    pub sonar_quality_gate: String,
    pub jira_status: String,
    pub critical_vulnerabilities: u32,
    pub approvals: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub critical: Option<CriticalFacts>,
}

impl Facts {
    pub fn as_policy_facts(&self) -> PolicyFacts<'_> {
        PolicyFacts {
            sonar_quality_gate: &self.sonar_quality_gate,
            jira_status: &self.jira_status,
            critical_vulnerabilities: self.critical_vulnerabilities,
            approvals: self.approvals,
            critical: self.critical.as_ref(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PrivateInputs {
    pub facts: Facts,
    /// 32 host-generated random bytes, hex encoded. Public in the simulator only.
    pub salt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ActionContext {
    pub tenant_id: String,
    pub tool: String,
    pub project_id: u32,
    pub merge_request_iid: u32,
    pub head_sha: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PublicInputs {
    pub audience: String,
    pub context: ActionContext,
    pub policy: Policy,
    pub policy_hash: String,
    pub input_commitment: String,
    pub nonce: String,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Envelope {
    pub spec_version: String,
    pub zkvm_backend: String,
    pub security_profile: String,
    pub elf_image_id: String,
    pub public_inputs_hash: String,
    pub public_inputs: PublicInputs,
    pub public_outputs: PolicyDecision,
    pub proof_bytes: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProveRequest {
    pub public_inputs: PublicInputs,
    pub private_inputs: PrivateInputs,
}

/// Canonical profile: ASCII schema keys, safe nonnegative integers, no floats.
/// serde_json's default map is sorted; never enable its preserve_order feature.
pub fn canonical_bytes<T: Serialize>(value: &T) -> StatementResult<Vec<u8>> {
    serde_json::to_vec(&serde_json::to_value(value).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

pub fn hash<T: Serialize>(domain: &str, value: &T) -> StatementResult<String> {
    let mut h = Sha256::new();
    h.update(domain.as_bytes());
    h.update([0]);
    h.update(canonical_bytes(value)?);
    Ok(format!("{:x}", h.finalize()))
}

pub fn input_commitment(private: &PrivateInputs) -> StatementResult<String> {
    hash("zk-mcp/witness/v1", private)
}

fn valid_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn valid_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:/-".contains(&b))
}

pub fn validate_request(request: &ProveRequest) -> StatementResult<()> {
    let p = &request.public_inputs;
    let f = &request.private_inputs.facts;
    if let Some(c) = &f.critical {
        if [
            c.approvals_expires_at_ms,
            c.evidence_observed_at_ms,
            c.change_window_start_ms,
            c.change_window_end_ms,
            c.canary_duration_ms,
        ]
        .iter()
        .any(|n| *n > MAX_SAFE_INTEGER)
        {
            return Err("INVALID_INPUT".into());
        }
    }
    if let Some(c) = &p.policy.critical {
        if c.max_evidence_age_ms > MAX_SAFE_INTEGER || c.min_canary_duration_ms > MAX_SAFE_INTEGER {
            return Err("INVALID_INPUT".into());
        }
    }
    if !valid_hex(&request.private_inputs.salt, 64)
        || f.sonar_quality_gate.len() > 64
        || f.jira_status.len() > 64
        || !f
            .sonar_quality_gate
            .bytes()
            .all(|b| (0x20..=0x7e).contains(&b))
        || !f.jira_status.bytes().all(|b| (0x20..=0x7e).contains(&b))
        || !valid_token(&p.audience)
        || !valid_token(&p.context.tenant_id)
        || p.context.tool != "verifiable_gitlab_merge"
        || p.context.project_id == 0
        || p.context.merge_request_iid == 0
        || !(valid_hex(&p.context.head_sha, 40) || valid_hex(&p.context.head_sha, 64))
        || !valid_hex(&p.nonce, 64)
        || !valid_hex(&p.policy_hash, 64)
        || !valid_hex(&p.input_commitment, 64)
        || p.policy.min_reviewers == 0
        || p.issued_at_ms > MAX_SAFE_INTEGER
        || p.expires_at_ms > MAX_SAFE_INTEGER
        || p.expires_at_ms <= p.issued_at_ms
        || p.expires_at_ms - p.issued_at_ms > 60_000
    {
        return Err("INVALID_INPUT".into());
    }
    if p.input_commitment != input_commitment(&request.private_inputs)?
        || p.policy_hash != hash("zk-mcp/policy/v1", &p.policy)?
    {
        return Err("COMMITMENT_MISMATCH".into());
    }
    Ok(())
}

/// Validate all commitments and bounds before evaluating the shared policy.
/// Time and revision come exclusively from the bound public statement.
pub fn evaluate_request(request: &ProveRequest) -> StatementResult<PolicyDecision> {
    validate_request(request)?;
    Ok(policy_engine_core::evaluate_at(
        &request.private_inputs.facts.as_policy_facts(),
        &request.public_inputs.policy,
        &ExecutionContext {
            at_ms: request.public_inputs.issued_at_ms,
            revision: Sha256::digest(request.public_inputs.context.head_sha.as_bytes()).into(),
        },
    ))
}

/// Public output committed by the guest. No witness or source facts are included.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Journal {
    pub spec_version: String,
    pub zkvm_backend: String,
    pub security_profile: String,
    pub elf_image_id: String,
    pub public_inputs_hash: String,
    pub public_outputs: PolicyDecision,
    pub timestamp: u64,
}

impl Journal {
    /// Extract the claimed journal for comparison with verified guest output.
    /// This extraction alone does not authenticate an envelope.
    pub fn from_envelope(envelope: &Envelope) -> Self {
        Self {
            spec_version: envelope.spec_version.clone(),
            zkvm_backend: envelope.zkvm_backend.clone(),
            security_profile: envelope.security_profile.clone(),
            elf_image_id: envelope.elf_image_id.clone(),
            public_inputs_hash: envelope.public_inputs_hash.clone(),
            public_outputs: envelope.public_outputs.clone(),
            timestamp: envelope.timestamp,
        }
    }
}

/// Produce the complete journal only after checking the request inside execution.
/// Backend, security profile and image identity must be pinned by each adapter,
/// never selected by the untrusted request.
pub fn journal_for(
    request: &ProveRequest,
    backend: &str,
    security_profile: &str,
    elf_image_id: &str,
) -> StatementResult<Journal> {
    let public_outputs = evaluate_request(request)?;
    Ok(Journal {
        spec_version: "1.0".into(),
        zkvm_backend: backend.into(),
        security_profile: security_profile.into(),
        elf_image_id: elf_image_id.into(),
        public_inputs_hash: hash("zk-mcp/public-inputs/v1", &request.public_inputs)?,
        public_outputs,
        timestamp: request.public_inputs.issued_at_ms,
    })
}
