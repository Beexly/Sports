# Provenance decision brief — engine adapter layer

Branch: `hermes-surf-16-provenance-fix` · Scope: the 11 `packages/prediction-engine/src/engine/*-adapters.ts`
files · Read-only analysis. No adapter, source file, or test was modified.

## The defect being judged

All 11 adapter files open with a header asserting:

> "These are NOT metadata wrappers. Each adapter invokes the real computation."

Not one of them does. Every adapter's only import from the engine is
`import type { Observation, FailClosedResult, AdapterResult }` — a **type** import,
erased at compile time. Every value an `Observation` carries is computed inline in
the adapter body, while the `provenance` string names a `module#symbol` that the
file never value-imports. The header is false in the strong sense: for every
violating claim there is no call site, and for the gated cases no call site should
be added.

## Counting basis and reconciliation

Extraction (regex over quoted `provenance` strings, cross-checked against every
`import { … } from` clause in the same file):

| Measure | Count |
|---|---|
| Provenance string occurrences | 109 |
| Distinct provenance strings | 99 |
| Distinct claims genuinely backed by a real value import | **41** |
| Violation sites (module named, never value-imported) | **68** |
| Distinct violating claims | 62 |
| Violation sites excluding directory-prefix claims | **52** |

`41` matches the parent count exactly, and `68 − 16 = 52` matches it exactly once
the 16 directory-prefix claims (`"packages/prediction-engine/src/calibration/"` and
friends) are set aside — those name a directory, not a `module#symbol`, so they are
not "claims" in this task's sense. The buckets below therefore total **52**, and
the 16 directory claims are reported separately at the end as a distinct defect.

Of the 52: 7 name a module that is absent from disk, and 1 names a symbol that does
not exist. Both figures match the parent count.

## Decision rule

Each violating claim is judged on two independent questions, because they have
different remedies:

1. **Is the inline math the real function?** (faithful vs divergent)
2. **Is the named module cleared for a live published path?** Its own docblock
   states an `ACCEPTANCE GATE`, `Research-only`, or `not wired into any live path`.

Verdict follows the second question when it bites, since a claim that a gated
module backs is a claim the module itself has not authorised:

- **(a) DROP-IN** — math is faithful *and* the module is ungated. Wiring a real call
  site is cheap and obviously right. Fix now.
- **(b) GATED** — the module declares an unmet acceptance gate or research-only
  status. Calling it from a published adapter would assert an adoption the gate has
  not cleared, so **delete the claim**. Sub-split by whether the math is faithful
  (restoring it later is a one-line import) or divergent (restoring it also needs
  real work).
- **(c) GENUINE WORK** — module is ungated and the real function exists, but the
  inline math is a different quantity on a different input contract. Making the
  claim true means implementing real behaviour; needs its own task.
- **(d) NO TARGET** — no module on disk, or no such symbol. Fabricated citation;
  delete. (The parent asked for three buckets; this fourth is reported separately
  rather than forced into (b), because "gated" would misdescribe it.)

## Summary

| Bucket | Sites | Cheapest honest action |
|---|---:|---|
| (a) DROP-IN | **1** | Wire the real call site now |
| (b) GATED — math faithful | **10** | Delete claim; restore is a 1-line import if the gate clears |
| (b) GATED — math divergent | **19** | Delete claim; re-adoption also needs real work |
| (c) GENUINE WORK | **15** | File as implementation tasks |
| (d) NO TARGET | **7** | Delete claim (fabricated / misnamed) |
| **Total** | **52** | |

**Headline: 46 of 52 claims should be deleted, 1 can be fixed cheaply today, and 15
name an ungated real function that the adapter should actually be calling.** The
cheap fix is `devig`; the flagship genuine-work item is `computeTurnoverLuck`.

---

## (a) DROP-IN — 1 site

