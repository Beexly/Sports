# [2063] Modeling Tabular Data using Conditional GAN (arXiv:1907.00503)

**Citation:** Lei Xu, Maria Skoularidou, Alfredo Cuesta-Infante, Kalyan Veeramachaneni (2019). *Modeling Tabular Data using Conditional GAN*. arXiv:1907.00503 (NeurIPS 2019). URL: https://arxiv.org/abs/1907.00503
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 1907.00503, sections 1–6, all equations, Tables 1–3 verified; references excluded).
**Verdict:** ADAPT — the conditional-generator + training-by-sampling design is the cleanest mechanism for controllable rare-outcome augmentation (exactly GSE's "more upset/cover-script games" need); the GAN backbone itself is superseded by diffusion (TabDDPM ledger 2062), so adopt the conditioning machinery, not the generator.

## 1. Research question
How can GANs model tabular data given four properties that break vanilla GANs: (1) mixed discrete/continuous columns, (2) non-Gaussian continuous columns (min-max normalization causes vanishing gradients), (3) multimodal continuous columns (57/123 continuous columns in their 8 real datasets are multimodal by KDE mode count; vanilla GANs can't cover all modes even on 2D data, Srivastava et al. 2017), and (4) highly imbalanced categorical columns (636/1048 categorical columns have a >90% majority class, causing mode collapse and insufficient training of minor categories). Secondary question: can a fair benchmark (7 simulated + 8 real datasets, Bayesian-network baselines) rank the proliferating tabular GANs?

## 2. Dataset / schema
Benchmark suite (SDGym): 7 simulated (Grid, Ring, GridR Gaussian-mixture oracles; alarm, child, asia, insurance Bayesian-network oracles from bnlearn.com) + 8 real: adult, census, covertype, intrusion, news (UCI), credit (Kaggle), MNIST28 (28×28 binarized → 784 binary features + label), MNIST12 (12×12 version). All public. Simulated oracles give a known joint distribution so likelihood-fitness metrics are computable; real sets carry a classification/regression task. Train/test partition of each table; not stated: exact row counts per dataset in main text (supplement).

## 3. Method / model
CTGAN = conditional tabular GAN with two inventions:
1. **Mode-specific normalization** (§4.2): per continuous column C_i, fit a variational Gaussian mixture (VGM) estimating m_i modes: P(c_i) = Σ_k μ_k N(c_i; η_k, φ_k). Each value c_{i,j} is assigned to a sampled mode (probabilities ρ_k = μ_k N(c_{i,j}; η_k, φ_k)) and represented as (β_{i,j} one-hot mode indicator, α_{i,j} = (c_{i,j} − η_k)/(4φ_k) within-mode scalar). Row = α_1⊕β_1⊕…⊕α_{Nc}⊕β_{Nc}⊕d_1⊕…⊕d_{Nd}.
2. **Conditional generator + training-by-sampling** (§4.3): condition on one discrete column/value (D_{i*} = k*), expressed as mask-vector cond = m_1⊕…⊕m_{Nd}. Generator models P_G(row | D_{i*}=k*) so the original distribution is recoverable as P(row) = Σ_k P_G(row|D_{i*}=k) P(D_{i*}=k). Training-by-sampling: pick a discrete column uniformly, then a value with PMF ∝ log-frequency (upweights rare categories without changing the target distribution). Generator loss adds cross-entropy between the mask m_{i*} and the generated one-hot d̂_{i*} so the output honors the condition.
3. **Networks** (§4.4): fully connected (no local structure in rows). Generator: 2 hidden layers 256-wide, BN+ReLU, skip concatenations h_1 = h_0⊕ReLU(BN(FC(h_0))), outputs via tanh (α̂), Gumbel-softmax τ=0.2 (β̂, d̂). Critic: PacGAN with pac=10, 2×256 leaky-ReLU(0.2)+dropout, WGAN-GP loss, Adam lr 2e-4. TVAE companion (§4.5): same preprocessing, ELBO, decoder emits Gaussian (α̂∼N(ᾱ,δ)) + softmax (β̂,d̂), 128-dim latents, Adam lr 1e-3.
Training: batch 500, 300 epochs. Code: https://github.com/DAI-Lab/CTGAN; benchmark: https://github.com/DAI-Lab/SDGym.

## 4. Equations & assumptions
Row representation: r_j = α_{1,j}⊕β_{1,j}⊕…⊕α_{Nc,j}⊕β_{Nc,j}⊕d_{1,j}⊕…⊕d_{Nd,j}.
VGM fit: P_{C_i}(c_{i,j}) = Σ_{k=1}^{m_i} μ_k N(c_{i,j}; η_k, φ_k); within-mode value α_{i,j} = (c_{i,j} − η_k)/(4φ_k).
Conditional decomposition: P(row) = Σ_{k∈D_{i*}} P_G(row|D_{i*}=k) P(D_{i*}=k).
Mask condition: m_i^{(k)} = 1 iff i=i*, k=k*, else 0; cond = m_1⊕…⊕m_{Nd}.
Generator: h_0 = z⊕cond; h_1 = h_0⊕ReLU(BN(FC_{|cond|+|z|→256}(h_0))); h_2 = h_1⊕ReLU(BN(FC_{|cond|+|z|+256→256}(h_1))); α̂_i = tanh(FC_{→1}(h_2)); β̂_i = gumbel_{0.2}(FC_{→m_i}(h_2)); d̂_i = gumbel_{0.2}(FC_{→|D_i|}(h_2)).
Critic (pac 10): C(r_1…r_10, cond_1…cond_10), 2×256 leaky_{0.2}+dropout, FC_{256→1}.
Likelihood-fitness on simulated data: L_syn = likelihood of T_syn under true oracle S (favors overfit); L_test = likelihood of T_test under oracle S′ retrained on T_syn (same structure, refit parameters) — detects mode collapse.
Assumptions: log-frequency sampling preserves the true distribution in expectation; the VGM mode count is correct; pac=10 suffices against mode collapse; conditional cross-entropy penalty is enough to enforce the condition.

## 5. Features / target
Varies by dataset (mixed continuous/discrete columns + one label column). For real datasets: features = all columns except label; target = label column (accuracy/F1 for classification, R² for regression). NFL translation (my inference): condition on binned outcome (e.g., favorite-covers / underdog-covers / push) or game-script category, generate the full feature row conditioned on that rare outcome.

## 6. Validation design
Two axes (§5.2): (1) likelihood fitness on simulated data with known oracles (L_syn, L_test); (2) machine-learning efficacy on real data — train classifiers/regressors on T_syn, test on T_test (accuracy/F1 classification, R² regression), averaged over multiple downstream models ("not trying to pick the best model"). Baselines: CLBN, PrivBN (Bayesian networks), MedGAN, VeeGAN, TableGAN, TVAE, plus "Identity" (returns T_train — the ceiling for all metrics except L_syn). Ablation (§5.4): mode-specific normalization variants (GMM5/GMM10/min-max), w/o training-by-sampling, w/o conditional generator, network variants (vanilla GAN, WGANGP, GAN+PacGAN). Splits are random, not time-ordered (cross-sectional benchmarks).

## 7. Numerical results / baselines
Benchmark results (Table 2, averaged):
- Gaussian-mixture simulated (L_syn / L_test, higher better): Identity −2.61/−2.61; TVAE −2.65/−5.42; CTGAN −5.72/−3.40; MedGAN −7.27/−60.03; VeeGAN −10.06/−4.22; TableGAN −8.24/−4.12; CLBN −3.06/−7.31; PrivBN −3.38/−12.42. (CTGAN best L_test among deep methods; TVAE best L_syn.)
- Bayesian-network simulated: Identity −9.33/−9.36; TVAE −6.76/−9.59; CTGAN −11.67/−10.60; MedGAN −11.14/−12.15; TableGAN −11.84/−10.47.
- Real data (avg clf F1 / reg R²): Identity 0.743/0.14; TVAE 0.519/−0.20; CTGAN 0.469/−0.43; CLBN 0.382/−6.28; PrivBN 0.225/−4.49; MedGAN 0.137/−8.80; VeeGAN 0.143/−6.5e6; TableGAN 0.162/−3.09.
- Head-to-head vs Bayesian networks (Table 1, # of 8 real datasets where method beats the BN): CTGAN beats CLBN 7/8, PrivBN 8/8; MedGAN 1/1, VeeGAN 0/2, TableGAN 3/3. Paper's claim: CTGAN surpasses Bayesian networks on ≥87.5% of datasets.
- Ablation (Table 3, absolute performance change on real classification datasets excl. MNIST): mode-specific normalization GMM5 −4.1%, GMM10 −8.6%, min-max −25.7%; w/o training-by-sampling −17.8%; w/o conditional generator −36.5%; vanilla GAN −6.5%, WGANGP +1.75%, GAN+PacGAN −5.2%. On the highly imbalanced credit dataset, removing training-by-sampling gives 0% F1 — the component is load-bearing.
- TVAE vs CTGAN: TVAE outperforms CTGAN on several datasets; CTGAN beats TVAE on 3. Paper notes the GAN generator never sees real data during training, so differential privacy (PATE-GAN style) is easier for CTGAN than TVAE.
All numbers are the paper's claims (Tables 1–3).

## 8. Code / data availability
CTGAN: https://github.com/DAI-Lab/CTGAN (also in SDV). Benchmark SDGym: https://github.com/DAI-Lab/SDGym. Datasets: UCI/Kaggle/bnlearn — public, no direct URLs in main text.

## 9. Leakage & limitations
Adversarial notes: (1) On real data, CTGAN reaches only 63% of Identity's classification F1 (0.469 vs 0.743) and negative R² on regression (−0.43 vs 0.14) — this 2019 GAN is far weaker than 2022 diffusion (ledger 2062: TabDDPM beats CTGAN on every fidelity rank). (2) Random splits only; temporal structure untested. (3) VGM mode estimation is a fragile preprocessing step — misspecifying m_i corrupts the representation; the paper's own ablation shows GMM5/GMM10 both degrade vs VGM. (4) Gumbel-softmax τ=0.2 with one-hot discretes risks the "trivial discriminator detects non-sparse fakes" issue the paper itself raises in §3 — addressed heuristically, not solved. (5) No privacy measurement at all (unlike TabDDPM's DCR/attack analysis). (6) MNIST-as-tabular is a stretch benchmark. External validity to NFL: the conditional-generation + log-frequency training-by-sampling machinery transfers directly to rare game-script augmentation; the raw GAN quality does not justify standalone use in 2026.

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no CTGAN/GAN-synthesis overlap — new capability (same as ledger 2062). Complements ledger 2062: TabDDPM gives the best generator; CTGAN gives the best *conditioning protocol* for imbalanced categorical targets. GSE's rare-outcome problem (upset covers, extreme-weather games, backup-QB games are all <10% categories) is exactly the §3 "highly imbalanced categorical columns" setting.

## 11. GSE implementation spec
Build plan (effort: ~2 engineer-days, reuses ledger 2062's pipeline):
1. Data: same nflverse game-level table as ledger 2062 (2015–2025, ~3,000 team-game rows).
2. Discretize the augmentation target: condition column = outcome regime — e.g., {favorite covers, favorite wins-no-cover, underdog wins outright, push} — each a minority category in some seasons.
3. Port CTGAN's two components onto the diffusion backbone: (a) mode-specific normalization for multimodal continuous features (margin, total, EPA differentials — all multimodal in NFL data); (b) training-by-sampling with log-frequency PMF over the outcome-regime condition so rare scripts (backup-QB games, extreme weather) get even training exposure.
4. Generator choice: TabDDPM (ledger 2062) as the backbone; CTGAN's conditional loss (cross-entropy between condition mask and generated one-hot) added to enforce regime conditioning.
5. Training: Adam, batch 500, ~300 epochs equivalent iterations; tune on CatBoost ML-efficiency on held-out season as in ledger 2062.
6. Use case: generate synthetic games *conditioned on rare regimes* — e.g., 500 extra "underdog covers by 7+" games — to rebalance downstream spread-model training.

## 12. Reproducible test
Dataset: nflverse team-game rows 2018–2023 train, 2024 held-out. Baseline: GBDT spread model on real only. Challenger: real + regime-conditioned synthetic (condition = binned ATS outcome; log-frequency training-by-sampling), same total row budget as ledger 2062's test. Metrics: log-loss on 2024 real season; plus per-regime calibration (ECE within each outcome regime) to verify the conditioning actually fixed rare-regime miscalibration rather than just adding noise.

## 13. Acceptance / rejection gate
ADOPT the conditioning machinery if: (a) real+regime-conditioned-synthetic beats real-only by ≥0.003 log-loss on held-out 2024 (same bar as ledger 2062), AND (b) ECE inside the rarest outcome regime (underdog outright wins) improves by ≥0.005 vs real-only, AND (c) fidelity: synthetic marginals within 5% TVD on ≥90% of features. REJECT if any condition fails, or if mode-collapse is detected (any conditioned regime's synthetic feature variance <50% of real within-regime variance). Gate set before running; 3 generator seeds.

## 14. Improvement experiment
Replace the VGM mode estimator with a market-aware mixture: fit the continuous-feature modes *within* each betting-market regime (e.g., spread buckets) instead of globally, so mode-specific normalization respects the fact that NFL margin distributions are mixtures indexed by the spread itself. Then condition generation on (spread bucket × outcome regime) jointly. Hypothesis: global VGM merges spread-dependent modes and the generator then produces "average" games that belong to no real regime; market-aware modes should improve both fidelity ranks and rare-regime ECE beyond the paper's global-VGM design.

**Verdict:** ADAPT
