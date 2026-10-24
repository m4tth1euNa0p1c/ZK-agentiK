# Evidence register

`catalog.json` associates each assertion with a relation, a status, its limits,
its primary sources and public artifacts. Read the limits before the figures.

The SHA-256 manifests created by [Proofkit](../tools/proofkit/README.md) verify
those bytes only. A hash is neither a ZK proof, nor a proof of date, nor a
scientific review. Local dates remain explicitly unattested.

Private data, unreviewed logs, caches and local configurations are excluded.
The catalog retains negative results and undemonstrated hypotheses.
Historical benchmarks stay where they are and are not recomputed under
a new name to hide a regression.

Publication adds a dated manifest, produced in a clean checkout. To
verify an old version after the catalog has evolved, take a checkout
of the stated `source.commit` and copy the manifest to verify into it. Run
the verifier from a trusted environment. The declared commit is a
reproduction reference, without a signature attesting the declarant's identity.
Keep the old manifests; a new catalog requires a new manifest, not the
rewriting of an earlier result.