| # | Claim | Adapter fn | Why |
|---|---|---|---|
| 1 | `devig/oracle.ts#devig` | `devigOracleAdapter` (market-odds-adapters.ts:149) | Module is ungated and its docblock explicitly says it is "the reference implementation" for field integration. The adapter's `implied/total` normalisation is exactly `devig(odds,"multiplicative")`. Needs a small shim — the real function takes **decimal** odds and a real `DevigMethod`, the adapter takes **American** odds and a `method` it only echoes into `raw` as the string `"proportional"`. So: convert American→decimal at the edge, pass a genuine `DevigMethod`, and either surface the other six methods or drop the phantom `method` field. ~15 lines, no new maths, and it makes six unused methods available for free. |

## (b) GATED, math faithful — 10 sites

The real function computes the same thing the adapter computes. The only obstacle
is that the module declares itself unwired pending a gate. Delete the claim; if the
gate clears, re-adding the import is mechanical.

| # | Claim | Adapter fn | Gate that blocks it | Note |
|---|---|---|---|---|
| 2 | `spread-winprob-map.ts#steamNullExceedanceRate` | `steamExceedanceAdapter` (market-odds:69) | `Φ(p/13.588)` Brier gate; "pure math kernel, not wired into any live path" | Real and adapter are the same filter-and-divide, same default threshold of 1. |
| 3 | `spread-winprob-map.ts#isLargeLineMove` | `largeLineMoveAdapter` (market-odds:54) | same | Real is `|move| > 1`; identical at the adapter's default. The real's second parameter is `nullProb` (and is `void`ed), not a threshold — so drop the adapter's `threshold` override or keep it and stop attributing it to this function. |
| 4 | `davidson-ties.ts#davidsonProbs` | `davidsonProbsAdapter` (ratings-weather:70) | "strength-dependent-nu Davidson beats constant-nu by ≥0.005 OOS log-loss" | Adapter is the real formula at `homeEdge = 1` (the real default) with constant `nu = 0.3` — i.e. exactly the constant-nu baseline the gate benchmarks against. The strongest of the ten if the team scopes the gate narrowly. |
| 5 | `ip-portfolio.ts#shrinkVariance` | `shrinkVarianceAdapter` (dfs:96) | "ADAPT iff … variance-floor + overlap-cap portfolios beat independent-greedy" | Same shrinkage formula, same `priorWeight = 10` default. Only delta: adapter defaults `nObs` to 1 where the real throws on `nObs < 0`. |
| 6 | `cluster-salary-screen.ts#teammateDifferential` | `teammateDifferentialAdapter` (dfs:46) | "ADOPT … iff flagged 'undervalued' players outscore … p < 0.05 over ≥40 slates" | Real is `toRoleRate - offRoleRate`; the adapter is the same subtraction. |
| 7 | `payout-framework.ts#powerLawShares` | `powerLawSharesAdapter` (dfs:135) | "ADAPT iff … reproduces the paper's qualitative claims … not wired into any live path" | Adapter builds the same `r^(−α)` vector, normalises identically, and emits `shares[0]/total` — which is precisely `powerLawShares(n, α)[0]`. It returns a count of one element of a function that returns the array. |
| 8 | `g-score.ts#zValue` | `zValueAdapter` (fantasy-injury:44) | "ADAPT iff … G ≥ 12% win rate, beats Z by ≥5pp … Research-only" | Real is `(mu − replacement)/sigma`; the adapter is the same line with its own guards. |
| 9 | `calibration-horserace.ts#brier` | `brierScoreAdapter` (real-signal:229) | "ADOPT the BNN head only iff it beats the best ex-post calibrator (paired DM at 5%)" | Identical mean-squared-error loop. Note the gate names the **BNN head**, and `brier` is the post-hoc metric the gate says to *keep* in the reject branch — the narrowest reading of any gate here. |
| 10 | `calibration-horserace.ts#logLoss` | `logLossAdapter` (real-signal:263) | same | Identical, including the `1e-15` clamp semantics via the real's `clampP`. |
| 11 | `1905-07886-conformal-ncp-intervals.ts#conformalInterval` | `conformalIntervalAdapter` (real-signal:565) | "ADOPT NCP if nominal coverage within 2pp AND mean width ≤ plain-CP width"; gate status NOT EVALUATED | Real returns `[yhat−qhat, yhat+qhat]`; the adapter computes both endpoints and emits the width. This is the **plain-CP** function, which the gate does not reject — the most defensible re-adoption candidate of the ten. |

