# MASTER PROMPT FOR CODING AGENT — GSE ENGINE, CALIBRATION, AND INTELLIGENCE

## Mission
Build the most accurate and intelligent sports prediction and fantasy platform in the world. Use all available math, data, and competitive intel. Test everything. Do not trust claims. Audit, improve, and hand off. Internal calibration only. No auto-publish. No external posting.

## Constraints
- Do not merge v5.2.8. Preserve the diff at site-audit-2026-09-11/preserved/v528-market-gate-uncommitted.diff. Use as reference for what not to do.
- Do not weaken any floor without explicit founder approval.
- Every exclusion must have a bucket. Do not drop picks to improve n.
- Production reads are read-only.
- USA English.

## Phase 0: Foundation
1. Verify PR #766 determinism CI. Merge 13bf131dc.
2. Implement Brier Skill Score (BSS) relative to base rate: BSS = 1 - BS/BS_ref, BS_ref = base_rate * (1 - base_rate). Gate requires BSS > 0 significantly.
3. Implement RES floor. Use null-band simulation to set floor. Constant model must fail.
4. Implement null-band ECE. Simulate perfectly calibrated forecaster with same p_obs. Gate passes only if observed ECE <= null_q95 + tolerance.
5. Distinguish two nulls: constant model (ECE=0, RES=0, Brier=p(1-p)) and perfectly calibrated model (y ~ Bernoulli(p_obs)). Use both.

## Phase 1: Math & Calibration
1. Murphy decomposition: REL, RES, UNC. Report per market, per sport, per confidence bin.
2. Bregman divergences: implement NLL alongside Brier and ECE. If ECE improves but NLL worsens, reject.
3. Doob-Martingale pathwise diagnostic: for each settled pick with probability path, compute running maximum. Compare to theoretical distribution.
4. Logarithmic opinion pool: logodds(p_pool) = w * logodds(q) + (1-w) * logodds(m). Report w with 95% CI. Require w significantly > 0.
5. Tail calibration: reliability for p > 0.7, 0.3-0.7, p < 0.3. Isotonic on tail only.
6. Beta-Bernoulli calibrator: p ~ Beta(α,β), y ~ Bernoulli(p). Mean as calibrated point forecast, variance as epistemic uncertainty.
7. Mondrian conformal prediction: stratify by confidence decile. 90% intervals. Report CLV on outside vs. inside picks.
8. De-vig methods: multiplicative, additive, Shin, power, logarithmic. Compare. Use best for fair q.
9. Market efficiency regression: outcome ~ logit(odds). Test intercept=0, slope=1. Report per book, per market.
10. CLV as training target: train model to predict closing fair probability. Bet when current odds differ. Use CLV as primary skill metric.

## Phase 2: Engine & Modeling
1. Build Monte Carlo simulation engine for each sport. Simulate games 10,000 times. Output distributions for all markets.
2. NFL: drive-based simulation. Use EPA/play, CPOE, pace, rest, weather, injuries.
3. NBA: possession-based simulation. Use pace, offensive/defensive efficiency, player minutes, usage, rest, injuries.
4. MLB: plate-appearance simulation. Use pitcher, batter, park factors, weather, bullpen, umpire.
5. NCAAF/NCAAB: similar to pro but with recruiting, transfers, coaching, conference strength.
6. Soccer: Poisson/Dixon-Coles, xG, possession, home advantage.
7. Player props: model minutes first, then per-minute rates, then distribution. Use opponent defense, pace, injuries. Poisson/NegBin for counts, normal for yards.
8. Ensemble/stacking: combine Elo, Glicko, Bayesian hierarchical, GBM, NN, market. Use cross-validation. Meta-learner learns when each is good.
9. Bayesian hierarchical models: partial pooling across teams/players. PyMC or Stan.
10. Online learning: update models quickly. Bayesian updating, online gradient descent.
11. Uncertainty quantification: prediction intervals for every prediction. Conformal + Bayesian posterior.
12. Kelly staking: compute optimal stake given edge and uncertainty. Simulate bankroll.

