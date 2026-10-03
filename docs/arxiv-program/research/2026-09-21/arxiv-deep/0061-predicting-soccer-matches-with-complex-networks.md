# [0061] Predicting soccer matches with complex networks and machine learning (arXiv:2409.13098v1)

**Citation:** Eduardo Alves Baratela, Felipe Jordão Xavier, Thomas Peron, Paulino Ribeiro Villas-Boas, Francisco Aparecido Rodrigues (2024). *Predicting soccer matches with complex networks and machine learning*. arXiv:2409.13098v1. URL: https://arxiv.org/abs/2409.13098v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 1,481 lines, incl. appendices).
**Verdict:** ADAPT — passing-network topology matches box-score stats and fusing them gains +3.5pp/0.05 AUC; port the fusion blueprint and centrality metric set to NGS target networks as a time-ordered ablation experiment, not the soccer model itself.

## 1. Research question
Tests whether passing-network topology (complex-network metrics on player passing graphs) predicts soccer match winners as well as traditional match statistics, and whether fusing both feature families beats either alone. Secondary questions: k-means clustering of leagues by network metrics (are playing styles distinct per country?), per-half vs. whole-match network granularity, and a leave-one-league-out championship simulation. Claims: (a) network-only models ≈ stats-only models; (b) mixed model beats both (RF 71.44% / 0.77 AUC); (c) per-half networks beat whole-match networks; (d) no significant playing-style differences across the five leagues.

## 2. Dataset / schema
- **Source:** Pappalardo et al. event dataset (Scientific Data 6:236, 2019 — public). 1,941 matches: 2018 FIFA World Cup, UEFA Euro 2016, and the 2017–18 seasons of Spain, Italy, Germany, England, France.
- **Main sample:** draws removed → **1,470 binary matches** (home-win binary target). Appendix A re-runs the analysis with draws included (3-class).
- **Schema:** match-level event data (passes with player IDs and pitch coordinates, shots, cards, goals, GK saves, possession, pass accuracy). League-level slices used for per-league predictability; Appendix B trains on four leagues and predicts the fifth, simulating a full table (3 pts/win): champions correctly predicted in England, Germany, France; within-2-positions margins: Spain 1 exact/4 ≤2, England 3/8, Italy 3/12, France 5/10, Germany 3/10 (Fig. 8).

## 3. Method / model
- **Passing networks:** player nodes (11 per team; substitutes merged into the replaced player — noted as suppressing substitution effects), directed edges weighted by pass count, node positions = average field coordinates in the interval. Two granularities: whole match; per-half.
- **Network metrics (Eqs. 1–6):** degree, closeness, betweenness, eigenvector centrality, clustering coefficient, average shortest path, network centroid (x_c, y_c). Per network: min/max/mean/std of node metrics (except avg shortest path and centroid).
- **Stats features:** GK saves, red/yellow cards, assists, shots, opponent shots, shots on target, passes, goals, opponent goals, possession, pass accuracy, GK-save accuracy, shots-on-target accuracy.
- **Feature construction:** rolling average of each team's previous five matches (home team's five home matches; away team's five away matches); feature row = half home-team + half away-team; binary target = home win.
- **Models:** Logistic Regression, Random Forest, XGBoost (scikit-learn), Hyperopt tuning, stratified 10-fold CV, 30% test split; metrics accuracy/precision/recall/F1/AUC. Interpretability: permutation importance + SHAP. Clustering: k-means k=2–7, elbow/silhouette/NMI, with and without PCA.

## 4. Equations & assumptions
Standard network-science definitions; no novel math. Quoted as printed:
- **Eq. 1 (degree):** C_D(v) = deg(v)/(n−1). Clean.
- **Eq. 2 (closeness):** C_C(v) = (n−1)/Σ_u d(u,v). Extraction interleaves the denominator; minor garble, reconstructable from the prose ("inverse of the sum of the shortest distances").
- **Eq. 3 (betweenness):** C_B(v) = Σ_{s≠v≠t} σ_st(v)/σ_st. Clean.
- **Eq. 4 (eigenvector):** C_E(v) = x(v), Ax = λ_max x. Clean.
- **Eq. 5 (clustering):** C_tr(v) = 2T(v)/(deg(v)(deg(v)−1)). Clean.
- **Eq. 6 (avg shortest path):** ℓ = Σ_{s,t∈V} d(s,t)/(n(n−1)). Clean.
- **Assumptions:** substitutes merged into replaced players (suppresses substitution/tactical-change effects); draws excluded from the main analysis; undirected-vs-directed treatment of centrality per standard definitions.

