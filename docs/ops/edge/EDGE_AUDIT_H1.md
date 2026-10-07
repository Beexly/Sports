# Edge Audit — Abandoned / Partial Edge Implementations

**Scope:** Audit of dead git branches, INERT/stub modules, and unmerged fixes across the `BeeXly/Sports` repo and GitHub remote, focused on "edge" angles (betting-edge discovery: CLV, covariates, calibration, frontier fusion, Kalshi/props book divergence).
**H0 context:** H0 covariate-binding edge hunt is complete — 9 H0 angle branches merged to `origin/main` (PRs #560, #564, #566, #569, #576). Remaining H0 open branches + pre-existing ghost branches + INERT stubs below.
**Method:** `git merge-base --is-ancestor origin/<branch> origin/main` → all reported branches are **UNMERGED** ("OPEN/dead"); checked against GitHub remote `BeeXly/Sports` via `gh` API.

---

## A. Dead ghost branches — entire abandoned edge programs (pre-restructure era, 800–1000 commits each, never merged)

1. `claude/glass-ledger-edge-engine` — last 2026-07-17 | 1001 commits | **DEAD**
   Glass-Ledger + edge-engine program: CLV APIs, council-ledgers, glass-ledger page, edge-signals. Diverged ~2789 files from main (based on pre-restructure repo state). Superseded by current `edge-lab/`.
   - `apps/web/app/api/clv/route.ts` (branch-only)
   - `apps/web/__tests__/glass-ledger-page.test.tsx` (branch-only)
   - `apps/web/app/edge-index/` (branch-only)

2. `claude/dfs-optimizer-edge` — last 2026-07-07 | 911 commits | **DEAD**
   DFS (Daily Fantasy Sports) optimizer edge: lineup generation, DFS salaries, edge-index. Last commit docs-only. Never integrated.
   - `apps/web/app/api/tools/lineup/route.ts` (branch-only)
   - `apps/web/app/api/dfs/salaries/route.ts` (branch-only)

3. `integration/proven-edge` + `research/proven-edge` — 2026-06-22 / 2026-06-26 | 708 / 659 commits | **DEAD**
   "Proven-edge" frontier fusion research + integration track: proven-path engine, multi-domain calibration. Superseded by H0 program.
   - `FRONTIER_RESEARCH_ADDITIONS.md` (branch-only)
   - `apps/web/__tests__/proven-path-engine.test.ts` (branch-only)

4. `claude/edge-map-rebuild-2026-06-04` — last 2026-06-09 | 339 commits | **DEAD**
   Edge-map rebuild effort. Never integrated.

5. `claude/frontier-*` (5 branches) — June–July 2026 | all **DEAD**
   - `claude/frontier-contracts` — frontier contracts prose/implementation
   - `claude/frontier-superset-rebased` — multi-domain calibration superset
   - `claude/frontier-agent-foundry-2026-07-11` — agent foundry scaffolding
   - `claude/frontier-model-router-shadow-2026-07-11` — model-router shadow deploy
   - `claude/frontier-design-docs` — frontier design docs
   All abandoned; multi-domain frontier calibration never shipped.

6. `codex/gse-frontier-recovery-2026-07-13` + `codex/sunday-frontier-maxforce-2026-07-05` — **DEAD**
   GSE frontier recovery / maxforce effort. Recovery waves abandoned.

---

## B. INERT / partial stubs inside the *active* `edge-lab/` package

7. `ledger-anchor.ts` — line 9 | **INERT / partial**
   External glass-ledger anchor (`anchorExternally`). HARD-GATED: throws `GatedActionError` unless founder confirms `FOUNDER-CONFIRMED` + env flag. No network call implemented — returns payload + instructions for manual OTS/gist step.
   - `packages/prediction-engine/src/edge-lab/ledger-anchor.ts:9`

8. `close-distillation.ts:predictedMoveEdge` — lines 13, 175 | **INERT BY CONSTRUCTION / partial**
   CLV-native closing-line distillation. Distiller is built; the firing consumer `predictedMoveEdge` is explicitly INERT — needs real decision-time prices (corpus only has closing lines), so it "cannot run without one."
   - `packages/prediction-engine/src/edge-lab/close-distillation.ts`

9. `agent-roles.ts` + `edge-lab-council.ts` — line 8, 2 | **stub / partial reference**
   `agent-roles.ts`: "Orchestrator / council runner is a later stub." Interface + `EdgeLabAgent` contract only. `edge-lab-council.ts` implements a single-round deterministic reference council (no LLM debate, no multi-round, no production persistence). `finalDecision` is RESEARCH/DIAGNOSTIC only — `selective-gate.ts` remains the sole FIRE/NO_BET authority.
   - `packages/prediction-engine/src/edge-lab/agent-roles.ts:8`
   - `packages/prediction-engine/src/edge-lab/edge-lab-council.ts:2`

10. `phase4-research.ts` — line 2 | **INERT / partial**
    PHASE 4 frontier fusion research stubs (Bayesian channel weighting, adaptive conformal inference, learn-then-test). "INERT by doctrine: No live weight and no public claim until 200+ fired bets clear breakeven." Live signal-mesh capture (Reddit/SiriusXM) is founder/legal-gated — NO implementation in repo.
    - `packages/prediction-engine/src/edge-lab/phase4-research.ts`

---

## C. Unmerged edge fixes (pre-built, tested, but never applied to `main`) — per C-14/CLV forensics verdict

11. Closing-snapshot staleness bound — commit `8e2af6f1` on `origin/claude/hotfix-settle-refresh-races` | **UNMERGED**
    `deriveClosingSnapshotFromOdds` accepts ANY latest pre-kickoff batch as "the close" with no `MAX_CLOSE_AGE_MS` → stale mid-afternoon batches corrupt SPREAD/TOTAL/ML CLV grading. Fix pre-built; not applied to main.
    - `packages/prediction-engine/src/clv-capture.ts:90`

12. Book-coverage truncation — commit `6f0353e1` on `origin/claude/galaxy-sports-edge-pdcswh` | **UNMERGED**
    Settle-side odds read uses `take:80`, dropping books from consensus close. Fix raises to `take:240`. Pre-built; not applied.
    - `packages/prediction-engine/src/settle-sport.ts:321` (exists on `origin/main`)

13. Settle/refresh TOCTOU race — commit `7c1276f8` on `origin/claude/hotfix-settle-refresh-races` | **UNMERGED**
    Concurrent settle/refresh on `clv_capture` / `odds_batch` creates a time-of-check/time-of-use gap. Recovery Wave R0.6.1; not applied.

---

## D. Open H0 covariate-angle branches (edge angles FOUND, integration pending)

| Branch | Edge angle | Status |
|---|---|---|
| `hermes/h0-change-point-fix` | Cubic-review fixes to regime-shift detector | OPEN |
| `hermes/h0-int-covariate-bind` | INT covariate bind (avgTimeToThrow, aggressiveness) | OPEN |
| `hermes/h0-incentive-cal-covariates` | Incentive + rule-change calendar covariates | OPEN |
| `hermes/covariate-cpoe-comp` | CPOE covariate comparison | OPEN |
| `hermes/h0-validation-harness` | H0 validation harness | OPEN |
| `hermes/h0-rem-remaining-cov-binds` | Next remaining covariate binds (**current worktree HEAD**) | IN PROGRESS |
| `hermes/h0-next` | EDGE-HUNT-LAUNCH / resume-oX-alpha instructions | OPEN |

> Note: 9 H0 angle branches already **merged** to `origin/main` (PRs #560 regime-shift, #564 ladder-boost+change-point, #566 standings-math, #569 ladder-boost-fix, #576 rush-yards+INT). `Sports-cpoe` worktree carries `hermes/covariate-cpoe-comp`.

---

## E. Kalshi / book-divergence edge angles — branches still OPEN

| Branch | Edge angle | Status |
|---|---|---|
| `grok/kalshi-book-div` | Kalshi two-way vs Shin-devigged book divergence (X4) | OPEN |
| `grok/kalshi-taker-friction` | Kalshi taker fee as friction on q | OPEN |
| `grok/kalshi-listing-quote` | Kalshi listing two-way from yes_bid+no_bid | OPEN |
| `grok/props-priced-edge` | Price HB P(over) as e=p-q, never confidence | OPEN |
| `grok/devig-honesty-compare` | De-vig honesty comparison | OPEN |
| `grok/fair-skill-brier` | Fair-skill / Brier calibration surface | OPEN |

> `covariate-cpoe-comp` (CPOE covariate comparison) — OPEN, carried by `Sports-cpoe` worktree.

---

## Summary

- **6 dead ghost branches** (B.1–B.6): entire edge programs from the pre-restructure era never merged back — glass-ledger edge engine, DFS optimizer, proven-edge frontier fusion, edge-map rebuild, 5x frontier contracts/foundry/router/superset/design-docs, and 2x GSE frontier recovery. Based on ~2026-04-07 repo state; diverge thousands of files from current `main`.
- **5 INERT/stub modules** in the *active* `edge-lab/` package (B.7–B.10): ledger-anchor, close-distillation consumer, agent-roles orchestrator, edge-lab-council (reference-only), phase4-research (frontier fusion stubs). Deliberately inert by doctrine/gating.
- **3 cluster of unmerged CLV measurement fixes** (C.11–C.13) per C-14 forensics verdict `docs/ops/edge/2026-08-19-clv-forensics-verdict.md`: closing-snapshot staleness bound, take:80→take:240 book coverage, settle/refresh TOCTOU race — all pre-built + tested, sitting on sideline branches.
- **6 open H0 covariate branches** + **6 open Kalshi/props/devig/fair-skill branches**: edge angles with real code that found signals but haven't been merged to `main` — candidates for the next integration wave.
