# Minimum-Viable Win-Rate Loop

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Decision document. No code, schema, deps, or gate changes proposed here.
**Scope:** Define the closed feedback loop that lets the published win rate *move* honestly, map every step to existing code/data or mark it a GAP, and name the smallest set of additions that close the loop on data we already hold.

---

## The one sentence

A win-rate platform is only honest if it has a *closed loop*: every market we look at, every decision we make (bet **or** no-bet), the price we locked, where it closed, how it resolved, and *why* it resolved that way must flow back into the thing that decides the next pick. Today the loop is **open in three places** and **data-blocked in one**.

## The thirteen steps

For each step: the role it plays, the existing code/data that implements it (cited), and whether it is **WIRED**, a **GAP** (no implementation), or **DATA-BLOCKED** (implemented but starved of the sample it needs).

| # | Step | Status | Implementation / citation |
|---|---|---|---|
| 1 | **Market considered** — enumerate every game/market we *evaluated*, not just the ones we published | **GAP (logging)** | The scorers in `packages/prediction-engine/src/scoring.ts` iterate every eligible market, but only *surfaced* picks become rows. There is no record of the considered set. |
| 2 | **Model P** — our independent probability for the side | **WIRED** | Poisson model `poisson.ts`; Elo `elo-ratings.ts` / `elo-estimator.ts`; ML `ml-estimator.ts`; combined in `scoring.ts`. Surfaced as a factor with a real weight. |
| 3 | **Devigged market P** — the book's fair price, vig removed | **WIRED** | `shin-devig.ts` (`shinDevig`, `gotoConversion`) + `market-read.ts` (`consensusNoVig`, cross-book consensus). This is the benchmark, not the opinion. |
| 4 | **Edge score** — gap between model P and devigged market P, refereed by independents | **WIRED but INERT** | `edge-engine.ts` (`assessEdge`) returns SPEAK / LEAN / PASS with shrunk edge + expected CLV. It is attached to the factor trail at **`weight: 0`** (`scoring.ts:874`, comment: *"surfaced in the glass box; NOT yet priced into confidence"*). It is computed and displayed but does **not** influence selection. |
| 5 | **Conviction tier** — the "we'll stand behind this" bar | **INERT** | `conviction-tier.ts` (`convictionTier`). Pure, tested, and **not called by any live path** (its own header: *"nothing in the live scoring or publishing path calls it yet"*). Blocked on calibrated probability + a ≥20 CLV segment sample. |
| 6 | **No-bet decision** — the choice to *not* publish | **WIRED (as silent reject)** | `scoring.ts:542 / 726 / 898`: `if (confidence < MIN_PUBLISH_CONFIDENCE) return null;` (`MIN_PUBLISH_CONFIDENCE = 50`, `constants.ts:8`). The decision happens — but it is a `return null` with **no ledger row**. See step 1/GAP below. |
| 7 | **Bet-time line** — the immutable price/line we locked at | **WIRED** | Captured per pick: `Pick.clvLockLine`, `Pick.clvLockPrice` (schema `schema.prisma:385–386`). |
| 8 | **Close line** — the market's most efficient final estimate | **WIRED** | Derived, not stored as a marker: `clv-capture.ts` (`deriveClosingSnapshotFromOdds`) takes the last `Odds` batch at/before kickoff. Stored as `Pick.clvCloseLine` / `clvClosePrice` / `clvCapturedAt`. |
| 9 | **CLV result** — did we beat the close? | **WIRED (measurement-only)** | `clv.ts` (`computeSpreadClv` / `computeTotalClv` / `computeMoneylineClv`), graded by `clv-capture.ts` (`gradePickClv`), persisted as `Pick.clvValue` + `Pick.clvVerdict` (BEAT/MATCHED/LOST). It is *recorded* but does **not** feed back into selection. |
| 10 | **Game result** — settled W/L/P/V | **WIRED** | `settlement.ts` + the settlement pipeline (`packages/ingestion-pipeline/src/settle-sport.ts`); `Pick.result` / `settledAt`. |
| 11 | **Autopsy classification** — *why* this result happened (good-win vs lucky-win, etc.) | **GAP (structured)** | A *narrative* loss autopsy exists (`LossAutopsy` model, `LossRootCause` enum, `/api/admin/losses/[pickId]/draft`) — but it is **losses-only**, operator-authored prose, and does **not** feed learning. No structured, both-sides, computable classification store. See `pick-autopsy-taxonomy-v1.md`. |
| 12 | **Calibration update** — re-fit forecast→outcome mapping from settled results | **DATA-BLOCKED** | Math is built and self-gating: `probability-calibration.ts` (isotonic/PAVA, ECE, Brier) + `calibration-apply.ts` (`buildCalibrator`: activates only at **≥100 sample AND `calibratedEce ≤ rawEce`**). Today the eligible sample is **16/100** and `OUTCOME_LEARNING_ENABLED=false`. See "The bottleneck" below. |
| 13 | **Edge-type reliability update** — learn which *kinds* of edge actually beat the close | **GAP** | No edge-type taxonomy is recorded against picks, so no reliability table can accrue. `edge-significance.ts` proves the *aggregate* edge isn't luck, but cannot attribute skill to a *type* of edge. See `edge-type-taxonomy-v1.md`. |

