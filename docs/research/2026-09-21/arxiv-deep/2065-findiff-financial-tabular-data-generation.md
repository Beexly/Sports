# [2065] FinDiff: Diffusion Models for Financial Tabular Data Generation (arXiv:2309.01472)

**Citation:** Timur Sattarov, Marco Schreyer, Damian Borth (2023). *FinDiff: Diffusion Models for Financial Tabular Data Generation*. arXiv:2309.01472. URL: https://arxiv.org/abs/2309.01472
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2309.01472, sections 1–7; all equations, Tables 1–3 verified).
**Verdict:** ADAPT — embedding-encoded categoricals + pure Gaussian diffusion is the most NFL-scalable of the tabular-diffusion designs (no one-hot dimensionality explosion, no per-feature multinomial process); the paper's head-to-head shows it beating TabDDPM/CTGAN/TVAE on fidelity, utility, and privacy on financial tabular data. Needs adaptation: 2-dim embeddings are crude for 32-team structure, and the Fund Holdings result shows skewed numerics need quantile preprocessing.

## 1. Research question
Financial regulators (Bundesbank et al.) cannot share microdata under GDPR, blocking collaborative research, stress testing, and fraud-detection model development. Can a diffusion model synthesize mixed-modality financial tabular data with high fidelity, utility, and privacy — without the one-hot dimensionality explosion that breaks baselines (Philadelphia Payments one-hot → 6,124–7,830 dimensions, which the authors say broke baseline training)? The technical question: do learned embedding encodings for categoricals (E ∈ ℝ^{D×C}, D=2) inside a single Gaussian diffusion process beat one-hot multinomial diffusion (TabDDPM) and GAN/VAE baselines?

