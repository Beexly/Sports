# 1798 GCN-WP: Semi-Supervised Graph Convolutional Networks for Win Prediction in Esports (arXiv:2207.13191v1)

**Citation:** Alexander J. Bisberg, Emilio Ferrara (2022). *GCN-WP – Semi-Supervised Graph Convolutional Networks for Win Prediction in Esports*. arXiv:2207.13191v1. URL: https://arxiv.org/abs/2207.13191v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Can a semi-supervised graph convolutional network that represents an entire esports league as a graph — nodes = team-games, edges = to the team's previous game and to the opponent's game-node — learn league structure from one league's season (LPL China 2020) and predict win/loss in a *different* league (LCS North America), beating random forests and Elo-based skill models (SCOPE) on accuracy?

## 2. Dataset / schema

- **League of Legends professional 2020 season**, Oracle's Elixir data (Tim Sevenhuysen). Train graph: LPL (China, ~2× the games of any other league); validation: LCK (Korea); test: LCS (North America). International tournaments (MSI, Worlds) excluded — only within-region regular-season games.
- **30+ features per team-game**, grouped: objectives (towers, inhibitors, dragons, barons), farm (creep/jungle kills), gold & experience, fighting (kills, multi-kills), vision (wards). Two encodings: raw per-team values and **delta** (team minus opponent).
- **Access:** Oracle's Elixir is a public blog dataset; code is a fork of Kipf's GCN (TensorFlow) — link given as [34] in the paper.

## 3. Method / model

BuildLeagueGraph (Algorithm 1): for each team, sort games by time; add one node per team-game with its features; add an undirected edge from node gᵢᵗ to the opponent's node gᵢᵒᵖᵖ and to the team's previous node gᵢ₋₁ᵗ. Homogeneous network (no self/opponent node-type distinction — justified by using delta features). Then a GCN: layer update f(L⁽ⁿ⁾,A) = σ(D̂^{−1/2}ÂD̂^{−1/2}L⁽ⁿ⁾W⁽ⁿ⁾), Â = A + I, tested with standard spectral convolutions and Chebyshev-polynomial filters (degree 1), 1–2 hidden layers (32/64/128 units), dropout 0.1–0.5, grid-searched on LCK. Semi-supervised: the graph includes the to-be-predicted game's node (features known, label masked). Label timing handled carefully: with c convolutions the node at time t carries the label of game G_{c+1} so no future information leaks (Fig. 3).

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- GCN layer: f(L⁽ⁿ⁾,A) = σ(D̂^{−1/2}ÂD̂^{−1/2}L⁽ⁿ⁾W⁽ⁿ⁾), Â = A + I.
- General form: L⁽ⁿ⁺¹⁾ = f(L⁽ⁿ⁾,A); naive form f(L⁽ⁿ⁾,A) = σ(AL⁽ⁿ⁾W⁽ⁿ⁾).

Assumptions stated: homogeneous network (self vs opponent edges indistinguishable — carried by delta features); league structure is learnable and transferable across regions with the same game rules; one season (2020) is the right window (rosters churn year-to-year); undirected edges acceptable given careful label offsetting; kill-differential as the LoL margin-of-victory analogue for SCOPE.

## 5. Features / target

Features: 30+ team-game statistics (raw or delta). Target: binary win/loss of the team-game node. No probabilities, no calibration, no margin modeling.

## 6. Validation design

Fixed train/validation/test *leagues* (LPL/LCK/LCS) chosen before modeling to avoid league-selection bias; single season (2020). Baselines: random forest (lookback 1/3/5 games, raw/delta) and SCOPE (Elo with cross-validated K, cutoff, regression, MoV function). Metric: accuracy only.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly (Table IV, test = LCS 2020):

| Model | Accuracy |
|---|---|
| GCN-cheby (1 layer) + raw | 0.541 |
| GCN (1 layer) + delta | 0.551 |
| GCN-cheby (2 layer) + delta | 0.568 |
| Random forest (lookback 5) + delta | 0.578 ± 0.012 |
| SCOPE (Elo) | 0.597 |
| **GCN-cheby (1 layer) + delta** | **0.619** |

- Delta features beat raw everywhere (RF: 0.578 vs 0.572; GCN-cheby 1-layer: 0.619 vs 0.541).
- 1-layer beats 2-layer (0.619 vs 0.568): wider neighborhoods pull in opponents-of-opponents noise.
- Chebyshev filters beat spectral on delta (0.619 vs 0.551) — opposite of Kipf & Welling's original finding; authors attribute it to continuous (not embedding) features.
- SCOPE best params: LCS — K=40, cutoff 1600, reduction 0.1, MoV none, w₉₀=100, regression 0.4; LPL — K=40, cutoff 1700, reduction 0.5, MoV lin, w₉₀=500.

