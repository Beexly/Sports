# [0598] Two-Sample Testing on Ranked Preference Data and the Role of Modeling Assumptions (arXiv:2006.11909v2)

**Citation:** Rastogi, C., Balakrishnan, S., Shah, N. & Singh, A. (2021). *Two-Sample Testing on Ranked Preference Data and the Role of Modeling Assumptions*. arXiv:2006.11909v2. URL: https://arxiv.org/abs/2006.11909v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 15,437 lines, including proofs, discussion, Appendix A experiment details, and references).
**Verdict:** ADAPT — the model-free two-sample test is directly usable as a principled change-detection tool for team-strength regimes (did relative team performance actually shift across seasons / after a coaching change / after a QB injury?), and the paper's headline negative result — assuming BTL/SST/Thurstone buys you nothing computationally — licenses using the simple model-free test instead of fancier parametric change detectors.

## 1. Research question
Given pairwise-comparison outcomes (or partial/total rankings) from two populations — e.g., team-vs-team results in two seasons — can we test whether the underlying win-probability distributions are identical, with minimax-optimal sample complexity, and do standard modeling assumptions (BTL, Thurstone, SST, MST, WST) actually help?

## 2. Dataset / schema
Theory: d items, per-pair comparison counts k^p_ij, k^q_ij, win counts X_ij ~ Bin(k^p_ij, p_ij), Y_ij ~ Bin(k^q_ij, q_ij). Simulations: d=20, ε=0.05, random-design k~Bin(n,a). Real data: (1) Shah et al. 2016 crowdsourcing set — 6 MTurk experiments (photo age, spelling mistakes, city distances, search results, taglines, piano), 10–25 items each, 2017 ordinal + 1671 cardinal-converted-to-ordinal responses, d=74 combined; (2) European football 2016-17 vs 2017-18 (EPL, Bundesliga, La Liga, Ligue 1), 15–17 common teams/league, d=67, 801 vs 788 comparisons, draws excluded; (3) Kamishima sushi preferences — 5000 total rankings over 10 sushi types + 5000 partial rankings (10 of 100 types) with demographics (gender, age ±30, region East/West).

## 3. Method / model
Test statistic (8): T = Σ_{i,j} I_ij [k^q(k^q−1)(X²−X) + k^p(k^p−1)(Y²−Y) − 2(k^p−1)(k^q−1)XY] / [(k^p−1)(k^q−1)(k^p+k^q)] — an unbiased-for-zero-under-null quadratic form; reject when T ≥ 11d (general threshold d√(24(2−ν)/ν) for error ν). Permutation variant (Algorithm 2) for sharp finite-sample Type I control. For ranking data: rank-breaking (random/disjoint-deterministic/complete) converts rankings to pairwise comparisons, then Algorithm 1 (Plackett-Luce, Theorems 7–8); permutation Algorithm 4 controls Type I error for the nonparametric marginal-probability model (Theorem 9) regardless of rank-breaking dependence.

## 4. Equations & assumptions
Hypotheses (1): H_0: P=Q vs H_1: (1/d)|||P−Q|||_F ≥ ε. Critical radius (3): ε_M = inf{ε: R_M ≤ 1/3}. Model hierarchy: {BTL, Thurstone} ⊂ parameter-based (M_ij = f(w_i−w_j)) ⊂ SST ⊂ MST ⊂ WST ⊂ model-free. Sample complexity upper bound (Theorem 1): ε² ≥ c/(kd) suffices with k>1 comparisons/pair (estimation would need k = O(log d/ε²); testing needs only k = O(1/(dε²))). Random-design corollary: ε² ≥ c·max{1/(μd), 1/d²}. Ranking-data bounds: N ≥ c·d²log(d)/m·⌈c_0/(dε²)⌉ (partial, random disjoint) and N ≥ 2d·⌈c/(dε²)⌉ (total, deterministic disjoint).
Assumptions: no ties; comparisons independent within/across pairs; ranking subset selection independent of preferences (Theorem 9).

## 5. Features / target
Features: per-pair win counts in two populations (or rank-broken pairwise comparisons from rankings). Target: binary reject/retain of H_0: P=Q, at separation (1/d)||P−Q||_F ≥ ε.

## 6. Validation design
Simulations: power vs n = 1/(adε²) scaling — curves coincide across varied d, ε, a, confirming the predicted rate; power identical under model-free, BTL, and SST data-generating models (open question noted). Real data: permutation tests at α=0.05 (5000 permutations for simulations, 200 for sushi). No train/test split — this is hypothesis testing, not prediction.