## Phase 3: Data Integration
1. The Odds API: pull one NFL/NBA/MLB game with player props. Document market keys, book list, credit cost per call, closing-line availability. Project monthly burn.
2. PropLine: verify closing_price on real sample. Confirm schema match. Confirm historical depth.
3. ESPN propBets: pull live game. Count line items. Confirm no prices. Note 404 for most NHL games.
4. Kalshi: GET /trade-api/v2/series?category=Sports. Find real tickers. Pull one game market. Document schema. Use events endpoint with series_ticker filter.
5. Polymarket: Gamma API for events, CLOB for orderbook, WebSocket for live scores. Pull one sports event. Document schema.
6. sportsdataverse: integrate cfbfastR, hoopR, baseballr. Use load_espn_cfb_*, load_nba_* crosswalks, etc. Build feature store.
7. Injury data: find working source. PFR 404s. Use bref_injuries(), ESPN injuries, Rotowire, FantasyPros.
8. Weather: OpenWeather API. Integrate for NFL, MLB, soccer.
9. Rundown API: evaluate. TheSportsDB: use for metadata.
10. Crosswalks: map team IDs, player IDs across ESPN, NBA, MLB, etc. Use sportsdataverse crosswalks.
11. Schema: unified schema for odds, predictions, results, receipts.
12. Feature store: build store for EPA/WPA, pace, efficiency, usage, injuries, rest, travel, weather, etc.

## Phase 4: Prediction Markets
1. Kalshi: discover sports series. Build Kalshi sports index.
2. Polymarket: build sports index.
3. Cross-venue arbitrage: compare Kalshi, Polymarket, sportsbooks. Find discrepancies.
4. Order book: store depth for prediction markets.
5. Closing prices: fetch last-seen price before event.
6. CLV: compute for prediction markets.

## Phase 5: Player Props
1. Model minutes for NBA, NFL, MLB.
2. Model per-minute rates.
3. Model distributions.
4. Use opponent defense, pace, injuries.
5. Calibrate at player-prop level.
6. Safety: check injury/roster/inactive. No props on injured/inactive players.
7. Closing-line availability: fetch closing props.

## Phase 6: Testing & Validation
1. Synthetic tests: perfectly calibrated forecaster passes. Constant forecaster fails. Adversarial calibrated-but-no-resolution fails.
2. Sample-size sensitivity: n = 100, 250, 392, 609, 1000.
3. Drift tests: regime shift detected.
4. API tests: live pull, schema validation, credit accounting, closing-line presence, historical depth.
5. Backtesting: walk-forward, no lookahead, realistic odds, CLV.
6. Acceptance criteria: ECE <= null_q95, RES >= 0.03, n >= 250, drift <= 0.10, w > 0, CLV positive at n≈283, identical-row Brier <= market Brier, BSS > 0.

## Phase 7: Reporting & Handoff
1. Report per market: n, base rate, RES, ECE, Brier, BSS, NLL, reliability, tail calibration.
2. Report CLV per pick, per market, per version.
3. Report identical-row Brier.
4. Report opinion pool weight.
5. Report competitive gap table.
6. Report API cost model.
7. Report feature store schema.
8. Report simulation engine design.
9. Report player prop models.
10. Handoff to coding agent with PRs, fixtures, tests.

## Deliverables
- Null-band ECE gate implementation.
- BSS and RES floor.
- Murphy decomposition reporting.
- Bregman/NLL reporting.
- Doob-Martingale diagnostic.
- Opinion pool weight.
- Tail calibration.
- Beta-Bernoulli calibrator.
- Conformal prediction.
- De-vig comparison.
- Market efficiency regression.
- CLV pipeline.
- Identical-row Brier.
- Simulation engine.
- Player prop models.
- Data integration for The Odds API, PropLine, ESPN, Kalshi, Polymarket, sportsdataverse.
- Injury data source.
- Weather integration.
- Crosswalks.
- Feature store.
- Backtesting framework.
- Monitoring and drift detection.
- PRs, fixtures, tests.

## Do Not
- Do not merge v5.2.8.
- Do not weaken any floor without founder approval.
- Do not drop exclusions to improve n.
- Do not claim "world's most accurate" unless identical-row Brier says so.
- Do not apply pooled ML floors to spread/total.
- Do not change a floor without explicit founder approval.

## Decisions Needed from Founder
- Approve/reject $30/mo props lane (plus free shadow lane).
- Decide the resolution floor.