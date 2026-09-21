# [0940] Is Elo Rating Reliable? A Study Under Model Misspecification (arXiv:2502.10985)

## Citation / full-text source

- arXiv:2502.10985 — full text: https://arxiv.org/pdf/2502.10985
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Shange Tang, Yuanhao Wang, Chi Jin (Princeton ORFE/ECE) (2025). *Is Elo Rating Reliable? A Study Under Model Misspecification*. arXiv:2502.10985. URL: https://arxiv.org/abs/2502.10985. No public code noted in text (experiments in JAX/L-BFGS; update formulas fully specified).
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete incl. appendices).

## 1. Research question
Elo is understood as an incremental estimator of a stationary Bradley-Terry (BT) model. Real match data violates BT and stationarity everywhere — yet Elo beats more complex systems (mElo/Elo2k, pairwise) at prediction. Why? And can Elo's rankings be trusted?

## 2. Dataset / schema
- **8 real datasets:** Renju (N=5k, 2T/N=49.8), Chess Lichess 2014 (185k, 125.4), ATP tennis (7k, 52.5), Scrabble (15k, 200.7), StarCraft Aligulac (22k, 38.7), Go OGS (426k, 60.4), LLM Arena/Chatbot Arena (129, 23156.9), Hearthstone archetypes (27, 4626.1).
- **Synthetic:** SST/WST transitive matrices (P_ij=0.6 by-entry; byrow/bydiagonal variants), N=100/1000, T=10^5, uniform + Elo-proximity matchmaking (K=N/5), non-stationary P^t.
- **Dense variants:** mixedchess-dense (N=2862, T=11.79M), go-dense (N=480, T=516k), Blotto/AlphaStar sparse vs 10× dense copies.

## 3. Method / model
- **BT rejection test:** logistic-regression form of BT, train/test split, augment with 2D features g_t = [θ_train[i_t], θ_train[j_t]] (or u/v for dense sets), likelihood-ratio statistic Λ ~ χ²₂ (Wilks; Sur et al. 1.25χ²₂ correction for high-dim). All 8 datasets reject BT: p < 10⁻⁴ (most < 10⁻¹⁰). A second martingale test using online Elo ratings as g_t (robust to adaptive matchmaking) rejects for all 8 at η=0.08.
- **Algorithms:** Elo (eq. 2), Glicko, TrueSkill vs Elo2k (k=4, vector ratings; p_t = σ(u_iᵀv_j − u_jᵀv_i)) vs Pairwise (regularized (5+wins)/(10+games), N(N−1)/2 params).
- **Regret lens:** ℒ_T = Model misspecification error + Regret_T (3). Elo = OGD on convex f_t, gradient −(o_t−p_t)(e_i−e_j).
- **Sparsity sweep:** plot (1/t)ℒ_t vs normalized time t/N; in-hindsight baselines for BT and Elo2k.

## 4. Equations & assumptions
- Elo: p_t = σ(θ_t[i_t]−θ_t[j_t]); θ_{t+1}[i] ← θ_t[i] + η_t(o_t−p_t) ...(2). BT: P(o_t=1|i,j) = σ(θ*[i]−θ*[j]).
- **Theorem 1:** OGD with η_t = D/(G√t) gives Regret_T ≤ (3/2)GD√T; for Elo, empirical ‖θ‖_∞ ≤ 5 → D=10√N, G≤√2, so **(1/T)Regret_T ≤ C√(N/T)** with η_t = √(N/t). Holds under misspecification and non-stationarity.
- Theorem 2/G.1: under product matchmaking q_ij = q_i q_j (incl. uniform), population BT-MLE θ* induces the same ranking as average win rate; under SST, Elo recovers the true ranking asymptotically.
- Hessian ∇²f_t = p_t(1−p_t)(e_i−e_j)(e_i−e_j)ᵀ ⪰ 0 (convexity). Elo2k loss is non-convex — no OGD guarantee.