## (b) GATED, math divergent — 19 sites

Delete the claim. Re-adoption would additionally require implementing or fixing the
math, so these are not one-line restores.

| # | Claim | Adapter fn | Gate | Divergence |
|---|---|---|---|---|
| 12 | `spread-winprob-map.ts#spreadToWinProb` | `spreadToWinProbAdapter` (market-odds:30) | "adopt Φ(p/13.588) iff 2012–2025 Brier within 0.002" | Real: `Φ(spread/13.588)`, no negation. Adapter: `Φ(−spread/13.45)` with a hand-rolled Abramowitz–Stegun `erf`. **Both the constant and the sign differ.** The gate is precisely about which curve is canonical, so this is the clearest case in the set of a claim that asserts an unearned number. |
| 13 | `book-overround-bandit.ts#naiveOverroundForecast` | `overroundForecastAdapter` (market-odds:93) | "ADAPT confirmed iff … ≥10% lower MAE than the naive baseline" | Real is a flat arithmetic mean. Adapter is an exponentially weighted moving average (decay 0.9). Wiring the real function would change every published value — the claim names the gate's own control arm and computes something else. |
| 14 | `bradley-terry.ts#btWinProb` | `bradleyTerryAdapter` (ratings-weather:32) | "adding omega_n reduces moneyline Brier by ≥0.002" | Real requires a fitted `BtFit` strengths map keyed by team name and throws on an unknown team; the adapter takes two scalars and a hardcoded `homeEdge = 1.15`, computing a log-odds form. Different input contract. |
| 15 | `csf-triple-compare.ts#csf` | `csfAdapter` (ratings-weather:51) | "adopt the serial CSF iff LOOCV win-RMSE beats optimized Tullock by ≥0.2 wins"; Research-only | Real `csf(pf, pa, alpha, form)` discriminates three published forms (Tullock, difference, serial). The adapter computes `(pf−pa)/(pf+pa)^(α−1)` — **a fourth form that appears nowhere in the module.** |
| 16 | `cycle-diagnostics.ts#cycleRate` | `cycleRateAdapter` (ratings-weather:85) | "deploy as a monitoring diagnostic; lack-of-fit flags at p < 0.01" | Real counts directed 3-cycles from a `Map<string, Set<string>>` adjacency graph and divides by C(n,3). The adapter takes the numerator as an input and divides by `n³`, and has no graph. Different denominator *and* a missing input. |
| 17 | `2109-09287-…#windChill` | `windChillAdapter` (ratings-weather:100) | stadium-factor table gate; NOT EVALUATED | Real guards `if (tempF > 50 \|\| windMph < 3) return tempF`. The adapter applies the NWS polynomial unconditionally, so at 75 °F it reports a wind chill *below* air temperature — the exact case the real refuses to answer. |
| 18 | `2109-09287-…#heatIndex` | `heatIndexAdapter` (ratings-weather:113) | same | Real is the full Rothfusz regression with a `tempF < 80 → return tempF` guard. Adapter is a linear approximation `t + 0.5(rh/100)(t − 50)` with no guard. Not the same function. |
| 19 | `2109-09287-…#passWeatherImpact` | `passWeatherImpactAdapter` (ratings-weather:133) | same | Real takes precipitation in **inches**, thresholds wind > 12 and temp < 25, and returns a **positive penalty** bounded to 1.5. Adapter takes precipitation as a **percentage**, thresholds temp < 35 / > 95, and returns an unbounded **signed** sum. Units, thresholds and sign all differ. |
| 20 | `2109-09287-…#fgWeatherAdj` | `fgWeatherAdjAdapter` (ratings-weather:151) | same | Same shape (base prob minus weather penalties, clamped) but different coefficients, thresholds and clamp floor: real `−0.004(w−10)` above 10 mph and `−0.02` below 32 °F, clamped to [0.01, 0.99]; adapter `−0.005w` with no threshold, `−0.05` below 35 °F, clamped to [0.05, 0.99]. |
| 21 | `cluster-salary-screen.ts#flagUndervalued` | `flagUndervaluedAdapter` (dfs:33) | "ADOPT … iff … ≥10% in points-per-$1K, paired t < 0.05, ≥40 slates" | Real computes a lognormal salary percentile within a (position, cluster) cell over a full `SlatePlayer[]`. The adapter computes a points-per-$1K ratio against a positional average. Different quantity, and it needs a slate it has no way to receive. |
| 22 | `dominance-pruning.ts#paretoFilter` | `paretoFilterAdapter` (dfs:77) | "adopt iff it reproduces unpruned optima with ≥10× speedup"; "Research-only module. Not wired into any live DFS path" | Real buckets by `(position, floor(salary/500))` and returns the kept player set. The adapter has no position, no bucketing, and returns a **count** instead of a set. |
| 23 | `ip-portfolio.ts#stackBonus` | `stackBonusAdapter` (dfs:109) | ip-portfolio gate | Real walks a `DfsPlayer[]` for a QB and same-team WR/TE (+1.5) and bring-backs (+0.5). The adapter computes `(playerCount − 1) × correlation × 0.5` from two scalars — no positions, no teams, no stacking structure. |
| 24 | `g-score.ts#playerMoments` | `playerMomentsAdapter` (fantasy-injury:30) | g-score gate; Research-only | `mu` matches, but the real `tau` is the **sample** SD (`n−1` denominator) and the real throws below 2 weeks; the adapter's `tau` is the **population** SD (`n`). |
| 25 | `g-score.ts#gPerDollar` | `gPerDollarAdapter` (fantasy-injury:57) | same | Real takes an array of `PlayerLog & {kappa, sigma, replacement}` and computes the G transform itself via `gValue`/`playerMoments`, returning a sorted array. The adapter takes a **pre-computed** scalar `gScore` and divides — it performs the final arithmetic step while skipping the entire G model the gate is about. |
| 26 | `1705-03918-…#attEstimate` | `attInjuryEffectAdapter` (fantasy-injury:74) | "ADAPT if … Iv width ≤1.4× Ic width AND Gamma ≥1.3"; NOT EVALUATED | Real takes `MatchedPair[]` and averages **per-pair differences in ATS residuals**. The adapter takes two independent outcome arrays and differences their means — a different estimator, on un-residualised inputs. |
| 27 | `1801-07104-…#repetitionContrast` | `hotHandAdapter` (fantasy-injury:93) | "ADAPT … if within-drive repetition ≥ +2pp with \|z\|>3 … REJECT if both \|z\|<2" | Real is an inverse-variance-weighted fixed-effect meta-analysis of **success rate** at touch index 1 vs 0, pooled across players with ≥10-per-group minimums. The adapter counts adjacent pairs where both touches > 0 and never looks at a success outcome at all. Different estimator entirely. |
| 28 | `nfl/parsimonious-season.ts` (no symbol) | `parsimoniousSeasonAdapter` (real-signal:506) | "ADOPT … as the engine's weeks-1-6 prior only iff it beats the current prior by ≥0.03 OOS R²" | Module is ungated-by-symbol but gated as a whole; real exports are `maeNullTable`, `scheduleAdjustedDiff`, `fitWinsRegression`, `predictWins`, `tableMae`. The adapter hardcodes `n = 32`, computes an MAE-null it never uses, and applies a bare `0.15 × pointDiff` coefficient. |
| 29 | `nfl/skellam-margin.ts` (no symbol) | `skellamMarginAdapter` (real-signal:535) | "adopt iff OOS Brier < climatology by ≥0.02 AND cover-calibration slope in [0.9,1.1]" | Real exports a full Skellam distribution (`marginProbs`, `coverProb`, `skellamPMF`, `predictMarginProbs`, Bessel `I_n`). The adapter returns a plain score difference and computes a `total` it never uses. No distribution is formed. |
| 30 | `nfl/block-poisson.ts` (no symbol) | `blockPoissonAdapter` (extended-signal:158) | "ADOPT the block-Poisson chance-rate layer iff, on 2025 …" | The module is a chance-rate **fitting** kernel (`fitChanceRates`, `dawidSebastiani`, `poissonLogLik`, `logLambda`). The adapter returns `lambdaHome − lambdaAway` — a fitted-rate consumer, not the fitter the claim names. |