## 2. Dataset / schema
Three real-world financial datasets (Table 1), 70/30 train/test:
- Credit Default (public, UCI): 30,000 rows; 10 categorical / 13 numeric; 2 classes. Taiwan credit-card clients, Apr 2005–Sep 2005.
- Philadelphia Payments (public, data.phila.gov): 100,000 sampled of 238,894 (one-hot baselines couldn't train on full); 7 categorical / 1 numeric; 11 classes. City payments FY2017.
- Fund Holdings (proprietary, Bundesbank; no descriptives publishable): 88,893 rows; 6 categorical / 78 numeric; 18 classes. Mostly extremely skewed numerics.
Diversity in categorical/numeric mix was deliberate. Access: two public URLs stated; Fund Holdings proprietary and unreplicable.

## 3. Method / model
FinDiff pipeline (Fig. 2): (1) preprocessing — numerics normalized, categoricals x^{cat} mapped through a learned embedding matrix E ∈ ℝ^{D×C} (D=2 per attribute; "increasing dimensionality did not result in performance enhancement"); (2) embedding assembly — x_0 = e^{c_1}⊕…⊕e^{c_k}⊕x^{num} plus sinusoidal time embedding and label embedding, linear-projected (Nichol et al. 2021 style); (3) single Gaussian diffusion (Ho et al. 2020) with a feed-forward noise-prediction network, 500 steps, linear scheduler; (4) postprocessing — sampled embeddings decoded to nearest neighbor in E (argmin over categories), numerics denormalized. Training: up to 3000 epochs, batch 512, Adam (β1=0.9, β2=0.999), cosine LR scheduler, Glorot init; neurons ∈ {256,…,8192}, hidden layers ∈ {4,6,8,10,12} per dataset. Conditional sampling supported (label embeddings) for multi-class sets. Baselines via SDV v1.0.1: TVAE, CTGAN, TabDDPM.

## 4. Equations & assumptions
Gaussian diffusion (Eqs. 1–4): q(x_t|x_{t-1}) = N(x_t; √(1−β_t)x_{t-1}, β_t I); closed form q(x_t|x_0) = N(x_t; √(1−β̂_t)x_0, β̂_t I), β̂_t = 1−Π(1−β_i); reverse p_θ(x_{t-1}|x_t) = N(x_{t-1}; μ_θ(x_t,t), Σ_θ(x_t,t)); μ_θ(x_t,t) = (1/√α_t)(x_t − (β_t/√(1−α̂_t))ε_θ(x_t,t)); L_t = E‖ε − ε_θ(x_t,t)‖²_2.
Column fidelity (Eq. 5): ω_col = 1−KS(x^d,s^d) numeric; 1−½TVD categorical; Ω_col = mean over attributes.
Row fidelity (Eq. 6): ω_row = 1−½|ρ(x^a,x^b)−ρ(s^a,s^b)| numeric pairs; 1−½TVD categorical pairs; Ω_row = mean over pairs.
Privacy (Eq. 7): DCR(s_n) = min_{x∈X} d(s_n, x), Euclidean; final = median over synthetic points (lower better).
Utility: Φ = (1/5)Σ Θ_i(S_train, X_test) over 5 classifiers (Random Forest, Decision Trees, Logistic Regression, AdaBoost, Naive Bayes) — train on synthetic, test on real; mean accuracy.
Synthesis: fraction of synthetic records exactly matching a real record (numeric match = within 1%); higher = more novel.
Assumptions: (1) 2-dim embeddings capture categorical semantics ("similar categories in close proximity"); (2) nearest-neighbor decoding recovers valid categories; (3) median DCR measures privacy; (4) the embedding space is Euclidean-meaningful for diffusion.

## 5. Features / target
Per dataset (see §2). Targets are the class labels (2/11/18 classes); utility classifiers predict them. Conditional generation conditions on the label. NFL translation (my inference): categoricals = team IDs, opponent IDs, venue/surface/weather bins, personnel groupings; numerics = EPA, success rates, pace, spreads/totals; label = outcome regime for conditional sampling.

## 6. Validation design
70/30 splits; 5 random seeds; metrics: column fidelity, row fidelity, utility (ML efficacy), synthesis (novelty), privacy (DCR) — all vs TVAE/CTGAN/TabDDPM through identical SDV harnesses. Ablation (§6): numeric scaling — Standard vs Power (yeo-johnson) vs Quantile Transformer on Fund Holdings. Qualitative: marginal histograms (Fig. 4: GENDER=2, PAY_0=11, AGE=56 categories reproduced) and correlation-difference heatmaps (Fig. 5). Splits random, not time-ordered; no temporal design.

## 7. Numerical results / baselines
Table 2 (mean ± std, 5 seeds; bold = best per dataset):
- Credit Default — column fidelity: FinDiff 0.931±0.01, TVAE 0.920±0.01, CTGAN 0.872±0.01, TabDDPM 0.401±0.05. Row fidelity: FinDiff 0.939±0.01, TVAE 0.923±0.01, CTGAN 0.871±0.01, TabDDPM 0.320±0.01. Utility: FinDiff 0.794±0.01 (+1.2%/+1.6% over TVAE per paper; +12.95% over CTGAN 0.703; +11.98% over TabDDPM 0.709). Privacy (lower better): FinDiff 1.474±0.01, TVAE 1.573±0.01, CTGAN 1.880±0.06, TabDDPM 2.734±0.18. Synthesis: all 1.000. Paper's striking claim: utility trained on FinDiff synthetic (0.794) beats training on REAL data (0.706) by 8.4%.
- Philadelphia Payments — column: FinDiff 0.901±0.01, TabDDPM 0.900±0.01, TVAE 0.791±0.01, CTGAN 0.782±0.01. Row: FinDiff 0.838±0.00, TVAE 0.634±0.01, CTGAN 0.576±0.01, TabDDPM 0.535±0.01. Utility: FinDiff 0.874±0.00 (best), TabDDPM 0.863±0.01. Privacy: FinDiff 1.414±0.00 (best), CTGAN 1.765±0.32, TVAE 2.000±0.00, TabDDPM 4.135±0.20. Synthesis: TabDDPM 1.000, FinDiff 0.992±0.01.
- Fund Holdings — column: FinDiff 0.764±0.01 (best), TVAE 0.745±0.01, CTGAN 0.591±0.02, TabDDPM 0.119±0.01 (collapse on skewed numerics). Row: TVAE 0.952±0.01, FinDiff 0.949±0.01 (second by a hair), CTGAN 0.937, TabDDPM 0.767. Utility: FinDiff 0.544±0.02 (best), TVAE 0.543±0.02, CTGAN 0.421±0.03, TabDDPM 0.135±0.06. Privacy: TVAE 0.171±0.01 (best), CTGAN 0.847, FinDiff 3.667±0.40, TabDDPM 9.816±8.00. Synthesis: all 1.000.
- Ablation Table 3 (Fund Holdings fidelity col/row): Standard scaler 0.534/0.824; Power 0.552/0.889; Quantile 0.764/0.949 — quantile transform wins decisively on skewed numerics.
All numbers are the paper's claims. Caveat (my inference): baselines ran through SDV v1.0.1 defaults while FinDiff got per-dataset architecture search — TabDDPM's collapse (0.401/0.119 column fidelity) looks like a config failure rather than a method failure, so treat the margin as optimistic.

## 8. Code / data availability
No code link stated in the paper ("None stated" for code). Data: Credit Default (archive.ics.uci.edu), Philadelphia Payments (data.phila.gov) public; Fund Holdings proprietary.

## 9. Leakage & limitations
Adversarial notes: (1) Asymmetric tuning — FinDiff got exhaustive architecture search, baselines got SDV defaults; the TabDDPM collapses are suspicious and flatter FinDiff. (2) "Increasing embedding dimensionality did not help" + D=2 chosen partly for visualization — a 2-dim embedding for an 11- or 56-category attribute is information-poor; nearest-neighbor decoding in 2D will alias categories. (3) Privacy metric (median DCR) is weak; Fund Holdings privacy (3.667) is far worse than TVAE (0.171) — the embedding model memorizes more on skewed numeric data. (4) Fund Holdings is proprietary — the most NFL-relevant result (skewed numerics) is unreplicable. (5) No temporal structure; no missing-value handling (MissDiff cited as alternative). (6) 3000 epochs × up-to-8192-wide nets is heavy for the reported gains. External validity to NFL: high for game-level tables with high-cardinality categoricals; the embedding trick directly solves the 32-team one-hot blowup that TabDDPM's multinomial diffusion would suffer (cf. Philadelphia's 7,830-dim one-hot breaking baselines).

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no overlap — new capability (ledgers 2062–2064). Within-lane position: FinDiff is the *scalability* answer to TabDDPM (2062) — one Gaussian diffusion over embedding+numeric space instead of per-feature multinomial processes — and the *quantile-transformer* ablation independently confirms the preprocessing choice for skewed NFL numerics (blowout margins, EPA tails). Complements CoDi (2064): both avoid one-hot, via different routes (embeddings vs native discrete diffusion).

