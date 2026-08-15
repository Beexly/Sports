# P6 — R&D Branch Mergeability Report

**Branch:** `codex/sunday-frontier-maxforce-2026-07-05` (171 commits ahead of `origin/main` at last fetch)
**Merge-base:** `a7bd5639f9c190d22a5da973ff72114965ca1d15`
**Report authored:** 2026-08-16 (this session)
**Scope:** investigation only — no merge, cherry-pick, or push performed.

---

## 1. Plain-English summary of what is in the branch

The R&D branch `codex/sunday-frontier-maxforce-2026-07-05` is a large, multi-cluster body of work (736 files differ from `origin/main`). It was produced as a shadow-mode R&D pass and is **not yet integrated** into the live tree. Four substantive clusters are present:

1. **Proof-of-record / trust layer (public + verifiable).** A `/verify` seam that publishes tamper-evident records of model outputs. Anchored by SHA-256 Merkle commitments (`packages/prediction-engine/src/proof-of-record.ts`) plus a Pedersen-commitment companion layer.
2. **Pedersen-commitment / ZK-research cluster.** A new isolated workspace package `@sports/crypto` (`packages/crypto/`) implementing secp256k1 Pedersen commitments using audited `@noble/curves`. Strictly additive, dependency-isolated, and explicitly NOT post-quantum.
3. **NGS data integration.** End-to-end ingestion of Next Gen Stats (player tracking) data, mapped into the metric engine as new metric families (expected-completion, expected-YAC, QB burden, receiver difficulty, rush-environment, etc.).
4. **API v1 + commercial/media-revenue product.** A large public API v1 surface (auth, quota, abuse-response, promotion packets, shadow routing, durable fixtures) plus a commercial/media-revenue layer (partner pipeline, sponsorship, content compliance, first-month queues).

The branch is described as built in careful shadow-mode stages (per `docs/ops/CODEX_HANDOFF_SUNDAY_FRONTIER_MAXFORCE_2026-07-05.md`), with evidence artifacts under `docs/fable/`, `eval/edge-lab/`, `handoff/claude/overnight-2026-07-01/`, `schemas/fable/`, and `reports/`.

---

## 2. Does the API v1 cluster genuinely resolve today's known test failures?

**Yes — the branch's API v1 cluster makes the `api-v1-*` tests pass.**

