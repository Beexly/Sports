# [0595] Limits of PageRank-Based Ranking Methods in Sports Data (arXiv:2012.06366v1)

**Citation:** Zhou, Y., Wang, R., Zhang, Y.-C., Zeng, A. & Medo, M. (2020). *Limits of PageRank-Based Ranking Methods in Sports Data*. arXiv:2012.06366v1. URL: https://arxiv.org/abs/2012.06366v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,543 lines).
**Verdict:** REJECT — a negative result: PageRank-style network rankings have no business in GSE's NFL team-strength pipeline. The paper proves PageRank beats plain win ratio only in a tiny early-season/low-randomness corner that NFL data does not occupy; the win ratio (and by extension Elo-type methods) is the robust default. Keep as a guardrail against adopting network-centrality rankings.

## 1. Research question
Has PageRank's superiority over simpler point/win-based rankings in sports ever been demonstrated — and under what conditions (randomness level, fraction of season played, home advantage, fitness heterogeneity) does PageRank actually beat the win-ratio benchmark?

## 2. Dataset / schema
18 leagues across baseball (MLB AL/NL 1997–2016, NPB 2010–2019, LMB 2007–2019), ice hockey (NHL 2000–2019, LNA 2008–2019, DEL 2007–2020), soccer (Bundesliga 2000–2019, Serie A 2005–2019, La Liga 1998–2017, EPL 1999–2018, MLS 2000–2019, Ligue 1 2000–2019, CSL 2004–2019), basketball (LBSA 2008–2019, CBA 2007–2017, ACB 2007–2019, NBA 2001–2020). Regular seasons only, playoffs excluded; soccer draws (20–25%/season) ignored. Synthetic data: N=30 teams, fitness f_i = (i−0.5)/N uniform in [0,1], P(N−1) games per team via random-degree-sequence graphs, outcomes from the calibrated model.

## 3. Method / model
A two-parameter generative model for game outcomes: P(i,j) = [1 + e^{−(f_i − f_j + H)/δ}]^{−1} (home team i vs away j), with δ = randomness indicator (δ→∞ → coin flip) and H = home advantage (effective strength H/δ). MLE calibration shows team fitness ≈ win ratio w_i (AIC rejects the N+2-parameter fit in favor of the 2-parameter fit using w_i), giving P(i,j) = [1 + e^{−(Δw_{i,j} + H)/δ}]^{−1}. Three ranking algorithms: WinRatio (benchmark), PageRank P_i = (1−α)Σ_j P_j w_{ji}/s_j^{out} + α/N + (1−α)/N Σ_j P_j δ(s_j^{out}) with α=0.15 (loser→winner edges, dangling-node correction), and a new Bi-directional PageRank S_i = P_i − Q_i where Q_i runs PageRank on reversed edges (winner→loser), rewarding losses against weak opponents negatively. Evaluated on synthetic (ground truth = known fitness) and real data (ground truth = end-of-season win ranking).

## 4. Equations & assumptions
P(i,j) = [1 + e^{−(f_i − f_j + H)/δ}]^{−1}; simplified with f_i ≈ w_i: P(i,j) = [1 + e^{−(Δw_{i,j} + H)/δ}]^{−1}; H=0 recovers Bradley-Terry via p_i := e^{f_i/δ}.
PageRank (2): P_i = (1−α)Σ_j P_j w_{ji}/s_j^{out} + α/N + (1−α)/N Σ_j P_j δ(s_j^{out}), α=0.15.
BiPageRank (3–4): S_i = P_i − Q_i, Q_i = (1−α)Σ_j Q_j w_{ij}/s_j^{in} + α/N + (1−α)/N Σ_j Q_j δ(s_j^{in}).
Non-uniform fitness: f_i = β((i−0.5)/N)^α + γ, Σ f_i/N = 1/2.
Metrics: Kendall τ (5), top-5 AUC, average computed rank of top-5 ground-truth teams.
Assumptions: fixed fitness over season; binary outcomes (draws dropped); random scheduling in synthetic; real-data ground truth = final win-ratio ranking (favors WinRatio by construction).

## 5. Features / target
Features: game outcomes (home/away winner) aggregated into directed win/loss networks. Target: team ranking vs ground-truth fitness (synthetic) or end-of-season standings (real). Metrics: Kendall τ, top-5 AUC, average top-5 rank.

