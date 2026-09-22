# [2062] TabDDPM: Modelling Tabular Data with Diffusion Models (arXiv:2209.15421)

**Citation:** Akim Kotelnikov, Dmitry Baranchuk, Ivan Rubachev, Artem Babenko (2022). *TabDDPM: Modelling Tabular Data with Diffusion Models*. arXiv:2209.15421. URL: https://arxiv.org/abs/2209.15421
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2209.15421, main sections 1–6 + Appendix A; equations and all result tables verified).
**Verdict:** ADAPT — diffusion synthesis beats GAN/VAE baselines on ML utility for mixed-type tabular data; directly transferable to GSE's small-season regime but needs class-conditional adaptation to NFL season structure and a fidelity gate before any production use.

## 1. Research question
Can denoising diffusion probabilistic models (DDPMs) handle general tabular problems, where each row is a heterogeneous vector of numerical and categorical features? The authors argue tabular data is harder than vision/NLP for generative modeling because features are heterogeneous in type and typical tabular datasets are small; the question is whether a universal diffusion design for mixed-type tables can beat the GAN/VAE incumbents (CTGAN, TVAE, CTABGAN/+) on both statistical fidelity and downstream ML utility, while being more privacy-safe than the surprisingly competitive shallow baseline SMOTE.

## 2. Dataset / schema
15 public tabular datasets (Table 2), all open benchmarks previously used in Zhao et al. 2021 / Gorishniy et al. 2021. Sizes (train/validation/test rows), #numerical, #categorical, task:
- AB Abalone 2672/669/836, 7 num / 1 cat, regression
- AD Adult 26048/6513/16281, 6 num / 8 cat, binary classification
- BU Buddy 12053/3014/3767, 4 num / 5 cat, multiclass
- CA California Housing 13209/3303/4128, 8 num / 0 cat, regression
- CAR Cardio 44800/11200/14000, 5 num / 6 cat, binary classification
- CH Churn Modeling 6400/1600/2000, 7 num / 4 cat, binary classification
- DE Default 19200/4800/6000, 20 num / 3 cat, binary classification
- DI Diabetes 491/123/154, 8 num / 0 cat, binary classification (smallest set — relevant to GSE's small-sample regime)
- FB Facebook Comment Volume 157638/19722/19720, 50 num / 1 cat, regression
- GE Gesture Phase 6318/1580/1975, 32 num / 0 cat, multiclass
- HI Higgs Small 62751/15688/19610, 28 num / 0 cat, binary classification
- HO House 16H 14581/3646/4557, 16 num / 0 cat, regression
- IN Insurance 856/214/268, 3 num / 3 cat, regression
- KI King 13832/3458/4323, 17 num / 3 cat, regression
- MI MiniBooNE 83240/20811/26013, 50 num / 0 cat, binary classification
- WI Wilt 3096/775/968, 5 num / 0 cat, binary classification
Not stated in paper: dataset download URLs (all are standard UCI/OpenML sets; the paper assumes familiarity).

## 3. Method / model
TabDDPM runs two diffusion processes in parallel on one joint representation. For a row x = [x_num, x_cat1, ..., x_catC] with N_num numerical and C categorical features (each with K_i categories), the input is one-hot encoded categoricals + Gaussian-quantile-transformed numericals (scikit-learn quantile transform), total dimension N_num + ΣK_i.
- Numerical features: Gaussian diffusion (Ho et al. 2020 forward kernel).
- Each categorical feature: independent multinomial diffusion process (Hoogeboom et al. 2021), noise sampled independently per feature.
- The reverse step is a single shared MLP (adapted from Gorishniy et al. 2021) with output dimension matching x_0: first N_num outputs predict ε for the Gaussian term; the rest predict x̂_0^onehot for each multinomial term. Time/label embeddings: t_emb = Linear(SiLU(Linear(SinTimeEmb(t)))) with 128-dim sinusoidal embedding; y_emb = Embedding(y); x = Linear(x_in) + t_emb + y_emb; all projection dims 128. MLPBlock = Dropout(ReLU(Linear)).
- Classification: class-conditional model p_θ(x_{t-1}|x_t, y). Regression: target treated as an additional numerical feature, joint distribution learned.
- Training loss: L_t^TabDDPM = L_t^simple + (Σ_i L_t^i)/C (MSE for Gaussian term, KL terms for multinomial terms, averaged over categorical features).
- Hyperparameter tuning via Optuna (50 trials): lr LogUniform[1e-5, 3e-3]; batch {256, 4096}; timesteps {100, 1000}; iterations {5000, 10000, 20000}; MLP layers {2,4,6,8}; width {128,256,512,1024}; sample proportion {0.25,…,8}; dropout 0.0; cosine scheduler (Nichol 2021). Tuning guided by ML efficiency w.r.t. CatBoost on a hold-out validation set, averaged over 5 sampling seeds. Appendix A verifies CatBoost-tuned models transfer to MLP evaluators (no CatBoost bias).
- Baselines with public code: TVAE, CTGAN, CTABGAN, CTABGAN+ (no regression support), and SMOTE generalized to full synthesis (interpolate two same-class samples; for regression split by median target).

## 4. Equations & assumptions
Forward/reverse Markov chains; VLB (Eq. 1):
log q(x_0) ≥ E[log p_θ(x_0|x_1) (L_0) − KL(q(x_T|x_0)||q(x_T)) (L_T) − Σ_{t=2}^T KL(q(x_{t-1}|x_t,x_0)||p_θ(x_{t-1}|x_t)) (L_t)].
Gaussian diffusion: q(x_t|x_{t-1}) = N(x_t; √(1−β_t)x_{t-1}, β_t I); p_θ(x_{t-1}|x_t) = N(x_{t-1}; μ_θ(x_t,t), Σ_θ(x_t,t)); μ_θ(x_t,t) = (1/√α_t)(x_t − (β_t/√(1−ᾱ_t)) ε_θ(x_t,t)); L_t^simple = E‖ε − ε_θ(x_t,t)‖²_2 (Eq. 2).
Multinomial diffusion: q(x_t|x_{t-1}) = Cat(x_t; (1−β_t)x_{t-1} + β_t/K); q(x_t|x_0) = Cat(x_t; ᾱ_t x_0 + (1−ᾱ_t)/K); posterior q(x_{t-1}|x_t,x_0) = Cat(x_{t-1}; π/Σπ_k), π = [α_t x_t + (1−α_t)/K] ⊙ [ᾱ_{t-1} x_0 + (1−ᾱ_{t-1})/K].
TabDDPM loss (Eq. 3): L_t^TabDDPM = L_t^simple + (Σ_{i≤C} L_t^i)/C.
Architecture (Eq. 4–5): MLP(x) = Linear(MLPBlock(…(MLPBlock(x)))); t_emb, y_emb as above.
Assumptions (stated or implied): (1) independent forward noise per categorical feature; (2) preprocessing (quantile transform, one-hot) is sufficient to make joint modeling work; (3) class-conditional sampling reproduces class proportions; (4) ML efficiency is the right utility measure; (5) DCR + black-box attack ROCAUC are adequate privacy proxies.

## 5. Features / target
Varies per dataset (see §2: 3–50 numerical, 0–8 categorical features). Targets: binary/multiclass labels (F1) or continuous targets (R²). For classification, the class label conditions generation; for regression the target is modeled as an extra numerical column. NFL translation (my inference): features = game-level descriptors (EPA differentials, success rates, pace, weather, rest, market features), target = margin/total outcome.

## 6. Validation design
Primary metric: machine-learning efficiency (Xu et al. 2019) — train classifier/regressor on synthetic data of the same size as the real train set, evaluate on the REAL test set. Two protocols: (a) average over weak models (Decision Tree, Random Forest, Logistic/Ridge, MLP, sklearn defaults, max-depth 28, max-iter 500/100); (b) tuned CatBoost (hyperparameters tuned per dataset from Gorishniy et al. 2021 spaces). The authors argue (b) is the honest protocol: under (a), synthetic-trained models sometimes beat real-trained ones, which they show is an artifact of weak evaluators. Each value: 5 seeds for synthetics generation × 10 seeds for downstream training. Tuning on validation ML efficiency w.r.t. CatBoost. Privacy: mean Distance to Closest Record (DCR) synthetic→real; black-box membership-inference ROCAUC (Chen et al. 2020a; Lee et al. 2021 protocol); DCR also in MLP latent space. No time-ordered splits — all datasets are i.i.d. cross-sectional benchmarks (a limitation for NFL's temporal structure).

## 7. Numerical results / baselines
Statistical fidelity (Table 3, average rank, lower better; exact values):
- WD numerical: SMOTE 1.67, TabDDPM 1.93, CTGAN 3.33, CTABGAN+ 3.87, TVAE 4.20
- JS divergence categorical: TabDDPM 1.62, SMOTE 2.15, CTABGAN+ 2.54, TVAE 3.92, CTGAN 4.77
- L2 correlation-matrix distance: TabDDPM 1.73, SMOTE 2.00, CTABGAN+ 3.40, CTGAN 3.47, TVAE 4.40
ML efficiency w.r.t. tuned CatBoost (Table 5, F1 for classification / R² for regression; TabDDPM vs Real vs next-best):
- AB: TabDDPM 0.550±.010, Real 0.556±.004 (SMOTE 0.549)
- AD: TabDDPM 0.795±.001 (best), Real 0.815±.002
- BU: TabDDPM 0.906±.003 (best; matches Real 0.906±.002)
- CA: TabDDPM 0.836±.002, Real 0.857±.001
- CAR: TabDDPM 0.737±.001 (best), Real 0.738±.001
- CH: TabDDPM 0.755±.006 (best), Real 0.740±.009 — synthetic beats real
- DE: TabDDPM 0.691±.004, Real 0.688±.003 — synthetic beats real
- DI: TabDDPM 0.740±.020 (best), Real 0.785±.013
- FB: TabDDPM 0.713±.002, Real 0.837±.001
- GE: TabDDPM 0.597±.006, Real 0.636±.007
- HI: TabDDPM 0.722±.001 (best; Real 0.724)
- HO: TabDDPM 0.677±.010 (best; Real 0.662) — synthetic beats real
- IN: TabDDPM 0.809±.002, Real 0.814±.001
- KI: TabDDPM 0.833±.014 (best), Real 0.907±.002
- MI: TabDDPM 0.936±.001 (best; Real 0.934)
- WI: TabDDPM 0.904±.009 (best; Real 0.898) — synthetic beats real
TabDDPM is best-or-tied-best synthetic on the majority of datasets; GAN/VAE baselines trail by large margins (e.g., CTGAN CA 0.686, FB 0.443; TVAE CA 0.752, FB 0.685; CTABGAN+ collapses on several sets: CA 0.525, KI 0.444, FB ≪0 under weak-model protocol).
Privacy: black-box attack ROCAUC (Table 6, lower better; 0.5 = random): TabDDPM 0.497–0.721 (mostly ≈0.51–0.57; IN 0.868 outlier), SMOTE 0.610–0.999. DCR (Table 7, higher better): TabDDPM beats SMOTE on all 16 sets (e.g., AD 0.295 vs 0.082) but trails TVAE/CTABGAN+ (whose utility is far lower — privacy-through-uselessness).
Claims vs inference: all numbers above are the paper's claims (Tables 3, 5, 6, 7). My inference: the recurring "synthetic beats real" cases (CH, DE, HO, MI, WI) are within noise of tuned-CatBoost variance and the paper does not claim synthetic > real as a real effect.

## 8. Code / data availability
Code: https://github.com/yandex-research/tab-ddpm (stated). Data: the 15 datasets are standard public benchmarks (UCI/OpenML); no direct URLs stated.

## 9. Leakage & limitations
Adversarial notes: (1) No time-ordered splits — every benchmark is i.i.d. cross-sectional, so temporal leakage (the core NFL risk) is untested; a naive season-concatenation application would leak future information into synthetic "past" seasons. (2) ML efficiency tuning on validation w.r.t. CatBoost, then evaluating w.r.t. CatBoost, is mildly circular; Appendix A mitigates via MLP transfer. (3) The "synthetic ≥ real" ML-efficiency cases are a red flag for memorization, but the privacy experiments (DCR, black-box attack ≈ random) argue against copying — except IN (attack ROCAUC 0.868), unexplained. (4) Smallest dataset DI has 491 train rows; NFL game-level seasons are ~272 rows — the paper does not test the ultra-small regime directly. (5) Categorical diffusion cost scales with ΣK_i; high-cardinality NFL features (e.g., team IDs 32, play types) are fine, but player-level one-hots would explode. (6) No differential-privacy guarantees — DCR is not a formal privacy measure (authors admit this). External validity to NFL: moderate-high for game-level tabular rows; low for play-by-play sequences (no temporal modeling).

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: the only "synthetic" hit is a causal-inference gap note (synthetic controls for QB/OL injury impact) — unrelated. No existing GSE work on generative tabular augmentation exists in the map; this is a NEW capability. The benchmark lane (SumerSports/Shauncore/SFData9ers mining) studies public metrics, not synthesis. GSE's small-sample problem (272 regular-season games/yr; fewer per-team observations; regime shifts under new coaches/QBs) is exactly the setting where synthetic augmentation is the standard remedy.

## 11. GSE implementation spec
Build plan (effort: ~2–3 engineer-days prototype, 1 week hardened):
1. Data: nflverse play-by-play aggregated to game level, 2015–2025 (~3,000 team-game rows). Feature engineering: for each team-game, EPA/play differential, success-rate differential, explosive-play rate, pressure rate allowed/generated, pace (seconds/play), rest days, dome/outdoor, wind/temp bins (categorical), closing spread/total (numerical), plus season and week as conditioning labels.
2. Preprocessing mirrors the paper: Gaussian quantile transform on numericals, one-hot categoricals (team IDs, surface, weather bins).
3. Model: TabDDPM reference implementation (github.com/yandex-research/tab-ddpm), class-conditional on binned margin outcome (or season label for season-conditional generation); for spread/total regression treat target as extra numerical feature.
4. Training: per paper's Optuna spaces, reduced (timesteps 100, iterations 5000–10000, MLP 4–6 layers × 256–512) for NFL-scale data; tune on ML-efficiency w.r.t. a GBDT surrogate on a held-out real season.
5. Serving: offline batch generator — produce 3–5 synthetic seasons per real season, mix real+synthetic at tuned ratio for downstream spread/total/prop model training. No online inference needed.
6. Fidelity gate before use: synthetic marginals within 5% TVD of real per feature; pairwise correlation L2 within paper's reported regime; DCR distribution checked against SMOTE-like collapse.

## 12. Reproducible test
Dataset: nflverse team-game aggregates, seasons 2018–2023 train, 2024 held-out real test. Baseline: gradient-boosted spread model trained on real 2018–2023 only, log-loss on 2024. Challenger: same model trained on real 2018–2023 + 3 TabDDPM-synthesized seasons (conditional on season-style labels, margin target as extra numerical column). Metric: log-loss on the 2024 real season; secondary: Brier score on ATS cover. Runnable with the tab-ddpm repo + nflverse CSVs; no new labeling needed.

## 13. Acceptance / rejection gate
ADOPT the augmentation pipeline if BOTH hold: (a) real+synthetic beats real-only by ≥0.003 log-loss on the held-out 2024 real season, AND (b) fidelity: per-feature total-variation distance between synthetic and real marginals ≤5% on ≥90% of features, with no feature exceeding 10%. REJECT if log-loss delta <0.003 or any fidelity breach, or if synthetic-only ML efficiency is <95% of real-only (signals the generator failed to capture the joint distribution). Gate set before running; evaluate over 3 generator seeds.

## 14. Improvement experiment
Condition on market regime instead of raw season label: train a season-embedding (learned vector per season capturing rule/coaching/meta shifts, e.g., 2018 vs 2023 scoring environments) and make the diffusion class-conditional on the embedding of the TARGET season — i.e., synthesize "what would 2018–2022-style games look like under 2024 conditions." This goes beyond the paper's static class conditioning and directly attacks the NFL's non-stationarity problem: augmentation that respects regime shift rather than pooling all history. Success measure: regime-conditioned synthetic beats pooled-season synthetic on the §13 gate.

**Verdict:** ADAPT
