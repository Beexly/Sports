# P6-03 Risk Assessment: Crypto/ZK Cluster (codex/sunday-frontier-maxforce-2026-07-05)

Read-only code review. All file:line citations are from the R&D branch via
`git show codex/sunday-frontier-maxforce-2026-07-05:...`. No integration attempted.

## 1. Scope reviewed

`packages/crypto/` — new workspace package `@sports/crypto` (v1.0.0).
Three source files + one test file:
- `packages/crypto/src/index.ts` — barrel re-exports (no logic)
- `packages/crypto/src/pedersen-ledger.ts` — secp256k1 Pedersen commitments
- `packages/crypto/src/__tests__/pedersen-ledger.test.ts` — 12 tests
- `packages/crypto/package.json` — deps: `@noble/curves@^2.2.0`, `@noble/hashes@^2.2.0`

Companion files cross-referenced (NOT modified):
- `packages/prediction-engine/src/pedersen-ledger.ts` — finite-field demonstrator
- `packages/prediction-engine/src/calibration-commitment.ts` — tamper-evident
  calibration receipt (ZK-dump salvage)
- `packages/prediction-engine/src/proof-of-record.ts` — SHA-256 Merkle slate layer
- `packages/crypto/tsconfig.json` — extends `../../tsconfig.base.json`
- `package.json` (root workspace) — `workspaces: ["apps/*","packages/*","workers/*"]`

## 2. Architecture verdict: CORRECT DECISION

- `@sports/crypto` is the ONLY production sibling permitted the `@noble` dep
  (CODEX-HANDOFF-NGS-INTELLIGENCE.md:113). The zero-dep contract of
  `@sports/prediction-engine` is preserved by isolating `@noble` in its own
  package. The finite-field demonstrator stays in the engine as a pure-BigInt
  reference; the production-hardened secp256k1 version lives here. This is the
  swap the engine's own docstring names as the production path
  (prediction-engine/src/pedersen-ledger.ts:38-40).
- The crypto layer is strictly ADDITIVE to the SHA-256 Merkle layer
  (pedersen-ledger.ts:20-21); it never replaces `proof-of-record.ts`. Merkle
  remains the primary, hash-based tamper evidence; Pedersen adds homomorphic
  aggregate-verifiability. This matches the cluster's honest framing
  (ZK-ML-DUMP-EXTRACTION-LEDGER.md:500-510).
- `calibration-commitment.ts` correctly labels its ZK-shaped `proof` field as
  null and explicitly states it does NOT call the structure "ZK"
  (calibration-commitment.ts:39-43). This is the anti-overclaim the moat
  requires.

## 3. Security posture (per the module's own stated-claims discipline)

Hiding:
- PERFECTLY HIDE (info-theoretic) when blinding r is uniform in [0, n).
  The module is honest about the boundary: it REDUCES r into range but
  does NOT mint it — "the caller supplies r from a CSPRNG at the loader
  boundary; this pure core cannot mint it" (pedersen-ledger.ts:26-27).
  RISK-L: real CSPRNG sourcing is a CALLER responsibility that does not exist
  yet (no `commitPick`/`commitPickSlate` adapter shipped — OPUS-HANDOFF
  2026-07-03.md:94, Garrett rejected that adapter). The risk is real but
  OUTSIDE this module's surface; it materializes only when an adapter lands.

Binding:
- COMPUTATIONALLY BINDING under the secp256k1 discrete-log assumption
  (~128-bit). H is nothing-up-my-sleeve, derived by hash-and-increment from
  public seed "GSE-pedersen-h-secp256k1-v1" (pedersen-ledger.ts:49-58).
  Counter result re-derived byte-for-byte; `verifyGroup()` asserts it
  (ledger-ledger.ts:60-66). No recited constant — self-checking.

Side channels:
- @noble scalar-mul is constant-time (pedersen-ledger.ts:31). No
  secret-dependent branches in this module. Commit path processes the secret
  blinding, so the module's own doc advises running commitment generation
  off an adversary's clock (pedersen-ledger.ts:34). This is a residual
  RISK-L, properly documented.

Quantum:
- NOT POST-QUANTUM (DLOG falls to Shor). Explicitly framed as additive only
  (pedersen-ledger.ts:36). Correct.

## 4. Defects found and their resolution status

All defects below are from the EXTERNAL GROK DRAFT and were ALREADY FIXED in
this branch. Each fix is pinned by a regression test. (Source: ZK-ML-DUMP-
EXTRACTION-LEDGER.md:503-509, commit fe89dd7f message.)