---

## What is actually WIRED today

Steps **2, 3, 7, 8, 9, 10** are fully wired and producing real, stored data per pick. Step **6** (no-bet decision) executes but leaves no trace. Step **4** (edge score) is computed and shown but priced at weight 0.

So the *measurement* spine — model P, devigged P, lock line, close line, CLV, result — is real and persisting. That is the foundation; it is the parts that *close the loop back onto selection* that are missing.

## The four breaks in the loop

- **(a) "Market considered" + "no-bet decision" are not LOGGED.** Steps 1 and 6 happen in memory and vanish. We can never ask "of the markets we passed, did they go on to be bad bets?" — so we cannot prove the no-bet gate creates alpha rather than cowardice. (Detailed plan: `no-bet-quality-measurement-plan.md`.)
- **(b) Autopsy classification is missing (structured form).** Step 11. We grade *whether* a pick won, never *why*, in a form a machine can aggregate. (Plan: `pick-autopsy-taxonomy-v1.md`.)
- **(c) Edge-type reliability update is missing.** Step 13. We don't tag picks with an edge type, so we can't learn which signals to trust. (Plan: `edge-type-taxonomy-v1.md`.)
- **(d) Calibration update is data-blocked, not code-blocked.** Step 12. The pipeline is built and correctly refuses to activate on a tiny sample.

## The bottleneck — state it plainly

**The published win-rate number cannot move until two things happen, neither of which is "write more code":**

1. **`OUTCOME_LEARNING_ENABLED` must be flipped to `true`** (owner/operator action — see `platform-config.ts:186`; per the gate handoffs this is *data-collection only, it does not change scoring*). Until it is on, settled canonical picks are not even marked `eligibleForLearning`, so the calibration sample stays frozen.
2. **~84 more eligible picks must settle.** The calibration sample today is **16**; `buildCalibrator` requires **≥100** (`DEFAULT_MIN_CALIBRATION_SAMPLE = 100`) *and* a held-out check that the fitted map does not worsen ECE (`calibratedEce ≤ rawEce`, `calibration-apply.ts:90–93`). The 16-pick reality is corroborated in `conviction-tier.ts`'s own note ("the 70–79% bucket currently wins 0% on a 16-pick sample").

No amount of engineering shortens item 2 — it is calendar + settled games. What engineering *can* do today is **make every other step of the loop record itself**, so that the day the 100th pick settles, we have a *rich* sample (edge type, autopsy class, considered-but-rejected set) to learn from rather than a bare win/loss column.

---

## The smallest set of additions that close the loop on data we already have

Ordered by leverage. None requires a new data provider; all build on fields we already capture.

1. **No-Bet / Considered Ledger.** Persist step 1 + step 6: one row per *considered* market with the rejection reason, price-at-rejection, and the IDs needed to later derive its close and result from the existing `Odds` history + final scores. Unlocks the gate-quality metric. Spec in `no-bet-quality-measurement-plan.md`. (Schema is owner-gated; an interim file-backed capture from the scorer's considered set is possible without a migration.)
2. **Edge-type tag on each pick.** Record which edge type (from `edge-type-taxonomy-v1.md`) `assessEdge` / the scorer believed it was acting on. Costs one enum field; immediately starts accruing the reliability table (step 13). ~6 of the v1 edge types are detectable on data we already have.
3. **Structured autopsy classification.** Extend the existing losses-only `LossAutopsy` concept into a both-sides, computable classification (step 11). ~10 of the 16 v1 classes are computable *now* from existing `Pick`/CLV/line-movement fields with zero new signal. Spec in `pick-autopsy-taxonomy-v1.md`.
4. **CLV segment aggregation surface.** Step 9's data is already stored; the missing piece is the *aggregation* (beat-close rate by sport/market/edge-type/confidence bucket) that conviction-tier (step 5) consumes. Buildable today on `clvVerdict`/`clvValue` + `summarizeClv`. Spec in `clv-quality-measurement-plan.md`.

What is explicitly **out of scope of an engineering sprint**: flipping `OUTCOME_LEARNING_ENABLED` (owner) and waiting for ~84 more settlements (calendar). Those gate step 12. Everything else above can be built and tested now so the loop is *primed*.

## Honest bottom line

The measurement spine is real and the calibration math is built and correctly self-suppressing. The loop is open at logging (no-bet ledger), attribution (autopsy + edge-type), and starved at calibration (16/100, flag off). The highest-leverage, non-data-blocked move is to **make the no-bet decision and the edge-type belief leave a trail**, so that when the sample matures the learning step has something rich to learn from.
