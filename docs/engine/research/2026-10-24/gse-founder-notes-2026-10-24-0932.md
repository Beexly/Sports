# GSE Founder Notes — 2026-10-24 09:32 AM

> Persisted in-tree so nothing is lost. These are the organized notes from the
> founder's Oct 24 email, reconciled against `implementation_plan.md`,
> `HANDOFF-2026-10-24.md`, and the extracted archives. Nothing here is a
> measurement unless it says so; every number carries its source.

---

## 1. The 3-View Winning Formula (Section 2A)

The engine's core claim is a **three-view pipeline** under a hard firewall:

```
Coach View  →  GM / Context View  →  Cadence Lock  →  Market View Last
```

| View | What it reads | What it must never read |
|---|---|---|
| **Coach View** | Formation, personnel, pressure, gap, coverage, red zone, special teams, injury/roster, 4th-down tendency, pace, situational EV | Any book price, spread, total, or market-derived prior |
| **GM / Context View** | Travel, rest, altitude, weather, referee crew, schedule spot, roster moves | Book prices |
| **Cadence Lock** | Freezes the coach+GM projection at the publish-time lock (Tuesday 04:00, Wednesday 17:00, Friday 16:30 Chicago; v4.0 = kickoff − 90 min) | — |
| **Market View Last** | De-vigged Pinnacle/Odds API (multiplicative, power, Shin), post-lock market regression, public hype check | — |

**Firewall:** `packages/prediction-engine/src/public-baseline/no-book-fence.ts`
(`assertNoBookInCoachSource`) mechanically rejects a book key on a coach-side
source. The fence is enforced by test, not by convention.

**Doctrine:** the market is the *last* view, never the first. A coach-side read
that has already seen a price is contaminated and must be rejected, not
re-weighted.

---

## 2. The 10 Belichick Game-Level Metrics (Section 2B)

Implemented in `packages/prediction-engine/src/nfl/belichick-ten-metrics.ts` and
wired into `markov-simulator.ts`.

| # | Metric | Function | Key coefficients / survivors |
|---|---|---|---|
| 1 | Defensive Efficiency by Formation | `defensiveEfficiencyByFormation` | EPA/play + success rate by formation × personnel × down × distance × field position; James-Stein shrinkage (d ≥ 3) |
| 2 | QB Pressure Rate by Rush Package | `qbPressureRateByRushPackage` | blitz (≥5) vs four-man × man vs zone; **sub-2.0s quick-pressure survivor 15.8% vs 10.1%** |
| 3 | Run Game Efficiency by Gap | `runGameEfficiencyByGap` | yards/carry, success, EPA by gap, adjusted for box count (≤6 light, ≥8 stacked) |
| 4 | Third-Down Conversion by Coverage | `thirdDownConversionByCoverage` | conversion rate by coverage shell and distance bucket; feeds `state.down === 3` |
| 5 | Red Zone Scoring by Play Type | `redZoneScoringByPlayType` | TD rate per RZ trip by run/pass, split red zone (≥80) vs goal-to-go (≥90) |
| 6 | Special Teams Field Position | `specialTeamsFieldPositionIndex` | `EFP_st` in yards and points; touchbacks and out-of-bounds folded in |
| 7 | Injury Impact | `injuryImpactAdjustment` | QB 5.5, LT 2.0, WR1/CB1 1.5, EDGE 1.2, S 0.8; LT × pass-rush spike; **Safety OUT deep-explosive dampener 18.2% → 15.6%** |
| 8 | Coach 4th-Down Tendency | `coachFourthDownTendency` | aggression .51–.94; **+6.7703 pp held-out edge** on 4th-and-short near midfield |
| 9 | Game Scripting & Pace | `gameScriptingPace` | score margin × clock; **kneeldown mixture −1.06 yd**; trailing second half speeds up, leading Q4 bleeds |
| 10 | Situation-Specific EV Optimization | `situationSpecificEvOptimization` | evGo / evFg / evPunt; two-minute drill `clock ≤ 120` Q2/Q4; goal-line defense `yardline ≥ 95`; prevent weight 0.25 → 1.0 |

