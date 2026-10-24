# Experimental Proofkit SDK

`@m4tth1euna0p1c/proofkit-sdk` **0.1.0-alpha.1** provides `defineVerifiedTool` to expose a tool
over HTTP, MCP or another transport, with the same verification-then-authorization
path. It is consumed by the [Horizon profile](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/packages/horizon-demo/src/tool.ts)
and its real-proof demonstration. This laboratory prerelease is not qualified
for sensitive use; its API may change without compatibility.
The SDK distributes ESM JavaScript and TypeScript declarations, without a proof
engine or native binary. It depends on Zod 4.6.7, installed separately by npm.

## Install the prerelease

Node.js **24.11 or later** is required. The commands below use the exact version;
they assume it is available in
[release v0.1.0-alpha.1](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/releases/tag/v0.1.0-alpha.1).
The tag and release must have been published; this README does not prove their availability.

The tarball attached to the public release installs without a GitHub account or token:

```sh
npm install https://github.com/m4tth1euNa0p1c/ZP3ntiProof/releases/download/v0.1.0-alpha.1/m4tth1euna0p1c-proofkit-sdk-0.1.0-alpha.1.tgz
```

The same version may be distributed through **GitHub Packages**. This registry
requires authentication even for a public package. Use a **classic** personal
access token with `read:packages` and package access when entering the password
interactively; do not save this token in the repository.
See the [GitHub Packages instructions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

```sh
npm login --scope=@m4tth1euna0p1c --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @m4tth1euna0p1c/proofkit-sdk@0.1.0-alpha.1
```

To configure a consumer explicitly, its `.npmrc` may contain only the following
registry mapping, without a secret:

```ini
@m4tth1euna0p1c:registry=https://npm.pkg.github.com
```

## Use the contract

```ts
import { defineVerifiedTool } from '@m4tth1euna0p1c/proofkit-sdk';

const tool = defineVerifiedTool({
  name: 'record_claim_authorization',
  profile: 'horizon-range-v1',
  evidenceKind: 'zk',
  environment: 'sandbox',
  input: inputSchema,
  challenge: challengeSchema,
  verified: verifiedSchema,
  authority: {
    issue: input => challengeStore.issue(input),
    expected: nonce => challengeStore.expected(nonce),
    verify: (presentation, expected) => trustedVerifier.verify(presentation, expected),
    authorize: (expected, verified) => durableController.authorize(expected, verified),
  },
});
const challenge = await tool.issue({});
// The prover receives the challenge and produces a presentation; its secrets stay with it.
const result = await tool.execute({ nonce: challenge.nonce, presentation });
```

This snippet illustrates the contract; its adapters must be supplied. The full
compiled example is in the [Horizon profile](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/packages/horizon-demo/src/tool.ts).
The following commands run from a repository checkout at tag
`v0.1.0-alpha.1`, not from the installed package:

```sh
npm ci --ignore-scripts
npm run horizon:build
npm run horizon:demo
npm run test:proofkit
npm run release:check
```

## SDK guarantees and adapter obligations

The SDK bounds and copies JSON inputs, enforces their schemas, retains adapters
registered at startup and retrieves expectations server-side.
It rechecks timestamps after awaiting verification, prohibits simulation in
production mode and never retries mutations. The caller supplies neither a
verified verdict, a policy, a verifier URL nor a trust key.

**Cryptographic security comes from the profile; atomicity comes from the controller.**
`verify` must verify the entire relation and compare its statement with expectations.
`authorize` must recheck revocations and timestamps at the point of effect,
durably reserve nonce and operation independently, enforce target preconditions
and preserve `UNKNOWN`. A boolean returned by an arbitrary adapter does not
become a proof merely because it passed through the SDK. Types do not prove an
adapter's correctness; the profile's negative tests are mandatory.

The helper provides neither user authentication, mTLS, a universal circuit nor
a distributed transaction. The host and its adapters are within the trust
boundary. The only integrated profile here records a synthetic SQLite action;
credentials for a real target must remain in the controller.
An `evidenceKind` descriptor is not a certification.

## Add a business tool

1. Establish the control owner, units, bounds, accepted sources, public/private
   data and signed alternative. Use the [H11 protocol](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/docs/horizon/REVIEW_PROTOCOL.md).
2. Define an explicit relation and a distinct profile identifier. A policy
   change cannot be a mere text edit around the existing proof: the verifier
   must check the new relation.
3. Implement the four adapters with roots and policy fixed server-side.
4. Test false proofs, wrong context/tenant, expiration after waiting, two nonces
   for one operation, concurrency, restart, revocation and ambiguous results
   while checking the external-effect counter.
5. Record code, versions, commands, dated results and limitations with Proofkit.

The nine SDK test groups use an explicitly marked simulation adapter to test
the contract. Horizon tests and the demo use the same helper with real
Bulletproofs and SQLite. These forms of evidence must remain distinct.

## Real MCP example

After `npm run horizon:build`, the official MCP server reads only public
configuration and a dedicated database:

```sh
node packages/horizon-demo/dist/mcp-stdio.js <public.json> <dedicated-sandbox.sqlite>
```

It exposes `horizon_issue_challenge` and `horizon_authorize_claim`. The client
must obtain the presentation from the supplier; this server loads no witness
or signing secret. The `tests/horizon/mcp.test.ts` tests connect an official
MCP client, generate a real proof in a separate worker and count effects for
tampering, acceptance and replay.
The Horizon presentation does not reuse the historical simulator's `_meta.zkp`
schema. See the [architecture](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/docs/horizon/ARCHITECTURE.md).

To record results and run available profiles, use
[Proofkit CLI](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/tools/proofkit/README.md). For secrets, IAM and multi-instance guarantees,
the [cloud foundations](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/docs/publication/CLOUD_COMPARISON.md)
describe outstanding decisions; they do not change the local example's guarantees.

## Distribution and license

The tarball contains `dist/*.js`, `dist/*.d.ts`, `package.json`, this README and
the project's MIT license. It contains no monorepo sources/tests, circuit, proof,
runtime data, bundled dependency or source map. Zod is a separate MIT dependency
whose license npm installs with the package; the SDK does not incorporate its
code. See also the
[repository notices](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/THIRD_PARTY_NOTICES.md)
and [security policy](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/blob/v0.1.0-alpha.1/SECURITY.md).

`npm run release:check` compiles the SDK, checks the exact packaged file list,
installs the tarball in a temporary consumer outside the monorepo, then verifies
the ESM import and TypeScript types. This check publishes no package.
`npm run release:check -- --out-dir release-dist` retains the validated tarball
in the specified directory. This check does not validate a consumer's proof
adapters, transport or deployment.
