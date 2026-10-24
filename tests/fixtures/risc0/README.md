# Public RISC Zero receipts

Two real CPU `Succinct` 3.0.6 proofs, generated on October 15, 2026 from
synthetic data and a signing authority whose test secret
is public. The format is `zk-agentik-risc0-lab/1`.

- `critical-proof.json`: historical authorizing decision.
- `denied-proof.json`: valid proof of a denial for emergency stop.
- `*-expected.json`: corresponding expected public challenges.
- `manifest.json`: digests, version and identities for reproduction.

The files include neither private facts nor commitment salt. The source
fixtures remain public elsewhere in the repository; this example therefore
does not demonstrate that an adversary could not know this data.

```bash
npm run lab:risc0 -- verify
```

The verifier is compiled with the expected guest image, then launched without network
with only its public files. A denied proof must produce
`POLICY_DENIED`, after cryptographic verification. The manifest
digests are descriptive; they replace neither the verifier nor an
independently administered trust registry.

Changing the guest image invalidates these receipts: preserve the provenance before
producing fixtures under a new image. None of these historical
challenges authorizes a current mutation. See
[the results and limits](../../../docs/08-RISC0-LAB-RESULTS.md).
