//! SEC-1 regression suite: statement and transcript binding of the verifier.
//!
//! Every case below targets `verify` with inputs that are structurally valid
//! (or deliberately malformed) and asserts the exact refusal code. The library
//! has no side effect; the zero-effect counters live in `tests/horizon`.
//! Passing these tests is not an external audit of the primitives (H15 open).
use super::*;

const NOW: u64 = 1_800_000_000_000;

fn authorize(f: &Fixture, p: &Presentation) -> Result<Verified> {
    verify(p, &f.challenge, &f.trust, &f.policy, NOW)
}

fn refusal(f: &Fixture, p: &Presentation) -> String {
    authorize(f, p)
        .expect_err("the verifier must refuse")
        .to_string()
}

fn holder(f: &Fixture) -> SigningKey {
    SigningKey::from_bytes(&decode(&f.holder_secret_hex).unwrap())
}

fn resign(f: &Fixture, p: &mut Presentation) {
    p.holder_signature_hex = signed(
        b"horizon/holder-authorization/v1",
        &holder_message(p).unwrap(),
        &holder(f),
    )
    .unwrap();
}

fn bound(f: &Fixture) -> Presentation {
    prove(&f.evidence, &f.witness, &f.holder_secret_hex, &f.challenge).unwrap()
}

fn blindings(f: &Fixture) -> (Scalar, Scalar) {
    (
        scalar(&f.witness.amount_blinding_hex).unwrap(),
        scalar(&f.witness.cap_blinding_hex).unwrap(),
    )
}

/// Upstream prover without this crate's layout, width or transcript choices.
fn upstream(
    generators: &BulletproofGens,
    pedersen: &PedersenGens,
    transcript: &mut Transcript,
    values: &[u64],
    blindings: &[Scalar],
    bits: usize,
) -> (Vec<u8>, Vec<CompressedRistretto>) {
    let (proof, commitments) = RangeProof::prove_multiple_with_rng(
        generators, pedersen, transcript, values, blindings, bits, &mut OsRng,
    )
    .expect("upstream prover accepts in-range values for its own layout");
    (proof.to_bytes(), commitments)
}

fn with_proof(f: &Fixture, bytes: &[u8]) -> Presentation {
    present(
        &f.evidence,
        Payload::ChallengeBound {
            proof_hex: hex::encode(bytes),
        },
        &f.holder_secret_hex,
        &f.challenge,
    )
    .unwrap()
}

fn set_proof(p: &mut Presentation, value: String) {
    match &mut p.payload {
        Payload::ChallengeBound { proof_hex } => *proof_hex = value,
        Payload::Reusable { prepared } => prepared.proof_hex = value,
        Payload::Disclosure { .. } => panic!("disclosure carries no proof"),
    }
}

fn proof_bytes(p: &Presentation) -> Vec<u8> {
    match &p.payload {
        Payload::ChallengeBound { proof_hex } => hex::decode(proof_hex).unwrap(),
        Payload::Reusable { prepared } => hex::decode(&prepared.proof_hex).unwrap(),
        Payload::Disclosure { .. } => panic!("disclosure carries no proof"),
    }
}