## 5. Features / target
Features: player identity indicators (or vector embeddings for Elo2k). Target: game outcome; metric: binary cross-entropy cumulative loss; ranking metric: pairwise inconsistency τ.

## 6. Validation design
Hyperparameters chosen by minimizing L(v)=Σ_{i=1}^{30}(CE_i + 5(CE_i−ln2)𝟙(CE_i>ln2)) — penalizes overfitting. 30 checkpoints; learning rate η_t = √(aN/(t+b)), η ∈ [10/C≈0.06, 40/C≈0.23] standard (C=400/ln10). Non-stationarity: permutation/bootstrap test on Elo scores (chess p=0.01). Matchmaking correlation test (Table 4).

## 7. Numerical results / baselines
- **BT rejected everywhere** (Table 1); matchmaking strongly assortative (correlations 0.19–0.57, all p<10⁻¹⁰; Hearthstone −0.07); chess: most games within 20% Elo-percentile; player strengths non-stationary.
- **Table 2** (avg CE loss): Elo-family best or tied in all 6 sparse datasets — Renju 0.6039 (Pairwise 0.6688), Chess 0.6391, Tennis 0.6242 (Pairwise 0.6820), Scrabble 0.6730, StarCraft 0.5713 (Pairwise 0.6753), Go 0.6443. Only in dense sets (Hearthstone, AlphaStar-dense, go-dense, mixedchess-dense) does Elo2k win (Hearthstone: 0.6847 vs 0.6898).
- **Sparsity rule:** t/N < 1000 → Elo/Elo2k/pairwise ordering favors Elo (regret dominates); t/N > 1000 → model capacity wins when Elo2k's hindsight baseline is better. Blotto sparse vs 10× dense: same underlying non-BT model, different winner — sparsity, not model, decides.
- **Ranking:** pairwise inconsistency τ strongly correlated with prediction performance. But Example 1: SST 5-player matrix + matchmaking Q → θ^mle = [5.48, 0.89, 4.60, 0.04, 0] → ranking 1≻3≻2≻4≻5, **inconsistent** with ground truth; bootstrap CIs [4.86,5.33],[0.72,1.17],[4.18,4.68] confirm. Under WST, average win rate itself may mis-rank.

## 8. Code / data availability
No public code stated; full algorithmic detail in Appendix D (Elo/Glicko/TrueSkill/Elo2k/Pairwise formulas). Public datasets: Lichess, OGS, Sackmann tennis, Aligulac, cross-tables, renju.net, lmsys arena.

## 9. Leakage
Careful: two LR tests (split-based + martingale) specifically guard against leakage from adaptive matchmaking contaminating the BT test. Hyperparameter criterion guards overfitting.

## Limitations
- The sparsity rule (t/N < 1000) is empirical, not derived — the crossover point will vary by domain and by how non-BT the underlying data is.
- The regret bound requires convex loss and bounded ratings; Elo2k/Pairwise have no such guarantee, so the theory only licenses the simple side of the comparison.
- Ranking results are mostly negative (Example 1 shows Elo can be inconsistent under arbitrary matchmaking), but the paper offers no corrective algorithm — only the caution.
- All real datasets are individual-player games; the paper says nothing about team sports with roster churn, margin-of-victory signals, or draws as a third outcome class.
- Pairwise baseline used a crude (5+wins)/(10+games) regularization — a better-regularized pairwise model might narrow the gap in the sparse regime.

## 10. GSE overlap vs existing-research-map
- 0930 (luck-skill) and 0937 (Elo vs UEFA coefficients, Elo wins) are empirical confirmations of this paper's thesis; 0932's logistic Elo-MMR (runtime 6× faster than the incumbent) is the production Elo-family system this paper would recommend.
- 0933's non-time-respecting CV: this paper's entire regret framework argues online/cumulative evaluation is the correct paradigm for rating systems — a second argument for the 0933 recommendation.
- No existing ledger contains the misspecification+regret decomposition or the t/N sparsity rule — this is the new contribution.

