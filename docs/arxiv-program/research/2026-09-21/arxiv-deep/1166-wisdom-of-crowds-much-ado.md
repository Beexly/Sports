# 1166 Wisdom of Crowds: Much Ado About Nothing (arXiv:2008.01485)

**Citation:** Sandro M. Reia, José F. Fontanari (2021). *Wisdom of crowds: much ado about nothing*. arXiv:2008.01485v2. URL: https://arxiv.org/abs/2008.01485
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v2, 12 pp incl. appendices, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt two instruments for GSE's ensemble lane: (1) the unbiasedness p-value test as a bias screen on GSE's model pool, and (2) a standing "best-single-model vs ensemble" comparison, since the paper shows biased crowds beat most members only ~67% of the time.

## 1. Research question
Do real-world expert forecasts support any of the three standard explanations of the wisdom of crowds (Page's diversity prediction theorem, the augmented quincunx psychophysical model, the unbiased-estimates assumption)? Using ~8,650 forecast experiments from the Federal Reserve Bank of Philadelphia's Survey of Professional Forecasters (FRBP), the paper tests each explanation and quantifies how often the crowd actually beats its members.

## 2. Dataset / schema
FRBP Survey of Professional Forecasters: quarterly projections of economic indicators, Q4 1968–Q4 2019. Main analysis: nominal GDP (NGDP) semestrial forecasts at three ranges — short (current quarter, 205 experiments), medium (2 quarters ahead, 203), long (4 quarters ahead, 196); N=9–87 economists per experiment (mean ≈37). Broader analysis: 8,650 experiments across 10 indicators × 5 forecast ranges. Schema: per experiment, one point estimate g_i per forecaster and the realized true value G. Plus 4 laypeople experiments (candies in a jar N=105, paper strip N=139, bean bag N=97, book pages N=140; data at https://github.com/JoseFontanari/Wisdom of Crowds) and synthetic "virtual unbiased forecaster" replications. Data: FRBP public (philadelphiafed.org); laypeople data on GitHub.

## 3. Method / model
- Per experiment: crowd estimate ⟨g⟩ = mean; collective error γ = G − ⟨g⟩ (signed) / |γ|; individual error ε=(1/N)Σ(g_i−G)²; diversity δ=(1/N)Σ(g_i−⟨g⟩)²; skewness μ3 = (1/N)Σ((g_i−⟨g⟩)/δ^{1/2})³.
- Dimensionless comparisons across experiments: |γ|/G, ε^{1/2}/G, δ^{1/2}/⟨g⟩, γ/G vs μ3.
- Spearman correlations (nonparametric) with p-values throughout.
- Virtual unbiased forecasters: for each experiment, N estimates drawn from Gaussian(μ=G, σ²=δ) with the experiment's observed δ and N; crowd ⟨g⟩_u ~ Gaussian(G, δ/N).
- Unbiasedness test: null = ⟨g⟩_u ~ Gaussian(G, δ/N); two-tailed p = 1 − erf(|⟨g⟩−G|/√(2δ/N)); fraction of experiments with p<0.05 measures bias prevalence.

## 4. Equations & assumptions
- Page's identity: γ² = ε − δ (restated; authors stress it's a tautology with no predictive content — "like Price's equation").
- Augmented quincunx: G = Ĝ + Σ_c η_c; g_i = Ĝ + Σ_c u_c η_c with u_c = ±1, P(+1)=p. Prediction: negative correlation between signed γ/G and skewness μ3.
- Unbiased null: P_u(g_i) = (2πδ)^{−1/2} exp(−(g_i−G)²/2δ); P(⟨g⟩_u) = Gaussian(G, δ/N). p-value: p = 1 − erf(|⟨g⟩−G|/√(2δ/N)).
- Assumptions: FRBP economists are the relevant "experts"; forecast ranges are comparable after nondimensionalization; Gaussian unbiased model is the right null.

## 5. Features / target
Inputs: forecaster point estimates g_i and realized G per experiment. Targets: crowd-vs-member win fractions; correlation statistics testing the three explanations.

## 6. Validation design
Observational: 8,650 natural forecast experiments; no intervention, no train/test. Comparisons: real economists vs synthetic unbiased forecasters matched on (N, δ) per experiment; short/medium/long range as difficulty control. Significance via Spearman p-values and the p<0.05 unbiasedness test.

## 7. Numerical results / baselines
- Real experts, all 8,650 experiments: crowd beats ALL individuals in 1.7% of experiments; beats MOST (ξ≤1/2) in 66.8% (exact). NGDP by range: crowd beats majority in 150/205≈0.73 (short), 145/203≈0.71 (medium), 130/196≈0.66 (long). One experiment had 85% of individuals beat the crowd.
- Virtual unbiased forecasters (matched N, δ): crowd beats all in 16.3%, beats most in 99.8%; unbiased crowd ≈10× more accurate than economists' crowd (exact: "about ten times more accurate").
- Diversity vs collective error (Spearman, real data): short-range ρ=0.31 (p<10⁻⁶), medium ρ=0.25 (p<10⁻⁶), long ρ=0.14 (p=0.05) — POSITIVE correlation: more diverse crowds are LESS accurate, contradicting the popular diversity reading.
- Skewness vs signed collective error: ρ=0.008 (p=0.91), −0.03 (p=0.62), −0.12 (p=0.09) — no association; contradicts augmented quincunx.
- Diversity vs skewness (real): ρ=−0.09 (p=0.19), −0.36 (p<10⁻⁶), −0.46 (p<10⁻⁶) — large variance goes with long left tails (not predicted by quincunx; absent in unbiased null).
- Unbiasedness test: 85% of the 8,650 collective predictions have p<0.05 → economists' forecasts are biased (exact).
- Laypeople: P(random participant beats crowd) = 15% (paper strip) to 38% (book pages); unbiased null rejected for jar (p<10⁻⁶) and book (p<10⁻⁶), not rejected for strip (p=0.14), borderline for beans (p=0.03).
- Short-range forecasts ≈3× more accurate and 4× less disperse than long-range (stated qualitatively with means/SDs in figures).

## 8. Code / data availability
No analysis code stated. FRBP data public via philadelphiafed.org; laypeople experiment data at https://github.com/JoseFontanari/Wisdom of Crowds.

## 9. Leakage & limitations
- Observational economics data; no causal identification; forecast ranges are coarse difficulty controls.
- FRBP economists forecast the same indicators repeatedly — herding/anchoring on consensus is likely, inflating bias.
- The "crowd beats most 66.8%" stat depends on the mean aggregator; other aggregators (median, trimmed) not tested here.
- Mapping to GSE: GSE's models are not human experts; "bias" here is systematic directional error, which is testable on models too, but the 85%-biased figure is about economists, not models.
- The paper's conclusion ("much ado about nothing") is rhetorical — the 66.8% figure still favors the crowd over a random member.

## 10. GSE overlap
Extension, not duplicate. 1163 gave the algebraic diversity decomposition; 1162 gave peer-assessment selection; this paper contributes the empirical magnitude argument (biased pools → ensemble beats most members only ~2/3 of the time) and the unbiasedness p-value test, which no other assigned paper provides. GSE currently has no bias screen on its model pool and no standing best-single-model baseline.

## 11. GSE implementation spec
Adapt two instruments:
1. Model-pool bias screen: for each market, treat each component model's season of probability forecasts as the "economists"; test the pool's unbiasedness per game-week via the paper's p-value logic — compute calibration-in-the-large: is the pool's mean forecast statistically distinguishable from perfect calibration on that week's games? Use a Hosmer–Lemeshow / Spiegelhalter z-test on the pooled forecasts instead of the paper's Gaussian null (probabilities, not point estimates). Flag weeks where the pool is significantly biased.
2. Best-single-model baseline: every week, compare the ensemble's Brier against each individual model's Brier; maintain the running fraction of weeks the ensemble beats most models. If that fraction is ~0.65–0.70 (paper's range) rather than ~1.0, keep a "champion model" lane alive and consider champion-weighted (not pure mean) aggregation.
3. Effort: ~half day; uses the existing picks table.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons, per-game component-model probabilities (picks table). (a) Run the calibration bias screen per week per market; report the fraction of weeks with p<0.05. (b) Compute the fraction of weeks the ensemble beats most component models on Brier. Baseline to beat for any new aggregation rule: the champion (best trailing-8-week) single model. Time-ordered: all selections use past weeks only.

## 13. Acceptance / rejection gate
ADOPT the champion-model lane if, on 2025 data, the single best trailing-8-week model beats the equal-weight ensemble on full-season Brier, OR the ensemble beats most models in fewer than 75% of weeks (paper-consistent regime) while a skill-weighted (not mean) ensemble recovers ≥2% Brier. REJECT the "ensemble always wins" default if the bias screen flags >50% of weeks — in that regime, mean aggregation of a biased pool is the paper's failure mode; shift weight to the champion.

## 14. Improvement experiment
Beyond the paper: the paper compares mean-ensemble vs unbiased null; run the three-way horse race on GSE data — mean ensemble vs median ensemble vs champion model vs skill-weighted ensemble — and test whether the ranking of the four is predicted by the weekly bias-screen p-value. Hypothesis: in low-bias weeks the mean ensemble wins (paper's unbiased regime); in high-bias weeks the champion wins. If confirmed, this yields a per-week aggregator selector driven by the bias screen — a direct operationalization the paper doesn't attempt.
