# HANDOFF v2b — Indie model-builder kernels, builds 7–15 (FULL SPEC)

Date: 2026-09-25. From: Motif. For: the coding agent.
Companion to handoff-indie-builders-v2-fullspec-2026-09-25.md (builds 1–6, same folder). Together they cover all 15 ranked builders.
Source: indie-model-builders-dossier-2026-09-25.md (same folder).

How to use this document: METHODOLOGY specs. The engine learns from each builder's approach and produces its own output — nothing is copied except where an MIT license explicitly allows it (Build 14 only, with attribution). No research needed; every build has exact inputs, method, output shape, which existing files to compose with, and what the test asserts.

---

## BUILD 7 — Per-play TrueSkill player ratings (SamuelLachance, open source)

His result: 14-feature stack with 11v11 per-play TrueSkill ratings beats team Elo alone (test log-loss 0.61919 vs plain Elo 0.63984 vs closing line ~0.609). Weekly QB Kalman fusion, opponent quality, salary cohort priors. He measured the closing line statistically ENCOMPASSING his model — and published that.

### Spec

1. New file `packages/prediction-engine/src/nfl/trueskill-player-ratings.ts` (+ test). New files only.
2. Method:
   - Treat each play as a contest between 11 offensive and 11 defensive players. Update every participant's TrueSkill (mu, sigma) from the play outcome (EPA bucketed to win/draw/loss per side).
   - Team strength = sum of the 11 starters' mu (offense and defense separately).
   - Weekly QB Kalman fusion: fuse the QB's TrueSkill mu with the prior week's via a Kalman update step (treat weekly observed QB EPA as the measurement).
   - "Devigged close as theoretical floor": evaluate log-loss against team Elo AND against the de-vigged closing line; report all three (his encompassing test — if adding the model to the market makes the forecast worse, say so).
3. Output: `{ playerId, mu, sigma }` ratings + `{ team, offStrength, defStrength }` aggregates.
4. COMPOSE WITH: `packages/feature-store/src/metrics/tuned-elo-2403.ts` (evaluation neighbor), `nflverse-cache.ts` (play data with player participation).

### Test asserts

- Fixture: a player with consistently positive-EPA plays rises in mu; a benched player's sigma widens (uncertainty grows).
- Team aggregate from 11 starters differs from team-only Elo on a fixture with a star QB injured (the whole point).
- Encompassing check runs on a fixture and reports the verdict numerically.

---

## BUILD 8 — Dynamic Elo + SoS-adjusted efficiency (Daniele Comitogianni, methodology only)

