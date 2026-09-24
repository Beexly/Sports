# [0015] Topological Data Analysis and Graph-Theoretic Approaches for Tennis Match Prediction (arXiv:2607.23509)

**Citation:** Jake Schwaderer, Alexander Bastien, Omid Khormali, Alejandro Navarrete, Mia Pesavento, Angelika Elderbrook (University of Evansville) (2026). *Topological Data Analysis and Graph-Theoretic Approaches for Tennis Match Prediction*. arXiv:2607.23509. URL: https://arxiv.org/abs/2607.23509
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v1), all 626 lines — abstract, §1 intro (TDA background, persistence summaries), §2 methods (lower-star filtration, g(v), MBD, modified Katz with recency-weighted digraph), §3 experiments (initial 1,200-match pilot, 65,834-match large-scale run, Katz CV + 2023–2025 test), §4 conclusion + limitations + future directions, acknowledgments, references.
**Verdict:** ADAPT — not the TDA pipeline (the paper's own results show it adds only 0.2pp accuracy at 242 hours of compute; honest null-ish result), but the modified Katz similarity index on a recency-weighted directed head-to-head graph is a clean, cheap, portable network-rating primitive worth adapting as an NFL team-strength feature. All quantitative claims below are quoted exactly from the paper.

## 1. Research question
Whether topological data analysis (lower-star filtration + persistent homology on player competitive networks) and a modified Katz similarity index can predict ATP match outcomes, and whether TDA features add predictive value beyond rankings and graph centralities.

## 2. Dataset / schema
ATP singles matches 2000–2025 from a Kaggle user dataset (public domain; last updated after the 2025 US Open): names, set winners, tournament date/name, set scores. 65,834 matches processed for the large-scale analysis (initial pilot: 1,200 random matches). ATP rankings contemporaneous with each match date (no leakage in rankings). Katz set-level graph: nodes = players, directed edge X→Y if X ever beat Y in a set, weight Σ 1/(1+e^{1.5(c−year)}) over X's set wins vs Y (c = current year). No player-level stats, surfaces, or context features.

## 3. Method / model
Two approaches. (1) Lower-star filtration: per match, induced subgraph H = union of r-neighborhood ego graphs around p₁, p₂, with r increased until H ≥ 75 nodes; filtration on vertex function g(v) (normalized to [0,1]); persistence diagrams for β₀/β₁; four vectorized summaries (VAB, HNAV, HWNAV, OW-HNPV, each discretized into 999 steps, Δt=0.001) plus Modified Band Depth scores vs 9 reference graphs. 26 features: node/edge counts, Randić index, geometric-arithmetic index, Δg, Δrank, centrality differences (degree, closeness, betweenness, PageRank), TDA MBD + direct statistics (mean/max/std of summaries). Classifiers: LR, RF (500 estimators, max depth 10, random_state 42), XGBoost. (2) Modified Katz: digraph Katz similarity →S(i,j) with cutoff 4, β=0.3; KatzScore(i,j) = →S(i,j) − →S(j,i); logistic fit P(Player 1 wins) = 1/(1+e^{−(−0.004794 + 0.429513·KatzScore)}), tuned on 5-fold CV (n=9,023 usable of 10,000 sampled 2000–2022 matches), tested on 2023–2025 sets.

## 4. Equations & assumptions
K_t = {σ : g(σ) ≤ t} (Eq. 1, lower-star sublevel sets); g(v) = v_p²/(m_p·m)·w with w = (1+e^{−3.25})/(1+e^{0.5(18.5−y)}), y = year of max(v_{pY}m_{pY}/(v_p m_p)) — temporally weighted, share-of-wins-adjusted win rate; MBD(X_m) = (1/C(9,2)) Σ_{i<j} (1/999) Σ_{s=1}^{999} 1_{B_{ij}(s)}(X_m(s)) (Eq. 2); S_katz(i,j) = Σ_{k=1}^∞ β^k A^k[i,j]; edge weight Σ 1/(1+e^{1.5(c−year)}); KatzScore(i,j) = →S(i,j) − →S(j,i); logistic P = 1/(1+e^{−(−0.004794+0.429513·KatzScore)}); Randić index Σ_{(u,v)∈E} 1/√(deg(u)deg(v)); geometric-arithmetic index Σ 2√(deg(u)deg(v))/(deg(u)+deg(v)); H = G[V(ego(p₁,r)) ∪ V(ego(p₂,r))]. Assumptions: triangles eliminated from filtration (so β₁ features collapsed to zero variance — structural consequence, not a data property); g(v) treats all matches/sets equally within the win-share weighting; ego-graph union approximates the competitive neighborhood; Katz graph built from historical snapshot (no future matches relative to prediction date).

## 5. Features / target
Inputs: 26 network/topological features + rank difference; Katz uses only the weighted-digraph path structure. Target: binary match winner (set-level graph for Katz). Prediction is pre-match (no in-play horizon).

## 6. Validation design
Lower-star: 70/30 stratified train/test split on 65,885 unique matches; pilot had 1,200 matches (840/360) plus external validation on the 2025 Vanda Pharmaceutical Hellenic Championship (35 predictable matches). Katz: 5-fold CV on 2000–2022 sample; temporal holdout test on all 2023–2025 sets (19,262 sets, split by year). Metrics: accuracy, AUC, precision/recall/F1, log loss.

## 7. Numerical results / baselines
- Lower-star, large-scale (Table 2): LR 0.652 acc / 0.691 AUC; RF 0.662 / 0.719 (prec 0.664, rec 0.657, F1 0.660); XGBoost 0.661 / 0.718. Pilot (n=1,200): XGBoost 61.27% (threshold α=0.27 vs 0.5 → +6.27pp), external tournament 57.14% (20/35).
- Feature importance (Figure 2): rankings (Δrank + Δg) 36.3%, centrality differences 25.5%, TDA combined 24.0% (direct statistics 17.0%, MBD 7.0%); VAB 7.3%, HNAV 6.0%, HWNAV 5.9%, OW-HNPV 4.9%.
- Topology-only (no rankings): 63.56% acc, AUC 0.691 (−2.52pp vs full model).
- TDA ablation (Table 3): baseline (no TDA, 10 features) 0.660/0.718 vs MBD only 0.662/0.718, direct-stats only 0.662/0.719, combined 0.662/0.719 — TDA adds ≈0.2pp.
- All β₁ (loop) features had zero variance across the dataset (triangle elimination) and were excluded; β₂ never computed.
- Katz (Table 4, CV 2000–2022): mean acc 0.6461 ± 0.0131, mean AUC 0.6911 ± 0.0159, mean log loss 0.6494. Test 2023–2025 (Table 5, 19,262 sets): overall acc 0.6248, AUC 0.6659, log loss 0.6550 (2023: 0.6193; 2024: 0.6324; 2025: 0.6221).
- Compute: ~242 hours on an Intel Core Ultra 9 285H (64 GB RAM), 13.18 s/match, for the 0.2pp TDA gain.

## 8. Code / data availability
Kaggle ATP dataset (public domain, URL not embedded in text — identified only as "a user on Kaggle.com"); player_cache_all.pkl / centralities_cache.pkl referenced as internal artifacts, not released. Claude was used for debugging/polishing (acknowledged). Course project (STAT 391, University of Evansville). Reproducibility: partial — dataset is public but not linked; code not released.

## 9. Leakage & limitations
Ranking feature uses contemporaneous ATP rankings (no leakage by construction). Katz graph uses historical snapshots only (mitigates but does not eliminate temporal granularity loss). Limitations (author-stated): cold-start players unanalyzable; temporal weighting may bias toward young players; surface/tournament/weather/recent-form/psychology omitted; β₁ collapse is an artifact of the optimization, leaving the value of higher-order topology unresolved; 242h compute for 0.2pp. No calibration analysis; pilot threshold α=0.27 tuned on the same CV (descriptive). Course-project provenance (undergraduate) — methods are standard but the experimental discipline is decent.

## 10. GSE overlap
Tennis is outside every GSE lane; TDA-on-networks is new to the corpus (no duplication). Conceptually adjacent: network-based ratings (Elo-type systems) and the existing-research map's general "model families" coverage. The transferable piece is the modified-Katz temporal digraph rating — a transitive-closure strength measure distinct from Elo's pairwise updates — which no GSE lane currently uses as a feature family.

## 11. GSE implementation spec
ADAPT: implement the modified-Katz primitive for NFL — nodes = teams, directed edges weighted by Σ 1/(1+e^{1.5(c−year)}) over game/set equivalents (game wins, optionally margin-scaled), cutoff 4, β=0.3, KatzScore home−away as a team-strength feature alongside existing EPA-based ratings. Cost: minutes to compute (n=32 teams), no 242-hour filtration pipeline. Do not port the TDA pipeline — the paper's own ablation says it adds 0.2pp at enormous compute cost.

## 12. Reproducible test
On 2015–2025 NFL game data: build the recency-weighted digraph, compute KatzScore(Home, Away) per game, and test (a) as a standalone predictor vs closing-spread baselines, and (b) as an additive feature in the engine's existing team-strength model (AUC/log-loss lift on chronological holdout 2023–2025). Adopt only if it adds ≥0.5pp AUC or meaningful log-loss improvement over the current rating — the paper's 62.48% standalone tennis accuracy is the honest baseline for what path-counting buys.

## 13. Acceptance / rejection gate
REJECT the lower-star TDA pipeline (cost-benefit fails on the authors' own numbers). ADOPT-or-not the Katz feature pending the §12 test. The gate is explicit: no TDA compute spend in GSE without a ≥1pp standalone gain, which this paper does not show.

## 14. Improvement experiment
The experiment the paper proposes but didn't run: full 66k-match analysis with triangle computation enabled, resolving whether β₁/β₂ features have any value. For GSE's purposes the sharper experiment is §12 above — plus a margin-weighted edge variant (weight ∝ point differential × recency sigmoid) which the paper's binary set-win edges ignore, and which plausibly matters more in football than in tennis.
