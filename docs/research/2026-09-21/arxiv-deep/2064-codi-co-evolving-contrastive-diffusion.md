# [2064] CoDi: Co-evolving Contrastive Diffusion Models for Mixed-type Tabular Synthesis (arXiv:2304.12654)

**Citation:** Chaejeong Lee, Jayoung Kim, Noseong Park (2023). *CoDi: Co-evolving Contrastive Diffusion Models for Mixed-type Tabular Synthesis*. arXiv:2304.12654 (ICML 2023). URL: https://arxiv.org/abs/2304.12654
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2304.12654, sections 1–5 + Appendices A–B; all equations and Tables 1–6 verified).
**Verdict:** ADAPT — two physically separated diffusion models (continuous + discrete) that co-evolve by conditioning on each other, bound by a triplet contrastive loss, beats the state-of-the-art STaSy on quality, diversity, AND 9× faster sampling; the cross-type correlation machinery is exactly what NFL game tables need (weather/venue categories × continuous efficiency metrics), but the twin-model + contrastive training is heavier than TabDDPM and should be adopted only if TabDDPM under-captures continuous–discrete interactions.

## 1. Research question
One-hot/Gumbel-softmax handling of discrete columns inside a single continuous-space model produces sampling mistakes and, worse, compromises inter-column correlations — especially continuous–discrete correlations. The authors ask: can we train two physically separate diffusion models (one Gaussian in continuous space, one categorical in discrete space) that co-evolve by reading each other's perturbed states as conditions, and bind them further with contrastive learning so the joint distribution is preserved? The evaluation target is the "generative learning trilemma" (Xiao et al. 2022): sampling quality, diversity, and sampling time together.

## 2. Dataset / schema
11 real-world tabular datasets (details in Appendix D.3; named in ablations/tables: Bank, Heart, Seismic, Stroke, CMC, Customer, Faults, Obesity, Absent, Drug, Insurance, plus Car/Clave/Nursery/Phishing for the discrete-space experiment). Mix of binary classification, multi-class classification, and regression tasks with both continuous and discrete columns. All public benchmarks (UCI-style). Not stated in main text: exact row counts (in appendix).

## 3. Method / model
For a row x_0 = (x_0^C, x_0^D) with N_C continuous and N_D discrete columns:
1. **Two diffusion models**: continuous model uses Gaussian diffusion (Ho et al. 2020), discrete model uses categorical/multinomial diffusion (Hoogeboom et al. 2021; Austin et al. 2021), each in its native space.
2. **Co-evolving conditioning** (§3.1): at each forward step t both are perturbed simultaneously; the continuous model denoises x_t^C conditioned on x_t^D and vice versa. Reverse: p_{θC}(x_{t-1}^C | x_t^C, x_t^D) and p_{θD}(x_{t-1}^{D_i} | x_t^{D_i}, x_t^C) — each step conditions on BOTH models' previous-step outputs (Algorithm 2).
3. **Contrastive binding** (§3.2): triplet loss L_CL(A,P,N) = Σ max{d(A_i,P_i) − d(A_i,N_i) + m, 0} (Eq. 16). Anchor = real sample; positive = one-step-estimated x̂_0^+ conditioned on the true counterpart (Eqs. 17–18 avoid full T-step generation: x̂_0^{C+} = (x_t^C − √(1−ᾱ_t) ε_{θC}(x_t^C,t|x_t^D))/√ᾱ_t); negative = x̂_0^− conditioned on a NEGATIVE condition built by shuffling the counterpart variable set across rows (Method 3: permute whole discrete/continuous blocks between records, preserving within-block pairing — Fig. 4, Table 5 shows this beats column-level shuffles). Distance: Euclidean for continuous, cross-entropy for discrete. Final losses: L_C = L_{Diff_C} + λ_C L_{CL_C}, L_D = L_{Diff_D} + λ_D L_{CL_D}, 0<λ<1 (Eqs. 19–20).
4. **Architecture** (Appendix B): U-Net-style fully-connected net, 4 layers/blocks with skip connections instead of residual blocks (fewer parameters), sinusoidal time embedding, condition projected to half the input dim and concatenated.
Preprocessing: min-max scaler to [−1,1] for continuous, one-hot for discrete; postprocessing: reverse scaler + argmax.
Baselines (8): MedGAN, VEEGAN, CTGAN, TVAE, TableGAN, OCT-GAN, RNODE, STaSy. Code: https://github.com/ChaejeongLee/CoDi.

