# 0986 — Transfer Portal: accurately forecasting the impact of a player transfer in soccer (2201.11533)
**Ledger:** 0986 | **arXiv:** 2201.11533 (2022) | **Lane:** win_spread_total
**Title:** "Transfer Portal: Accurately Forecasting the Impact of a Player Transfer in Soccer" — Daniel Dinsdale & Joe Gallagher
**Replacement context:** Fresh-search replacement (query: `abs:"win probability" AND abs:"soccer" AND cat:stat.AP`) for an original-assignment duplicate already in the corpus map. Duplicate skips are not REJECTs — see wave summary.

---

## Citation / full-text source
Full citation: "Transfer Portal: Accurately Forecasting the Impact of a Player Transfer in Soccer" — Daniel Dinsdale & Joe Gallagher. Full text: arXiv 2201.11533 (2022), https://arxiv.org/abs/2201.11533.

## Research question
An end-to-end deep-learning system for the hardest prediction problem in football analytics: forecasting how a *specific player's* per-90 output will change when they move to a *specific* team in a *specific* league. Four modules: (1) Opta spatial event-data collection across 32 domestic leagues since 2017; (2) player/team/league feature creation with rolling windows and prior-adjustment for low-data entities; (3) grouped multi-head neural networks; (4) output dashboards, shortlists, and "Hot or Not" rumor scoring. Two tasks: **transfer impact** (predict player X at club Y) and **player recommendation** (shortlist replacements/targets by weighted predicted metrics).

## Dataset / schema
Training: **26,000 samples** (transfer + non-transfer) across 32 leagues since 2017; targets = per-90 metrics over the **first 1,000 minutes** at the new club (or the next 1,000 minutes for non-transfers). Test: **2,659 historic transfers + 8,677 non-transfers**. Ability system: daily ratings since 1990 across **195 countries, 423 leagues, 20,000+ teams** — claimed as the largest soccer ratings system in existence.

## Method
Four grouped multi-head TensorFlow NNs (Table 1 groupings, e.g., xG+shots together): shared dense layer per group → per-target heads, letting targets share relevant signal without noise from irrelevant features. Hyperparameters (learning rate, batch size, dropout, hidden units) tuned with HyperOpt Bayesian optimization.

**Hyperparameters.** N=1000 (player window), M=3000 (team-position window), c=1000 (prior→data blend constant), 1,000-minute target horizon, 13 targets in 4 groups, HyperOpt-tuned dense architectures.