## (c) GENUINE WORK — 15 sites

Ungated modules, real function exists, but the adapter's inline math is a different
quantity on a different input contract. These are the claims where the honest fix
is to **do the work**, not to delete the string. Ordered by value.

| # | Claim | Adapter fn | What the real function actually does | Why the adapter isn't it |
|---|---|---|---|---|
| 31 | `signals/turnover-luck.ts#computeTurnoverLuck` | `turnoverLuckAdapter` (real-signal:88) | Five-input decomposition (defensivePlays, opponentDropbacks, fumblesForced, fumblesRecoveredByTeam, interceptions) returning occurrence-over-expected and recovery-over-expected as **separate** components; returns `null` on thin samples; nulls `recovery` independently below `minFumblesForced`. | The adapter is three lines: shrink `(takeaways − giveaways)` toward the expected margin with a hardcoded `0.463` recovery share and `4.5` points-per-turnover, collapsed to **one scalar**. The module's docblock specifically forbids this: components are "never summed into one scalar (a caller who wants a single number is making a weighting decision this module has not fit and will not invent)". The adapter invents exactly that weighting. Highest-value fix in the set; note the `null` contract is a behavioural change every caller must handle. |
| 32 | `signals/opponent-adjusted-epa.ts#computeOpponentAdjustedEpa` | `opponentAdjustedEpaAdapter` (real-signal:126) | Iterative solver (tolerance, maxIterations, damping, minGames, week-1 priors, shrinkage fade) returning adjusted splits, iteration count, convergence and league averages. | The adapter play-weights off/def EPA and subtracts. **There is no opponent adjustment anywhere in it** — the defining word of the function it claims is absent. |
| 33 | `expected-metrics/expected-points.ts#predictExpectedPoints` | `expectedPointsAdapter` (real-signal:161) | `Σ P(outcome)·value(outcome)` from a fitted score-distribution model; provably in [−7, 7]. | The adapter is a hand-weighted linear sum with invented coefficients (base 1.5, field weight 2.5, a down-difference table). No model, no distribution, no bound. |
| 34 | `expected-metrics/win-probability.ts#predictLogistic` | `winProbabilityAdapter` (real-signal:193) | **No such export exists.** The real export is `predictWinProbability`, which takes a fitted `WinProbabilityModel`; the module also exports `winProbabilityAdded`. | Two separate defects: the symbol name is fabricated, *and* the adapter hand-rolls a logistic on score/time/field/spread. Correcting the name alone still leaves genuine work, because the real function is model-driven. This is the only claim in the set that is wrong on **both** axes. |
| 35 | `market/steam-curvature.ts#detectSteam` | `detectSteamAdapter` (market-odds:112) | Curvature/braking detector over an `OddsSample` series; **requires** `options.mode` of `"causal"` or `"retrospective"` with no default; returns `null` or a result carrying `reason`. | The adapter is a three-scalar threshold rule (`|move|>1.5 && velocity>0.5 && bookCount>=3`) with no trajectory, no deceleration ratio, and no mode. The module is ungated and is explicitly built for live use — the missing `mode` is the module's own anti-leakage guard, so this is real work worth doing. |
| 36 | `odds/favorite-longshot-audit.ts#bucketRoi` | `bucketRoiAdapter` (market-odds:128) | Per-bucket flat-stakes ROI priced at each observation's own implied probability; validates implied ∈ (0,1] and throws rather than clamping. | The adapter takes `totalStaked`/`totalReturned` and returns one global ROI — and **ignores its own `bucketCount` argument entirely** (dead parameter). No per-bucket pricing, no validation. |
| 37 | `expected-metrics/expected-completion.ts#computeCpoe` | `expectedCompletionAdapter` (extended-signal:33) | Per-player CPOE over `DropbackPlay[]` against a fitted `ExpectedCompletionModel`, with a min-attempts filter. | Right shape, wrong rig: the adapter receives `expectedCompletions` already computed and does a three-scalar difference. **This claim is a duplicate** — `expected-metrics-adapters.ts:198` already wires the real `computeCpoe` with a value import. Delete this site outright. |
| 38 | `expected-metrics/drives.ts#buildDrives` | `drivesAdapter` (extended-signal:72) | Partitions plays by game, segments drives, and emits drive objects with a model version and feature-schema hash. | The adapter **consumes** three already-averaged per-drive scalars and echoes `pointsPerDrive`. It builds nothing — the contract is inverted relative to the function it names. |
| 39 | `expected-metrics/expected-yac.ts` (no symbol) | `expectedYacAdapter` (extended-signal:46) | Exports `computeYacOverExpected`, `predictExpectedYac`, `fitExpectedYacModel`. | Adapter is `actualYac − expectedYac`. Smallest genuine-work item here: likely reduces to naming the right symbol and threading a model, since the two scalars are already the actual/expected pair. |
| 40 | `expected-metrics/success-rate.ts` (no symbol) | `successRateAdapter` (extended-signal:59) | Exports `isSuccessfulPlay`, `successRateByTeam/Player/Down/Situation`. | Adapter is `successfulPlays / totalPlays` — a defensible aggregate, but no named function backs it. Needs a symbol named and per-play data threaded. |
| 41 | `nfl/qb-burden.ts` (no symbol) | `qbBurdenAdapter` (extended-signal:88) | Exports `gseQbBurden`. | Adapter is `dropbacks / teamPlays`, and ignores the `epaPerDropback` it is handed. |
| 42 | `nfl/receiver-difficulty.ts` (no symbol) | `receiverDifficultyAdapter` (extended-signal:102) | Exports `gseReceiverDifficulty`. | Adapter is `targetShare × (1 + (2.5 − separation)/5)` — a hand-rolled fudge around a hardcoded 2.5 — and ignores `cushion`. |
| 43 | `nfl/role-volatility.ts` (no symbol) | `roleVolatilityAdapter` (extended-signal:115) | Exports `gseRoleVolatility`. | Adapter averages two variances, which is not a volatility estimator. |
| 44 | `nfl/rush-environment.ts` (no symbol) | `rushEnvironmentAdapter` (extended-signal:129) | Exports `gseRushEnvironment`. | Adapter is a linear blend `−0.05·boxCount + runDefEpa + 0.1·YBC`. |
| 45 | `nfl/margin-mixture-model.ts` (no symbol) | `marginMixtureAdapter` (extended-signal:145) | A full mixture API: `fitNflMarginMixture`, `keyMassAt`, `continuousDensity`, `mixtureCdf`, `coverProbability`, `homeCoverProbability`, plus `NFL_KEY_NUMBERS`. | Adapter returns a **plain margin difference** and computes a `totalVariance` it never uses. It engages with no part of a mixture model. |

