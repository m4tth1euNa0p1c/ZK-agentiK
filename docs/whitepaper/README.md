# Horizon mathematical dossier

[Whitepaper PDF](whitepaper.pdf), [LaTeX source](whitepaper.tex),
[bibliography](references.bib), [executable checks](../../math/README.md).

The [circuit validation supplement](circuit-validation.pdf) develops
the relation, the bounds and the correlation of the oracles with the prover/verifier.
Its [LaTeX sources](circuit-validation.tex) and the [executable testbed](../experiments/circuit/README.md)
are kept separate from the historical manuscript.

The text distinguishes Pedersen's ideal hiding, its computational binding,
the argument of knowledge inherited from Bulletproofs, the integer bounds, the
composition with the signatures and the challenge, and the application
deduplication invariant. The opening argument requires authenticated sources in a
bounded integer domain: the mere existence of an opening would be insufficient.

The assumptions are explicit. The amounts are hidden from the verifier in A/B,
the metadata remains public and correlatable, B signs a historical proof,
and the controller does not prove a cumulative budget, a deductible or the truth of the
sources. This dossier claims neither novelty, nor a machine-checked formal proof, nor
post-quantum security, nor an equivalent task beating Vega. The
[separate](../experiments/gpu/) GPU dossier must be read with its own relation and its limits.

## Reproducing the PDF

At the root, PowerShell:

```powershell
docker build -t horizon-math-paper:local -f math/Dockerfile math
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g --mount "type=bind,source=$repoPath,target=/work" horizon-math-paper:local sh /work/docs/whitepaper/build.sh
```

Or POSIX shell:

```sh
docker build -t horizon-math-paper:local -f math/Dockerfile math
docker run --rm --network none --cpus 2 --memory 2g \
  --mount "type=bind,source=$PWD,target=/work" \
  horizon-math-paper:local sh /work/docs/whitepaper/build.sh
```

The compilation uses pdfLaTeX, BibTeX and then two further passes. It produces
`whitepaper.pdf`, extracts the text, renders all pages with Poppler and keeps
the logs in `build/` (ignored by Git). The PDF is a reading artifact: it
is neither signed nor timestamped by a third party. Its build date may change
at each compilation. The build must be followed by an inspection of the PNGs; an
error-free TeX output is not enough to qualify the rendering.

## Delivered validation

- **24 October 2026, English rebuild.** The LaTeX sources had been translated
  to English on 17 October while the committed PDFs were still the French
  builds. Both PDFs were rebuilt in the pinned image (image id and package
  versions recorded in `validation.json`): eight and five pages, no warning,
  error or `Overfull` box in the final passes. All thirteen Poppler PNG pages
  were inspected: English text, tables, equations, the boxed protocol diagram,
  bibliographic links and pagination legible, no overflow or residual French
  observed. Beyond the translation, the source changes are four wording fixes from an
  independent agent drift review (listed in `validation.json`) and the two
  `.bib` files: braces protect proper nouns (RangeProof, API, EdDSA, SQLite,
  GNU Octave, JSON) from BibTeX lowercasing and two MathWorks entries without
  a publication year print `n.d.`. No statement, number, date or citation
  target changed. The GitHub Actions `math` profile rebuilt the same sources
  on Linux without diagnostics; hashes are not compared across machines
  because pdfTeX embeds the build timestamp.
- **17 October 2026, French build (historical).** Eight-page PDF compiled;
  no warning or `Overfull` overrun in the final pass; the eight PNGs were
  inspected. Octave 7.3.0: arithmetic checks and finite model passed; no
  MATLAB execution claimed. See the dated reports under `math/results/`.
  The PDF skill helper was found and executed before writing; the rendering
  was produced with Poppler. The sealed manifests under `evidence/manifests/`
  reference that French PDF and are valid at their own `source.commit`.
- `validation.json` ties the current finding to specific PDFs and sources.
  Each finding is a visual review by an agent; no independent human review
  has been confirmed and no attestation is claimed.

## Sources and consultation scope

The primary sources were opened on October 17, 2026: Bulletproofs ePrint
(notice and 2022 Fiat-Shamir correction), Dalek 5.0.0 documentation and implementation
notes, RFC 9496 and 8032, Microsoft Vega paper and code, SQLite
documentation, Shor's paper, FIPS 204 and 205. Pedersen's publisher page gives the
bibliographic metadata of the volume published in 1992 (1991 conference); access
to the full chapter is not claimed. The algebraic derivations in the text
are developed explicitly and remain conditional on the primitives.

The CPU figures come from the local raw data already published in
`docs/horizon/BENCHMARK_RESULTS.json`. The Horizon quantiles and Criterion Vega
central estimates are identified as such; they are neither an SLA
nor a comparison of equivalent relations. FIPS 204/205 specify
signatures: substituting them for Ed25519 does not make Bulletproofs/Pedersen PQ.
