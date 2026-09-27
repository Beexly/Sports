# [0766] How Proper Scoring Rules Shape LLM Forecasting (arXiv:2608.28482v2)

**Citation:** Benjamin Turtel, Paul Wilczewski, Kris Skotheim, Ville A. Satopää, Philip E. Tetlock (2026). *How Proper Scoring Rules Shape LLM Forecasting*. arXiv:2608.28482v2. URL: https://arxiv.org/abs/2608.28482
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2608.28482.txt`; complete paper incl. appendices A–C, verified end-to-end).
**Verdict:** ADAPT — the reward/loss-choice lesson (proper ≠ interchangeable as a training objective) and the bias–information–noise (BIN) decomposition are directly portable diagnostics for GSE's probabilistic models; the beta-family reward shaping offers a recipe for emphasising specific probability regions (e.g., favourites vs underdogs).

## 1. Research question
Five strictly proper scoring rules share the same population-level incentive (report your true probability), but do they behave interchangeably as *training objectives*? The authors train GPT-OSS-120b with Dr. GRPO using five different proper scoring rules as the terminal reward on binary forecasting of resolved news events, and compare the resulting forecasters on aggregate performance, calibration, discrimination, probability-scale use, and the bias–information–noise decomposition.

## 2. Dataset / schema
8,041 binary forecasting questions constructed from news events (July 2024–January 2026) via Lightning Rod's proprietary SDK, following the "future-as-label" temporal-masking protocol (Turtel et al. 2026): predictor sees only pre-cutoff evidence; outcome resolved from post-cutoff evidence by a fixed external resolver. Domains: politics, geopolitics, economics, business, science, sports. Horizons 7–90 days. Split: 7,076 train / 965 held-out. Positive rates: 27.0% train, 28.5% eval. Proprietary dataset (Lightning Rod SDK) — not public. Evaluation: 5 independent rollouts per question at temperature 1.0 (pooled N=4,825 pairs; AUC computed per-rollout then averaged; BIN fit jointly on all 4,825).

## 3. Method / model
- Base: GPT-OSS-120b + rank-32 LoRA, trained with Dr. GRPO (Liu et al. 2025): per state, K=8 rollouts, advantage A_i = S_m(p_i,y) − (1/K)Σ_j S_m(p_j,y); no division by within-group std, no KL penalty (deliberate, to preserve the scoring-rule incentive). Batch 32, 200 training steps, lr 2e-5, warmup 0.1, max response length 16,384. Invalid outputs: fixed penalty per rule scale (0 spherical, −1 Brier/beta, −8 log); probabilities clipped to [0.001,0.999].
- Five rewards: (1) S_log=y log p+(1−y)log(1−p); (2) S_Brier=−(p−y)²; (3) S_spherical=[yp+(1−y)(1−p)]/√(p²+(1−p)²); (4)/(5) beta family S_{α,β}(p,y)=−y∫_p¹(1−q)w(q)dq −(1−y)∫_0^p q w(q)dq with w_{α,β}(q)=q^{α−1}(1−q)^{β−1}/B(α,β), evaluated at (2,8) (weights low-probability region) and (8,8) (weights near 0.5); Beta(1,1) recovers Brier up to a constant. Beta forecasts clipped to [1e-3,1−1e-3].
- Metrics: Brier, ECE (10 bins), log score, AUC-ROC, BIN decomposition (Satopää et al. 2021, latent-normal model; components as % of model-implied base Brier). Paired question-level bootstrap CIs (2,000 resamples).

## 4. Equations & assumptions
(1) S_log(p,y)=y log p+(1−y)log(1−p). (2) S_Brier(p,y)=−(p−y)². (3) S_spherical as above. (4)–(5) beta family with beta weight function. (6) ECE=Σ_b(|I_b|/N)|mean(y|I_b)−mean(p|I_b)|, B=10. (7) A_i=S_m(p_i,y)−(1/K)Σ_j S_m(p_j,y). Appendix C contrasts: D_bias^{(s)}=|μ_A^{(s)}|−|μ_B^{(s)}|, D_info^{(s)}=γ_A^{(s)}−γ_B^{(s)}, D_noise^{(s)}=δ_A^{(s)}−δ_B^{(s)}; reported P(|μ_A|<|μ_B|), P(γ_A>γ_B), P(δ_A<δ_B) via HMC (2000 warmup, 4000 post-warmup).
Assumptions: temporal masking prevents leakage (inherited from Turtel et al. 2026); the latent-normal BIN model is correctly specified enough for component attribution (components sum to model-implied, not observed, Brier difference — "differ by roughly one to two percentage points"); one seed per condition (authors flag stochasticity explicitly).

## 5. Features / target
Input: temporally-masked news context per question (free text). Target: binary resolved outcome (event occurred by resolution time: yes/no). The modelled object is the final parsed probability p∈(0,1); reasoning trajectories get no process reward.

## 6. Validation design
Single held-out set of 965 questions; all five reward variants share model/data/optimizer/steps/rollout budget — only the reward varies. Primary evaluation: pooled five-rollout; robustness: single-sample (n=1) and median-of-five. Baselines: the untrained GPT-OSS-120b base model; pairwise bootstrap comparisons among reward variants for Brier. No cross-validation; no second dataset.

## 7. Numerical results / baselines
Table 2 (pooled 5, primary; Brier↓, ECE↓, log↑, AUC↑):
- Log: Brier 0.1653***, ECE 0.0434 (best), log −0.5132 (best), AUC 0.7407, tokens 454.3, missing 0.00%
- Brier: 0.1648*** (best Brier), ECE 0.0568, log −0.5185, AUC 0.7511 (best), tokens 1089.4
- Spherical: 0.1680***, ECE 0.0538, log −0.5273, AUC 0.7353, tokens 362.8
- Beta(2,8): 0.1677***, ECE 0.0449, log −0.5223, AUC 0.7372, tokens 790.4
- Beta(8,8): 0.1731**, ECE 0.0954 (worst), log −0.5536, AUC 0.7366, tokens 2691.9, missing 0.27%
- Base: 0.1861, ECE 0.1099, log −0.5585, AUC 0.7248, tokens 662.6
*** = Brier vs base significant at 1% (paired bootstrap); Beta(8,8) at 5%. Bootstrap Brier differences vs base (99% CI): Log −0.0207 [−0.0341,−0.0082]; Brier −0.0213 [−0.0346,−0.0085]; Spherical −0.0181 [−0.0322,−0.0046]; Beta(2,8) −0.0184 [−0.0308,−0.0065]; Beta(8,8) −0.0130 [−0.0290,0.0027].
BIN contributions (pooled 5, % of model-implied base Brier; Table 7): Log — bias 6.06, noise 2.60, info 1.29; Brier — bias 5.75, noise 0.44, info 3.70; Spherical — bias 6.35, noise −0.38, info 2.16; Beta(2,8) — bias 6.63, noise 0.36, info 1.90; Beta(8,8) — bias 3.73, noise −1.57, info 3.68. Stable across eval methods: Brier variant largest information contribution; log variant largest positive noise contribution (near-unit posterior probability of lower noise than every other variant).
Token-compute confound: Beta(8,8) generated ~7× the tokens of spherical despite identical step/rollout budgets.

## 8. Code / data availability
Training via Tinker (Thinking Machines Lab, 2025) LoRA RL infrastructure; dataset via Lightning Rod proprietary SDK (not public). No paper code repo stated ("None stated"). Appendix A documents the exact forecasting prompt.

## 9. Leakage & limitations
Temporal masking is the design's strength (predictor never sees post-cutoff evidence). Adversarial notes: (i) single seed per condition — the headline "Brier beats log on Brier" could partly be training noise; the authors state this plainly; (ii) hyperparameters held fixed across rewards rather than tuned per objective — rewards compared under a common setup, not at their individual optima; (iii) token-compute differs ~7× across conditions, an uncontrolled confound; (iv) BIN components are model-based estimates summing to the *implied* rather than observed Brier difference; (v) only one base model, one dataset, one outcome base rate (27–28.5%) — the Beta(2,8) low-probability emphasis may be base-rate-sensitive; (vi) no process reward — reasoning quality unmeasured.

## 10. GSE overlap
Extension. Complements ledger 0763 (Landsgesell et al.) on scoring-rule choice, but with distinct additions absent from the research map: (a) the BIN decomposition as a diagnostic for *why* a model variant wins (bias vs information vs noise) — no BIN concept in the map; (b) beta-family reward shaping with explicit probability-region weighting (Buja et al. 2005) — a recipe for emphasising probability regions GSE cares about; (c) group-relative advantage construction without std-normalisation, preserving the scoring rule's scale — relevant if GSE ever RL-tunes a forecaster. The map's calibration stack lacks any error-structure decomposition.

## 11. GSE implementation spec
- **BIN diagnostics for model selection**: when comparing GSE model variants (e.g., champion vs challenger on the rolling validation window), fit the Satopää et al. BIN decomposition on the Brier-score difference. Select not just the lowest Brier but the variant whose gains come from *information* (portable) rather than *noise* (fragile) or *bias* reduction (may not survive regime shifts). Implement via the paper's latent-normal BIN fit on pooled forecast–outcome pairs.
- **Beta-weighted training objectives**: for GSE's binary win-probability models, experiment with Beta(2,8)-style objectives (upweight low-probability region) when the downstream use is underdog/dog-ML betting, or Beta(8,8) when the action concentrates near 50% (close spreads). This is the binary analogue of the wCRPS tail-weighting in ledger 0763.
- **Ensemble by reward diversity**: per §5, ensemble members trained under different scoring rules contribute complementary error profiles; build the Rashomon ensemble (ledger 0764) with members trained under log/Brier/beta objectives rather than clones of the champion.
- Effort: ~2 days to implement BIN fitting + beta-family binary losses in the XGBoost/LightGBM objective; ~1 day to add BIN columns to the model scoreboard.

## 12. Reproducible test
Dataset: GSE 2022–2024 NFL binary win-probability models (existing tabular features). Train three variants with identical features/seeds but different objectives: log loss, Brier (squared error on probability), and Beta(2,8)-weighted. Evaluate on 2025 weeks 1–8: Brier, ECE, AUC, and BIN decomposition of each variant vs the log-loss champion.

## 13. Acceptance / rejection gate
ADOPT beta-weighted objectives and BIN diagnostics if any non-log variant beats the log-loss champion by ≥0.003 Brier on 2025 weeks 1–8 AND the BIN decomposition attributes the gain primarily to the information component (≥50% of the implied Brier improvement). Otherwise REJECT — keep log loss as the sole binary objective.

## 14. Improvement experiment
Learn the aggregation policy: train a small meta-model (logistic regression on the variant probabilities, fit on the validation window) to combine the reward-diverse ensemble, optimised under the downstream decision score (CLV), and test whether the learned aggregator beats simple averaging on the 2025 holdout. The paper suggests this direction explicitly ("whether an aggregation policy can itself be learned from forecasting feedback") but does not test it.
