use super::*;

const NOW: u64 = 1_800_000_000_000;

fn authorize(f: &Fixture, p: &Presentation) -> Result<Verified> {
    verify(p, &f.challenge, &f.trust, &f.policy, NOW)
}

fn resign(f: &Fixture, p: &mut Presentation) {
    let holder = SigningKey::from_bytes(&decode(&f.holder_secret_hex).unwrap());
    p.holder_signature_hex = signed(
        b"horizon/holder-authorization/v1",
        &holder_message(p).unwrap(),
        &holder,
    )
    .unwrap();
}

fn bound(f: &Fixture) -> Presentation {
    prove(&f.evidence, &f.witness, &f.holder_secret_hex, &f.challenge).unwrap()
}

#[test]
fn fresh_reusable_and_disclosure_use_same_evidence() {
    let mut f = Fixture::generate(NOW).unwrap();
    let p = bound(&f);
    assert!(authorize(&f, &p).is_ok());
    assert_eq!(authorize(&f, &p).unwrap().not_before_ms, NOW);
    let mut evidence_expiry = f.clone();
    evidence_expiry.challenge.expires_at_ms = f.evidence.amount.body.valid_until_ms + 1;
    evidence_expiry.policy.max_challenge_ttl_ms = 4_000_000;
    let expiry_proof = bound(&evidence_expiry);
    assert_eq!(
        authorize(&evidence_expiry, &expiry_proof)
            .unwrap()
            .expires_at_ms,
        f.evidence.amount.body.valid_until_ms
    );

    let prepared = prepare(&f.evidence, &f.witness).unwrap();
    assert_eq!(prepared.proof_hex.len(), 672 * 2);
    f.challenge.method = Method::Reusable;
    let reusable =
        present_reusable(&f.evidence, &prepared, &f.holder_secret_hex, &f.challenge).unwrap();
    assert!(authorize(&f, &reusable).is_ok());
    f.challenge.nonce = "ef".repeat(32);
    let second =
        present_reusable(&f.evidence, &prepared, &f.holder_secret_hex, &f.challenge).unwrap();
    assert!(authorize(&f, &second).is_ok());
    assert_ne!(reusable.holder_signature_hex, second.holder_signature_hex);
    if let Payload::Reusable { prepared: reused } = &second.payload {
        assert_eq!(reused, &prepared);
    } else {
        panic!("wrong payload");
    }
    assert!(authorize(&f, &reusable).is_err());

    f.challenge.method = Method::Disclosure;
    let disclosed = bound(&f);
    assert!(authorize(&f, &disclosed)
        .unwrap_err()
        .to_string()
        .contains("DISCLOSURE_FORBIDDEN"));
    f.policy.require_private = false;
    assert!(authorize(&f, &disclosed).is_ok());
    let verified = serde_json::to_string(&authorize(&f, &disclosed).unwrap()).unwrap();
    assert!(
        !verified.contains("blinding")
            && !verified.contains("holder_secret")
            && !verified.contains("amount")
    );
}

#[test]
fn integer_boundaries_match_relation_including_amount_two_power_32() {
    for (amount, cap) in [(1, 1), (RANGE, RANGE), (RANGE, 2 * RANGE - 1)] {
        let f = Fixture::with_values(NOW, amount, cap).unwrap();
        assert!(authorize(&f, &bound(&f)).is_ok(), "{amount}/{cap}");
    }
    for (amount, cap) in [
        (0, 0),
        (RANGE + 1, RANGE + 1),
        (5, 4),
        (1, RANGE + 1),
        (u64::MAX, u64::MAX),
    ] {
        let f = Fixture::with_values(NOW, amount, cap).unwrap();
        assert!(prove(&f.evidence, &f.witness, &f.holder_secret_hex, &f.challenge).is_err());
    }
}

