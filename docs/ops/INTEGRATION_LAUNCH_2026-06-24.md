# Integration & Launch Record — 2026-06-24

Consolidation of the scattered branches into one verified, deployable line, plus the
Decision Genome research integration. Branch: `claude/stoic-dirac-20h11q` (the integration
branch; `main` is a strict ancestor → clean PR→main, no force-push).

## Phase 0 — Discover (the premise had changed)

The runbook assumed `main` was stale at `a132d98`. In fact `origin/main` had been
**force-updated** to `5687b411`, carrying **45 commits** of independent Proven-edge +
Advanced-Systems work (CLV proof receipts, commit-reveal slates, Integrity Ledger, Public
Claim Compiler, Signal Lineage, Market Memory, etc.) that `intelligence-core` lacked.

| Branch | Tip | Role |
|---|---|---|
| `main` | `5687b411` | Proven-edge + Advanced Systems (45 commits since pivot) |
| `codex/intelligence-core` | `30f8c455` | engine + keystone backtest (HAS_BACKTEST) |
| `claude/sweet-fermi-sk9gws` | `9198f20f` | fantasy-launch polish (+1 commit beyond IC) |

Decision (owner-approved): **base the integration on `main`** and merge the others in, so
no work is orphaned and `main` stays an ancestor.

## Phase 1 — Consolidate

- Merged `codex/intelligence-core`: 1 conflict — `apps/web/lib/cache/public-read-model-policy.ts`
  (add/add). Kept **main's** surface-keyed version (it is wired into the Advanced Systems
  Integrity Ledger evidence chain; IC's was an unwired duplicate); dropped IC's duplicate
  colocated test. The other 3 overlapping files auto-merged.
- Merged `claude/sweet-fermi-sk9gws`: clean (its only unique commit is the weekly-loader polish).
- Result: 66 commits / 150 files added vs `main`.

## Phase 2 — The gate (GREEN)

| Check | Result |
|---|---|
| typecheck | green (all workspaces, strict + noUncheckedIndexedAccess) |
| lint | green (`max-warnings=0`) |
| tests | green — 6,123 web + ~660 package tests |
| backtest | **18,344 OOS, model MAE 5.3087 vs naive 4.9064, beats naive = false, priced=false (shadow)** — reproduces the keystone exactly |
| build | green (exit 0, full route table) |
| guardrails | trust-gate / model-freeze / draft-only / claude-api / secret-scan / eval-contracts all OK |

Blockers cleared: Prisma engine download was proxy-reset (fetched engines via curl,
generated offline); type fixtures lagged the engine's extended `MarketAnchoredPlayerProjection`;
the next-auth/vitest `next/server` resolver plus intelligence-core's deferred ADMIN-gate
route tests (commit `01559316`) — finished those, adding 403-without-admin assertions.

## Phase 3 — Truth & safety (✅)

- Projections stay **shadow** — no gate flipped, `priced` never true (289 "illustrative" labels).
- No live secrets committed.
- Clearance engine + source-rights registry intact (scores24.live = permission_required, etc.).
- Entitlements `PAST_DUE → FREE` 7-day grace intact.

## Research integration — Decision Genome + Epistemic Alpha spine

From the *GSE/GSN Master Research* doc: the platform is reframed around the Decision
Genome (the atomic object behind every decision) and Epistemic Alpha (was the confidence
deserved before the outcome?). Built the full A–I order as pure, tested TypeScript that
**composes** existing primitives (`compilePublicClaim`, `scanForBannedPhrases`, agent
registry) under `apps/web/lib/decision-genome/`, plus an ADMIN-gated `/api/decision-genome`
that runs the spine end-to-end in-app on illustrative fixtures. 40 new tests; see that
module's `README.md`.

## Owner-gated / remaining (not code)

- Live Stripe Fantasy prices + secret keys + webhook registration (host env only).
- TikTok app: Privacy (`/privacy`) + Terms (`/terms`) pages exist; the domain-verification
  signature file is owner-provided (drop at site root in `apps/web/public/`).
- Preview deploy (Phase 4) and production (Phase 5) remain owner-gated.
- Galaxy Dynasty Studio (`codex/galaxy-dynasty-studio-rescue-v2 @ e19a8ceb`) is a large
  separate surface 157 commits behind this line — recommended as a parallel track, not a
  launch-branch merge.
