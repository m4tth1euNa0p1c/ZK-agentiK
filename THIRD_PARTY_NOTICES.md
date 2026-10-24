# Dependencies and third-party notices

Inventory status: 17 October 2026. Original code in this repository is under
the [MIT license](LICENSE). Third-party components retain their licenses. This
document identifies major components; **it is neither an exhaustive inventory
of transitive dependencies nor legal advice**.

The versions below were collected from manifests/lockfiles and installed
package metadata for this laboratory. Before redistributing a binary, container
or bundle, inventory that exact distribution and include the required license
texts, copyrights and any NOTICE files. A license URL does not replace inclusion
of the text when the license requires it.

| Component | Observed version | Declared license | Origin |
| --- | --- | --- | --- |
| MCP TypeScript SDK | 1.32.1 | MIT | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) |
| Zod | 4.6.7 | MIT | [colinhacks/zod](https://github.com/colinhacks/zod) |
| TypeScript | 5.9.3 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| Bulletproofs | 5.0.0 | MIT | [zkcrypto/bulletproofs](https://github.com/zkcrypto/bulletproofs) |
| curve25519-dalek | 4.1.3 | BSD-3-Clause | [dalek-cryptography](https://github.com/dalek-cryptography/curve25519-dalek) |
| ed25519-dalek | 2.2.0 | BSD-3-Clause | [dalek-cryptography](https://github.com/dalek-cryptography/curve25519-dalek) |
| Merlin | 3.0.0 | MIT | [zkcrypto/merlin](https://github.com/zkcrypto/merlin) |
| SHA-2 | 0.10.9 | MIT OR Apache-2.0 | [RustCrypto/hashes](https://github.com/RustCrypto/hashes) |
| Serde | 1.0.228 | MIT OR Apache-2.0 | [serde-rs/serde](https://github.com/serde-rs/serde) |
| serde_json | 1.0.149 | MIT OR Apache-2.0 | [serde-rs/json](https://github.com/serde-rs/json) |
| rand | 0.8.6 (current Horizon; 0.8.5 historical) | MIT OR Apache-2.0 | [rust-random/rand](https://github.com/rust-random/rand) |

“OR” denotes a choice declared by the component, not cumulative licenses.
Notices for transitive dependencies still need to be inventoried for each
redistributed artifact. Node/Rust/Debian images and build tools also contain
components with their own obligations.

## Comparison sources and RISC Zero laboratory

The Vega campaigns use an external checkout of
[microsoft/vega-prover](https://github.com/microsoft/vega-prover), revision
`c0ee259053cd12eaf43ed71b5cde375452b3ee4d`. The LICENSE file consulted states
MIT, copyright Microsoft Corporation. The local checkout is not included in
the repository; benchmark outputs imply no Microsoft endorsement and do not
represent a complete mDL credential proof.

The RISC Zero laboratory is a separate workspace. Licenses for its crates,
binaries and patches must be inventoried from its lockfile before redistribution;
the SHA-2 or Dalek entries above do not automatically cover RISC Zero forks.
The patch revisions used are recorded in the laboratory manifests and
the [stack dossier](docs/07-STACK-SECURITY-AND-PERFORMANCE.md).

Downloads of Bicep, Terraform and its provider used to validate `infra/`
remain in local caches; they are not bundled by this contribution. Their
licenses and terms apply to any redistribution. Cited documentation sources
remain their authors' work; the repository contains an attributed synthesis,
not a complete copy.

## Publication limitations

The full inventory, notices for final distributions and any data rights must
be checked in the [publication checklist](docs/publication/RELEASE_CHECKLIST.md).
This license review establishes neither the absence of patents nor freedom
to operate. The project's prior-art search is technical and bounded.