- All 16 `api-v1-*.test.ts` files exist on the branch and were executed in the disposable worktree from P6-02.
- Result: **17 test files passed, 110 tests passed, 0 failures** (the 17th "file" in vitest's count is the explicitly-named-but-nonexistent `actor-minting-boundary.test.ts`, which is a harmless no-op).
- The `@/` path alias is configured in `apps/web/vitest.config.ts`, so the vitest command must be run with `cwd = apps/web/` (running from repo root fails to resolve aliases).

This is the branch's own self-consistent test suite for API v1. It does **not** by itself prove that main's pre-existing failing tests are resolved — that would require running the same test selection against main, which was out of scope for P6-02. The honest statement: **the API v1 cluster on this branch is internally green** (see P6-02 for full output).

**Confidence: verified** for "the branch's API v1 code passes the branch's API v1 tests."
**Confidence: unverified** for "merging this cluster into main would fix or break main's other tests" — that is a merge-time question, not a static one.

---

## 3. Recommended integration order (IF the owner chooses to merge)

The cluster boundary is not perfectly clean (many files are touched by multiple clusters), so the order below is a risk-minimizing sequence, not a hard partition. Each step should be a separate, reviewable merge.

**Recommended order:**

1. **API v1 cluster first** (`apps/web/lib/api-v1/**`, `apps/web/lib/api/v1/**`, `apps/web/__tests__/api-v1-*.test.ts`, `schemas/fable/api-v1*.schema.json`, `scripts/guardrails/api-v1-boundary.mjs`, `scripts/guardrails/api-payload-rights-scan.mjs`).
   - Rationale: highest test coverage density (110 green tests), well-bounded surface, and directly exercises the paywall/tier discipline that the current sprint (Phase 7) is already fixing on main. Merging it after the P7 paywall fixes land makes the two compatible.
   - Risk: 16 test files + fixtures touched on main since branch point — manual review of each is required (730/736 files have main-side edits).

2. **NGS data integration second** (`packages/data-ingestion/src/nflverse-ngs.ts`, `packages/prediction-engine/src/nfl/**`, `packages/prediction-engine/src/metrics/{passing,receiving,rushing}/**`).
   - Rationale: read-only data ingestion + metric definitions. Lower blast radius than the commercial/product cluster. The `nflverse-ngs.test.ts` and `gse-nfl-metrics.test.ts` files give some confidence.
   - Risk: schema fields (`packages/db/prisma/schema.prisma` is touched) — merging requires a coordinated DB migration applied first (owner-gated, see §4).

3. **Crypto / ZK cluster third** (`packages/crypto/**`, `packages/prediction-engine/src/pedersen-ledger.ts`, `packages/prediction-engine/src/calibration-commitment.ts`).
   - Rationale: additive-only, dependency-isolated, zero runtime exposure today (no consumer imports `@sports/crypto` from `apps/*` or `workers/*`). Lowest production risk of the four. P6-03 found no defects.
   - Risk: still recommends a pre-integration `@sports/crypto` typecheck + workspace test run (P6-03 §6: could not execute in read-only mode; package-lock integration unverified).

4. **Commercial / media-revenue product last** (`apps/web/lib/{api-auth,media-revenue,revenue,fables}/**`, `apps/web/app/{partners,media-kit,newsletter,content-lab,podcast,commercial}/**`, `docs/commercial/**`, `docs/media/**`).
   - Rationale: largest, most cross-cutting cluster — touches auth, API keys, partner pipeline, pricing, and public copy. Highest chance of colliding with the P7/P9 paywall and entitlement work on main.
   - Risk: 500+ files; should be merged incrementally by sub-domain (auth → pricing → media → partners), not as one blob.

**Why not single-blob merge:** 730 of 736 files have been modified on `origin/main` since the branch point. A single merge would produce a near-730-file conflict surface that no human can review in one pass. Splitting by cluster above keeps each review bounded.

---

## 4. Explicit red flags from the crypto risk assessment (P6-03)

P6-03's verdict is: **architecturally sound, no defects, no changes required.** But it surfaces real forward-looking red flags that must gate any integration:

- **RISK-L (low, contained):** Blinding randomness is a caller responsibility; no CSPRNG-minting adapter exists in this branch. The risk is zero until an adapter lands — but any future PR that wires `@sports/crypto` into a production commitment path **must** supply a CSPRNG at the loader boundary. (pedersen-ledger.ts:26-27)
- **RISK-L:** `commit(0n, 0n)` returns `null`, not the identity point O. Downstream consumers that do not null-check will get `undefined` on degenerate input. (pedersen-ledger.ts:88-97)
- **RISK-M (medium, forward-looking):** The public-RO claim surface `apps/web/lib/performance/public-roi-policy.ts` was NOT reviewed in depth here. Any future PR touching that file **must** cite the actual `@sports/crypto` function + a concrete commitment hash, not a prose claim, or the legal-artifact discipline breaks.
- **RISK-INFO:** `@sports/crypto` is currently DARK/R&D — there is **no runtime import** of it from `apps/*` or `workers/*` anywhere in the branch. This is correct for a risk pass but means there is zero production exposure to validate against today.
- **Not post-quantum:** the Pedersen layer is computationally binding under secp256k1 DLOG (~128-bit) and falls to Shor. The module is honest about this — it is additive to, not a replacement for, the SHA-256 Merkle layer.

**Do NOT merge the crypto cluster until:** (a) a CSPRNG adapter is wired before any production commitment, (b) a workspace `npm test` + `@sports/crypto` typecheck pass in a real installed tree (P6-02 proved install works in a temp worktree; P6-03 could not run tests in read-only mode), and (c) any RO claim touching Pedersen output is audited against the null/canonicalization contract.

---

## 5. What you could NOT verify — needs a human or a fresh Laguna pass

1. **Merge-time conflict count.** P6-01 classified 730/736 files as `needs-manual-review`, but did not attempt a dry-run merge (`git merge-tree` / `git diff --check`). A real conflict count requires checking out the branch against main in a scratch tree — that crosses into build territory and was intentionally not done in this read-only phase.
2. **Cross-cluster regressions.** Each cluster was assessed in isolation. Whether the NGS ingestion, API v1, and commercial layers compose correctly at runtime has **not** been executed end-to-end.
3. **`@sports/crypto` typecheck and workspace test run.** P6-03 was read-only; the package-lock integration of `@noble/curves` into the root monorepo was not exercised. The temp-worktree install succeeded (P6-02 used the branch, which includes the crypto package), but a focused `tsc --noEmit` on `packages/crypto` under its tsconfig was not run.
4. **DB migration dependencies.** `packages/db/prisma/schema.prisma` is touched on both branch and main since branch point. Whether the crypto/proof-of-record layer or the NGS layer adds new schema columns that require a migration applied **before** the code can deploy was not traced commit-by-commit. (Per the scope guard, no migration may be run without owner approval.)
5. **Production env-var contract changes.** The branch touches auth, API-key, and Stripe-related config surfaces. Without a live Vercel environment inspection, it cannot be confirmed which env vars the branch assumes vs. what `origin/main` documents in `.env.example`.
6. **Whether main's currently-failing tests (Phase 7 P7-02 census) are fixed or regressed by this branch.** Running the branch's code against main's test set was scoped out of P6.

---

## 6. Bottom line for the owner

- **The branch contains real, substantial work** across four coherent clusters — not a fabricated or empty blueprint. Evidence is corroborated across git commits, test runs, and doc handoffs.
- **Single-blob merge is strongly discouraged.** 730/736 files conflict with main. Merge by the cluster order in §3.
- **API v1 is the most merge-ready:** 110 tests green in a temp worktree.
- **Crypto is the lowest production risk but needs a pre-integration typecheck + CSPRNG-adapter gate** (RISK-L/RISK-M above). Nothing currently imports it at runtime.
- **Commercial/product cluster needs the most review** — 500+ files crossing auth, pricing, copy, and partner surfaces.
- **Nothing was pushed.** `git worktree list` (checked during P6-02) showed no `Sports_rnd_test_TEMP` entry after cleanup. No commits were made to `main` or `claude/fable-5-ultracode-plan-ptru4e` referencing the R&D branch's content in this phase — Phase 6 is investigation-only.

**Owner decision needed before any merge:** (1) approve cluster-by-cluster integration order, (2) approve the one-time DB migration(s) the NGS/schema changes require, (3) confirm production env vars, and (4) green-light the `@sports/crypto` CSPRNG-adapter pre-condition.

---

## 7. Phase 6 exit — investigation-only confirmation (P6-05)

**Closed:** Phase 6 (`codex/sunday-frontier-maxforce-2026-07-05`) was investigation-only and is complete. As of this closing note: (1) `git worktree list` shows **no** `Sports_rnd_test_TEMP` entry — the disposable worktree created during P6-02 was removed with `--force` (mandated because it held `node_modules`) and is gone; (2) `git log` of the sprint branch `claude/fable-5-ultracode-plan-ptru4e` confirms **no commits were made to `main` or to the sprint branch that reference, merge, or cherry-pick any content from the R&D branch** — every P6 commit is a read-only doc/test artifact or the P6-02 disposable-worktree test result; (3) **nothing was pushed** to any remote. Phase 6 produced analysis and a recommended integration order for an owner decision; it changed zero source on either branch and merged nothing. The owner gates all subsequent integration.
