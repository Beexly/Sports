# [0542] Bradley-Terry Rankings for Recommender Systems Across Dataset Taxonomies (arXiv:2606.07492v1)

**Citation:** Grishina, E., Kuznetsov, S., Tsyganov, A., Ivanov, I., Korovaitceva, D., Rusanova, M., Parkina, U., Derevyagin, A., Frolov, E., Samsonov, S., & Lysenko, A. (2026). *Bradley-Terry Rankings for Recommender Systems Across Dataset Taxonomies*. In Proc. KDD '26, Jeju, Aug 9–13, 2026. arXiv:2606.07492v1. URL: https://arxiv.org/abs/2606.07492v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5492 lines).
**Verdict:** ADAPT — the BT-vs-naive-aggregation comparison and covariate-adjusted BT are directly portable upgrades to GSE's team-rating and model-selection machinery (the paper's recommender domain transfers cleanly since GSE already uses BT/Elo on pairwise comparisons).

## 1. Research question
Naive aggregation of algorithm performance (mean/sum of NDCG across benchmark datasets) produces unstable, misleading rankings because algorithm performance depends on dataset characteristics (sparsity, sequentiality, scale). The paper asks: (1) does a Bradley–Terry tournament model over pairwise algorithm comparisons yield more consistent and missing-data-robust rankings than naive aggregation? (2) can covariate-adjusted BT (fusion-regularized) and BT trees predict an algorithm's ranking on an *unseen* dataset from its characteristics without running the models? Answer: yes — BT beats mean/sum on a new transitive-triplets consistency metric and is robust to up to ~70% missing comparisons; covariate BT best predicts top-k baselines on holdout datasets (top-1 hit 0.24–0.28 vs 0.02–0.08 for mean aggregation).

## 2. Dataset / schema
- **89 recommendation datasets** (mostly from the APS benchmark set + additions), 5-core filtered; grouped along 4 taxonomy dimensions: density, user-item ratio, mean interactions per user, sequentiality (2-gram-based sequentiality score; datasets without timestamps treated as non-sequential).
- **14 algorithms:** trivial (Random, PopRandom), neighborhood (User-KNN, Item-KNN, Seq-KNN), MF/linear (ALS, BPR, SGD MF, PureSVD, EASEr), graph (LightGCN, UltraGCN), sequential (SASRec transformer, GASATF tensor).
- **Protocol:** global temporal split (GTS) 90/5/5 train/val/test; last-item validation, random-item test target; 10 random seeds → metric intervals mean ± std; Optuna TPE hyperparameter search, single search space, 200 trials (20 startup), tuned on validation NDCG@10; retrained on train+val, test metrics collected.
- **Access:** open — code at https://doi.org/10.5281/zenodo.20383718 and https://github.com/fallnlove/btl_recsys (14 algorithm implementations, 89 preprocessed datasets, HPO/eval/BT framework).

## 3. Method / model
**BT tournament.** Algorithm i "beats" j on dataset d if its metric (NDCG@10) is higher → win matrix W, W_{ij} = # datasets where i beats j. Ties: if intervals metric_i ± std_i and metric_j ± std_j overlap, add 0.5 to both W_{ij} and W_{ji}. Then standard BT: Pr(i ≻ j) = p_i/(p_i + p_j), Σ p_i = 1 (or Π p_i = 1).
- **Estimation (three variants, compared):** (1) classic Zermelo MLE iteration p′_i = Σ_j W_{ij} / Σ_j (W_{ij}+W_{ji})/(p_i+p_j), normalized by geometric mean; (2) Bayesian BT: W_{ij} ∼ Binomial(N_{ij}, e^{β_i}/(e^{β_i}+e^{β_j})), β_i ∼ Normal(0, σ̄), σ̄ ∼ LogNormal(0, 0.5), Metropolis-Hastings → posterior samples give CIs on weights and P(i≻j); (3) rank centrality (spectral): random walk on comparison graph, θ*_i from stationary distribution. On the complete win matrix all three converge to identical weights; the Bayesian variant is used for its confidence intervals.
- **Plackett–Luce (listwise):** per-dataset full rankings from sorted metrics; EM with latent Exp(z_{ij}; Σ_{k≥j} p_{y_ik}) variables, or Gibbs sampler with Gamma posteriors; gives an alternative weights estimate.

