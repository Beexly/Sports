# [1903] Information Theoretic Meta Learning with Gaussian Processes (arXiv:2009.03228v3)

**Citation:** Titsias, M. K., Ruiz, F. J. R., Nikoloutsopoulos, S., Galashov, A. (2020). *Information Theoretic Meta Learning with Gaussian Processes*. arXiv:2009.03228v3. URL: https://arxiv.org/abs/2009.03228v3
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** the variational-information-bottleneck (VIB) derivation recovers MAML as a special case and yields a GP-VIB few-shot regressor that beats MAML 10× on few-shot sinusoids; the β-compression knob is directly useful as a regime-shift regularizer for GSE.

## 1. Research question
Meta-learning lacks unifying principles (memory-based vs gradient-based families are disconnected). Can the variational information bottleneck (VIB) provide a single tractable objective — maximize information the task encoding carries about the validation set minus β times the information it retains about the support set — that recovers MAML/probabilistic-MAML as special cases AND yields a new GP-based memory algorithm for few-shot supervised learning?

## 2. Dataset / schema
- **Sinusoid regression** (Finn 2017 settings): amplitude/phase varying across tasks; K-shot MSE with K ∈ {5,10,20}; 10 repeats with 95% CIs.
- **Few-shot classification** (unified Patacchiola 2020 protocol): CUB (11,788 images, 200 classes; 100/50/50 train/val/test), mini-ImageNet (100 classes × 600; 64/16/20 split), cross-domain mini-ImageNet→CUB and Omniglot (4,114 train classes after augmentation)→EMNIST (31 val / 31 test classes). 5-way 1-shot and 5-shot, 3 independent runs.
- Code: builds on https://github.com/BayesWatch/deep-kernel-transfer (stated); no dedicated GP-VIB repo stated in the paper.

## 3. Method / model
**GP-VIB.** Meta-task encoding Z_i = full GP function values (f^v_i, f^t_i) at validation + support inputs. Prior = GP prior with deep kernel k_θ(x,x′) = (exp(v)/M)·φ(x;θ)ᵀφ(x′;θ) (linear or cosine-similarity kernel; φ from a Conv-4/MAML-net backbone). Encoder q(f^t|D^t) = exact GP posterior for Gaussian likelihoods, or an amortized Gaussian approximation per non-Gaussian likelihood term p(y^t_j|f^t_j) ≈ N(m^t_j | f^t_j, s^t_j) with m_w, s_w networks (simplified to scalars (m̃, σ²) in experiments). Decoder = standard GP likelihood. Training: episodic SGD maximizing per-task objective (Eq. 13): Σ_j E[log p(y^v_{i,j}|f^v_{i,j})] − β·KL[q(f^t_i|D^t_i) || p(f^t_i|X^t_i)]. MAML recovered with β=0 + Dirac encoder q = δ_{θ+Δ(θ,D^t)}; probabilistic MAML with Gaussian encoder N(θ+Δ, s) (Eq. 9). Inference: standard GP posterior predictive conditioned on the support set.