#[test]
fn foreign_profile_and_agent_selected_parameters_are_rejected() {
    let f = Fixture::generate(NOW).unwrap();
    let valid = bound(&f);
    assert!(authorize(&f, &valid).is_ok());

    // Presentation profile is compared before any cryptography.
    let mut p = valid.clone();
    p.profile = "horizon-range-v2".into();
    resign(&f, &mut p);
    assert_eq!(refusal(&f, &p), "PROFILE_MISMATCH");

    // Evidence profile/version/currency are fixed by the verifier, not negotiated.
    for (field, value) in [
        ("profile", serde_json::json!("horizon-range-v2")),
        ("version", serde_json::json!(2)),
        ("currency", serde_json::json!("USD")),
        ("exponent", serde_json::json!(0)),
    ] {
        let mut value_tree = serde_json::to_value(&valid).unwrap();
        value_tree["evidence"]["amount"]["body"][field] = value;
        let mut p: Presentation = serde_json::from_value(value_tree).unwrap();
        resign(&f, &mut p);
        assert_eq!(refusal(&f, &p), "EVIDENCE_PROFILE", "{field}");
    }

    // A presentation cannot carry its own registry, policy, key, backend or image.
    for field in [
        "trust",
        "policy",
        "verification_key",
        "backend_url",
        "image_id",
        "expected",
        "now_ms",
    ] {
        let mut value_tree = serde_json::to_value(&valid).unwrap();
        value_tree[field] = serde_json::json!({ "selected_by": "agent" });
        assert!(
            serde_json::from_value::<Presentation>(value_tree).is_err(),
            "{field}"
        );
    }
    // Nor can the payload or the challenge smuggle additional selectors.
    for path in [["payload", "generators"], ["challenge", "trust_registry"]] {
        let mut value_tree = serde_json::to_value(&valid).unwrap();
        value_tree[path[0]][path[1]] = serde_json::json!("agent");
        assert!(
            serde_json::from_value::<Presentation>(value_tree).is_err(),
            "{path:?}"
        );
    }
}

#[test]
fn transcript_mode_label_and_challenge_are_bound() {
    let mut f = Fixture::generate(NOW).unwrap();
    let challenge_bound = bound(&f);
    let prepared = prepare(&f.evidence, &f.witness).unwrap();

    // Reusable proof bytes (transcript mode "reusable") presented as challenge bound.
    let mut p = challenge_bound.clone();
    set_proof(&mut p, prepared.proof_hex.clone());
    resign(&f, &mut p);
    assert_eq!(refusal(&f, &p), "INVALID_RANGE_PROOF");

    // Reusable payload while the verifier expects a challenge-bound proof.
    let mut p = challenge_bound.clone();
    p.payload = Payload::Reusable {
        prepared: prepared.clone(),
    };
    resign(&f, &mut p);
    assert_eq!(refusal(&f, &p), "METHOD_MISMATCH");

    // A correct opening disclosed under a private policy is not a fallback.
    let mut p = challenge_bound.clone();
    p.payload = Payload::Disclosure {
        witness: f.witness.clone(),
    };
    resign(&f, &mut p);
    assert_eq!(refusal(&f, &p), "METHOD_MISMATCH");

    // Challenge-bound proof bytes presented as a reusable proof with a correct hash.
    let bytes = proof_bytes(&challenge_bound);
    f.challenge.method = Method::Reusable;
    let mut p =
        present_reusable(&f.evidence, &prepared, &f.holder_secret_hex, &f.challenge).unwrap();
    assert!(authorize(&f, &p).is_ok());
    set_proof(&mut p, hex::encode(&bytes));
    resign(&f, &mut p);
    assert_eq!(refusal(&f, &p), "INVALID_RANGE_PROOF");
    f.challenge.method = Method::ChallengeBound;

    // Same messages under a different transcript label: the domain is part of the statement.
    let (a, c) = blindings(&f);
    let values = [f.witness.amount - 1, f.witness.cap - f.witness.amount];
    let mut foreign = Transcript::new(b"horizon-range-v2");
    foreign.append_message(
        b"evidence",
        &message(b"horizon/evidence-pair/v1", &f.evidence).unwrap(),
    );
    foreign.append_message(b"mode", b"challenge_bound");
    foreign.append_message(
        b"challenge",
        &message(b"horizon/challenge/v1", &f.challenge).unwrap(),
    );
    let (bytes, _) = upstream(
        bulletproof_generators(),
        pedersen_generators(),
        &mut foreign,
        &values,
        &[a, c - a],
        32,
    );
    assert_eq!(refusal(&f, &with_proof(&f, &bytes)), "INVALID_RANGE_PROOF");

    // Correct label, evidence message bound under a foreign domain string.
    let mut relabeled = Transcript::new(b"horizon-range-v1");
    relabeled.append_message(
        b"evidence",
        &message(b"horizon/evidence-pair/v2", &f.evidence).unwrap(),
    );
    relabeled.append_message(b"mode", b"challenge_bound");
    relabeled.append_message(
        b"challenge",
        &message(b"horizon/challenge/v1", &f.challenge).unwrap(),
    );
    let (bytes, _) = upstream(
        bulletproof_generators(),
        pedersen_generators(),
        &mut relabeled,
        &values,
        &[a, c - a],
        32,
    );
    assert_eq!(refusal(&f, &with_proof(&f, &bytes)), "INVALID_RANGE_PROOF");

    // Positive control: the same upstream call with this crate's transcript is accepted.
    let (bytes, derived) = upstream(
        bulletproof_generators(),
        pedersen_generators(),
        &mut transcript(&f.evidence, Some(&f.challenge)).unwrap(),
        &values,
        &[a, c - a],
        32,
    );
    assert_eq!(derived.as_slice(), commitments(&f.evidence).unwrap());
    assert!(authorize(&f, &with_proof(&f, &bytes)).is_ok());
}

