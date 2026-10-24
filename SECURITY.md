# Security and reporting

ZK-agentiK is an experimental laboratory. No version is currently declared
qualified to authorize payments, protect a critical platform or independently
satisfy a regulatory regime. Known results and assumptions are described in
the [threat model](docs/horizon/THREAT_MODEL.md),
the [internal review](docs/horizon/SECURITY_REVIEW.md) and
the [publication claims](docs/publication/CLAIMS.md).

## Private reporting

Use [Report a vulnerability](https://github.com/m4tth1euNa0p1c/ZK-agentic/security/advisories/new)
for private GitHub reporting. Its activation was verified through the GitHub API
on 17 October 2026. If this feature is subsequently unavailable, use a private
channel already established with the maintainer. Otherwise, a public issue may
request a private channel **without exploitable details or sensitive data**.
No contractual response time, bounty program or unverified contact address
is promised.

Provide the version/commit, configuration, prerequisites, impact, minimal
reproduction and expected behavior. Use synthetic fixtures; do not attach
secrets, customer data, real witnesses or tokens. Do not test a third-party
system or deployed service without its authorization.

## Priority review areas

- Verification before effects, complete context binding, controller-enforced
  policy, no caller-selected key or backend.
- Encodings, parsing, commitments, signatures, generators and transcript.
- Replay and concurrency for both nonce **and** business operation; revocation
  and deadlines after waits; recovery and the `UNKNOWN` state.
- Source authorities, factual truth, transfer of openings and keys.
- Tenant isolation, metadata/log leakage and locked dependencies.

Simulator mode discloses its witness and is not a ZK proof. The Horizon profile
uses classical assumptions, without a post-quantum guarantee.
A local SQLite transaction does not demonstrate exactly-once remote mutation.
An agent review does not replace an external cryptographic audit.

The maintainer must verify the private channel and its recipients before public
publication; do not add sensitive details to issues to compensate for the lack
of a channel.
