use policy_statement::{
    canonical_bytes, evaluate_request, input_commitment, journal_for, Journal, ProveRequest,
};
use serde_json::{json, Value};

fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/policy-v1.json")).unwrap()
}

fn request() -> ProveRequest {
    serde_json::from_value(fixture()["request"].clone()).unwrap()
}

#[test]
fn public_journal_preserves_the_seven_field_wire_relation() {
    let fixture = fixture();
    let request = request();
    let image = format!("sha256:{}", "1".repeat(64));
    let journal = journal_for(&request, "risc0", "zk", &image).unwrap();
    let expected = json!({
        "spec_version": "1.0",
        "zkvm_backend": "risc0",
        "security_profile": "zk",
        "elf_image_id": image,
        "public_inputs_hash": fixture["expected"]["public_inputs_hash"],
        "public_outputs": fixture["expected"]["public_outputs"],
        "timestamp": request.public_inputs.issued_at_ms,
    });
    assert_eq!(
        canonical_bytes(&journal).unwrap(),
        canonical_bytes(&expected).unwrap()
    );
    let decoded: Journal = serde_json::from_value(expected.clone()).unwrap();
    assert_eq!(decoded, journal);
    let mut unexpected = expected;
    unexpected["private_inputs"] = fixture["request"]["private_inputs"].clone();
    assert!(serde_json::from_value::<Journal>(unexpected).is_err());
}

#[test]
fn journal_generation_cannot_skip_request_authentication() {
    let mut request = request();
    request.private_inputs.facts.approvals = 0;
    assert_eq!(
        evaluate_request(&request).unwrap_err(),
        "COMMITMENT_MISMATCH"
    );
    assert_eq!(
        journal_for(&request, "risc0", "zk", "pinned-image").unwrap_err(),
        "COMMITMENT_MISMATCH"
    );
    request.public_inputs.input_commitment = input_commitment(&request.private_inputs).unwrap();
    let journal = journal_for(&request, "risc0", "zk", "pinned-image").unwrap();
    assert!(!journal.public_outputs.allow);
    assert_eq!(journal.public_outputs.violations_mask, 8);
    request.public_inputs.policy.min_reviewers = 1;
    assert_eq!(
        journal_for(&request, "risc0", "zk", "pinned-image").unwrap_err(),
        "COMMITMENT_MISMATCH"
    );
}