**Location-locked prior:** `SIGMA = 13.45`, target N = 246,462 locked-filter
games, target CRPS = 7.099. The HFA is **1.56 points**, replacing the hardcoded
+3.0 / 46.5 stub in `markov-simulator.ts`. Source:
`gse_location_locked_harness.py`.

---

## 3. The 10 Competitor Kernels (Section 2C)

Implemented in `packages/prediction-engine/src/public-baseline/rankings.ts`,
wired in `packages/ranking/src/index.ts`.

| Competitor | Our kernel | Function |
|---|---|---|
| FiveThirtyEight Elo + SP+ | Elo 538 baseline | `winProb` (existing `elo538.ts`) |
| nfelo market regression | market strengths LS | `marketStrengthsLeastSquares` |
| Action Network power rankings | SRS | `srsRatings` |
| Sharp steam moves | de-vigged market stack | `stackWithMarket` |
| Massey-Peabody | Massey + efficiency decomposition | `masseyRatings`, `masseyPeabodyRatings`* |
| Sports-Reference SRS | SRS | `srsRatings` |
| Advanced NFL Stats EPA | SP+ efficiency | `spPlusEfficiencyRatings` |
| Next Gen Stats | PFF-style unit grades | `pffStyleUnitGrades` |
| PFF Grading System | PFF-style unit grades | `pffStyleUnitGrades` |
| Dark Horse / X metrics | public hype valuation | `publicHypeValuationCheck` |

\* `masseyPeabodyRatings` is a composite of `masseyRatings` + efficiency splits;
the decomposition lives in `fpiDecomposition` and `pffStyleUnitGrades`.

**Also ported:** `colleyRatings`, `bradleyTerryMle`, `kalmanRatings`,
`invertCompetitorRatingDeltas`, `hmm2RegimeFit`, `deflatedSharpe`,
`shinDevigClosedForm`.