## 4. Equations & assumptions
Forward: q(x_{1:T}|x_0) = Π q(x_t|x_{t-1}) (Eq. 1); reverse p_θ(x_{0:T}) = p(x_T) Π p_θ(x_{t-1}|x_t) (Eq. 2); VLB (Eq. 3); Gaussian transitions (Eqs. 4–5), L_simple (Eq. 6); categorical transitions (Eqs. 7–9).
CoDi losses (Eqs. 10–11): L_{Diff_C}(θ_C) = E‖ε − ε_{θC}(x_t^C, t | x_t^D)‖²; L_{Diff_D}(θ_D) = E_q[KL(q(x_T^D|x_0^D)‖p(x_T^D)) − log p_{θD}(x_0^D|x_1^D, x_1^C) + Σ_{t≥2} KL(q(x_{t-1}^D|x_t^D,x_0^D) ‖ p_{θD}(x_{t-1}^D|x_t^D, x_t^C))].
Marginals (Prop. 3.1, Eqs. 12–13): q(x_t^C|x_0^C) = N(√ᾱ_t x_0^C, (1−ᾱ_t)I); q(x_t^{D_i}|x_0^{D_i}) = C(ᾱ_t x_0^{D_i} + (1−ᾱ_t)/K_i). Joint reverses (Eqs. 14–15).
Contrastive: triplet loss (Eq. 16); one-step x̂_0 estimates (Eqs. 17–18); combined losses (Eqs. 19–20); time embedding t_emb = FC²(ReLU(FC¹(Emb(t)))) (Eq. 21); U-Net block equations (Eq. 22).
Assumptions: (1) min-max to [−1,1] suffices for continuous columns (no VGM — simpler than CTGAN); (2) one-step x̂_0 estimates are adequate positives/negatives for the triplet loss; (3) cross-record shuffling produces valid "inappropriate counterpart" negatives; (4) Euclidean distance is meaningful in the min-max-scaled continuous space.

## 5. Features / target
Per-dataset mixed columns; targets: binary labels (F1/AUROC), multi-class labels (macro F1/AUROC), continuous targets (R²/RMSE). Evaluation is TSTR: train downstream classifier/regressor on fake data, validate on real train, test on real test (5 fake samples × best-hyperparameter search). NFL translation (my inference): continuous = EPA/play, success rates, pace, market numbers; discrete = venue type, surface, weather bin, rest category, outcome regime — the cross-type correlation (e.g., wind bin × passing EPA) is precisely what CoDi's binding protects.

## 6. Validation design
Strictly follows Kim et al. 2022a (STaSy): TSTR sampling quality (F1/AUROC classification; R²/RMSE regression), coverage diversity (Naeem et al. 2020: fraction of fake samples with a real sample in their 5th-nearest neighborhood), wall-clock sampling time for 10K fakes (mean ± std over 5 runs). 8 baselines from GANs to score-based models. Ablations: discrete-in-discrete vs discrete-in-continuous space (§4.3), 3 negative-sampling methods (§4.4), contrastive learning on/off (§4.5). Splits random, not time-ordered.

