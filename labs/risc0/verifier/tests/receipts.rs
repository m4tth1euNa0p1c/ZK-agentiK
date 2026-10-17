//! Regression checks on saved real receipts: no prover, witness, clock or network.
use lab_verifier::{authorize_historical, import_receipt, verify_receipt};
use policy_statement::PublicInputs;
use risc0_zkvm::{FakeReceipt, InnerReceipt, Receipt, VerifierContext};

fn fixture(denied: bool) -> (Receipt, PublicInputs) {
    let (proof, expected): (&[u8], &[u8]) = if denied {
        (
            include_bytes!("../../../../tests/fixtures/risc0/denied-proof.json"),
            include_bytes!("../../../../tests/fixtures/risc0/denied-expected.json"),
        )
    } else {
        (
            include_bytes!("../../../../tests/fixtures/risc0/critical-proof.json"),
            include_bytes!("../../../../tests/fixtures/risc0/critical-expected.json"),
        )
    };
    (
        import_receipt(proof).expect("valid real fixture"),
        serde_json::from_slice(expected).expect("public challenge fixture"),
    )
}

#[test]
fn real_receipts_distinguish_proof_validity_from_business_authorization() {
    let (allowed, expected) = fixture(false);
    assert!(
        verify_receipt(&allowed, &expected)
            .unwrap()
            .public_outputs
            .allow
    );
    authorize_historical(&allowed, &expected).unwrap();

    let (denied, expected) = fixture(true);
    assert!(
        !verify_receipt(&denied, &expected)
            .unwrap()
            .public_outputs
            .allow
    );
    assert_eq!(
        authorize_historical(&denied, &expected)
            .unwrap_err()
            .to_string(),
        "POLICY_DENIED"
    );
}

#[test]
fn another_project_or_nonce_cannot_reuse_a_valid_receipt() {
    let (receipt, expected) = fixture(false);
    let mut project = expected.clone();
    project.context.project_id += 1;
    let mut nonce = expected;
    nonce.nonce.replace_range(0..1, "f");
    for changed in [project, nonce] {
        assert_eq!(
            verify_receipt(&receipt, &changed).unwrap_err().to_string(),
            "STATEMENT_MISMATCH"
        );
    }
}

#[test]
fn cryptographic_verifier_rejects_modified_seal_journal_and_wrong_image() {
    let (receipt, _) = fixture(false);
    let context = VerifierContext::default().with_dev_mode(false);
    let mut seal = receipt.clone();
    if let InnerReceipt::Succinct(proof) = &mut seal.inner {
        let middle = proof.seal.len() / 2;
        proof.seal[middle] ^= 1;
    } else {
        panic!("fixture must be succinct");
    }
    let mut journal = receipt.clone();
    journal.journal.bytes[0] ^= 1;
    for changed in [seal, journal] {
        assert!(changed
            .verify_with_context(&context, lab_methods::POLICY_PROOF_GUEST_ID)
            .is_err());
    }
    assert!(receipt.verify_with_context(&context, [0u32; 8]).is_err());
}

#[test]
fn fake_receipt_is_rejected_even_when_its_claim_and_journal_match() {
    let (receipt, expected) = fixture(false);
    let fake = Receipt::new(
        InnerReceipt::Fake(FakeReceipt::new(receipt.claim().unwrap())),
        receipt.journal.bytes,
    );
    assert_eq!(
        verify_receipt(&fake, &expected).unwrap_err().to_string(),
        "NON_SUCCINCT_RECEIPT"
    );
    assert!(fake
        .verify_with_context(
            &VerifierContext::default().with_dev_mode(false),
            lab_methods::POLICY_PROOF_GUEST_ID
        )
        .is_err());
}
