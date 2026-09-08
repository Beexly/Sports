# Identical-row score bake-off — 2026-09-08

Ledger row **C-261**. Branch `claude/launch-identical-row-bakeoff`, based on `main` at `8cc0695`.

Every number in this document comes from a command run in this session or from the live truth
surface at the stated time. A cell that could not be produced without a database reads
**NOT RUN**. Nothing is estimated.

---

## 1. The question

The truth surface names the market as the best score (`provenPath.bestScore = marketFairProb`).
The 2026-09-08 handoff on PR #720 (`docs/ops/audit-2026-09-08/production-truth-2026-09-08.md`,
`docs/ops/EDGE_DOCTRINE_AUDIT_2026-09-08.md`) records two confounds in the table that
conclusion is read from:

1. **The scores are not on identical rows.** `scoreBakeoffByMarket` measures each score on
   whatever rows carry that score. On MONEYLINE the row counts differ by a factor of five
   (section 3), so the gap between two cells is part score quality and part row selection.
2. **The outcomes include the C-247 contradicted finals.** Some stored FINAL scores are
   contradicted by the ESPN feed they were ingested from, with settled published picks on them.

This row removes the first confound in code, on production, automatically, and gives the second
a cell that is either computed from the real contradicted game ids or reads NOT RUN.

## 2. Method

**Row set.** Settled canonical WIN/LOSS two-way MONEYLINE picks (`CANONICAL_LEARNING_PICK_WHERE`,
the same filter the plan already loads) on which **all four** of these are finite:

| score | probability used |
|---|---|
| `confidence` | confidence / 100 |
| `independent_trueProb` | `factorBreakdown.independentEdge.trueProb` (raw model P, never a confidence-echo rankingP) |
| `blend_indep_conf` | 0.5 × confidence/100 + 0.5 × independent trueProb |
| `marketFairProb` | market-anchored probability, resolved below |

Three-way moneyline sports are excluded structurally with the helper every other loader uses.
Every row that fails a condition is counted under one drop reason (`not_win_loss`,
`non_moneyline_market`, `three_way_market`, `no_confidence`, `no_independent_trueprob`,
`no_market_probability`), so the reader can see how the identical set relates to the full one.

**Market probability: the calibration loader's order, not the bake-off's.** The two loaders on
main disagree, and that disagreement is the whole reason the by-market market cell is thin:

| loader | order | calls the odds-table resolver |
|---|---|---|
| calibration eligibility (`live-calibration-p.ts` `resolveMarketAnchoredCalibrationP`) | proof receipt → factor-breakdown market fair (`independentEdge.marketFairProb`, then top-level) → odds-table resolver at `generatedAt` | yes |
| bake-off rows (`proven-path-rows.ts` `toProvenPathPickRow`) | factor-breakdown market fair → proof receipt | no |

The identical-row set uses the **calibration loader's order** and records which source supplied
each row's market probability (`proof_receipt`, `factor_breakdown`, `resolver`,
`resolver_single_book`), so the table's `marketPSources` can be compared directly with
`calibrationEligibility.pSources`. The by-market bake-off is left exactly as it was.

**Metrics.** The same functions as every other cell on the truth surface
(`@sports/prediction-engine` `brierDecomposition`, `expectedCalibrationError`; results rounded to
four places by the engine): Brier, ECE on **10 equal-width probability bins**, Murphy
reliability / resolution / uncertainty, and separation (mean p on wins minus mean p on losses).

One correction to the dispatch wording: `apps/web/lib/calibration/compute.ts` `BUCKETS` are the
**five 10-point confidence buckets** (50-59 … 90-100) the `/calibration` chart displays. They are
not the 10 equal-width probability bins the floors and `scoreBakeoffByMarket` use. Using the chart's
buckets here would have made the ECE incomparable with `calibrationEligibility.ece`, so the engine's
bins are used and the difference is stated on the artifact's `notes`.