## 7. Numerical results / baselines
Sampling quality TSTR (Table 1, averaged across datasets; CoDi vs STaSy vs Identity = real data):
- Binary F1: CoDi 0.4726, STaSy 0.4559, Identity 0.4154 (synthetic beats real here — best-hyperparameter selection per fake set inflates TSTR; authors' protocol, my caveat)
- Binary AUROC: CoDi 0.8106, STaSy 0.7961, Identity 0.8119
- Multi-class macro F1: CoDi 0.6221, STaSy 0.6078, Identity 0.6514
- Multi-class AUROC: CoDi 0.8026, STaSy 0.7997, Identity 0.8230
- Regression R²: CoDi 0.4794 (ONLY positive among 9 methods; Identity 0.6673; STaSy −1.3200; MedGAN/VEEGAN/CTGAN/TVAE −inf); RMSE 0.6477 vs Identity 0.3593
- Other baselines trail badly: CTGAN binary F1 0.3432, TVAE 0.3188, TableGAN 0.4078, OCT-GAN 0.3814, RNODE 0.3208; regression R² all ≤ −0.07 except CoDi.
Diversity coverage (Table 2): CoDi 0.6931 (best), STaSy 0.5771, TableGAN 0.5759, TVAE 0.3903, CTGAN 0.3834, RNODE 0.3841, OCT-GAN 0.2547, MedGAN 0.0155, VEEGAN 0.0019.
Sampling time 10K fakes (Table 3): CoDi 0.5187s vs STaSy 4.6417s (~9× faster; smaller per-model dims + U-Net skips), RNODE 103.14s, OCT-GAN 0.6008s, TVAE 0.0140s (fast but low diversity).
Discrete-space ablation (Table 4, F1/coverage): discrete-space diffusion beats continuous-space on all 4 discrete-only datasets (e.g., Phishing F1 0.931±0.012 vs 0.915±0.008, coverage 0.644 vs 0.127 — the continuous model collapses category counts, Fig. 6).
Negative sampling (Table 5): Method 3 (whole-block shuffle, CoDi's choice) best — Heart F1 0.872±0.039 / coverage 0.949±0.012; Faults 0.715±0.046; Insurance R² 0.575±0.398; Methods 1–2 show unstable triplet-loss curves (Fig. 8).
CL ablation (Table 6): contrastive learning improves F1 on Bank (0.566 vs 0.527), Seismic (0.305 vs 0.210), Faults, Obesity; diversity on Heart (0.949 vs 0.879), Stroke (0.919 vs 0.651); Absent R² −0.026→0.095.
All numbers are the paper's claims.

## 8. Code / data availability
Code: https://github.com/ChaejeongLee/CoDi (stated). Data: 11 public benchmark datasets (UCI-style); exact list in Appendix D.3.

## 9. Leakage & limitations
Adversarial notes: (1) TSTR-with-best-hyperparameters lets synthetic beat Identity (binary F1 0.4726 vs 0.4154) — the protocol can flatter generators; the honest comparison is CoDi-vs-baselines, where it still wins. (2) Min-max [−1,1] preprocessing is cruder than CTGAN's VGM or TabDDPM's quantile transform — long-tailed NFL features (blowout margins) may be poorly scaled. (3) Two diffusion models + triplet loss = more hyperparameters (λ_C, λ_D, margin m) and a more fragile training loop; failure modes multiply vs single-model TabDDPM. (4) Random splits only; no temporal evaluation. (5) Authors' own limitation: inapplicable to pure-continuous or pure-discrete tables. (6) No privacy analysis. (7) Compared against STaSy but not TabDDPM (both 2022 ICML-adjacent; no head-to-head exists in either paper — a gap GSE's own test should close). External validity to NFL: high for game-level mixed tables; the cross-type correlation claim maps directly to weather/venue × efficiency interactions.

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no overlap — new capability, same as ledgers 2062–2063. Within this lane it is the architectural alternative to TabDDPM (2062, single joint model) and complements CTGAN (2063, conditioning protocol): CoDi's contribution is the *cross-type binding* (co-evolving conditions + contrastive negatives). GSE relevance: NFL game rows have strong continuous–discrete interactions (dome/outdoor × passing EPA, rest-days bin × rushing efficiency, wind bin × kicking) that a single-model diffusion may smooth over; CoDi is the fallback if ledger 2062's fidelity gate shows weak cross-type correlation preservation.

## 11. GSE implementation spec
Build plan (effort: ~1 week, only if ledger 2062's gate fails on cross-type correlation):
1. Data: same nflverse game-level table (2015–2025) as ledger 2062, but keep discrete features native (venue type, surface, weather bin, rest category, division/game-script regime) rather than one-hot-into-joint-space.
2. Model: CoDi reference implementation; continuous net on EPA/pace/market numerics, discrete net on the categorical block; co-evolving conditioning both directions.
3. Contrastive negatives: Method 3 — shuffle discrete blocks across games (e.g., attach a dome-game weather block to an outdoor-game efficiency vector) so the triplet loss learns that weather×efficiency pairing matters.
4. Preprocessing: replace min-max with quantile transform for long-tailed margin/EPA features (paper's weakness, our fix).
5. Training: λ_C, λ_D ∈ {0.1, 0.3, 0.5}, margin m per paper; tune on CatBoost ML-efficiency on held-out season as in ledger 2062.
6. Compare directly against TabDDPM on the same fidelity suite (marginals, correlation L2, cross-type Cramér's V / correlation-ratio preservation).

## 12. Reproducible test
Dataset: nflverse team-game rows 2018–2023 train, 2024 held-out. Baseline: TabDDPM-synthesized 3 seasons (ledger 2062). Challenger: CoDi-synthesized 3 seasons. Both feed the same GBDT spread model (real+synthetic). Metrics: (a) log-loss on 2024 real season; (b) cross-type correlation preservation: mean absolute error between real and synthetic correlation-ratio (continuous × categorical) matrices. CoDi must win (b) by ≥10% relative to justify its complexity even if (a) ties.

## 13. Acceptance / rejection gate
ADOPT CoDi over TabDDPM if BOTH: (a) real+CoDi-synthetic beats real+TabDDPM-synthetic by ≥0.002 log-loss on held-out 2024, OR ties within 0.001 while (b) cross-type correlation MAE is ≥10% lower for CoDi. REJECT (stay with TabDDPM) if neither holds, or if training instability appears (triplet loss non-convergence across 2+ seeds), or fidelity marginals breach the 5% TVD rule from ledger 2062. Gate set before running; 3 seeds each.

## 14. Improvement experiment
Condition the discrete diffusion model on the *market-implied* regime (spread bucket + total bucket) as an explicit third condition stream, and make the negative sampler market-aware: negatives pair a game's efficiency vector with the weather/discrete block of a game from a DIFFERENT spread bucket. This teaches the model that discrete–continuous correlations are regime-dependent (a 7-point home favorite's EPA profile differs from a pick'em's), going beyond the paper's unconditional binding. Success: cross-type correlation MAE improves another ≥10% and rare-regime ECE (cf. ledger 2063) doesn't degrade.

**Verdict:** ADAPT