## 7. Numerical results / baselines
Lower bounds match the upper bound: MST/WST/model-free critical radius ε²_M > c/(kd) (Theorem 3 — test is minimax optimal); parameter-based and SST information-theoretic lower bound ε²_M > c/(kd^{3/2}) (Theorem 5); computational lower bound for SST at k=1: ε²_M > c/(d(log log d)²) under the planted-clique conjecture (Theorem 6) — i.e., no polynomial-time test beats the model-free rate, so assuming SST/BTL buys nothing. k≤1 impossible in general: minimax risk ≥ 1/2 for ε ≤ 1/2 (Proposition 4). Real data: ordinal vs cardinal-converted-to-ordinal REJECTED, p=0.003 combined (age p=0.001, taglines p=0.083, search p=0.187; spelling/distances/piano n.s.) — people generate comparisons by a different mechanism than rating-then-converting, especially for subjective tasks. European football 2016-17 vs 2017-18: FAIL TO REJECT, p=0.971 combined (EPL 0.998, Bundesliga 0.691, La Liga 0.67, Ligue 1 0.787) — no detectable shift in relative team strength across consecutive seasons. Sushi: significant demographic differences (gender, age, region) detected in both the 10-sushi total-ranking set (d=10) and the 100-sushi partial-ranking set, competitive with Kendall/Mallows kernel tests.

## 8. Code / data availability
No code link in paper. Algorithms 1–4 fully specified (reproducible in an afternoon). Data: Shah et al. 2016 MTurk set (public via that paper), football scores (public), Kamishima sushi set (public, 5000+5000 rankings).

## 9. Leakage & limitations
- Football analysis drops draws and uses ≤2 comparisons/pair — near the k>1 boundary; low power against small shifts.
- The test detects *any* distributional shift, not its direction or which teams changed — no attribution.
- SST/parameter-based gap: simulations show equal power across models, but theory leaves the kd^{−3/2} vs kd^{−1} gap open.
- Permutation power not theoretically characterized (noted as active research).
- Rank-breaking "complete" induces dependence handled only via permutation; Plackett-Luce sample-complexity bounds need the disjoint variants.

## 10. GSE overlap
Extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1), the corpus has regime/momentum detection (MOVE-37) and change-oriented engine work, but no principled two-sample change test on win-probability matrices. The paper's sports example *is* the GSE use case, and its negative result (no detectable cross-season shift in 4 leagues, p=0.971) is a directly reusable baseline: GSE's priors on season-to-season team-strength persistence should be strong, and claims of "the league got weaker" need this test's bar.

## 11. GSE implementation spec
Deploy the permutation two-sample test (Algorithm 2) as a regime-change monitor: split team-vs-team (or QB-vs-defense) matchup outcomes into pre/post windows around candidate change points (coaching changes, QB injuries, trade deadline, season halves); run the test on each window pair at α=0.05. Use the null result as a gate: only re-fit team-strength priors when the test rejects. Also applicable to model monitoring: test whether the distribution of engine pick outcomes shifted after a model-version deploy. Effort: ~1 engineer-week (statistic + permutation loop; ~50 lines).

## 12. Reproducible test
Dataset: nflverse 2015–2025 game results (drop ties or treat as half-wins), 32 teams. Test 1: split each season into first/second half — count rejections at α=0.05 (expect ~5% under stability, calibrating the test). Test 2: pre/post head-coach-change windows for the ~20 in-season firings since 2015 — measure the rejection rate; if near 5%, coaching changes don't detectably shift relative team strength at this resolution. Test 3: 2020 (COVID, no preseason) vs 2019 — a known structural break the test should catch.

## 13. Acceptance / rejection gate
Adopt as the regime-change gate if Test 1's false-rejection rate is within [2%, 10%] (calibrated) AND Test 3 rejects at p<0.05 (power against a real break). Reject if calibration fails (the permutation variant should fix this; if not, the statistic is misbehaving on NFL's sparse k≈1–2 schedule) — in that case restrict to multi-season aggregates only.

## 14. Improvement experiment
The paper tests for *any* shift with no attribution. Extend with a post-rejection attribution step: decompose T by pair (i,j) contribution to identify which team-pairs drive the rejection — turning "something changed" into "the AFC East hierarchy changed." Validate the attribution on the coaching-change windows from Test 2: the fired coach's team should rank in the top-3 contributing pairs whenever the global test rejects.