## 5. Features / target
- **Network features:** per-team min/max/mean/std of node degree, closeness, betweenness, eigenvector centrality, clustering coefficient; plus average shortest path and network centroid (x_c, y_c) — no min/max/mean/std for the latter two.
- **Stats features (exact list):** GK saves, red/yellow cards, assists, shots, opponent shots, shots on target, passes, goals, opponent goals, possession, pass accuracy, GK-save accuracy, shots-on-target accuracy.
- **Target:** binary home win (draws excluded in main analysis; 3-class win/draw/loss in Appendix A).
- **Horizon/label construction:** rolling average of each team's previous five matches (home team's five home matches; away team's five away matches); feature row = half home-team features + half away-team features.

## 6. Validation design
- **Splits:** stratified 10-fold CV plus a 30% test split. **Critical caveat:** no stated time ordering — if the split is random, the rolling 5-match features can include future matches (leakage risk; any GSE replication must be time-ordered).
- **Baselines compared:** LR, RF, XGB on nets-only vs. stats-only vs. mixed feature sets (ablation across feature families).
- **Metrics:** accuracy, precision, recall, F1, AUC.
- **Appendices:** Appendix A re-runs with draws included (3-class); Appendix B leave-one-league-out championship simulation (train four leagues, predict the fifth, simulate full table).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper; all are the paper's claims, not this ledger's.
- **Table I (binary, no draws):** Nets-only — LR 67.64%/0.75 AUC, RF 67.93%/0.74, XGB 66.18%/0.69. Stats-only — LR 65.12%/0.69, RF 66.86%/0.72, XGB 66.86%/0.69. Network ≈ stats.
- **Table II (mixed):** LR 69.39%/0.75, RF 71.44%/0.77, XGB 66.18%/0.72. Mixed beats both single-source models.
- **Granularity:** per-half networks → AUC 0.72, F1 ≈ 75.5% vs. whole-match AUC 0.70, F1 ≈ 74% (Fig. 5 text).
- **Top features (Fig. 6/7):** avg opponent goals in away matches ("avg goals against T2"); min clustering coefficient of away team 1H ("avg min clustering T2 1H"); max eigenvector centrality home 1H ("avg max eigenvector centrality T1 1H" — the playmaker proxy). Importance spread across both feature families; no single dominant feature.
- **Fig. 2 (EPL position correlations):** degree r=−0.690 (p=0.000767); closeness −0.682 (p=0.000929); betweenness +0.671 (p=0.001199); eigenvector −0.521 (p=0.018); clustering −0.658 (p=0.0016); avg shortest path +0.659 (p=0.0016); centroid-X −0.733 (p=0.00023); centroid-Y +0.228 (p=0.333, ns — only non-correlating metric). Better teams: higher degree/closeness/clustering, lower average path length.
- **Clustering:** k=3 best, silhouette 0.173 (0.194 with PCA), NMI ≈ 0.03 (0.033) — inconclusive; no distinct league styles.
- **Table III (draws included, 3-class):** RF accuracy drops 71.44% → 55.03% (LR 69.39%→49.28%, XGB 66.18%→55.65%); still beats the 33% random baseline.
- **League-level:** EPL most predictable (RF 80%), others 65–69%.

## 8. Code / data availability
**Code:** not stated. **Data:** Pappalardo et al. 2019 public dataset (Scientific Data 6:236). Methods fully described; reimplementable. No repo link given.

## 9. Leakage & limitations
- **Stated:** single season of five leagues + two tournaments; no draws in main analysis; no team/coach/injury changes; substitute merging suppresses in-game tactical changes.
- **Reviewer view (adversarial):**
  - **Leakage risk:** "30% test" and stratified 10-fold CV with no stated time ordering — if the split is random, the rolling 5-match features can include future matches. Flag; any GSE replication must be time-ordered.
  - Draw removal inflates all headline numbers; the realistic 3-class accuracy is 55%.
  - EPL 80% is a single-league, single-season slice — likely noise-assisted.
  - Soccer-only; passing networks have no direct NFL analog (NFL is not a continuous passing graph), so the transfer is conceptual, not direct.
  - Methodological novelty is low — standard centrality features + RF/XGBoost.