## 6. Validation design
Synthetic: 100 independent realizations per (δ, H, P, α, β) setting, N=30; metrics averaged with ±2 standard errors. Real: first PN_S games of each season as input, Kendall τ vs end-of-season ranking, averaged over last 10 available seasons per league; reports τ(P, BiPageRank) − τ(P, WinRatio) with the threshold P where the sign flips.

## 7. Numerical results / baselines
- Calibration: δ varies by sport (baseball most random, basketball least; CBA least random of 17 leagues); H ∈ [0, 0.25]; basketball/soccer have larger effective H/δ than baseball/hockey; CBA's H/δ is 5.4× baseball's.
- Synthetic (H=0): PageRank beats WinRatio only when δ is small AND P is small; the δ threshold below which PageRank wins shrinks as P grows; the vast majority of real datasets have δ > 0.15, where PageRank brings no improvement — and is significantly worse for high-δ sports late in the season.
- BiPageRank ≥ PageRank in all settings, but beats WinRatio only for the lowest-randomness sports at small P (e.g., δ=0.1, P=0.1); with power-law fitness (α≠1 or β<1), its advantage shrinks further.
- Home advantage H>0 degrades all three methods, WinRatio most robustly; PageRank's applicability window shrinks further.
- Removing/reversing unexpected outcomes (fraction η): no η lets PageRank/BiPageRank beat WinRatio — WinRatio improves uniformly, the network methods need implausibly large η.
- Real data: BiPageRank beats WinRatio only at very small P — threshold P ≈ 0.1 or lower per league (ACB, DEL have narrow secondary windows); averaged over all leagues the threshold is P = 0.035, and WinRatio never loses by more than 0.03 in Kendall τ. Confirms the synthetic finding model-free.
- Mechanism: a single upset perturbs only two teams' win ratios but propagates through the whole PageRank network; with many upsets (high δ), accumulation is detrimental.

## 8. Code / data availability
No code link stated. Data from sports-reference.com and win007.com; synthetic generator fully specified (NetworkX random_degree_sequence_graph + Eq. 1).

## 9. Leakage & limitations
- Real-data ground truth (final win ratio) structurally favors the WinRatio benchmark — the authors acknowledge this; the early-season PageRank edge survives it, which strengthens that specific finding.
- Binary-outcome model drops soccer draws (20–25% of games) — calibration on soccer is approximate.
- Fixed fitness: no in-season form changes, injuries, or trades.
- Synthetic scheduling is random; real schedules are structured (divisions/conferences).
- Tennis/national-team settings (small effective P) are suggested as possible PageRank territory but untested.

## 10. GSE overlap
No overlap — per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1 master metrics list), the repo's team_ratings lane contains no PageRank or eigenvector-centrality ranking methods, which is exactly the state this paper recommends keeping. The paper's two-parameter outcome model (δ randomness, H/δ effective home advantage) and its calibration protocol are adjacent to existing HFA and luck work but add no new GSE feature.

## 11. GSE implementation spec
No implementation — the verdict is rejection. The one actionable boundary condition: if GSE ever builds a network-based ranking (e.g., for cross-league or sparse-data settings like preseason/early-season power ratings), the paper licenses exactly one use case — BiPageRank on the first ~3.5% of games (roughly NFL weeks 1–2), where it beats win-based rankings on real data. Any PageRank use beyond that window contradicts the evidence.

## 12. Reproducible test
Dataset: nflverse 2015–2025. Reproduce Figure 6 for the NFL: compute τ(P, BiPageRank) − τ(P, WinRatio) vs end-of-season standings for P in {0.02, 0.05, 0.1, 0.25, 0.5, 1.0}, averaged over seasons. Expect the paper's pattern: small positive differences at P ≤ 0.05, negative thereafter.

## 13. Acceptance / rejection gate
Reject as a GSE ranking method — the paper's own evidence shows PageRank-family methods lose to the win ratio across the NFL-relevant parameter range. The narrow early-season BiPageRank window may be adopted only if the reproducible test above confirms a positive τ difference at P ≤ 0.05 on NFL data; otherwise no network ranking enters the pipeline.

## 14. Improvement experiment
The paper's mechanism (upset propagation through the network) suggests a fix it never tests: edge weights that down-weight high-surprise games (e.g., weight by |predicted − actual| outcome probability, or by score differential as in Govan et al. 2008) before running PageRank. If surprise-discounted PageRank closes the gap to WinRatio at NFL randomness levels, the network approach becomes viable; if not, the rejection is final.
