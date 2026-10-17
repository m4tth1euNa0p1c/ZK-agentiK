//! Portable statement boundary; native receipts are deliberately NOT ZK proofs.
use base64::{engine::general_purpose::STANDARD, Engine};
pub use policy_statement::{
    canonical_bytes, evaluate_request, hash, input_commitment, journal_for, validate_request,
    ActionContext, Envelope, Facts, Journal, PrivateInputs, ProveRequest, PublicInputs,
    StatementResult, MAX_SAFE_INTEGER,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAX_WIRE_BYTES: usize = 2 * 1024 * 1024;
pub type BridgeResult<T> = StatementResult<T>;

pub trait ZkVmBackend {
    fn name(&self) -> &'static str;
    fn image_id(&self) -> BridgeResult<String>;
    fn prove(&self, request: &ProveRequest) -> BridgeResult<Envelope>;
    /// Cryptographic/semantic verification only; gateway enforces freshness,
    /// trusted policy/image, expected action and atomic replay protection.
    fn verify(&self, envelope: &Envelope) -> BridgeResult<()>;
}

#[derive(Default)]
pub struct NativeSimulatorBackend;

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SimulationReceipt {
    private_inputs: PrivateInputs,
    statement_hash: String,
}

pub fn simulation_image_id() -> String {
    let mut h = Sha256::new();
    h.update(b"zk-mcp/simulation-source/v1\0");
    h.update(include_bytes!("../../policy-engine-core/src/lib.rs"));
    h.update(include_bytes!("../../policy-engine-core/src/critical.rs"));
    h.update(include_bytes!("../../policy-guest-riscv/src/lib.rs"));
    h.update(include_bytes!("../../policy-statement/src/lib.rs"));
    h.update(include_bytes!("lib.rs"));
    format!("sim-sha256:{:x}", h.finalize())
}

fn statement_hash(envelope: &Envelope) -> BridgeResult<String> {
    hash("zk-mcp/statement/v1", &Journal::from_envelope(envelope))
}

impl ZkVmBackend for NativeSimulatorBackend {
    fn name(&self) -> &'static str {
        "native-simulator"
    }
    fn image_id(&self) -> BridgeResult<String> {
        Ok(simulation_image_id())
    }
    fn prove(&self, request: &ProveRequest) -> BridgeResult<Envelope> {
        let journal = journal_for(request, self.name(), "simulation", &self.image_id()?)?;
        let mut envelope = Envelope {
            spec_version: journal.spec_version,
            zkvm_backend: journal.zkvm_backend,
            security_profile: journal.security_profile,
            elf_image_id: journal.elf_image_id,
            public_inputs_hash: journal.public_inputs_hash,
            public_inputs: request.public_inputs.clone(),
            public_outputs: journal.public_outputs,
            proof_bytes: String::new(),
            timestamp: journal.timestamp,
        };
        let receipt = SimulationReceipt {
            private_inputs: request.private_inputs.clone(),
            statement_hash: statement_hash(&envelope)?,
        };
        envelope.proof_bytes = STANDARD.encode(canonical_bytes(&receipt)?);
        Ok(envelope)
    }
    fn verify(&self, envelope: &Envelope) -> BridgeResult<()> {
        if envelope.spec_version != "1.0"
            || envelope.zkvm_backend != self.name()
            || envelope.security_profile != "simulation"
            || envelope.elf_image_id != self.image_id()?
            || envelope.timestamp != envelope.public_inputs.issued_at_ms
            || envelope.proof_bytes.len() > MAX_WIRE_BYTES
        {
            return Err("INVALID_ENVELOPE".into());
        }
        let bytes = STANDARD
            .decode(&envelope.proof_bytes)
            .map_err(|_| "INVALID_BASE64")?;
        if STANDARD.encode(&bytes) != envelope.proof_bytes {
            return Err("INVALID_BASE64".into());
        }
        let receipt: SimulationReceipt =
            serde_json::from_slice(&bytes).map_err(|_| "INVALID_RECEIPT")?;
        let expected = self.prove(&ProveRequest {
            public_inputs: envelope.public_inputs.clone(),
            private_inputs: receipt.private_inputs,
        })?;
        if expected != *envelope {
            return Err("INVALID_RECEIPT".into());
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
pub enum PlannedBackend {
    Sp1,
    Risc0,
    Magnetar,
}

impl ZkVmBackend for PlannedBackend {
    fn name(&self) -> &'static str {
        match self {
            Self::Sp1 => "sp1",
            Self::Risc0 => "risc0",
            Self::Magnetar => "magnetar",
        }
    }
    fn image_id(&self) -> BridgeResult<String> {
        Err(format!("BACKEND_UNAVAILABLE:{}", self.name()))
    }
    fn prove(&self, _: &ProveRequest) -> BridgeResult<Envelope> {
        Err(format!("BACKEND_UNAVAILABLE:{}", self.name()))
    }
    fn verify(&self, _: &Envelope) -> BridgeResult<()> {
        Err(format!("BACKEND_UNAVAILABLE:{}", self.name()))
    }
}