## (d) NO TARGET — 7 sites

The named module is absent from disk. There is nothing to wire and nothing to gate;
the citation is fabricated and the claim must be deleted. In each case the adapter
computes a plausible-looking heuristic with hardcoded coefficients, which is the
most dangerous shape of this defect — the number looks like a real signal.

| # | Claim | Adapter fn | What the adapter actually computes |
|---|---|---|---|
| 46 | `signals/wind-elasticity.ts` | `windElasticityAdapter` (real-signal:288) | `−(wind/20) × 0.15` on pass plays |
| 47 | `signals/injury-trajectory.ts` | `injuryTrajectoryAdapter` (real-signal:323) | status-substring lookup → base impact × a games-missed decay |
| 48 | `signals/redzone-te-leverage.ts` | `redzoneTeLeverageAdapter` (real-signal:351) | three hardcoded leverage tiers on a red-zone target share |
| 49 | `signals/schedule-density.ts` | `scheduleDensityAdapter` (real-signal:381) | rest penalty tiers minus `games/7 × 0.1` |
| 50 | `signals/qb-receiver-continuity.ts` | `qbReceiverContinuityAdapter` (real-signal:411) | `min(1, gamesTogether/16) × targetShare`, two hardcoded tiers |
| 51 | `signals/coaching-tendencies.ts` | `coachingTendenciesAdapter` (real-signal:443) | three leans subtracted from hardcoded league means (0.5 / 0.25 / 0.3) |
| 52 | `signals/referee-crew-tendencies.ts` | `refereeCrewTendenciesAdapter` (real-signal:473) | `foulRate − 0.12` hardcoded league average |