#[test]
fn commitment_layout_is_derived_by_the_verifier_not_chosen_by_the_prover() {
    let f = Fixture::generate(NOW).unwrap();
    let (a, c) = blindings(&f);
    let amount = f.witness.amount;
    let cap = f.witness.cap;
    let pedersen = pedersen_generators();
    let fresh = || transcript(&f.evidence, Some(&f.challenge)).unwrap();

    // Each layout is a sound range proof over ITS OWN commitments (upstream check),
    // yet the verifier only accepts the derived layout [A - G, C - A].
    let layouts: [(&str, [u64; 2], [Scalar; 2]); 3] = [
        ("unshifted [A, C]", [amount, cap], [a, c]),
        (
            "swapped [C - A, A - G]",
            [cap - amount, amount - 1],
            [c - a, a],
        ),
        ("half-shifted [A - G, C]", [amount - 1, cap], [a, c]),
    ];
    for (name, values, blinds) in layouts {
        let (bytes, own) = upstream(
            bulletproof_generators(),
            pedersen,
            &mut fresh(),
            &values,
            &blinds,
            32,
        );
        assert_ne!(own.as_slice(), commitments(&f.evidence).unwrap(), "{name}");
        assert!(
            RangeProof::from_bytes(&bytes)
                .unwrap()
                .verify_multiple_with_rng(
                    bulletproof_generators(),
                    pedersen,
                    &mut fresh(),
                    &own,
                    32,
                    &mut OsRng,
                )
                .is_ok(),
            "{name}: upstream accepts its own layout"
        );
        assert_eq!(
            refusal(&f, &with_proof(&f, &bytes)),
            "INVALID_RANGE_PROOF",
            "{name}"
        );
    }

    // Swapped Pedersen bases: the prover cannot pick the generators.
    let swapped = PedersenGens {
        B: pedersen.B_blinding,
        B_blinding: pedersen.B,
    };
    let (bytes, _) = upstream(
        bulletproof_generators(),
        &swapped,
        &mut fresh(),
        &[amount - 1, cap - amount],
        &[a, c - a],
        32,
    );
    assert_eq!(refusal(&f, &with_proof(&f, &bytes)), "INVALID_RANGE_PROOF");

    // Width and arity are pinned by the 672-byte encoding: a 64-bit proof, a
    // single-commitment proof and a four-commitment proof are refused before
    // any algebra, even when their values are in range.
    let wide = BulletproofGens::new(64, 4);
    // (name, values, blindings, bit width, serialized proof length)
    type Shape<'a> = (&'a str, Vec<u64>, Vec<Scalar>, usize, usize);
    let cases: [Shape; 3] = [
        (
            "64-bit",
            vec![amount - 1, cap - amount],
            vec![a, c - a],
            64,
            736,
        ),
        ("single", vec![amount - 1], vec![a], 32, 608),
        (
            "four",
            vec![amount - 1, cap - amount, amount - 1, cap - amount],
            vec![a, c - a, a, c - a],
            32,
            736,
        ),
    ];
    for (name, values, blinds, bits, expected_len) in cases {
        let (bytes, _) = upstream(&wide, pedersen, &mut fresh(), &values, &blinds, bits);
        assert_eq!(bytes.len(), expected_len, "{name}");
        assert_eq!(
            refusal(&f, &with_proof(&f, &bytes)),
            "PROOF_LENGTH",
            "{name}"
        );
    }
    // A 64-bit proof would accept a difference of exactly 2^32; the profile refuses it.
    let out = Fixture::with_values(NOW, 1, RANGE + 1).unwrap();
    let (oa, oc) = blindings(&out);
    let (bytes, _) = upstream(
        &wide,
        pedersen,
        &mut transcript(&out.evidence, Some(&out.challenge)).unwrap(),
        &[0, RANGE],
        &[oa, oc - oa],
        64,
    );
    assert_eq!(refusal(&out, &with_proof(&out, &bytes)), "PROOF_LENGTH");

    // Same 672-byte length, different (n, m): the encoding alone does not pin the
    // shape. The verifier's fixed n = 32, m = 2 (Merlin domain separation and the
    // two derived commitments) must refuse (64, 1), (16, 4) and (8, 8) algebraically.
    let small = Fixture::with_values(NOW, 100, 150).unwrap();
    let (sa, sc) = blindings(&small);
    let (va, vc) = (
        small.witness.amount - 1,
        small.witness.cap - small.witness.amount,
    );
    let shapes = BulletproofGens::new(64, 8);
    let same_length: [Shape; 3] = [
        ("(64, 1) over [A - G]", vec![va], vec![sa], 64, 672),
        (
            "(16, 4) two copies",
            vec![va, vc, va, vc],
            vec![sa, sc - sa, sa, sc - sa],
            16,
            672,
        ),
        (
            "(8, 8) four copies",
            vec![va, vc, va, vc, va, vc, va, vc],
            vec![sa, sc - sa, sa, sc - sa, sa, sc - sa, sa, sc - sa],
            8,
            672,
        ),
    ];
    for (name, values, blinds, bits, expected_len) in same_length {
        let (bytes, _) = upstream(
            &shapes,
            pedersen,
            &mut transcript(&small.evidence, Some(&small.challenge)).unwrap(),
            &values,
            &blinds,
            bits,
        );
        assert_eq!(bytes.len(), expected_len, "{name}");
        assert_eq!(
            refusal(&small, &with_proof(&small, &bytes)),
            "INVALID_RANGE_PROOF",
            "{name}"
        );
    }
    assert!(authorize(&small, &bound(&small)).is_ok());
}