**Case studies:** Rennes winger shortlist (Sulemana/Demir/Lang with swarm-plot dashboards — e.g., Gakpo's shots/90 dropping from 59th to 27th percentile moving PSV→Rennes); Doku→Liverpool/Barcelona/Gwangju projections (individual metrics like take-ons retained across destinations; team-driven metrics shift); "Hot or Not" rumors: Mbappé→Real **Hot**, Kane→City **Hot**, de Jong→United **Not** (outputs slashed up to 50% by style mismatch), Aarons→Bayern **Hot**, Sterling→Barça **Tepid**, Adeyemi→Dortmund **Hot**, Mooy→Celtic **Hot**, Healey→Brighton **Tepid**.

## Equations / assumptions
- Team ability = E_continent + E_country + E_league + E_team (Elo components), rescaled 0–100 daily.
- Feature blend: X'_{i,j,g} = (1−w_{j,g})P_{i,j} + w_{j,g}R_{i,j,g}, w_{j,g} = min(1, (Σ minutes)/c).
- Shortlist score: Σ_k (weight_k × normalized predicted metric_k) / Σ_k weight_k, weights ∈ [0,1] user-set.
- Assumptions: event data consistent across leagues; position labels from formations are adequate role proxies (authors flag moving to learned "Player Roles" as future work); 1,000-minute horizon; no defensive "opposition allowed" metrics or goalkeeping yet (future work: xGoT, Ramos-at-PSG-style defensive impact).

## Features / target
**Features (the paper's core contribution).**
1. **Hierarchical ability (Power Ranking):** four-level Elo (continent + country + league + within-league team); only the highest affected hierarchy level updates per match (e.g., Liverpool–Flamengo 2019 CWC final updates team Elos + Europe/South America continental Elos); team score = sum of hierarchy components, rescaled 0–100 daily to kill Elo inflation. Worked example: Agüero's Man City → Barcelona move analyzed against 10 years of Power Rankings plus league distributions.
2. **Rolling per-90 features:** player metrics over previous N=1000 minutes; team-position aggregates over M=3000 minutes; position assignment from formation event data (a player's minutes/events counted separately per position played within a match).
3. **Adjustment models for low-data entities:** X'_{i,j,g} = (1−w_{j,g})P_{i,j} + w_{j,g}R_{i,j,g}, w = min(1, minutes/c), c=1000. Nested prior order: ability → team/team-position → player. RAG (red/amber/green) confidence flags how prior-dependent each feature is. Worked example: Ismaïla Sarr's xA/90 prior→rolling transition across Rennes → Watford → Championship.

**Target:** 13 per-90 metrics over the first 1,000 minutes at the new club (or next 1,000 minutes for non-transfers): shots, xG, xA, take-ons, crosses, penalty-area entries, total passes, short (<32m) passes, long (≥32m) passes, attacking-third passes, defensive actions in own/middle/opposition thirds.

## Validation
Test: **2,659 historic transfers + 8,677 non-transfers**, evaluated against the naive baseline (player's most recent rolling average carried forward) — no competing transfer model exists, per authors. Related work cited: PECOTA (baseball), Imburgio & Goldberg (soccer goals added), 538 roster-shuffling, Pelton WARP, Patton et al. (NBA draft tracking), SciSports roles, player2vec (Torvaney), smarterscout league-adjusted ratings. Figure 10 calibration check on xG/90 (slight over-prediction at low xG, slight under-prediction at high xG).

## Exact results / baselines
**Key results (Table 2).**
- **49% average MSE improvement over baseline on transfers** (baseline = player's most recent rolling average carried forward); 21% on transfers+non-transfers combined (expected — stayers are predictable).
- **xG/90: 54% MSE reduction** (Figure 10 calibration: slight over-prediction at low xG, slight under-prediction at high xG).
- Per-target improvement range: **37% (crosses) to 61% (short passes)** — team-style-sensitive metrics gain most.
- Case studies: Rennes winger shortlist (Sulemana/Demir/Lang with swarm-plot dashboards — e.g., Gakpo's shots/90 dropping from 59th to 27th percentile moving PSV→Rennes); Doku→Liverpool/Barcelona/Gwangju projections (individual metrics like take-ons retained across destinations; team-driven metrics shift); "Hot or Not" rumors: Mbappé→Real **Hot**, Kane→City **Hot**, de Jong→United **Not** (outputs slashed up to 50% by style mismatch), Aarons→Bayern **Hot**, Sterling→Barça **Tepid**, Adeyemi→Dortmund **Hot**, Mooy→Celtic **Hot**, Healey→Brighton **Tepid**.

**Baselines.** Naive baseline (carry forward rolling average) is the only comparator — no competing transfer model exists, per authors. Related work cited: PECOTA (baseball), Imburgio & Goldberg (soccer goals added), 538 roster-shuffling, Pelton WARP, Patton et al. (NBA draft tracking), SciSports roles, player2vec (Torvaney), smarterscout league-adjusted ratings.

## Code / data
No public data or code — Opta event data is proprietary; the 26k-sample training set, ability ratings, and model weights are all closed. Nothing here is directly re-runnable.

## Leakage
No leakage discussion in the paper; features are strictly pre-transfer (player metrics over the previous N=1000 minutes; team-position aggregates over M=3000 minutes) and targets are post-transfer (first 1,000 minutes at the new club), so the feature/target temporal split is clean. Evaluation is retrospective on completed transfers (selection bias: observed transfers are the ones clubs chose to make — noted in Limitations).

## Limitations
- No public data or code — Opta event data is proprietary; the 26k-sample training set, ability ratings, and model weights are all closed. Nothing here is directly re-runnable.
- Baseline is deliberately weak (naive carry-forward); 49% improvement is against a strawman, not against a competent transfer model or a league-average prior.
- xG/xA inputs inherit Opta model error; cross-league event-data consistency is assumed, not tested.
- Position labels are formation-derived, ignoring role diversity within positions (acknowledged; Player Roles deferred).
- No uncertainty quantification on predictions — point forecasts only, with RAG flags as a coarse substitute.
- The 1,000-minute horizon is short-term; adaptation curves beyond it unmodeled.
- Evaluation is retrospective on completed transfers (selection bias: observed transfers are the ones clubs chose to make).

## GSE overlap
- No corpus paper forecasts *individual player* transfer impact — the map's forecasting work is team/match-level. The hierarchical Elo and prior-blend feature engineering are new instruments for the corpus.
- Adjacent: player2vec-style representation learning and smarterscout league-adjusted ratings are cited as related, not duplicated.
- The player-level forecasting paper the wave was missing: complements 0982's team-tier SBM (block structure ↔ individual transfer fit), 0984's entertainment metrics (transfers as suspense generators), and the map's forecasting cluster. The hierarchical Elo (195 countries/423 leagues) is the most ambitious ability-rating construction in the corpus.

## Implementation (GSE adaptation)
- **What to build:** a **transfer-fit forecaster** for GSE's fantasy/DFS and content products: given (player, source team/league, target team/league), predict per-90 deltas across the paper's 13 KPIs using the same four-module design — GSE's existing ratings as the ability hierarchy, rolling per-90 features from event data GSE can license or approximate, grouped multi-head NNs, and the prior-blend equation for low-minute players (breakout rookies are exactly the high-value case).
- **Concretely:** (1) replicate the feature spec (N=1000 player windows, M=3000 team-position windows, X' blend with c=1000, RAG flags) on whatever event data GSE holds; (2) train grouped multi-head models on historical transfers with the 1,000-minute target; (3) ship two surfaces — a "transfer impact" card (predicted KPI deltas + percentile context vs new league, à la Figures 12–15) and a "replacement shortlister" with user-weighted scoring; (4) validate against the paper's 49% MSE-improvement-vs-naive bar on GSE's own transfer sample.
- **Where it plugs in:** NFL/NBA trade and free-agency content ("what does Player X look like on Team Y"), DFS slate analysis when players change teams (role/production shifts), dynasty fantasy trade tools, and sportsbook-adjacent "transfer rumor" engagement content (the Hot-or-Not format is proven social content).

## Reproducible test
- Using any licensed event-data sample with ≥500 historical transfers: rebuild the feature pipeline and naive baseline; confirm (a) the grouped multi-head NN beats the carry-forward baseline on transfer MSE, (b) per-target improvements are largest on team-style-sensitive metrics (passes/attacking-third) and smallest on individual metrics (take-ons), (c) the prior-blend weight w behaves monotonically in minutes played. Exact 49% not required (data differs); direction and ordering required.

## Numeric gate
- On a held-out transfer test set, the model must achieve **≥25% mean MSE improvement over the carry-forward baseline across the 13 KPIs** (paper: 49% on transfers; gate set lower to allow for smaller/weaker event data). Below 25% → the feature engineering is not capturing team/league context and the implementation fails.

## Improvement experiment
- **Uncertainty + longer horizons (the paper's gaps):** add quantile heads (P10/P50/P90) to each target head and extend the target horizon to 3,000 minutes with a time-decay weighting. Success: 80% prediction intervals achieve 70–90% empirical coverage on held-out transfers AND the 3,000-minute model retains ≥60% of the 1,000-minute model's MSE improvement over baseline — proving the system works for the season-long forecasts users actually want.
- **Defensive "opposition allowed" metrics:** implement the authors' proposed extension (how much less xG a team concedes after signing a defender) and test whether including it improves team-level goals-against forecasts — success if team xGA forecasts improve ≥10% MSE vs without.

## Verdict
**ADAPT** — The most product-adjacent paper of the wave: a complete, battle-tested architecture for player-transfer forecasting with the exact feature-engineering details (hierarchical Elo, nested priors, position-aware rolling windows) needed to rebuild it on GSE data. The 49%-vs-naive figure is flattering but the per-target pattern (team-driven metrics gain most) is the real signal. Direct line to fantasy trade tools, DFS role-change analysis, and Hot-or-Not rumor content. Data-closed is the caveat; the spec is open enough to reimplement.