**Provenance:** `engine_math.py` (RATING_ATLAS 60 methods),
`RATING_ATLAS.md` (equations for Massey #8, Colley #7, SRS #9),
`gse_location_locked_harness.py` (HFA 1.56, SIGMA 13.45).

**Gap found:** Massey, Colley, and SRS are *not implemented* in `engine_math.py`
— only their equations appear in `RATING_ATLAS.md`. They were implemented here
from those equations using the ported `gaussSolve`. This is a real gap in the
source archive, not a gap in this port.

---

## 4. The 10 Advanced Strategies (Section 2D)

| # | Strategy | Implementation |
|---|---|---|
| 1 | Stack with market | `stackWithMarket(pModel, pMarket, w)` — log-odds pooling |
| 2 | Public hype valuation | `publicHypeValuationCheck` — hype delta and material flag |
| 3 | Invert competitor deltas | `invertCompetitorRatingDeltas` — ridge regression |
| 4 | Market strengths LS | `marketStrengthsLeastSquares` — invert closing spreads |
| 5 | 2-state regime HMM | `hmm2RegimeFit` — cold/hot form Baum-Welch |
| 6 | Deflated Sharpe | `deflatedSharpe` — Bailey & López de Prado |
| 7 | Shin closed-form de-vig | `shinDevigClosedForm` — fixed-point form |
| 8 | Kalman state-space | `kalmanRatings` — hidden team strength |
| 9 | FPI decomposition | `fpiDecomposition` — offense/defense/special |
| 10 | PFF unit grades | `pffStyleUnitGrades` — team-level PFF structure |

---

## 5. The 49-Row Gap Audit (recovered artifact)

`GSE-DESIGN-VS-CODE-GAP-AUDIT-2026-10-23.md` — recovered from the archive; it was
missing from the repository tree.

| Bucket | Rows |
|---|---|
| NOT BUILT | 20 |
| BUILT-DISCONNECTED | 12 |
| BUILT-DRIFTED | 17 |
| WIRED-VERIFIED | 0 |

**The headline:** zero rows were WIRED-VERIFIED. Every row that was built was
either disconnected or drifted. That is the honest starting state.

---

## 6. The Weight Correction Addendum (recovered artifact)

`wire-everything-addendum-3-weight-correction-2026-10-17.md` overrides the
79-game 0.0 weight freeze on `CORPUS_EVALUATOR_DEFAULT_WEIGHT` and
`mind-reasoning`.

- **Old:** weight 0.0, frozen on 79 games.
- **New:** walk-forward measurement over the full pre-Week-6 2026 dataset —
  N = 2,462 locked-filter games / 14,251 archived fixtures / local
  `pbp_2019..2025.csv.gz`.
- **Why:** a measurement bar must be measured on the data that exists, not used
  as a place to park. The 79-game freeze was parking, not measuring.

---

## 7. Branch unification (Component 1)

Three branches were split on Beexly/Sports:

| Branch | SHA | What it carries |
|---|---|---|
| `engine/public-baseline-2026-10-24` (PR #1202) | `ee1c303f7` | markov-simulator, realized-settlement, cadence, narrative-rejections, no-book-fence, marchenko, bal-cin fixture |
| `hermes/ship-night-findings` (PR #1195) | `4fecd2661` | lockCoachProjection, coach-lock, price-check, trench-continuity, travel-factor, route-shell, snap-state, week7-live, site-rebuild, HANDOFF-SCORING, SIGNAL-CENSUS |
| `audit/reconciliation-2026-10-20` | `69faf39d2` | 80/80 X-Situational rules, 50k-premise 4-stage router, 24 OSF modules, causal stack |

PR #1202 was branched off `main` and is missing 108 commits from PR #1195 and
the 11 commits + Oct 22 TNF learning-loop modules from the audit branch. The
unification merged all three without dropping a file or a test.

**Verification (all green):**

| Suite | Result |
|---|---|
| `tsx --test markov-simulator.test.ts public-path.test.ts` | 30/30 |
| `vitest scoring-locked-price.test.ts` | 8/8 |
| `vitest x-situational-80-records-complete.test.ts` | 80/80 |
| `mind-reasoning.mutation-v2.spec.ts` (tsx --test) | 11/11 |

**Plan correction:** the plan's third vitest command is wrong — the file is
`mind-reasoning.mutation-v2.spec.ts` and it is a `node:test` file, so it must run
under `tsx --test`, not vitest.

---

## 8. Open items / named gaps

1. **Massey, Colley, SRS are not in `engine_math.py`.** Implemented from
   `RATING_ATLAS.md` equations. Marked here so the port is traceable.
2. **`packages/ranking` did not exist.** Created as the integration layer
   (`@sports/ranking`), depending on `@sports/prediction-engine`.
3. **The integration branch is local-only.** `integration/unified-gse-2026-10-24`
   has two merge commits and is unpushed. It needs to be pushed as the safety
   net before any further work.
4. **`node_modules/@sports/types` was a stale real directory**, not a workspace
   link. Replaced with a junction to `packages/types`; typecheck went 310 → 291
   errors and all 16 `game-context.ts` errors cleared. The remaining 291 are
   pre-existing on the audit branch (209 in `pinhole-jacobian.ts`).
5. **The 10 Belichick metrics are defined only in the plan.** Neither the gap
   audit nor the Master Execution Report nor the research spreadsheet contains
   their formulas. They are implemented from the plan's coefficients and marked
   as such.

---

## 9. Source artifacts and where they came from

| Artifact | Location | What it is |
|---|---|---|
| `engine_math.py` | `EYI Package_10-24-2026_1792878207.zip` → `workspace/user/files/` | 425-line math library (Bradley-Terry, Dixon-Coles, Kalman, Shin, HMM, market LS) |
| `RATING_ATLAS.md` | same zip | 60 methods with equations |
| `gse_location_locked_harness.py` | same zip | SIGMA 13.45, target N 246,462, CRPS gate |
| `GSE-DESIGN-VS-CODE-GAP-AUDIT-2026-10-23.md` | same zip → `workspace/your_files/` | 49-row gap audit |
| `wire-everything-addendum-3-weight-correction-2026-10-17.md` | same zip | 0.0 weight freeze correction |
| `Master Execution Report_ The Belichick.docx` | `Downloads/` | Architectural summary; references `engine_math.py` but does not inline it |
| `gse_research_analysis.xlsx` | `Downloads/` | 1,342-paper triage index (no kernel formulas) |

The two zips in `Downloads` are 657 MB and 776 MB. The six files above are the
only ones needed for Component 3; the rest of the archive is corpus and fixtures.
