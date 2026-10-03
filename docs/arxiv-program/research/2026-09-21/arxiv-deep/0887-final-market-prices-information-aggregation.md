# [0887] Are Final Market Prices Sufficient for Information Aggregation? Evidence from Last-Minute Dynamics in Parimutuel Betting (arXiv:2509.14645v3)

**Citation:** Hiroaki Hanyu, Shunsuke Ishii, Suguru Otani, Kazuhiro Teramoto (2026). *Are Final Market Prices Sufficient for Information Aggregation? Evidence from Last-Minute Dynamics in Parimutuel Betting*. arXiv:2509.14645v3 [econ.GN]. URL: https://arxiv.org/abs/2509.14645v3 — first version 2025-09-18, current version 2026-07-07.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2509.14645v3.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the late-odds-movement finding is the most directly market-actionable in this wave: nearly half of JRA wagering arrives in the final five minutes, and a 10% late move carries ~14× the return association of an equivalent cross-sectional final-odds difference (coefficient −0.3386, SE 0.0392, n=894,127). Ex-post association, not a proven tradable edge — the adaptation is a steam-detection feature, not a blind follow-the-move system.
**Replacement context:** Fresh-search replacement (query: `arXiv horse racing win probability prediction betting market model`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Hiroaki Hanyu, Shunsuke Ishii, Suguru Otani, Kazuhiro Teramoto. v3 dated 2026-08-20. Empirical market-microstructure paper on the Japan Racing Association (JRA) parimutuel market.

## Research question
Do final market prices fully aggregate information, or does the *path* of late odds movements contain additional information about outcomes? Tests whether last-minute odds dynamics predict returns beyond what final odds imply.

## Dataset / schema
- JRA-VAN data: 63,372 races, ~895,090 horse-race observations, 2004–2023 (20 years).
- Main regression sample: 894,127 observations with clustered standard errors.
- Schema: per horse per race — timestamped odds snapshots through the betting window, final odds, finish position, win/place payoffs.
- Access: JRA-VAN (commercial Japanese racing data product).

## Method
- Regress realized returns on (a) final-odds-implied probability and (b) late odds movement (change in implied probability over the final minutes), with race-level fixed effects and standard errors clustered appropriately.
- Key statistic: nearly half of all wagering volume arrives during the final five minutes before post time — the market is extremely back-loaded.
- Tests whether late movement predicts returns conditional on the final price (the "sufficiency" question).

## Equations / math / assumptions
- Return regression: return_i = β_0 + β_1·final_implied_prob_i + β_2·late_move_i + race FE + ε_i, SEs clustered.
- Headline estimate: **β_2 = −0.3386 (SE 0.0392)** — negative because odds shortening (price falling) is coded as positive movement toward lower returns-to-stake; the sign convention is the paper's.
- Economic translation: a 10% late move implies about **14× the return association** of an equivalent cross-sectional final-odds difference at median odds 25.5.
- Assumptions: parimutuel payoffs reflect the final pool; late moves proxy informed-money arrival; no structural break in the 2004–2023 window.

## Features / target
- Features: final odds-implied probability, late-window odds movement, race fixed effects.
- Target: realized betting return per horse.

## Validation
- 894,127-observation regression with clustered SEs; the late-move coefficient is significant at −0.3386/0.0392 ≈ 8.6σ.
- Robustness across subperiods (stated in paper). The volume fact (half of wagering in final 5 minutes) is descriptive.

## Exact results with baselines
- Late-movement coefficient: **−0.3386 (SE 0.0392)**.
- Sample: 894,127 observations; 63,372 races; 2004–2023.
- Volume: ~50% of wagering in the final five minutes.
- Economic magnitude: 10% late move ≈ 14× the return association of an equivalent final-odds cross-sectional difference (at median odds 25.5).
- Baseline comparison: final-odds-only model (the "sufficiency" null) is rejected — the path adds information.

## Code / data availability
JRA-VAN commercial data; no public code stated.

## Leakage
- The regression is ex-post: late moves and outcomes are both known; the association does not imply a tradable strategy (execution at the pre-move price is not available to a follower).
- Parimutuel mechanics: late money moves the price against itself — the follower's realized price differs from the measured move.
- Survivorship/selection: JRA only; other parimutuel markets may differ.

## Limitations
- Ex-post association, not a demonstrated tradable strategy — the paper does not backtest a betting rule with transaction costs and price impact.
- Parimutuel-specific; fixed-odds books (Pinnacle-style) have different microstructure.
- No decomposition of *whose* money moves late (informed syndicates vs public steam).
- Commercial data; GSE cannot directly replicate on JRA.

## GSE overlap vs existing-research-map
Existing-research-map.md has a betting-market lane (accounts like @PlusEVAnalytics, @UnabatedSports inventoried) but no market-microstructure paper on late odds dynamics; the map's gap list does not cover steam/informed-money detection as a researched topic. This is the corpus's first late-move-information paper — novel, squarely in odds_market.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE steam-detection feature: (a) ingest timestamped odds from Pinnacle/sharp books; (b) compute late-window move features (final-30-min implied-probability velocity, acceleration, volume proxy via move size); (c) add them to the pick model as features, NOT as a standalone signal; (d) backtest a "follow sharp late steam" rule with realistic execution (bet at post-move price + estimated slippage).
- **Key design decision from the paper:** the move's *path* matters beyond the final price — engineer path features (velocity, convexity of the odds path), not just start-vs-end deltas.
- **Effort:** 1–2 weeks for the feature pipeline on existing odds feeds; backtest harness reuses GSE's CLV infrastructure.

## Reproducible test
- On GSE's own Pinnacle odds archive (any league, 2023–2024): regress CLV/realized return on final implied prob + late-move features with event fixed effects; test whether the late-move coefficient is significant and directionally consistent with the paper.

## Numeric gate
- ADAPT confirmed if, in GSE's odds data, late-move features add significant explanatory power for CLV beyond final odds (p<0.01 on the move coefficient in at least one league). If no league shows the effect, the JRA finding is parimutuel-specific — record that boundary.

## Improvement experiment
- **Steam-vs-noise decomposition:** separate late moves into "informed" (moves that persist/revert patterns consistent with syndicate action) vs "public steam" (correlated with media/betting splits); test whether fading public steam while following informed steam beats following all steam. Success: the decomposed strategy shows positive mean CLV where the naive follow-steam rule does not.

## Verdict
**ADAPT** — The single most market-actionable empirical finding in this wave: late odds paths carry ~14× the information of equivalent cross-sectional price differences. The paper doesn't hand GSE a strategy, but it hands GSE the feature family (odds-path velocity/convexity) and the economic justification for building steam detection. The parimutuel-vs-fixed-odds boundary is the thing to test first.