**Bootstrap.** Seeded percentile interval (2.5% to 97.5%), 200 resamples, `mulberry32` seed
20260908, deterministic. The **same index draws are applied to every score** (paired), so
`brierGapVsMarketCi95` on each non-market score is the interval of
(that score's Brier − marketFairProb Brier) on the same resampled rows. An interval entirely above
zero means the market beats that score on the identical rows at the 95% percentile level.
Per-score `brierCi95` and `resolutionCi95` are reported as well.

**Slices.** The whole table repeats per sport (`bySport`) and per model version
(`byModelVersion`), each with its own paired bootstrap on its own rows.

**Sensitivity (confound 2).** `buildScoreBakeoffIdenticalRows` accepts `excludeGameIds`. With a
non-empty set it recomputes the pooled table without those games and reports how many rows were
removed. Without one it emits `{ status: "NOT RUN", command: "npm run ops:verify-scores -- --json" }`.
The classifier behind that command (`scripts/ops/lib/score-reconciliation.ts`, PR #720) is pure and
importable without a database, but its inputs are the stored `games` rows and the live ESPN finals,
so the truth surface cannot fill this cell on its own and does not pretend to.

## 3. Code path

| file | change |
|---|---|
| `apps/web/lib/calibration/identical-row-bakeoff.ts` | new: `selectIdenticalRows`, `scoreIdenticalRows`, `buildScoreBakeoffIdenticalRows`, types, constants |
| `apps/web/lib/calibration/proven-path-engine.ts` | `ProvenPathPlan.scoreBakeoffIdenticalRows?` and an `identicalRows` option on `buildProvenPathPlan`; bestScore, `scoreBakeoff`, the sweep and the pause list are unchanged with or without it (asserted by test) |
| `apps/web/lib/ops/proven-path-seed.ts` | `loadRows` also selects `id`, `gameId`, `generatedAt`, `selection`, `modelVersion`, `settledAt` and the team names, runs the read-only odds-table resolver (`loadPublishTimeMarketPResolver`, one `odds.findMany`), and passes the selection into the plan. Best-effort: a failed odds read leaves the plan as before and the table absent. |
| `apps/web/__tests__/identical-row-bakeoff.test.ts` | 16 tests; every expected number is worked by hand in the fixture comments |

Surface: `GET /api/ops/public-surface-truth` → `provenPath.scoreBakeoffIdenticalRows`, next to
`provenPath.scoreBakeoffByMarket`. The route already answers through `jsonNoStore`; the plan is also
persisted by `persistProvenPathPlan` as before, so the durable plan carries the table from the first
read after deploy. No cron, flag, env variable or gate is added or read.

Not touched: `scripts/guardrails/**`, `MODEL_VERSION`, every floor, threshold, delta and pause group,
`schema.prisma`, migrations, `.github/**`, `.claude/**`, any `.env*`, `package-lock.json`.

## 4. Numbers

### 4a. Live truth surface, read-only, `generatedAt 2026-09-08T19:11:01.145Z`, deployed sha `8cc0695`

`provenPath.scoreBakeoffByMarket`, MONEYLINE (the table this row exists to correct):

| score | n | Brier | ECE | Murphy RES | separation | coverage |
|---|---|---|---|---|---|---|
| confidence | 745 | 0.2332 | 0.1156 | 0.0118 | −0.0018 | 1.000 |
| independent_trueProb | 712 | 0.2338 | 0.0858 | 0.0080 | 0.0056 | 0.956 |
| blend_indep_conf | 712 | 0.2332 | 0.1016 | 0.0113 | 0.0045 | 0.956 |
| marketFairProb | 135 | 0.1781 | 0.1411 | 0.0038 | 0.0561 | 0.181 |

`provenPath.scoreBakeoff` (pooled across markets): confidence n 1823 Brier 0.2620 ECE 0.1029
RES 0.0023; independent_trueProb n 1132 Brier 0.2475; blend n 1132 Brier 0.2474;
marketFairProb n 1039 Brier 0.2337 ECE 0.0280 RES 0.0185. `bestScore = marketFairProb`.

`calibrationEligibility` at the same read: status GREEN, n 475, Brier 0.1898, ECE 0.0466,
`pBasis market_anchored_v2`, `pSources` proof_receipt 133 / factor_breakdown 0 /
market_p_single_book 226 / market_p_from_odds_table 116, consecutiveGreen 11 of 3, reasons `[]`.
(The dispatch context quoted a 19:01 UTC read with different eligibility values; this document
records what the surface said at 19:11:01 and does not reconcile the two.)

`provenPathExclusions`: three_way_market 128, no_market_probability 0, non_moneyline_market 0.
`provenPath.scoreBakeoffIdenticalRows`: **absent** (not deployed yet).

What the two loaders' difference already tells us, from the surface alone: the market cell in the
by-market table has n 135 while the eligibility sample on the same picks has n 475, and 342 of
those 475 come from the odds-table resolver the bake-off loader never calls. The identical-row set
is bounded above by min(712, 475) = 475 MONEYLINE rows and will be smaller than that, since a row
must carry an independent trueProb **and** a market probability.

### 4b. Identical-row table on production

| cell | value |
|---|---|
| n | NOT RUN |
| confidence: Brier / ECE / REL / RES / UNC / separation / Brier CI / RES CI / gap CI | NOT RUN |
| independent_trueProb: same | NOT RUN |
| blend_indep_conf: same | NOT RUN |
| marketFairProb: same | NOT RUN |
| marketPSources | NOT RUN |
| bySport, byModelVersion | NOT RUN |
| contradictedFinalsSensitivity | NOT RUN (and reads NOT RUN on the surface itself until the game ids are supplied) |

This session has no database access and did not attempt any. The table appears at
`provenPath.scoreBakeoffIdenticalRows` on the first truth-surface read after this branch deploys.

### 4c. Fixture numbers, produced by `npx vitest run __tests__/identical-row-bakeoff.test.ts` in `apps/web` (16 passed)

Four hand-worked rows (A: conf .6 ind .8 mkt .9 win; B: same, win; C: conf .6 ind .4 mkt .3 loss;
D: conf .6 ind .4 mkt .3 win). Base rate .75, uncertainty .1875 on every score.

| score | Brier | ECE | REL | RES | separation |
|---|---|---|---|---|---|
| confidence | 0.21 | 0.15 | 0.0225 | 0 | 0 |
| independent_trueProb | 0.15 | 0.15 | 0.025 | 0.0625 | 0.2667 |
| blend_indep_conf | 0.17 | 0.15 | 0.045 | 0.0625 | 0.1333 |
| marketFairProb | 0.15 | 0.15 | 0.025 | 0.0625 | 0.4 |

Brier = UNC + REL − RES holds on every row. On a 60-row fixture where the market is closer to the
outcome than confidence on every single row (per-row squared error .01 against .16), the paired
gap interval is exactly [0.15, 0.15] and every per-score interval contains its point estimate.
Two runs with the default seed produce byte-identical JSON; two different seeds produce different
intervals.

Red-check (each mutation applied to the module alone, tests rerun, module restored and verified
identical to the original):

| mutation | result |
|---|---|
| blend returns independent trueProb instead of the 50/50 blend | 2 failed, 14 passed |
| separation sign flipped | 1 failed, 15 passed |
| empty exclusion set treated as a run | 1 failed, 15 passed |
| bootstrap unpaired (fresh random index per score) | 1 failed, 15 passed |

## 5. How the founder fills the sensitivity cell

On a machine with `DATABASE_URL` (read-only is enough; the tool is SELECT-only) and PR #720 merged:

```
npm run ops:verify-scores -- --json
```

Collect the game ids it reports as contradicted. Then either

- run the table locally with those ids in `excludeGameIds` (a ten-line script against
  `buildScoreBakeoffIdenticalRows`), or
- open a follow-up row to thread the ids into `proven-path-seed.ts`. That would need the reconciler
  to run against ESPN inside a request path, which is a new external dependency on the truth surface
  and a founder decision, so it is not done here.

## 6. Merge dependencies and risks

- **No merge dependency on `main`**: everything this branch needs is on `8cc0695`.
- **PR #720**: the sensitivity command exists only there. The NOT RUN cell names it either way. If
  #720 lands first, nothing here conflicts with its C-253/C-255/C-257 changes: those alter where the
  *slate* writes `marketFairProb` and how `/api/v1/probabilities` reads it; this row reads through
  the calibration loader's resolver, which already handles both the nested and the top-level field.
- **Ledger numbering**: C-261 was chosen as the next number above #720's C-260. Six sibling sessions
  are dispatching in parallel; a duplicate number is a merge conflict the ledger guard will catch.
- **Cost**: one extra `odds.findMany` per truth-surface read (the same query the six-hourly cron
  already runs), bounded by the 2000-pick window and the 60/min rate limit already on the route.
- **What this does not do**: it does not change `bestScore`, any floor, the streak, the pause list,
  the selective delta, or anything that publishes. It is a measurement, read-only, next to the
  measurement it corrects.
