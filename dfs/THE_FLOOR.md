# THE FLOOR — equations × papers × data × kill tests

_Built 2026-10-11T02:32:18Z. Sources: 1,251-paper arXiv corpus (35 lanes) + live arXiv tonight + agent-bus intel + our engines._

## GAME SCORES
- **Now:** Gaussian close + alt-line residual <0.6%
- **Upgrade:** Bayesian BIVARIATE Conway-Maxwell-Poisson [2409.17129] — handles score correlation AND dispersion; kills independent-Poisson
- **Data:** pbp margins (READY)
- **Kill test:** CRPS vs Gaussian-close bar 7.109 walk-forward

## TEAM RATINGS
- **Now:** Kalman (thin tails)
- **Upgrade:** Score-Driven (GAS) ratings [2604.09143 PUBLISHED + 2101.04040 rankings ext] — zero-EV score, sums-to-zero, t-innovations; Plackett-Luce worths for positional tiers
- **Data:** margins (READY)
- **Kill test:** CRPS bar; LOSO-CV calibration per ryurko standard

## PROP TAILS
- **Now:** DK ladder = Gaussian implied
- **Upgrade:** Non-stationary GPD via nsEVDx [2509.07261] w/ covariates (week, usage, weather) — registry C weaponized
- **Data:** PBP play-lengths + ladders (READY)
- **Kill test:** backtest 23-25 longest-X Brier vs book-implied

## WEATHER
- **Now:** wind15+ = -5.41 total measured (549 games, fixed)
- **Upgrade:** 3-layer: (1) physics drag+Magnus+density-altitude kick model [2206.02397, 1710.02784, physics/0505118], (2) EMOS ensemble post-processing → calibrated P(wind15) [1805.09091, ENS-10 2206.14786], (3) CRPS-trained like AIFS [2412.15832] + conformal gate [2606.19642]
- **Data:** 549-game sample + free Pangu-Weather/GFS/ENS-10 (READY)
- **Kill test:** wind15 coefficient stability LOSO; conformal null on calm weeks

## LIVE REPRICING
- **Now:** none (dead PPD lanes)
- **Upgrade:** Hawkes multivariate intensity on scoring events (registry A) → state-dependent drift in live totals
- **Data:** PBP timestamps (re-pull needed)
- **Kill test:** log-loss vs constant-rate AND vs close drift

## CONTEXT FACTORS
- **Now:** pooled OLS (confounded)
- **Upgrade:** DML Chernozhukov cross-fitting (registry G) — debiased rest/travel/turf coefficients
- **Data:** pbp+schedule+residuals (READY)
- **Kill test:** fold stability + placebo treatments

## SIZING
- **Now:** plug-in Kelly
- **Upgrade:** Posterior-Kelly MC over (mu,sigma) uncertainty (registry J) — honest fractional
- **Data:** dk fits uncertainty (READY NOW)
- **Kill test:** growth curves w/ parameter noise

## BOOK WEIGHTS
- **Now:** equal-weight consensus
- **Upgrade:** Hedge multiplicative weights on book log-loss (registry I) — learning line-shopping
- **Data:** book snapshots (READY)
- **Kill test:** weighted vs equal consensus log-loss walk-forward

## COACHES
- **Now:** tendencies only
- **Upgrade:** MaxEnt IRL reward recovery (registry B) — coach irrationality index theta_gap
- **Data:** pbp decisions (re-pull needed)
- **Kill test:** beat nfl4th AND market on next-season decisions

## ABSTAIN
- **Now:** manual gates
- **Upgrade:** MMD two-sample conformal drift gate (registry K) married to weather ensemble disagreement [2606.19642]
- **Data:** team-state features (READY)
- **Kill test:** net CLV improvement skipping flagged weeks

## Standards
- ryurko/nflscrapR-models: every model ships leave-one-season-out calibration BEFORE a consumer; failures documented dead
- CollegeGuard + FreshnessGate + close-anchored CRPS bars + kill ledger (19-rule doctrine.py, 19/19 PASS)
## Scoring Engine (DK authoritative)
- `scoringStyleId` lives on every contest-detail response (classic=1, showdown variant noted per gameType)
- The full rules table renders in the contest pop from an XHR the SPA scopes per session — not yet pinned to a static JSON (tried 3 CDN paths + api rules v1; the browser rules iframe loads it per-session). OPEN ITEM: capture the rules XHR once from the live pop and land `DK_RulesAndScoring.json`.
- Standard NFL DK scoring (for our engine, pending the authoritative capture): pass TD 4 / rush+rec TD 6 / pass yds 25:1 / rush+rec yds 10:1 / rec 1 / fumble+int −1/-2 / bonuses per DK published rules.

## New from the chunk sweep (mine_scoring.py)
- `scoring: 48` hits in app.js → all UI/config refs, confirming (again) the engine is server-side
- The Rules & Scoring tab = `dkjs-rules-and-scoring-container` populated via mvcVars.contests server injection