## 8. Code / data availability

Fork of Kipf's GCN on GitHub (linked); Oracle's Elixir data public. Reproducible in principle.

## 9. Leakage & limitations

- **Accuracy only — no probabilities, no calibration:** the paper never evaluates log-loss, Brier, or calibration. For GSE's probability lane this is the central weakness; "state-of-the-art" is 2.2pp of accuracy on one test league-year.
- **Single season, single test league:** 2020 only; no cross-season validation; roster-stability assumption untested.
- **Undirected graph + label offsetting is fragile:** the authors admit a directed/heterogeneous GCN is the right model (future work) — the current setup risks subtle leakage and can't use >1 layer effectively.
- **Esports-specific features:** gold/wards/dragons have no direct NFL analogue; only the *graph construction* transfers, not the feature set.
- **Homogeneity assumption:** self-edges and opponent-edges treated identically is a modeling shortcut the authors themselves plan to remove.
- **No uncertainty:** semi-supervised node classification gives point predictions; nothing about confidence.

## 10. GSE overlap

The corpus's rating work (Elo/Glicko/TrueSkill, 1795's shrinkage) treats teams as scalar strengths updated sequentially. No ledger represents the *league as a graph* — team-game nodes linked temporally and to opponents, with neighborhood aggregation replacing hand-tuned recency weighting ("the modeler will not be forced to manually weight past results"). The cross-league transfer result (train LPL → predict LCS at 0.619) is the closest analogue in the corpus to training on historical NFL and generalizing across eras/conferences. The delta-feature finding reinforces the corpus theme (1794, 1792) that relative/difference representations beat absolute ones. Not a duplicate; the graph-structural primitive is new to the corpus.

## 11. GSE implementation spec

1. **NFL team-game graph:** nodes = 32 teams × 17 games per season (544 nodes); edges = previous-game + opponent-game (Algorithm 1 verbatim); features = delta features (offensive/defensive EPA, success rate, explosive-play rate differentials — the NFL analogues of the paper's delta encoding).
2. **Calibrated GCN:** replace the paper's accuracy-only head with a logistic output; train semi-supervised on 2015–2024 seasons; evaluate on log-loss/Brier vs the engine's current model and vs Elo — the paper's missing experiment, and the one that decides GSE value.
3. **Cross-era transfer test:** train on 2010–2019, predict 2020–2024 (the paper's cross-league idea mapped to cross-era).
4. Cost: ~1 week (graph construction + GCN training; feature pipeline exists).

## 12. Reproducible test

Dataset: NFL 2015–2024 team-game features from nflverse. Baseline: engine ratings + SCOPE-style Elo. Metric: Brier score and log-loss on game win probability, 2023–2024 held out; calibration curves. Also ablate: GCN vs GCN-cheby, 1 vs 2 layers, delta vs raw — the paper's own ablations, rerun on NFL data. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the graph model as a ratings/ensemble arm if** the calibrated GCN beats the engine's current win-probability model on 2023–2024 Brier by ≥0.003 with acceptable calibration (ECE within 0.005 of baseline); **reject** if it merely matches Elo (the paper's 2.2pp accuracy edge may not survive proper scoring on NFL data — and the paper gives no evidence it would). If rejected, keep the BuildLeagueGraph construction as a *feature-engineering* recipe (neighborhood-aggregated opponent-adjusted features) rather than a model.

## 14. Improvement experiment

**Heterogeneous directed GCN with edge-type attention:** implement the authors' stated future work properly for the NFL — directed edges (past→present only, killing the leakage problem structurally instead of via label offsets), typed edges (self-temporal vs opponent vs divisional-opponent), and attention weights per edge type learned end-to-end. Hypothesis: the directed heterogeneous version unlocks the multi-layer gains the paper couldn't reach (their 2-layer model lost to 1-layer because undirected edges smeared in opponents-of-opponents). Test: 2–3 layer hetero-GCN vs 1-layer homo-GCN on 2023–2024 Brier; success = ≥0.002 additional gain. If it works, this is publishable as the first directed-heterogeneous league-graph win model, and it gives GSE a structural moat no scalar-rating competitor has.

**Verdict:** ADAPT
