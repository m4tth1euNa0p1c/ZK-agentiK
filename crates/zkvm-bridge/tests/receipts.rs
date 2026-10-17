use serde_json::Value;
use zkvm_bridge::{
    hash, input_commitment, NativeSimulatorBackend, PlannedBackend, ProveRequest, ZkVmBackend,
};

fn vector() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/policy-v1.json")).unwrap()
}
fn request() -> ProveRequest {
    serde_json::from_value(vector()["request"].clone()).unwrap()
}

#[test]
fn cross_language_commitment_vectors() {
    let v = vector();
    let req = request();
    assert_eq!(
        input_commitment(&req.private_inputs).unwrap(),
        v["expected"]["input_commitment"]
    );
    assert_eq!(
        hash("zk-mcp/policy/v1", &req.public_inputs.policy).unwrap(),
        v["expected"]["policy_hash"]
    );
    let receipt = NativeSimulatorBackend.prove(&req).unwrap();
    assert_eq!(
        receipt.public_inputs_hash,
        v["expected"]["public_inputs_hash"]
    );
    assert_eq!(
        serde_json::to_value(receipt.public_outputs).unwrap(),
        v["expected"]["public_outputs"]
    );
}

#[test]
fn roundtrip_and_determinism() {
    let backend = NativeSimulatorBackend;
    let receipt = backend.prove(&request()).unwrap();
    assert_eq!(receipt, backend.prove(&request()).unwrap());
    backend.verify(&receipt).unwrap();
}

#[test]
fn every_statement_field_is_bound() {
    let backend = NativeSimulatorBackend;
    let original = backend.prove(&request()).unwrap();
    let mut mutated = original.clone();
    mutated.public_outputs.allow = false;
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original.clone();
    mutated.public_inputs.context.project_id += 1;
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original.clone();
    mutated.timestamp += 1;
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original.clone();
    mutated.elf_image_id.push('a');
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original.clone();
    mutated.zkvm_backend = "magnetar".into();
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original.clone();
    mutated.security_profile = "zk".into();
    assert!(backend.verify(&mutated).is_err());
    let mut mutated = original;
    mutated.proof_bytes.replace_range(..4, "AAAA");
    assert!(backend.verify(&mutated).is_err());
}

#[test]
fn proof_of_denial_is_not_a_proof_of_allowance() {
    let mut req = request();
    req.private_inputs.facts.critical_vulnerabilities = 1;
    req.public_inputs.input_commitment = input_commitment(&req.private_inputs).unwrap();
    let receipt = NativeSimulatorBackend.prove(&req).unwrap();
    assert!(!receipt.public_outputs.allow);
    NativeSimulatorBackend.verify(&receipt).unwrap();
}

#[test]
fn rejects_unbound_witness_policy_and_bad_ranges() {
    let mut req = request();
    req.private_inputs.facts.approvals = 0;
    assert!(NativeSimulatorBackend.prove(&req).is_err());
    let mut req = request();
    req.public_inputs.policy.min_reviewers = 1;
    assert!(NativeSimulatorBackend.prove(&req).is_err());
    let mut req = request();
    req.public_inputs.expires_at_ms = u64::MAX;
    assert!(NativeSimulatorBackend.prove(&req).is_err());
    let mut req = request();
    req.private_inputs.salt = "00".into();
    assert!(NativeSimulatorBackend.prove(&req).is_err());
    let mut bad = vector()["request"].clone();
    bad["private_inputs"]["facts"]["approvals"] = (-1).into();
    assert!(serde_json::from_value::<ProveRequest>(bad).is_err());
    let mut bad = vector()["request"].clone();
    bad["private_inputs"]["facts"]["extra"] = true.into();
    assert!(serde_json::from_value::<ProveRequest>(bad).is_err());
}

#[test]
fn unimplemented_backends_cannot_authorize() {
    let req = request();
    let receipt = NativeSimulatorBackend.prove(&req).unwrap();
    for backend in [
        PlannedBackend::Sp1,
        PlannedBackend::Risc0,
        PlannedBackend::Magnetar,
    ] {
        assert!(backend.image_id().is_err());
        assert!(backend.prove(&req).is_err());
        assert!(backend.verify(&receipt).is_err());
    }
}

#[test]
fn ascii_control_statuses_match_typescript_rejections() {
    for status in ["OK\n", "APPROVED\t", "\0", "\u{7f}", "é"] {
        let mut req = request();
        req.private_inputs.facts.jira_status = status.into();
        req.public_inputs.input_commitment = input_commitment(&req.private_inputs).unwrap();
        assert!(NativeSimulatorBackend.prove(&req).is_err());
    }
}