All seven sit in `real-signal-adapters.ts`, which is the file with the most
fabricated citations. Its header claims it "wires exported functions from … into the
engine"; for these seven it wires nothing at all.

---

## Separate finding: 16 directory-prefix claims

Not counted in the 52 (they name no `module#symbol`), but they are the same class of
defect and should be swept in the same change. All are in `extended-signal-adapters.ts`:

| Claim | Sites | Adapters |
|---|---:|---|
| `packages/prediction-engine/src/calibration/` | 2 | `eceAdapter` (187), `reliabilityDiagramAdapter` (202) |
| `packages/prediction-engine/src/ratings/` | 2 | `teamRatingAdapter` (218), `eloRatingAdapter` (233) |
| `packages/prediction-engine/src/weather/` | 3 | `weatherImpactAdapter` (253), `altitudeFatigueAdapter` (269), `travelFatigueAdapter` (286) |
| `packages/prediction-engine/src/injuries/` | 2 | `injuryImpactAdapter` (304), `depthChartAdapter` (318) |
| `packages/prediction-engine/src/props/` | 2 | `propEdgeAdapter` (367), `propLineValueAdapter` (381) |
| `packages/prediction-engine/src/fantasy/` | 1 | `fantasyProjectionAdapter` (336) |
| `packages/prediction-engine/src/dfs/` | 1 | `dfsValueAdapter` (351) |
| `packages/prediction-engine/src/devig/` | 1 | `devigAdapter` (399) |
| `packages/prediction-engine/src/odds/` | 1 | `lineMovementAdapter` (413) |
| `packages/prediction-engine/src/market/` | 1 | `consensusAdapter` (427) |