## 11. Implementation spec (GSE adaptation)
- **Sparsity gate:** compute t/N for every GSE rating lane. NFL teams: N=32, T≈285/season → t/N ≈ 9 → extreme-sparse: **Elo-family only**, no pairwise/head-to-head parameters, no per-QB-matchup matrices. The regret bound says complex models' regret would dominate; the paper's tennis result (Pairwise 0.6820 vs Elo 0.6242, 2T/N=52.5) is the closest analog.
- **Learning rate:** set GSE Elo η from η_t = √(N/t) schedule, initial η ∈ [0.06, 0.23]/C; tune a,b in η_t = √(aN/(t+b)) per the paper's hyperparameter criterion (30 checkpoints + overfitting penalty). This replaces any hand-tuned K with a theory-backed schedule.
- **Team-strength→spread calibration:** since BT is rejected everywhere (including tennis, the closest NFL analog), treat GSE team ratings as *predictive* rather than *structural* — evaluate by cumulative CE loss (calibration), never by whether "true skill" is recovered. Aligns with the 750 program's calibration keyword.
- Effort: 2–3 days (sparsity audit of all GSE rating lanes + η schedule swap + CE-loss evaluation harness).

## 12. Reproducible test
Dataset: NFL 2000–2025. Compare three rating lanes on rolling cumulative CE loss: (a) current GSE team ratings, (b) plain Elo with paper's η schedule, (c) pairwise head-to-head win-rate model (regularized). Expect: (b) ≤ (a) or parity; (c) strictly worse — replicating Table 2. Success: (c) worse by ≥0.02 CE while (b) within 0.005 of best — confirming the sparsity regime applies to NFL. Failure mode: if (c) wins, NFL is effectively denser than t/N suggests (e.g., divisional repeat matchups) — revisit the gate.

## 13. Numeric gate
ADAPT confirmed if the NFL replication shows pairwise/Elo2k-style complexity underperforming plain Elo on cumulative CE loss (≥0.02 gap), validating the t/N<1000 sparsity regime for NFL. If complex models win, the doctrine still holds but the regime classification flips — either way the experiment pays for itself.

## 14. Improvement experiment
**Ranking-consistency audit under NFL matchmaking:** NFL scheduling is non-uniform (6 divisional games, strength-of-schedule tiers) — the paper's Example 1 shows Elo rankings can contradict transitivity under such matchmaking. Construct the paper's test on NFL data: compute the population BT-MLE θ* vs average win rate vs GSE power rankings for 2020–2025; flag any team pairs where θ* ordering contradicts average-win-rate ordering (the Example-1 signature). If contradictions exist, add the paper's correction — replace raw Elo ordering in published power rankings with the win-rate-consistent ordering, and quantify how often this changes playoff-seeding-relevant ranks. This turns the paper's caution into a concrete GSE quality control.

## 15. Verdict

**ADAPT** — the paper's value is not an algorithm but a **model-selection doctrine** GSE should internalize: cumulative loss = *model misspecification error* + *regret* (eq. 3). Elo = online gradient descent on convex log-loss with regret bound 1/T·Regret_T ≤ C√(N/T) and η_t = √(N/t), which explains why simple ratings beat complex ones in sparse data. The empirical **sparsity rule — t/N < 1000 favors Elo; t/N > 1000 favors Elo2k** — directly licenses GSE's simple team ratings (NFL: t/N ≈ 9, extreme-sparse) and warns against pairwise/matchup-style complexity. Adapt: (1) calibrate GSE Elo learning rates from the √(N/t) bound; (2) use the t/N rule as the gate for model complexity in every GSE rating lane; (3) heed the ranking caveat — under non-uniform matchmaking (NFL scheduling), Elo can induce inconsistent rankings even under transitivity. Not ADOPT: no new algorithm; pure theory + experiments.