His recipe: decade of play-by-play, dynamic Elo ratings, efficiency metrics ADJUSTED for strength of schedule (his SoS adjustment dropped the Patriots' defense from 5th raw to 11th), three models (XGBoost, RF, Ridge) + 100,000 Monte Carlo → win prob, spread, projected score (62%, −3, 23-20).

### Spec

1. New file `packages/prediction-engine/src/nfl/sos-adjusted-efficiency.ts` (+ test). New files only.
2. Method:
   - Dynamic Elo: standard Elo with a margin-of-victory multiplier, updated weekly; one rating per team.
   - SoS-adjusted efficiency (the portable kernel): compute raw EPA/play per team (offense/defense), then solve iteratively like SRS — adjusted rating = raw rating − average opponent adjusted rating, iterated to convergence. A team that feasted on weak opponents drops (the 5th→11th pattern).
   - Feed `dynamicEloDiff` + `sosAdjOffEffDiff` + `sosAdjDefEffDiff` as features into the existing GBM (`ml-estimator.ts`) or the ensemble voter (indie Build 4).
3. Output: `{ team, rawOffEff, rawDefEff, sosAdjOffEff, sosAdjDefEff, dynamicElo }`.
4. COMPOSE WITH: `ml-estimator.ts` (consumer of the features), `nflverse-cache.ts`.

### Test asserts

- Fixture: team with +0.15 raw EPA/play against bottom-5 defenses ends SoS-adjusted BELOW a team with +0.10 against top-5 defenses.
- Iteration converges (delta < 1e-6 within 100 iterations) on a fixture.
- Dynamic Elo updates weekly and sums to ~zero across the league (Elo conservation).

---

## BUILD 9 — Score simulator + model-vs-market value framing + leakage lesson (Athena Huo, code on request)

Her recipe: 4,045 games back to 2010; refreshes with injury reports and weather; predicts FULL SCORES via simulation (27-24 style outputs); flags model-vs-market discrepancies as "value" (Kalshi 61% vs her sims); DOCUMENTED leakage fix — V1 trained on 2025 data = leakage, retrained as V2 (and said so publicly).

### Spec

1. New file `packages/prediction-engine/src/nfl/score-simulator.ts` (+ test). New files only.
2. Method:
   - Simulate each game N=10,000 times: sample each team's points from their scoring distribution (points-per-drive × expected drives, drive outcomes from nflverse) → most-likely score = mode of the joint distribution; win prob = share of sims won.
   - Refresh hook: injury report + weather inputs adjust the scoring distributions before simulation (documented inputs, not hardcoded teams).
   - Value framing: `value = simProb − marketImpliedProb`; flag |value| > 0.05 with direction ("model likes X, market says Y").
   - Leakage lesson as code: the module's trainer REJECTS any training row dated in or after the season being predicted — encode her V1→V2 fix as a hard gate, with a comment citing the lesson.
3. Output: `{ homeScore, awayScore, winProb, valueFlag }`.
4. COMPOSE WITH: `packages/prediction-engine/src/nfl/parsimonious-season.ts` and `dixon-coles.ts` (existing sim patterns), market de-vigging modules.

### Test asserts

- Fixture: mode score matches a hand-computed joint distribution on a tiny 2-outcome fixture.
- Trainer throws when given a 2025 training row for a 2025 prediction (the V1 lesson, enforced).
- Value flag fires on a fixture with simProb 0.65 vs market 0.55.

---

## BUILD 10 — LeakageGate + as-of time-fence + market blend-space discipline (jackc625, learn-only)

His rigor: Bronze/Silver/Gold lakehouse; three-level temporal safety — as_of_datetime time-fence on every feature, LeakageGate keyword scan, walk-forward splitter that HARD-FAILS on season overlap; model outputs blended with the market "in the mathematically appropriate space (log-odds for probabilities, point space for spreads and totals)"; blend weights tuned strictly on pre-2018 seasons so 2021–2024 backtest is never seen during weight selection. A release literally titled "Trust & Reproducibility — NO new product features."

### Spec

1. New file `packages/prediction-engine/src/nfl/leakage-gate.ts` (+ test). New files only.
2. Method:
   - `assertAsOf(features, asOf)`: every feature passed to a predictor must carry an `asOf` timestamp ≤ the prediction time; violation throws. No silent defaults.
   - Walk-forward splitter: `makeSplits(seasons)` yields {train, test} pairs; throws if any train season ≥ test season (hard fail on overlap).
   - Market blend: `blendModelMarket(modelProb, marketProb, w)` operates in LOG-ODDS space for probabilities (`logit` → weighted average → `expit`), and in POINT space for spreads/totals. Blending probabilities in probability space is a bug — the module refuses it (assert or separate function names so the wrong space can't be called).
   - Blend weights tuned on pre-2018 seasons only (constant in config, documented).
3. Output: the gate functions + `{ blendedProb }` / `{ blendedSpread }`.
4. COMPOSE WITH: `eval/edge-lab/sealed-split.mjs` (sealed-split discipline), `apps/web/lib/calibration/prereg-eval.ts` (gates live together).

### Test asserts

- Splitter throws on a fixture with train=[2023], test=[2022] (overlap/inversion).
- `assertAsOf` throws when a feature's asOf is after prediction time.
- Blend in log-odds space on a fixture matches hand-computed logit math; probability-space blending is not exposed.

---

## BUILD 11 — QB Elo + market regression as second-source benchmark (nfelo / Robby Greer, open source)

His model: separate team Elo and QB Elo (replicates/improves the old FiveThirtyEight QB model), regresses to market spreads for margin prediction, HFA/rest/weather. Public per-game win-prob CSVs. Caveat (his own docs): market-regressed, so NOT methodologically independent of the market — use as a benchmark, not a signal.

### Spec

1. New file `packages/prediction-engine/src/nfl/qb-elo-benchmark.ts` (+ test). New files only.
2. Method:
   - QB Elo: QB-specific Elo rating; update after each game weighted by the QB's share of team EPA (a QB who produced 80% of the offense moves his rating more than a game manager).
   - Margin = f(teamEloDiff, qbEloDiff) regressed toward the market spread (documented: this makes it a market-following benchmark, which is the point — it tells us what "Elo + market" thinks).
   - Benchmark comparison: join GSE's win probs vs the public nfelo CSVs per game; report divergence distribution; flag games where |GSE − nfelo| > 0.08 for analyst review (divergence is the product, not agreement).
3. Output: `{ qbId, qbElo }` + `{ gameId, gseProb, nfeloProb, divergence, flagged }`.
4. COMPOSE WITH: feature-store Elo metrics, market spread ingestion.

### Test asserts

- Fixture: QB producing 90% of team EPA in a win gains more Elo than one producing 30%.
- Benchmark join on a fixture flags exactly the games diverging > 8pp.
- Module header documents the market-regression caveat (it must never be presented as independent).

---

## BUILD 12 — Coach Intent Index + confidence-split reporting (R2, methodology only)

His ideas: ridge regression on 3,028 games since 2015 (recency-weighted) for power rankings; 1,000 sims per game; CONFIDENCE-SPLIT analysis — 60%+ picks went 9-1 vs sub-60% 2-4, and he publishes the split; original "Coach Intent Index" for preseason (which coaches actually try to win).

### Spec

1. New file `packages/prediction-engine/src/nfl/coach-intent-index.ts` (+ test). New files only.
2. Method:
   - Coach Intent Index (preseason): per head coach, historical preseason win rate + first-team reps share (when charted) + 4th-down aggressiveness in preseason → `intentScore` 0–1. In preseason games, shade the win prob toward the higher-intent coach: `adjProb = 0.5 + (prob−0.5)·(0.5 + 0.5·|intentDiff|)` directionally toward the trier. Regular season: index is informational only.
   - Confidence-split reporting: extend the ensemble voter (indie Build 4) to ALWAYS report record by tier — `{ tier: "60%+", record, n }` vs `{ tier: "sub-60%", record, n }` — the 9-1 vs 2-4 framing as a standing output, not a one-off analysis.
3. Output: `{ coach, intentScore }` + voter gains `recordByTier`.
4. COMPOSE WITH: indie Build 4 (ensemble voter — add the tier-split report there), `signals/situational/fourth-down-coaching-aggressiveness.ts` (preseason aggressiveness input).

### Test asserts

- Fixture: coach with 0.800 historical preseason win rate scores above one with 0.200.
- Tier-split report on a fixture computes 9-1 / 2-4 style splits correctly from pick outcomes.
- Regular-season games ignore the intent shading (flag off).

---

## BUILD 13 — Movelor CFB system + transparent error benchmarking (Barking Crow, open writeup)

His system: margin-of-victory-based Elo + recruiting — LOG-SCALED margin of victory, 247Sports Composite 5-year weighted talent (3-years-ago class double-weighted), preseason AP blend; HFA ≈ 3 pts; output = points/game vs average D-I team. The masterclass is the benchmarking honesty: "Movelor averaged 12.9 points error, closing spread 12.1, FPI 12.5, SP+ 12.3" — and he admitted the 2023 FSU/Georgia miss: "That's on us."

### Spec

1. New file `packages/prediction-engine/src/cfb/movelor-benchmark.ts` (+ test). New files only.
2. Method:
   - CFB ratings: Elo with LOG-scaled margin of victory (dampens 50-point blowouts); preseason prior = recruiting talent (5-year weighted composite, 3-years-ago class double-weighted) blended with preseason AP poll; HFA = 3 points.
   - THE META-KERNEL (applies beyond CFB): every prediction module gains a `benchmarkReport()` that reports its own average error ALONGSIDE the closing line's error and named public benchmarks — the transparent four-column table (model / closing / FPI / SP+). Wire this into the sealed ledger (indie Build 6) as a standing section.
3. Output: `{ team, ratingPtsVsAverage }` + `{ modelError, closingError, fpiError, spPlusError }`.
4. COMPOSE WITH: indie Build 6 (sealed ledger hosts the benchmark table), CFB data ingestion.

### Test asserts

- Fixture: 49-0 win moves the rating less than 2× a 21-14 win moves it (log scaling verified).
- Benchmark report on a fixture includes all four columns with no missing values.
- Recruiting prior: team with top-5 talent composite starts above an unranked team preseason.

---

## BUILD 14 — Pre-snap run/pass tendency engine (maximusdesir/engage8, MIT — code liftable with attribution)

His result: pre-snap run/pass prediction + defensive-tendency engine; LightGBM on 173,881 nflverse plays; time-split train 2019–21 / calibrate 2022 / test 2023: 69.7% accuracy vs 59.0% naive, ROC-AUC 0.766, Brier 0.192. Reports Brier over accuracy — the discipline Garrett asked for.

### Spec

1. New file `packages/prediction-engine/src/nfl/presnap-tendency.ts` (+ test). New files only.
2. Method:
   - Features from the pre-snap state only: down, distance, yardline, personnel grouping, formation, score differential, time remaining. Target: run vs pass. (His LightGBM → our GBM scaffold `ml-estimator.ts`, or reference his MIT repo with attribution: https://github.com/maximusdesir/engage8.)
   - Time-split discipline: train ≤2021, calibrate 2022, test 2023+ — hard-coded split, never shuffled.
   - Consumer: feeds the AI offensive coordinator (ethandojo Build 7) and the exploit finder (ethandojo Build 9) as the defensive-tendency input — this is the bridge between the two handoffs.
   - Report Brier and ROC-AUC, not just accuracy.
3. Output: `{ pRun, pPass, brier }` per pre-snap state.
4. COMPOSE WITH: `ml-estimator.ts`, ethandjo Builds 7 & 9 (consumers).

### Test asserts

- Fixture: 3rd-and-12 → pPass > 0.8; 3rd-and-1 → pRun > 0.6 (sanity).
- Time-split: training function throws if given a 2023+ row in the train set.
- Brier reported on the test fixture (value asserted in range, not a fixed number).

---

## BUILD 15 — EMA-differential features + weekly ledger template (cdinh92, learn-only)

His pipeline: nflreadpy → EMA (span 4) feature engineering → XGBoost → 80/20 ensemble with odds-vig-strip; features compressed to 9 EMA DIFFERENTIALS (off_epa, def_epa, off_cpoe, net_yds_per_play…); shift(1) leakage prevention; weekly ops log with per-game confidence tiers, model blend %, Vegas-implied %, edge per matchup, and diagnostic notes on failures (road underdogs). Only 2 weeks of history — promising, not proven.

### Spec

1. New file `packages/prediction-engine/src/nfl/ema-features.ts` (+ test). New files only.
2. Method:
   - EMA(span=4) differentials: for each core metric (off EPA/play, def EPA/play, off CPOE, net yards/play, success rate, explosive rate, turnover margin, pressure rate, point diff), compute the exponentially-weighted mean with SHIFT(1) — yesterday's value only, never including the current week (leakage prevention).
   - Differential = team EMA − opponent EMA. Nine features, compact vector — the compression is the idea.
   - 80/20 ensemble: 0.8 × model prob + 0.2 × vig-stripped market prob.
   - Weekly ledger template (adopt as the STANDARD posted-record format, feeding the sealed ledger from indie Build 6): `{ gameId, pick, modelProb, vegasImplied, edge, confidenceTier, outcome }` + a one-line diagnostic note per miss.
3. Output: EMA feature vector + weekly ledger rows.
4. COMPOSE WITH: `ml-estimator.ts` (consumer), indie Build 6 (ledger host), market vig-strip.

### Test asserts

- Fixture: EMA with shift(1) on a 5-week series excludes week 5's value (hand-computed).
- Differential = team − opponent verified on a fixture.
- Ledger row computes `edge = modelProb − vegasImplied` and the 80/20 blend matches hand math.

---

## Standing rules (all builds)

- New files only. Never modify existing files or live code paths. No regression.
- Every module gets a test.
- Own branch, commit as you go.
- Log each finished item in `docs/research/2026-09-21/wiring/IMPLEMENTED.md` so nothing gets built twice.
- The repo's AGENTS.md governs everything else.
- Methodology is learned from and re-implemented as GSE's own output. The only code that may be adapted directly is engage8's (MIT, Build 14) — with attribution in the file header. Everything else: learn the idea, write our own implementation.