## 4. Equations & assumptions
- IB objective: **L_IB(w) = I(Z, D^v) − β·I(Z, D^t)** (Eq. 2).
- VIB bound: **F(θ,w) = E[log p_θ(D^v|Z)] − β·E[log(q_w(Z|D^t)/p_θ(Z))]** (Eq. 7); per-task: **F̃_i = E_{q_w(Z_i|D^t_i)}[log p_θ(D^v_i|Z_i)] − β·KL[q_w(Z_i|D^t_i) || p_θ(Z_i)]** (Eq. 8).
- MAML recovery: ψ_i = θ + Δ(θ, D^t_i) with Δ = ρ·∇_θ log p(D^t_i|θ); F̃_i(θ) = log p(D^v_i | θ + Δ(θ,D^t_i)) when β=0 and encoder is Dirac (Section 2.2).
- Probabilistic MAML (Eq. 9): **F̃_i(θ,s) = E_{N(ε|0,I)}[log p(D^v | θ + Δ(θ,D^t_i) + √s ∘ ε)] − β·KL[q_{θ,s} || p_θ]**.
- GP-VIB task objective (Eq. 13): **Σ_j E_{q(f^v_{i,j})}[log p(y^v_{i,j}|f^v_{i,j})] − β·KL[q(f^t_i|D^t_i) || p(f^t_i|X^t_i)]**.
- Amortized non-Gaussian encoder (Eq. 16): q(f^t|D^t) = N(f^t | K^t(K^t+S^t)⁻¹m^t, K^t − K^t(K^t+S^t)⁻¹K^t).
Assumptions: (i) encoder factorizes through the GP prior; (ii) Gaussian approximations of non-Gaussian likelihood terms are adequate; (iii) simplified encoder scalars (m̃, σ²) outperform the full amortized functions (empirical claim); (iv) shared deep-kernel features φ capture task-family structure; (v) episodic i.i.d. task sampling matches deployment task distribution.

## 5. Features / target
Features: regression — scalar x; classification — Conv-4 64-channel embeddings of images. Target: scalar continuous output (sinusoid) or 5-way class label. Horizon: point prediction per query example.

## 6. Validation design
Episodic meta-training; meta-test on disjoint class sets / held-out tasks. Regression: sinusoid K-shot MSE, 10 repeats. Classification: 5-way 1-shot/5-shot accuracy, unified protocol, 3 runs. Baselines: MAML (1/5/10 adaptation steps), Feature Transfer, Baseline++, MatchingNet, ProtoNet, RelationNet, DKT+Linear/CosSim/BNCosSim. β=0.001 in classification, β=1 in regression (not tuned per dataset — claimed robustness point). Not time-ordered; no cross-season-style drift test.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **Sinusoid K-shot MSE**: MAML-1step K=5: 0.600 ± 0.662; MAML-10step K=5: 0.280 ± 0.013; **GP-VIB K=5: 0.02 ± 0.014**; MAML-10step K=20: 0.043 ± 0.003; **GP-VIB K=20: 0.001 ± 0.001**. GP-VIB beats MAML by >10× at every K; Figure 2 shows posterior mean matches ground truth after only K=4 shots with shrinking uncertainty.
- **mini-ImageNet 5-shot accuracy**: Baseline++ 66.18 ± 0.18 (best baseline); **GP-VIB+Linear 65.84 ± 0.22**; DKT+BNCosSim 64.00 ± 0.09. CUB 5-shot: Baseline++ 78.51 ± 0.59 vs GP-VIB+CosSim 78.35 ± 0.23 (competitive, within noise).
- **Omniglot→EMNIST cross-domain 1-shot**: GP-VIB+Linear **76.01 ± 0.54** vs DKT+Linear 75.97 ± 0.70 (SOTA in this cell); 5-shot: DKT+BNCosSim 90.30 ± 0.49 vs GP-VIB+Linear 89.93 ± 0.23.
- **mini-ImageNet→CUB cross-domain 1-shot**: DKT+CosSim 40.22 ± 0.54 vs **GP-VIB+CosSim 40.70 ± 0.48** (best); 5-shot: Baseline++ 57.31 ± 0.11 (best) vs GP-VIB+CosSim 56.70 ± 0.62.
Pattern: dominant on regression; classification competitive with SOTA cells on cross-domain transfer. *My inference:* the information-bottleneck compression (β>0) is what prevents task memorization — the memorization problem documented in the NGGP paper (1902) is attacked here by a principled knob.

## 8. Code / data availability
No dedicated repo stated. Builds on DKT code at https://github.com/BayesWatch/deep-kernel-transfer (stated). Datasets public (CUB, mini-ImageNet, Omniglot, EMNIST, sinusoid synthetic).

