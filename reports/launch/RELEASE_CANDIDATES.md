# Galaxy Sports Edge — Focused Release Candidates (LC-007)

**Generated:** 2026-07-19 01:10 UTC

## Method

Checked every branch/PR the Launch Convergence skill explicitly names as "must NOT bulk-merge"
(#129, #112, #121, #122, #124, #125, #127, #52) directly against GitHub (`pull_request_read`,
live state/diff-stat/base-SHA) and, for the one item with a live-correctness claim worth
independently checking, against current `main`'s actual code. Goal: find any genuinely unique,
verified, launch-critical behavior sitting on an old branch that isn't already on `main` or
already shipped in this campaign's own PR #130 -- and if found, scope it for a fresh, bounded PR
cut from `main`. Never bulk-merge the old branch itself.

## Finding: no new release-candidate PR is needed this pass

**PR #130 (`claude/gse-launch-convergence` -> `main`) and PR #128 (the 4-line CI fix) already
are the complete set of focused release candidates this campaign has produced.** PR #130 itself
was cut fresh from `origin/main` (not extending any old branch) and already bundles real,
independently-reviewed fixes across exactly the lanes LC-007 asks for: CI/baseline reliability
context (LB-001, ready for PR #128), Sentinel v2 (LC-002), security residue (LC-003), revenue
correctness (LC-004's Stripe refund/dispute fix), data/engine continuity (LC-005's
settlement-health wiring), and a public-claims fix (LB-009). Every item below was checked and
found NOT to add anything unique, verified, and launch-critical beyond what's already shipped.

## Per-branch disposition

| PR | Title | State | Base vs. current `main` | Verdict | Reason |
|---|---|---|---|---|---|
| #129 | Frozen recovery branch (pdcswh) | draft, frozen | 71 commits, self-declared frozen | **SUPERSEDED / EVIDENCE-ONLY** | Its own freeze receipt (2026-07-18) already declares it an audit trail, not a merge vehicle. Every launch-critical fix this campaign found on it (settlement/CLV healing, outage-state modeling, secrets exposure) was independently re-verified and re-shipped fresh in PR #130 rather than ported wholesale. |
| #112 | Frontier recovery: governed intelligence playback | draft, **dirty** (real conflicts) | base `7c747679` -- far behind current `main` | **BACKLOG, not launch-critical** | 283 files, a major new Game Room "Intelligence Playback" feature. Not a launch blocker; stale and conflicted besides. Recovering it needs its own dedicated freeze-contract pass per the campaign's standing rule (only start old backlog when it resolves a *verified* P0/P1). |
| #121 | Fantasy Engine floor revival | ready, **dirty** | base `e9fab35` -- behind current `main` | **BACKLOG, not launch-critical** | A real, well-tested feature (MLB fantasy engine), but a new-capability feature, not a launch blocker. Task #13's own backlog item; explicitly excluded from auto-start per the standing directive. |
| #122 | CLV decomposition + Pedersen aggregate columns re-land | ready, **dirty** | base `e9fab35` -- behind current `main` | **FLAGGED for a dedicated future review, not portable today** | See below -- touches a Prisma migration (protected, owner-gated per LC-007's own rule) and its "real bug found" claim no longer cleanly maps onto current `main`'s code, which already has an independently-built `book-dispersion.ts` the PR's description doesn't account for. |
| #124 | Frontier intelligence fabric (Agent Foundry, Assurance, Resource Radar, shadow Model Router) | ready, **dirty** | base `e9fab35` -- behind current `main` | **BACKLOG, not launch-critical** | Shadow-only, zero production wiring by design, R&D infrastructure. Valuable, not a launch blocker. |
| #125 | docs(genesis): canon, autonomous execution, reconciliation, production-activation docs | draft, unstable (no conflicts) | base = current `main` HEAD (not stale) | **BACKLOG, not launch-critical** | Docs-only, additive, genuinely mergeable without conflict -- but it proposes a large *parallel* governance/process framework, not a product or launch fix. Its own body says "do not merge this control PR as a claim of product implementation." No launch blocker depends on it. |
| #127 | GX-000: Codebase Twin v0 + Metacortex Plan Compiler v0 | draft, unstable (no conflicts) | base = current `main` HEAD (not stale) | **BACKLOG, not launch-critical** | Shadow-only, zero apps/web/workers imports (independently verified by its own structural tests and a prior gse-verifier pass), genuinely safe to merge -- but Genesis-kernel R&D scaffolding, not a launch/revenue fix. |
| #52 | Galaxy Dynasty world-graph game builder | ready, **dirty** | base `d52b62a8` -- a month stale | **BACKLOG, not launch-critical** | A large speculative new product surface with its own explicit "intentionally NOT started" next step. Not launch-critical by any reading. |

## #122's bug claim, checked against current `main`

PR #122's body claims: "Away-side moneyline picks were silently locking the **home** side's
book disagreement (American odds aren't complementary)." This session independently read
`packages/ingestion-pipeline/src/book-dispersion.ts` on current `main` (a module PR #122's
description does not appear to account for -- it may not have existed, or existed differently,
when that branch was last verified). `bookLineDispersion()`'s MONEYLINE branch computes
`spread()` (max-minus-min) of the **home** implied probability across books. For a two-outcome
market where `away_i = 1 - home_i` for every book `i`, `max(away) - min(away)` algebraically
equals `max(home) - min(home)` -- the dispersion is side-symmetric by construction, so this
specific function cannot exhibit the described "locks the home side's value when picking away"
bug as stated. Whether PR #122's original bug was in a *different*, non-symmetric quantity (e.g.
a signed disagreement rather than a spread), or whether current `main`'s `book-dispersion.ts`
already independently fixed it, is genuinely unclear without a dedicated side-by-side diff this
pass didn't have budget for. **Do not treat this as "confirmed harmless"** -- it is
correctly recorded as `NEEDS_DEEPER_REVIEW`, not `SUPERSEDED_BY_MAIN`, precisely because the
claim couldn't be cleanly confirmed OR refuted against current `main` in this pass.

**Why this isn't ported now regardless:** even if the bug is real and still live, PR #122 also
carries a Prisma migration (`ADD COLUMN IF NOT EXISTS` on `Pick`/`SlateCommitment`) that would
need re-verification against current `main`'s schema (which has moved since the PR's own
migration-safety testing), and any CLV-correctness change is a protected-zone (money-truth)
change requiring its own freeze-contract, targeted tests, and a mandatory `gse-red-team` pass --
exactly the "protected migrations last, isolated and owner-gated" sequencing LC-007 itself
specifies. This is recorded as a named future workstream, not silently dropped.

## Disposition

- **No new release-candidate PR opened this pass.** PR #130 + PR #128 remain the complete,
  correct release-candidate set.
- **New backlog item recorded (not started):** independently re-verify whether PR #122's
  away-side CLV-dispersion bug is live on current `main`, and if so, scope a dedicated,
  owner-gated, red-teamed re-land of the CLV decomposition + Pedersen columns as its own
  workstream -- separate from Launch Convergence, since it is a correctness *enhancement*, not
  a launch blocker.
- #112, #121, #124, #52 stay correctly un-merged per the standing directive (no fresh evidence
  this session found proves any of them resolve a verified P0/P1 launch/revenue blocker).
- #125, #127 stay correctly un-merged: genuinely safe/non-conflicting, but out of Launch
  Convergence's scope (R&D/governance infrastructure, not a launch/revenue fix).
- #129 stays frozen exactly as already recorded.

## Verification

Every PR's state (draft/open/merged, `mergeable_state`, base SHA, diff stat) pulled live via
`mcp__github__pull_request_read` this session, not inherited from any prior snapshot. The
`book-dispersion.ts` side-symmetry argument was derived directly from the algebra of
`away_i = 1 - home_i` and the file's own current-`main` source, not assumed.