## 10. GSE overlap
- **Existing GSE corpus:** no passing/target-network graph features found in the existing-research map — the NGS corpus covers 27 metric families + STRAIN, but network topology appears to be a **gap**, strengthening the ADAPT case.
- **This batch:** 0065 (Sports-Traj) uses trajectory prediction, not graph topology; 0063/0066 (MambaTrack/MambaMOT) are tracking/MOT — complementary, no duplication.
- Assessment: extension / new capability (graph-topology features), not a duplicate.

## 11. GSE implementation spec
- **The transferable finding is the fusion result:** topology features ≈ box-score features, and the mixed model gains **+3.5pp accuracy / +0.05 AUC** over either alone. GSE's NGS program has the raw material for an NFL analog:
  1. **Target networks:** QB→receiver directed weighted graphs per game — compute degree/eigenvector/betweenness centrality of receivers, clustering of target distribution (is the offense concentrated through one hub or distributed?). Feed alongside traditional stats into game-outcome / spread models.
  2. **Route-combination co-occurrence networks** from tracking data (which routes co-occur; motif analysis — the authors' own suggested extension).
  3. **Temporal granularity lesson:** per-half networks beat whole-match — mirror with per-quarter or per-half splits in NFL features (the paper's stated next step is 15-minute windows).
- The Fig. 2 pattern (better teams = shorter average path / higher clustering) suggests an NFL hypothesis: offenses whose target networks have high clustering + short paths (quick ball distribution through multiple hubs) outperform star-concentrated ones — testable against EPA/play.
- **Build plan:**
  1. Build per-team-per-game target networks from NGS/tracking: nodes = eligible receivers + QB, edges weighted by targets (or completions).
  2. Compute the paper's metric set (degree, closeness, betweenness, eigenvector, clustering, avg path) per network; aggregate min/max/mean/std as in the paper.
  3. Rolling 5-game averages, home/away split as in the paper; fuse with existing GSE game features; train RF/XGB with **time-ordered** splits (fixing the paper's leakage risk).
  4. Ablate: stats-only vs. network-only vs. mixed — require the mixed model to reproduce the +3pp-style gain before productionizing.

## 12. Reproducible test
- **Reproduction gate:** reimplement on the Pappalardo dataset; recover Table II RF mixed accuracy ≈ 71.4% ± 2pp and AUC ≈ 0.77 ± 0.03.
- **GSE gate:** network-feature ablation on 2022–2025 NFL games, time-ordered; metric = accuracy/AUC on spread-cover or win prediction. **Adopt if mixed beats stats-only by ≥2pp with p<0.05 (McNemar);** keep as research feature otherwise.

## 13. Acceptance / rejection gate
Verdict rationale: a modest, honest paper — no direct NFL method, but the fusion blueprint and centrality metric set port cleanly to NGS target networks as an ablation experiment, with the paper's unstated-split leakage risk fixed by time-ordered replication.
1. **Reproduction criterion:** reimplement on the Pappalardo dataset (1,470 binary matches) with **time-ordered** splits and recover the paper's Table II RF mixed-model results: accuracy ≥ 69.4% (paper: 71.44%, tolerance −2pp) and AUC ≥ 0.74 (paper: 0.77, tolerance −0.03).
2. **Comparison to run:** head-to-head ablation — stats-only vs. network-only vs. mixed RF/XGB — on 2022–2025 NFL games, time-ordered; metric = accuracy/AUC on spread-cover or win prediction.
3. **Decision rule:** ADOPT only if the reproduction gate holds AND the mixed model beats stats-only by ≥ 2pp accuracy with McNemar p < 0.05; otherwise keep as a research feature and REJECT for production.

## 14. Improvement experiment
- Finer temporal windows (per-quarter networks; the paper's 15-minute suggestion).
- Network motifs (the authors' stated extension; Gyarmati "flow motifs") for route-combination patterns.
- Replace substitute-merging with dynamic node sets for in-game personnel changes (directly relevant to NFL personnel packages).
- 3-class outcome modeling from the start (the paper shows draws collapse accuracy — the NFL analog is cover/push/no-cover).