A directory is not a computation. Each of these names a folder that contains many
candidate kernels, none of which the adapter calls.

One of these is a near-certain mislabel rather than an invention:
`devigAdapter` (extended-signal:399) normalises implied probabilities by their sum,
which **is** `devig(odds, "multiplicative")` from the ungated `devig/oracle.ts` —
the same fix as item 1 above. The remaining 15 name directories with no identifiable
real counterpart and should simply lose the provenance string, or be relabelled to
name the engine's own inline heuristic explicitly (e.g. a `engine-inline:` prefix) so
the distinction between a paper-derived kernel and a local approximation is visible
to every downstream reader.

## Recommended sequence

1. **Cheap and safe now (1 site).** Wire `devig/oracle.ts#devig` in
   `devigOracleAdapter`, with an American→decimal conversion and a real
   `DevigMethod`. Same change fixes `extended-signal:399`.
2. **Delete, no behaviour change (29 sites).** The 10 faithful-gated and 19
   divergent-gated claims. Removing a false provenance string changes no computed
   value, so this is a pure honesty fix and needs no modelling decision.
3. **Delete, fabricated (7 sites + 15 directory claims).** No behaviour change.
   Then correct the `predictLogistic` → `predictWinProbability` name in the
   bookkeeping even though the underlying work is item 34.
4. **File as implementation work (15 sites).** Prioritise `computeTurnoverLuck`
   (item 31) — the adapter currently invents a single weighted scalar its module
   explicitly refuses to produce, and it carries the most fabricated constants in
   the layer (0.463, 4.5). Then `computeOpponentAdjustedEpa` (32) and
   `predictExpectedPoints` (33), which are ungated model-driven functions whose
   absence means the published numbers are coefficient inventions.
5. **Fix the headers.** All 11 files assert "Each adapter invokes the real
   computation." After step 2 the accurate statement is per-adapter, not per-file.
   Whichever header text is chosen, it must be true of the 41 backed claims without
   implying it of the rest.