#[test]
fn wrong_trusted_verifier_parameters_are_rejected() {
    let f = Fixture::generate(NOW).unwrap();
    let p = bound(&f);
    let at = |trust: &TrustRegistry, policy: &VerificationPolicy, now: u64| {
        verify(&p, &f.challenge, trust, policy, now)
            .expect_err("the verifier must refuse")
            .to_string()
    };

    // Registry: swapped keys, swapped names, one authority, holder as authority, weak keys.
    let mut trust = f.trust.clone();
    std::mem::swap(
        &mut trust.amount_issuer.public_key_hex,
        &mut trust.cap_issuer.public_key_hex,
    );
    assert_eq!(at(&trust, &f.policy, NOW), "INVALID_SIGNATURE");
    let mut trust = f.trust.clone();
    std::mem::swap(
        &mut trust.amount_issuer.issuer,
        &mut trust.cap_issuer.issuer,
    );
    assert_eq!(at(&trust, &f.policy, NOW), "UNKNOWN_ISSUER");
    let mut trust = f.trust.clone();
    trust.cap_issuer = trust.amount_issuer.clone();
    assert_eq!(at(&trust, &f.policy, NOW), "DISTINCT_AUTHORITIES_REQUIRED");
    let mut trust = f.trust.clone();
    trust.cap_issuer.public_key_hex = trust.amount_issuer.public_key_hex.clone();
    assert_eq!(at(&trust, &f.policy, NOW), "DISTINCT_AUTHORITIES_REQUIRED");
    let mut trust = f.trust.clone();
    trust.amount_issuer.public_key_hex = f.evidence.amount.body.holder_public_key_hex.clone();
    assert_eq!(at(&trust, &f.policy, NOW), "INVALID_SIGNATURE");
    for weak in ["00".repeat(32), format!("01{}", "00".repeat(31))] {
        let mut trust = f.trust.clone();
        trust.amount_issuer.public_key_hex = weak;
        assert_eq!(at(&trust, &f.policy, NOW), "WEAK_KEY");
    }
    let mut trust = f.trust.clone();
    trust.amount_issuer.public_key_hex = "ff".repeat(32);
    assert_eq!(at(&trust, &f.policy, NOW), "INVALID_SIGNATURE");

    // Self-attestation: both bodies re-signed by the holder, true registry.
    let mut self_issued = p.clone();
    for signed_evidence in [
        &mut self_issued.evidence.amount,
        &mut self_issued.evidence.cap,
    ] {
        signed_evidence.signature_hex = signed(
            b"horizon/issuer-attestation/v1",
            &signed_evidence.body,
            &holder(&f),
        )
        .unwrap();
    }
    resign(&f, &mut self_issued);
    assert_eq!(refusal(&f, &self_issued), "INVALID_SIGNATURE");

    // Policy: identifier, TTL budget and epoch are the verifier's, not the challenge's.
    let mut policy = f.policy.clone();
    policy.policy_id = "claim-range-v2".into();
    assert_eq!(at(&f.trust, &policy, NOW), "POLICY_MISMATCH");
    let ttl = f.challenge.expires_at_ms - f.challenge.issued_at_ms;
    for budget in [0, ttl - 1] {
        let mut policy = f.policy.clone();
        policy.max_challenge_ttl_ms = budget;
        assert_eq!(at(&f.trust, &policy, NOW), "CHALLENGE_TTL");
    }
    let mut policy = f.policy.clone();
    policy.policy_epoch += 1;
    assert_eq!(at(&f.trust, &policy, NOW), "POLICY_MISMATCH");
    let mut trust = f.trust.clone();
    trust.epoch += 1;
    assert_eq!(at(&trust, &f.policy, NOW), "TRUST_EPOCH_MISMATCH");

    // Clock: the evidence window is checked at the verifier's time, not the holder's.
    let mut g = Fixture::generate(NOW).unwrap();
    g.policy.max_challenge_ttl_ms = 8_000_000;
    g.challenge.issued_at_ms = NOW - 1_000;
    g.challenge.expires_at_ms = g.evidence.amount.body.valid_until_ms + 1_000;
    let q = bound(&g);
    assert!(verify(&q, &g.challenge, &g.trust, &g.policy, NOW).is_ok());
    for now in [NOW - 1, g.evidence.amount.body.valid_until_ms] {
        assert_eq!(
            verify(&q, &g.challenge, &g.trust, &g.policy, now)
                .expect_err("outside the evidence window")
                .to_string(),
            "EVIDENCE_EXPIRED"
        );
    }
}