## 11. GSE implementation spec
Build plan (effort: ~3 engineer-days; candidate replacement for TabDDPM if one-hot cardinality becomes a bottleneck):
1. Data: nflverse game-level table 2015–2025 (same as ledger 2062).
2. Categorical encoding: learn E ∈ ℝ^{D×C} with D ∈ {8, 16} (not the paper's D=2 — NFL team identity needs more capacity; tune D on fidelity) for team, opponent, venue type, surface, weather bin, rest category.
3. Numerics: quantile transform (per the paper's own Table 3 ablation — mandatory for skewed margin/EPA features), then standardize.
4. Model: single Gaussian diffusion over concatenated [embeddings ⊕ numerics], feed-forward noise net, 500 steps linear schedule, sinusoidal time + outcome-regime label embeddings for conditional sampling (rare regimes).
5. Decode: nearest-neighbor in E per categorical; denormalize numerics.
6. Tune: neurons/layers per paper's grid (reduced: {512,1024,2048} × {4,6,8}); select on CatBoost ML-efficiency on held-out season.
7. Head-to-head vs TabDDPM on identical fidelity/utility/privacy suite before choosing the production backbone.

## 12. Reproducible test
Dataset: nflverse team-game rows 2018–2023 train, 2024 held-out. Baseline: TabDDPM (ledger 2062) 3 synthetic seasons. Challenger: FinDiff-style embedding diffusion 3 synthetic seasons (D=8 and D=16). Same downstream GBDT spread model (real+synthetic). Metrics: (a) log-loss on 2024; (b) column fidelity Ω_col and row fidelity Ω_row per the paper's Eqs. 5–6 (KS/TVD-based — directly implementable); (c) training wall-clock and peak memory (the scalability claim).

## 13. Acceptance / rejection gate
ADOPT embedding-diffusion as the production backbone if: (a) Ω_col ≥ 0.90 and Ω_row ≥ 0.80 on the NFL table (the paper's winning regime on Credit Default was 0.931/0.939), AND (b) real+synthetic log-loss beats real-only by ≥0.003 on held-out 2024 (same bar as ledger 2062), AND (c) peak training memory ≤50% of TabDDPM's one-hot model. REJECT (keep TabDDPM) if any gate fails or if nearest-neighbor decoding aliases teams (any team's synthetic self-match rate <90% when decoding its own embedding centroid). Gate set before running; 3 seeds.

## 14. Improvement experiment
Structured embeddings: instead of one flat embedding per categorical, factor team embeddings as team_base ⊕ season_form (a learned per-team-per-season offset capturing roster/coaching regime) — i.e., E_team(season) = E_team + Δ_{team,season}. The diffusion then operates over a space where "2024 Chiefs" and "2019 Chiefs" are nearby but distinct, giving regime-aware synthesis for free (cf. ledger 2062 §14's season-embedding idea, but now inside the categorical representation rather than as a conditioning label). Test: does regime-conditioned sampling from factored embeddings beat flat embeddings on the §13 gate, especially for teams with coaching/QB changes?

**Verdict:** ADAPT