| # | Defect in Grok draft | Resolution in this branch | Evidence |
|---|---|---|---|
| 1 | Wrong `@noble` v2 import paths (`@noble/curves/secp256k1` without `.js`) | Fixed: `@noble/curves/secp256k1.js` + `@noble/hashes/sha2.js` + `@noble/hashes/utils.js` | pedersen-ledger.ts:76-78 |
| 2 | `secp256k1.CURVE.n` / `.CURVE.p` (CURVE is undefined v2) | Fixed: `Point.Fn.ORDER` | pedersen-ledger.ts:64 |
| 3 | **Load-bearing:** `G.multiply(0n)` THROWS "invalid scalar: out of range"; `encodeFixedPoint(-1)=0` is the most common pick outcome (full-stake loss) | Fixed: zero-safe `mul()` maps [0]P -> identity O | pedersen-ledger.ts:69-73; test pedersen-ledger.test.ts:29-36 |
| 4 | "11 of 13... 1M attacks all passed / 100% coverage" unverified | 500-attempt forgery loop, 0 openings, REAL execution (not `expect(=>fn())` no-op) | pedersen-ledger.test.ts:120-131 |
| 5 | Benchmark "commit 0.3-0.6ms" recited | Measured ~3.5ms; commit ~3.5ms, add ~0.30ms, fold-100 ~10.4ms, verify-100 ~14.4ms (actual runs) | pedersen-ledger.ts:22-25 |
| 6 | `Point.toHex(true)` (v2 takes no boolean) | Not used; `pointToCommitment` guards identity -> null | pedersen-ledger.ts:93-97 |
| 7 | COMMIT path uses non-constant-time modPow (finite-field engine) | Addressed by moving production to audited constant-time @noble; engine stays the demonstrator | prediction-engine/src/pedersen-ledger.ts:35-38 |

## 5. Residual risks (honest, no overclaim)

RISK-L (low, contained in this branch):
- Blinding randomness is a CALLER responsibility; no CSPRNG-minting adapter
  exists in this branch. Risk is zero until an adapter lands.
  (pedersen-ledger.ts:26-27, 38)

RISK-L:
- `commit(0n, 0n)` returns `null`, not O — correct group-theory (identity has
  no compressed hex), but a downstream consumer that does not null-check will
  get `undefined` on degenerate input. The module is null-on-data per spec;
  callers must respect it. (pedersen-ledger.ts:88-97, test:63-68)

RISK-M (medium, forward-looking — NOT a defect in this branch):
- The public RO claim surface (`apps/web/lib/performance/public-roi-policy.ts`)
  was NOT reviewed in depth here. If a Pedersen/HKDF-derived public number is
  ever cited there without the module's null/canonicalization guards, the
  legal-artifact discipline breaks. RECOMMEND: any future PR touching that file
  must cite the actual `@sports/crypto` function + a concrete commitment hash,
  not a prose claim. (public-roi-policy.ts is a legal artifact per OPUS-HANDOFF
  2026-07-01.md:94-95.)

RISK-INFO:
- `@sports/crypto` is NOT yet wired into any consumer. `git grep
  '@sports/crypto|packages/crypto'` across the branch finds references ONLY in
  handoff docs and package-lock (CODEX-HANDOFF-NGS-INTELLIGENCE.md:113,
  OPUS-HANDOFF-2026-07-03.md:37, ZK-ML-DUMP-EXTRACTION-LEDGER.md:504,
  package-lock.json:11727). There is NO runtime import of `@sports/crypto` from
  `apps/*` or `workers/*`. The package is DARK / R&D. This is correct for a
  risk-assessment pass but means there is ZERO production exposure to validate
  against. Recommend: before any integration, run the full `npm test` workspace
  suite + a dedicated `@sports/crypto` typecheck under its tsconfig.

## 6. Test status
- 12 tests claimed green against the corrected module (fe89dd7f commit
  message: "12 tests green, tsc clean"). Tests pin: correct v2 imports,
  zero-safe commit, exact homomorphism, HIDING (distinct blindings -> distinct
  commitments), binding (500-attempt forgery loop -> 0 opens), tamper rejection,
  and the two identity-sum regressions. (pedersen-ledger.test.ts:1-145)
- Could NOT execute `npm test` in this run: the task is read-only and
  `packages/crypto` is a NEW workspace package whose `@noble` dependency is
  recorded in package-lock but whose integration into the root monorepo's
  `npm install` gate is unverified. Running install in a temp worktree was
  out of scope for THIS task (P6-03 is read-only; P6-01/P6-02 cover install
  hardening). Flag for the integration step.

## 7. Recommendation
- STATUS: APPROVED as a read-only risk pass. No changes required in this
  branch — every Grok-draft defect is fixed and pinned by regression tests.
- The cluster is architecturally sound: additive-only, dependency-isolated,
  honest about its quantum/sidecar limitations, and never overclaims ZK.
- Before integration (separate task): (a) wire `@sports/crypto` into a CSPRNG
  adapter before any production commitment, (b) run the workspace test suite
  + `tsc --noEmit` to confirm package-lock / tsconfig.base resolution,
  (c) audit any RO claim in `public-roi-policy.ts` that references a Pedersen
  output against the module's null/canonicalization contract.

No files modified. No commit. Read-only complete.

— P6-03 risk assessment, 2026-08-15