#[test]
fn malicious_prover_cannot_bypass_native_range_preflight() {
    let f = Fixture::with_values(NOW, RANGE + 1, RANGE + 1).unwrap();
    let a = scalar(&f.witness.amount_blinding_hex).unwrap();
    let c = scalar(&f.witness.cap_blinding_hex).unwrap();
    // Invoke the upstream prover directly, bypassing our integer checks.
    let (proof, _) = RangeProof::prove_multiple_with_rng(
        &BulletproofGens::new(32, 2),
        &PedersenGens::default(),
        &mut transcript(&f.evidence, Some(&f.challenge)).unwrap(),
        &[RANGE, 0],
        &[a, c - a],
        32,
        &mut OsRng,
    )
    .expect("pinned upstream prover emits a candidate without our range preflight");
    let presentation = present(
        &f.evidence,
        Payload::ChallengeBound {
            proof_hex: hex::encode(proof.to_bytes()),
        },
        &f.holder_secret_hex,
        &f.challenge,
    )
    .unwrap();
    assert!(authorize(&f, &presentation)
        .unwrap_err()
        .to_string()
        .contains("INVALID_RANGE_PROOF"));
}

#[test]
fn exact_context_and_epochs_are_required() {
    let f = Fixture::generate(NOW).unwrap();
    let p = bound(&f);
    let updates: [fn(&mut Challenge); 12] = [
        |c| c.tenant.push('x'),
        |c| c.client_id.push('x'),
        |c| c.audience.push('x'),
        |c| c.operation_id.push('x'),
        |c| c.object_id.push('x'),
        |c| c.subject.push('x'),
        |c| c.action.push('x'),
        |c| c.policy_id.push('x'),
        |c| c.policy_epoch += 1,
        |c| c.trust_epoch += 1,
        |c| c.nonce = "aa".repeat(32),
        |c| c.expires_at_ms += 1,
    ];
    for update in updates {
        let mut wrong = f.challenge.clone();
        update(&mut wrong);
        assert!(verify(&p, &wrong, &f.trust, &f.policy, NOW)
            .unwrap_err()
            .to_string()
            .contains("CHALLENGE_MISMATCH"));
    }
    let mut policy = f.policy.clone();
    policy.policy_epoch += 1;
    assert!(verify(&p, &f.challenge, &f.trust, &policy, NOW).is_err());
    let mut trust = f.trust.clone();
    trust.epoch += 1;
    assert!(verify(&p, &f.challenge, &trust, &f.policy, NOW).is_err());
    assert!(verify(
        &p,
        &f.challenge,
        &f.trust,
        &f.policy,
        f.challenge.expires_at_ms
    )
    .is_err());
    assert!(verify(&p, &f.challenge, &f.trust, &f.policy, NOW - 1).is_err());
}

#[test]
fn challenge_bound_proof_cannot_be_transplanted_even_by_holder() {
    let mut f = Fixture::generate(NOW).unwrap();
    let mut p = bound(&f);
    f.challenge.nonce = "aa".repeat(32);
    p.challenge = f.challenge.clone();
    resign(&f, &mut p);
    assert!(authorize(&f, &p)
        .unwrap_err()
        .to_string()
        .contains("INVALID_RANGE_PROOF"));
}

#[test]
fn altered_proof_is_rejected_even_with_valid_fresh_holder_signature() {
    let f = Fixture::generate(NOW).unwrap();
    let mut p = bound(&f);
    if let Payload::ChallengeBound { proof_hex } = &mut p.payload {
        let mut bytes = hex::decode(proof_hex.as_str()).unwrap();
        // RangeProof v5: four compressed points, then the canonical t_x scalar.
        // Preserve all encodings, so the rejection must be algebraic.
        let original: [u8; 32] = bytes[128..160].try_into().unwrap();
        let changed =
            Option::<Scalar>::from(Scalar::from_canonical_bytes(original)).unwrap() + Scalar::ONE;
        bytes[128..160].copy_from_slice(&changed.to_bytes());
        assert!(RangeProof::from_bytes(&bytes).is_ok());
        *proof_hex = hex::encode(bytes);
    }
    resign(&f, &mut p);
    assert!(authorize(&f, &p)
        .unwrap_err()
        .to_string()
        .contains("INVALID_RANGE_PROOF"));
    if let Payload::ChallengeBound { proof_hex } = &mut p.payload {
        proof_hex.truncate(10);
    }
    resign(&f, &mut p);
    assert!(authorize(&f, &p)
        .unwrap_err()
        .to_string()
        .contains("PROOF_LENGTH"));
}