#[test]
fn malformed_proofs_are_refused_without_authorizing() {
    let f = Fixture::generate(NOW).unwrap();
    let valid = bound(&f);
    let bytes = proof_bytes(&valid);
    assert_eq!(bytes.len(), MAX_PROOF_BYTES);

    let mut non_canonical_scalar = bytes.clone();
    non_canonical_scalar[128..160].copy_from_slice(&[0xff; 32]); // t_x above the group order
    let mut non_canonical_point = bytes.clone();
    non_canonical_point[..32].copy_from_slice(&[0xff; 32]); // A is not a Ristretto encoding
    let mut truncated_hex = hex::encode(&bytes);
    truncated_hex.pop();
    // Exact messages; the last three come from the pinned hex 0.4.3 and bulletproofs 5.0.0.
    let cases: [(&str, String, &str); 9] = [
        ("empty", String::new(), "PROOF_LENGTH"),
        ("short", "ab".repeat(16), "PROOF_LENGTH"),
        ("odd length", truncated_hex, "PROOF_LENGTH"),
        ("one extra byte", hex::encode(&bytes) + "00", "PROOF_LENGTH"),
        (
            "uppercase",
            hex::encode(&bytes).to_uppercase(),
            "NONCANONICAL_HEX",
        ),
        (
            "non-hex",
            "zz".repeat(MAX_PROOF_BYTES),
            "Invalid character 'z' at position 0",
        ),
        (
            "all zero",
            "00".repeat(MAX_PROOF_BYTES),
            "INVALID_RANGE_PROOF",
        ),
        (
            "non-canonical scalar",
            hex::encode(&non_canonical_scalar),
            "Proof data could not be parsed.",
        ),
        (
            "non-canonical point",
            hex::encode(&non_canonical_point),
            "INVALID_RANGE_PROOF",
        ),
    ];
    for (name, proof_hex, code) in cases {
        let mut p = valid.clone();
        set_proof(&mut p, proof_hex);
        resign(&f, &mut p);
        assert_eq!(refusal(&f, &p), code, "{name}");
    }

    // Reusable: the prepared hash must name these exact attestations.
    let prepared = prepare(&f.evidence, &f.witness).unwrap();
    let mut g = f.clone();
    g.challenge.method = Method::Reusable;
    let mut p =
        present_reusable(&g.evidence, &prepared, &g.holder_secret_hex, &g.challenge).unwrap();
    if let Payload::Reusable { prepared } = &mut p.payload {
        prepared.evidence_hash = "00".repeat(32);
    }
    resign(&g, &mut p);
    assert_eq!(refusal(&g, &p), "PREPARED_EVIDENCE_MISMATCH");
}