## 9. Leakage & limitations
- β chosen globally (1 for regression, 0.001 for classification) without search — claimed as robustness, but it's also a missed-tuning risk; the optimal compression level for sports regimes is unknown.
- Simplified encoder scalars (m̃, σ²) beat the full amortized version empirically — a convenience result with no theory; may not transfer to regression likelihoods.
- No temporal/drift validation — episodic i.i.d. task sampling is the optimistic case; NFL regimes are sequential and adversarial (injuries, trades).
- GP O(n³) per task episode at meta-training; support sets in classification are tiny so cost is hidden — sports meta-training on team-seasons would need sparse approximations.
- MAML baselines use only up to 10 adaptation steps; still, GP-VIB's regression margin (10×) survives that caveat.
- External validity: regression evidence is sinusoids-only — a single synthetic family.

## 10. GSE overlap
No VIB/meta-learning entries in Garrett's existing-research map; closest related concepts in-repo are the calibration stack and the "memorization" concern absent from GSE's playbook entirely. GSE's engine lacks any mechanism that compresses team-season information toward *only what's predictive of future games* — current features use full histories. **New capability**: the IB objective gives a principled regularizer for "new regime" adaptation (β knob trades memorization of a 2-game sample against predictive compression), which no existing GSE component does.

## 11. GSE implementation spec
1. Data: nflverse 2015–2025 team-game features (EPA margin, success rate, pace, pressure rate, roster continuity); tasks = team-seasons; meta-test = rookie-QB / new-HC / post-trade regimes 2023–2025.
2. Model: deep kernel GP-VIB as in Section 3 (Gaussian-likelihood encoder exact, no amortized nets needed for regression); β ∈ {0.01, 0.1, 1.0} grid.
3. Target: next-game win-probability logit (Gaussian likelihood on logit-margin) with support = first K games of the new regime.
4. Integration: the KL term −β·KL[q(f^t)||p(f^t)] acts as the anti-memorization gate — tune β on 2023 leave-one-season-out; the VIB framing also lets MAML-style XGBoost fine-tuning be recast as β=0 ablation.
5. Serving: weekly refit per new-regime team using closed-form GP posterior; uncertainty bands feed pick-confidence and Kelly fraction sizing.
Effort: ~2 engineering weeks; depends on the deep-kernel feature pipeline already implied by ledger 1902's spec.

## 12. Reproducible test
Same meta-protocol as ledger 1902 (nflverse team-game data, leave-one-season-out, support = first K∈{2,4} games of new-regime teams, query = rest). Baselines: (a) DKT-style GP without β term (β=0 ablation — should memorize support noise), (b) MAML-style fine-tuned XGBoost, (c) league-average prior. Metrics: Brier + NLL. The β>0 vs β=0 contrast directly tests the paper's compression claim on real sports regimes.

## 13. Acceptance / rejection gate
ADOPT iff GP-VIB (β tuned) beats the league-average prior by **≥0.01 Brier** on new-regime first-4-game predictions (2023–2025 LOSO) AND the β>0 model beats the β=0 ablation on NLL by a statistically clear margin (paired t-test p<0.05). Reject if β adds nothing over plain DKT-style GP — then it's just a theory paper for GSE.

## 14. Improvement experiment
**Sequential VIB**: extend the objective to an online setting where the support set grows week by week and β_t anneals from high (compress hard on 1–2 games) to low (trust the data by week 8): β_t = β_0 / (1 + K_t/τ). This matches the sports reality that early-season priors must fade as evidence accumulates — the paper's fixed β is the limitation. Expected: better early-season Brier than fixed-β, and a principled alternative to the ad-hoc early-season blend weights (50/30/20 splits) used in DVOA-style metrics. Paper cites ALPaCA (harrison2018meta — Bayesian linear-regression meta-learning, candidate for this lane) and DKT; the β-knob complements ledger 1902's flow (marginal shape) — flow handles non-Gaussian noise, VIB handles memorization.