#[test]
fn issuer_holder_and_join_attacks_rejected() {
    let f = Fixture::generate(NOW).unwrap();
    let p = bound(&f);
    let mut forged = p.clone();
    forged.evidence.amount.signature_hex = "00".repeat(64);
    resign(&f, &mut forged);
    assert!(authorize(&f, &forged).is_err());
    let mut forged = p.clone();
    forged.holder_signature_hex = "00".repeat(64);
    assert!(authorize(&f, &forged).is_err());
    let mut forged = p.clone();
    std::mem::swap(&mut forged.evidence.amount, &mut forged.evidence.cap);
    resign(&f, &mut forged);
    assert!(authorize(&f, &forged).is_err());
    for field in [
        "subject",
        "tenant",
        "currency",
        "valid_until_ms",
        "commitment_hex",
    ] {
        let mut value = serde_json::to_value(&p).unwrap();
        value["evidence"]["cap"]["body"][field] = if field == "valid_until_ms" {
            serde_json::json!(NOW + 1)
        } else if field == "commitment_hex" {
            serde_json::json!("ff".repeat(32))
        } else {
            serde_json::json!("other")
        };
        let mut forged: Presentation = serde_json::from_value(value).unwrap();
        resign(&f, &mut forged);
        assert!(authorize(&f, &forged).is_err(), "{field}");
    }
    let another = Fixture::generate(NOW).unwrap();
    assert!(verify(&p, &f.challenge, &another.trust, &f.policy, NOW).is_err());
}

#[test]
fn policy_selection_never_silently_falls_back() {
    let mut f = Fixture::generate(NOW).unwrap();
    assert_eq!(select_method(&f.policy), Method::Reusable);
    f.policy.allow_reuse = false;
    assert_eq!(select_method(&f.policy), Method::ChallengeBound);
    let prepared = prepare(&f.evidence, &f.witness).unwrap();
    f.challenge.method = Method::Reusable;
    let p = present_reusable(&f.evidence, &prepared, &f.holder_secret_hex, &f.challenge).unwrap();
    assert!(authorize(&f, &p)
        .unwrap_err()
        .to_string()
        .contains("REUSE_FORBIDDEN"));
    f.policy.require_private = false;
    assert_eq!(select_method(&f.policy), Method::Disclosure);
    assert!(prove(&f.evidence, &f.witness, &f.holder_secret_hex, &f.challenge).is_err());
    let other = Fixture::generate(NOW).unwrap();
    assert!(present_reusable(
        &other.evidence,
        &prepared,
        &other.holder_secret_hex,
        &f.challenge
    )
    .is_err());
}

#[test]
fn invalid_openings_encodings_and_unknown_fields_rejected() {
    let mut f = Fixture::generate(NOW).unwrap();
    f.witness.amount_blinding_hex = "ff".repeat(32);
    assert!(prepare(&f.evidence, &f.witness)
        .unwrap_err()
        .to_string()
        .contains("NONCANONICAL_SCALAR"));
    f.witness.amount_blinding_hex = "00".repeat(32);
    assert!(prepare(&f.evidence, &f.witness).is_err());
    let mut value = serde_json::to_value(&f.challenge).unwrap();
    value["unexpected"] = serde_json::json!(true);
    assert!(serde_json::from_value::<Challenge>(value).is_err());
    assert!(decode::<32>(&"AA".repeat(32)).is_err());
    assert!(Fixture::generate(u64::MAX).is_err());
}