#[test]
fn holder_signature_binds_payload_and_verified_names_only_the_expected_statement() {
    let mut f = Fixture::generate(NOW).unwrap();
    let first = bound(&f);
    f.challenge.nonce = "bb".repeat(32);
    let second = bound(&f);
    f.challenge.nonce = first.challenge.nonce.clone();

    // Without a fresh holder signature, any payload substitution is caught before the proof.
    let mut hybrid = first.clone();
    hybrid.payload = second.payload.clone();
    assert_eq!(refusal(&f, &hybrid), "INVALID_SIGNATURE");
    let mut hybrid = first.clone();
    hybrid.holder_signature_hex = second.holder_signature_hex.clone();
    assert_eq!(refusal(&f, &hybrid), "INVALID_SIGNATURE");

    // A holder signature under the issuer domain is not a holder authorization.
    let mut cross_domain = first.clone();
    cross_domain.holder_signature_hex = signed(
        b"horizon/issuer-attestation/v1",
        &holder_message(&cross_domain).unwrap(),
        &holder(&f),
    )
    .unwrap();
    assert_eq!(refusal(&f, &cross_domain), "INVALID_SIGNATURE");

    // Valid points substituted for the signed commitments reach the issuer signature
    // check and fail there: the amount commitment reused as cap, and the identity.
    for replacement in [
        first.evidence.amount.body.commitment_hex.clone(),
        "00".repeat(32),
    ] {
        assert!(point(&replacement).is_ok());
        let mut substituted = first.clone();
        substituted.evidence.cap.body.commitment_hex = replacement;
        resign(&f, &mut substituted);
        assert_eq!(refusal(&f, &substituted), "INVALID_SIGNATURE");
    }

    // Both bodies consistently renamed to another case: refused against the expected
    // subject before any signature is checked.
    let mut renamed = first.clone();
    renamed.evidence.amount.body.subject = "claim-002".into();
    renamed.evidence.cap.body.subject = "claim-002".into();
    resign(&f, &mut renamed);
    assert_eq!(refusal(&f, &renamed), "SUBJECT_MISMATCH");

    let verified = authorize(&f, &first).unwrap();
    assert_eq!(verified.bundle_hash, holder_message(&first).unwrap());
    assert_eq!(
        serde_json::to_value(&verified).unwrap(),
        serde_json::json!({
            "bundle_hash": verified.bundle_hash,
            "method": "challenge_bound",
            "tenant": f.challenge.tenant,
            "subject": f.challenge.subject,
            "operation_id": f.challenge.operation_id,
            "object_id": f.challenge.object_id,
            "not_before_ms": NOW,
            "expires_at_ms": f.challenge.expires_at_ms,
        })
    );
}