**Transitive-triplets metric (novel).** A triplet (i_1,i_2,i_3) is transitive on dataset d if i_1 wins i_2, i_2 wins i_3, and i_1 wins i_3 per the global ranking. Triplet ratio = 1/((n choose 3)·D − missing) · Σ_d Σ_{i_1≠i_2≠i_3} I{i_1^d ≻ i_2^d ≻ i_3^d}. Tie-aware: transitive if i_1 ⪰ i_2 ⪰ i_3. Robust to missing comparisons (unlike mean Kendall's τ, which requires dropping algorithms with missing values). Higher = better.

**Covariate-adjusted BT.** P(i ≻ j | x) = σ(β_{i0} − β_{j0} + ⟨x,β_i⟩ − ⟨x,β_j⟩); n(d+1) parameters; identifiability Σ_i β_{ij} = 0 ∀j. Fitted by penalized MLE: ℓ(B) − L(B) with fusion penalty L(B) = λ_0 Σ_{i<j} √((β_{i0}−β_{j0})²+ε) + λ_1 Σ_k Σ_{i<j} √((β_{ik}−β_{jk})²+ε) (shrinks overall strengths together and covariate effects together to avoid overfitting to the static global ranking); L-BFGS-B. Covariates: log-normalized numeric + binary categorical dataset characteristics. Predict ranking on a new dataset by sorting β_{i0} + ⟨x, β_i⟩. **BT trees** (psychotree R package): recursive partition of datasets by covariates (e.g., forced root split on sequentiality → number of users → interactions/user), leaf = BT ranking; zero-cost prediction by tree traversal.

## 4. Equations & assumptions
- BT: Pr(i ≻ j) = p_i/(p_i + p_j), Σ_i p_i = 1 or Π_i p_i = 1.
- Log-likelihood: ℓ(p) = Σ_{i,j} W_{ij}(ln p_i − ln(p_i + p_j)).
- Zermelo iteration: p′_i ← Σ_j W_{ij} / Σ_j (W_{ij}+W_{ji})/(p_i+p_j); p_i ← p′_i/(Π_j p_j)^{1/n}.
- Bayesian BT: W_{ij} ∼ Binomial(N_{ij}, e^{β_i}/(e^{β_i}+e^{β_j})); β_i ∼ Normal(0, σ̄); σ̄ ∼ LogNormal(0, 0.5).
- Rank centrality: P_{ij} = (1/(2nd))A_{ij}w̄_{ji} (i≠j), P_{ii} = 1 − (1/(2nd))Σ_{k≠i} A_{ik}w̄_{ki}; π̂ᵀP = π̂ᵀ; θ*_i = log π̂_i − (1/n)Σ_k π̂_k (under Σ_i θ*_i = 0).
- PL: Pr(y_{i_1} ≻ … ≻ y_{i_{T_i}}) = Π_{k=1}^{T_i} p_{i_k}/Σ_{j=k}^{T_i} p_{i_j}; EM via latent z_{ij} ∼ Exp(·; Σ_{k≥j} p_{y_ik}).
- Triplet ratio: = 1/((n choose 3)·D − missing) · Σ_d Σ_{i_1≠i_2≠i_3} I{i_1^d ≻ i_2^d ≻ i_3^d}.
- Covariate BT: P(i ≻ j | x) = σ(β_{i0} − β_{j0} + ⟨x,β_i⟩ − ⟨x,β_j⟩); ℓ(B) = Σ_k (y_k log P(i_k≻j_k|x_k) + (1−y_k) log(1−P(i_k≻j_k|x_k))); fusion penalty L(B) = λ_0 Σ_{i<j} √((β_{i0}−β_{j0})²+ε) + λ_1 Σ_k Σ_{i<j} √((β_{ik}−β_{jk})²+ε); objective ℓ(B) − L(B) → max, subject to ∀j Σ_i β_{ij} = 0.
- **Stated assumptions:** (1) pairwise wins on metric values are the right primitive for algorithm quality (magnitude of win ignored — acknowledged limitation §8); (2) metric±std interval overlap ⇒ tie; (3) datasets are exchangeable tournament "venues" (no weighting by dataset size/quality); (4) BT model order-preserves "true" algorithm strength; (5) covariate effects are linear in the BT logit; (6) GTS 90/5/5 with random timestamps for dateless datasets preserves comparability.

## 5. Features / target
- **Inputs:** per-(algorithm, dataset) test metric intervals (NDCG@10 primary; HitRate@10, Coverage@10 in appendix); dataset taxonomy covariates (density, user-item ratio, mean interactions/user, sequentiality, #users, #interactions).
- **Targets:** global algorithm ranking (BT weights); dataset-class-conditional rankings; holdout-dataset ranking prediction.
- **Horizon:** static.

## 6. Validation design
- **Ranking-quality metrics:** transitive-triplet ratio (novel) and mean Kendall's τ between global ranking and per-dataset rankings; computed on all datasets + sparse / long-history subsets, with and without tie handling.
- **Stability:** randomly omit a fraction of (algorithm, dataset) metric entries; recompute rankings; track triplet ratio and weight trajectories (Figs. 1–2).
- **Baselines:** Mean and Sum of NDCG@10 (the naive aggregators); PL; and within BT: Zermelo vs Bayesian vs rank centrality.
- **Holdout prediction:** 10 (then 30) random holdout datasets; fit on remainder; metrics: top-1/2/3 hits (predicted top-1 in ground-truth top-1/2/3), top-2/3/5 overlap; averaged over 5 runs. Methods: Mean (same ranking for all holdouts), BT, Cov. BT, BT tree. Plus Table 6: Kendall τ, MAP@5, NDCG@5, top-5 overlap of predicted rankings.
- **Ablations:** timestamp shuffling on sequential datasets (§6.4 — checks ranking separation under destroyed sequentiality); tie handling on/off.

## 7. Numerical results / baselines
- **Ranking quality (Table 1, NDCG@10, w/o ties → w/ ties):** triplet ratio — Mean 0.488→0.613, Sum 0.484→0.613, **BT 0.510→0.631**, PL 0.503→0.631. Mean Kendall's τ — Mean 0.542, Sum 0.541, **BT 0.567**, PL 0.558. BT best on both; consistent on sparse/long-history subsets (e.g., sparse: BT 0.505→0.624, τ 0.565 vs Mean 0.495→0.615, τ 0.542). BT and Kendall's τ agree on ordering.
- **Stability (Figs. 1–2):** triplet ratio for BT/PL stays ≈0.6 until >0.7 of comparisons are missing; Sum/Mean decline 0.6 → ~0.4. BT/PL weights stable; Sum/Mean weights fluctuate with missingness.
- **Estimator comparison:** Zermelo, Bayesian, rank centrality converge to identical weights/rankings on the complete W; BT vs PL: highly concordant on all/sequential datasets (same top cluster: Seq-KNN, LightGCN, SASRec), diverge on long-history datasets (PL moves SASRec 4th→6th, Item-KNN 9th→5th — "under uncertainty they give different interpretations").
- **Dataset-class rankings (Table 2):** SASRec/GASATF rank 1–2 on sequential, collapse to 10th/11th on non-sequential; ALS rises 11th→2nd on non-sequential; LightGCN best on short-history; UltraGCN/ALS better on low user-item ratio. Global BT ranking (Table 3): 1 Seq-KNN, 2 LightGCN, 3 SASRec, 4 GASATF, 5 EASEr, 6 BPR, 7 Item-KNN, 8 UltraGCN, 9 PureSVD, 10 ALS, 11 SGD MF, 12 User-KNN, 13 PopRandom, 14 Random. Discrepancies vs naive: EASEr 5th (BT) vs 1st (Mean); BPR 6th (BT) vs 10th (Sum) — "simple methods treat every win as equal; BT accounts for opponent strength."
- **Timestamp shuffle (§6.4):** sequential models lose dominance and separation; BT weights shrink; SASRec degrades most (SASRec < Seq-KNN, GASATF after shuffle).
- **Holdout prediction (Table 5):** Train(79)/Holdout(10) — top-1 hits: Mean 0.02, BT 0.24, Cov. BT 0.28, BT tree 0.26; top-3 hits: 0.16/0.78/0.78/0.64; top-2 overlap: 0.62/0.86/0.96/0.86; top-5 overlap: 3.32/3.32/3.28/2.88. Train(59)/Holdout(30) — top-1 hits: 0.08/0.15/0.24/0.13; top-2 hits 0.17/0.47/0.61/0.40: covariate models degrade less with fewer comparisons. **Table 6:** Kendall τ: Mean 0.438, BT 0.489, Cov. BT 0.572, tree 0.501; MAP@5: 0.689/0.872/0.873/0.869; NDCG@5: 0.575/0.709/0.732/0.693; top-5 overlap: 3.10/3.32/3.42/3.18.
- Appendix Table 8: BT vs Mean/Sum/PL Kendall τ > 0.8 on NDCG@10/HitRate@10/Coverage@10 (PL often highest, esp. sparse/coverage).

## 8. Code / data availability
- Code + data: https://doi.org/10.5281/zenodo.20383718 / https://github.com/fallnlove/btl_recsys (stated). 89 datasets preprocessed, 14 algorithm implementations, HPO/eval/BT pipeline.

## 9. Leakage & limitations
- **Win magnitude ignored:** BT counts wins, not margins — a 0.001 NDCG edge equals a 0.1 edge (authors acknowledge §8; tie-handling only partially mitigates via std-overlap).
- **Dataset exchangeability:** 89 datasets treated as equal tournament venues; no weighting by dataset size, quality, or recency; multiple near-duplicate datasets in APS could double-count evidence.
- **HPO budget asymmetry:** 200 Optuna trials per (algorithm, dataset) but "occasionally terminated early due to time constraints" on large datasets — rankings confound algorithm quality with compute budget; authors don't quantify this.
- **Selection of the 89 datasets** is author-curated; a different corpus could shift the taxonomy-conditioned rankings (no corpus-sensitivity analysis).
- **Covariate BT has n(d+1) parameters** with fusion regularization — on the 79-dataset fit this is identified, but the paper doesn't report λ_0, λ_1 selection or standard errors on β.
- **BT trees** are built with the psychotree R package; tree instability under dataset resampling is not evaluated (only point trees shown).
- **External validity to NFL:** the recommender-algorithm domain transfers conceptually but the *win primitive* differs — algorithms compete on metric values across venues, while NFL teams compete head-to-head with home-field and schedule structure. BT-for-teams is already in GSE's inventory; the paper's *novelties* (transitive-triplet metric, covariate BT, missing-data robustness) are the transferable parts, and they port without the recsys baggage.

## 10. GSE overlap
Per the existing-research map: **Bradley–Terry, Plackett–Luce, Elo, Dixon-Coles** are inventoried in the 26-metric catalog, and ledger 0004 covers BT/Elo unification — the core tournament model is **duplicate**. **New/extension components:** (a) the **transitive-triplets ratio** as a ranking-consistency metric — not in the corpus; GSE evaluates model variants across weeks/seasons with plain win-rate/MAE comparisons and has no consistency metric for *rankings of candidate models*; (b) **covariate-adjusted BT with fusion regularization** for regime-conditional strengths — GSE's rating machinery is regime-unaware (no weather/rest/home-away-conditional Elo in the corpus); (c) the **missing-data robustness result** — directly relevant to GSE's early-season sparse comparison matrix; (d) **Bayesian BT with Metropolis-Hastings CIs** on P(i≻j) — the corpus's BT work is point-estimate; uncertainty-quantified head-to-head probabilities would feed the calibration stack. Verdict: **extension** — upgrades existing BT/Elo machinery rather than duplicating it.

## 11. GSE implementation spec
1. **Regime-conditional team strength via covariate BT.** Build a weekly win matrix W over the last N seasons (i beats j = ATS or SU win); covariates x per game: home/away indicator, rest differential, dome/outdoor, wind bucket, QB-missing flags. Fit the paper's fusion-regularized covariate BT (L-BFGS-B, identifiability constraints) to get β_{i0} + ⟨x, β_i⟩ — a team-strength rating *conditional on Sunday's regime*, usable as a feature in the margin model and for regime-sliced edge detection. Data: nflverse 2015–2025 + weather/roster flags (already in-repo patterns). Effort: ~3–5 days (win-matrix builder + penalized BT + backtest).
2. **Transitive-triplet consistency metric for model selection.** When GSE compares candidate models/configs across backtest windows (e.g., margin-model variants), report the triplet ratio alongside MAE — a model that beats A, A beats B, but loses to B is suspect regardless of mean error. Effort: ~half day as an eval-utility addition.
3. **Bayesian BT head-to-head probabilities with CIs.** Port the Binomial/Normal/LogNormal MH formulation to team matchups for uncertainty-quantified P(i≻j) feeding the calibration/Kelly stack (interval width as a bet-sizing input). Effort: ~2–3 days.

## 12. Reproducible test
- **Dataset:** nflverse 2018–2024 regular seasons, game-level SU outcomes; covariates: home indicator, rest days differential, outdoor/dome, wind ≥15 mph flag.
- **Baseline 1:** static BT/Elo team ratings (GSE's existing, per the corpus) predicting next-week SU winners. **Baseline 2:** naive "mean margin" team ranking.
- **Protocol:** rolling 4-season fit → predict next season's games; compare (a) accuracy/log-loss, (b) triplet ratio of the weekly implied ranking vs per-week observed outcomes, (c) top-3 overlap of predicted vs actual weekly team orderings.
- **Metric:** SU log-loss primary; triplet ratio and top-k overlap as in the paper.

## 13. Acceptance / rejection gate
- **Adopt** the covariate-BT component if, on the 2022–2024 rolling test seasons, it beats the static-BT baseline by ≥ 0.01 log-loss per game AND achieves a higher transitive-triplet ratio on weekly implied rankings (averaged over test weeks), with no worse top-3 overlap. **Reject otherwise.** Adopt the triplet metric as a standing eval utility regardless (cost ~0). Gate stated before running.

## 14. Improvement experiment
Extend the paper's linear covariate BT to a **two-stage regime-discovery + BT**: first cluster games into latent regimes (e.g., via the BT-tree idea applied to game covariates rather than dataset covariates), then fit separate static BT ratings per regime-cluster, and compare against the linear covariate-BT on the §13 gate. Hypothesis: NFL regimes (e.g., "backup-QB chaos weeks", "bad-weather weeks") are discrete and better captured by tree-structured splits than linear covariate effects — if the tree variant wins, it gives GSE interpretable regime labels for the edge sheet; if it loses, the linear form stands.
