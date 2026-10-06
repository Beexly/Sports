# [0049] Relative Advantage: Quantifying Performance in Noisy Competitive Settings (arXiv:2504.19612v1)

**Citation:** M. R. Brown, G. Scott, L. Kilduff (2025). *Relative Advantage: Quantifying Performance in Noisy Competitive Settings*. arXiv:2504.19612v1 [physics.data-an]. URL: https://arxiv.org/abs/2504.19612v1. Swansea University, 28 Apr 2025.
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v1) line by line on 2026-09-21 (3,755 extracted lines; §§1–7 plus Appendix A). Mathematical symbol extraction is unreliable in this PDF (superscripts/subscripts dropped); equations below are reconstructed and cross-checked across multiple restatements — see flags in §4.
**Verdict:** ADAPT — not a plug-in model, but a formal noise-cancellation principle with a usable diagnostic (the ση/σ_indiv variance ratio) that should govern how GSE engineers differential vs. absolute features; apply as a feature-prioritization audit on the existing NFL metric set.

## 1. Research question
Why do relative (difference-based) performance metrics outperform absolute metrics in competitive settings? The paper formalizes the mechanism: shared environmental effects (weather, referee, game pace, market climate) contaminate absolute measurements but cancel exactly in the difference. It develops an axiomatic + SNR-based framework, three linked performance metrics (separability, information content, effect size), simulation evidence across a parameter sweep, and a rugby real-world validation, with explicit guidance on *when* relativization helps most (the noise ratio ση/σ_indiv as the diagnostic).

## 2. Dataset / schema
- **Simulations (synthetic):** univariate two-competitor model, parameters |μA−μB| ∈ [0,20], σA,σB ∈ [1,10], ση ∈ [0,100]; 1,000 trials × (2,000 train / 1,000 test) per configuration; linear SVM; metrics = classification accuracy + AUC-ROC. Two spotlight configurations (Tables 2–3): High-Noise (μA=1010, μB=1013, σA=σB=3, ση=100, |Δμ|=3) and Boundary (μA=1000, μB=1010, σA=σB=3, ση=0.1, |Δμ|=10).
- **Rugby (real data):** 127 matches from the 2021–2022 United Rugby Championship season; three KPIs from Scott et al. (2023a): X1 = carries over gain line (absolute count), X2 = defenders beaten (absolute count), X3 = tackle completion % (ratio). Not published with the paper (access not stated).
- Access: rugby data not published; simulation code written in MATLAB R2023a with "complete implementation available in the accompanying code repository" — URL not stated in paper.

## 3. Method / model
- **Axiomatic foundation (§2.1):** four axioms a valid relative metric R must satisfy: (1) Invariance to Shared Effects: R(XA+η, XB+η) = R(XA, XB); (2) Ordinal Consistency: if μA > μB then E[R] > 0; (3) Scaling Proportionality: R(αXA, αXB) = αR(XA, XB); (4) Optimality: R = XA − XB minimizes expected squared error in estimating μA − μB.
- **Core theorems:** Thm 2.1 (minimal sufficiency: XA − XB is the minimal sufficient statistic for μA − μB, via Fisher–Neyman factorization); Thm 2.2 (asymptotic efficiency: the difference estimator achieves the Cramér–Rao bound); Thm 2.3 (environmental cancellation: R = (μA−μB) + (εA−εB), η cancels exactly); Thm 2.4 (R ~ N(μA−μB, σ_A² + σ_B²)). Thm 2.6 (Relative Superiority): when η is significant vs. εi, both competitors face identical conditions, and |μA−μB| is small vs. |η|, then E[P_R(Ω)] > max(E[P_XA(Ω)], E[P_XB(Ω)]).
- **Key ML-relevant insight (§2.4.3):** a two-feature absolute predictor given both XA and XB implicitly learns relativization — optimal linear weights converge to wA = 1, wB = −1 (Eq. 26), with decision boundary (XA − XB) > 0 (Eq. 45); SNR_twoabs ≈ 4·SNR_rel, a pure scaling that does not change the boundary. So explicitly engineering the difference is equivalent to what a well-trained model discovers, but with better data efficiency and robustness.
- **Rugby validation:** logistic regression per KPI with three predictors — Xi,H (home only), (Xi,H, Xi,A) (both), Ri = Xi,H − Xi,A (relative) — predicting win/loss; AUC-ROC compared.

## 4. Equations & assumptions
- Measurement model (Eqs. 2–3): X_A = μ_A + ε_A + η; X_B = μ_B + ε_B + η, with ε_i ~ N(0, σ_i²), η ~ N(0, σ_η²) shared.
- Relative transformation (Eq. 4): R = XA − XB; environmental cancellation (Eq. 5): R = (μA−μB) + (εA−εB).
- SNR (Eqs. 8–9): SNR_single_abs = (μA−μB)²/(σ_A² + σ_η²); SNR_rel = (μA−μB)²/(σ_A² + σ_B²). Improvement ratio (appendix Eqs. 60–61, the clean authority): **SNR_rel/SNR_abs = (σ_A² + σ_η²)/(σ_A² + σ_B²)**; when ση dominates: ≈ 1 + σ_η²/(σ_A² + σ_B²) (Eq. 12).
- **FLAG:** Eq. 7's extraction includes a factor-of-2 variant for the two-feature case whose exact numerator could not be disambiguated; the Eq. 60–61 form above is what the appendix proof derives — use that, not the garbled Eq. 7. Re-derive from the source PDF before citing the two-feature SNR formulas downstream.
- Three metrics (§3), all functions of effect size d: Separability S = Φ(d/2) = Φ(μR/σR) (Eqs. 27, 34; Φ = standard normal CDF); Information content I = 1 − H(S) = 1 − H(Φ(d/2)) (Eq. 35; H = binary entropy); Mahalanobis distance DM = |μA−μB|/√(σ_A² + σ_B²) (Eq. 32); **d = 2·DM** (Eq. 33), so d = 2|μA−μB|/√(σ_A² + σ_B²). Bounds: S_max = Φ(d_max/2), I_max = 1 − H(S_max), d_max = 2|μA−μB|/√(σ_A²+σ_B²). Improvement scaling: d_rel/d_abs = √(SNR_rel/SNR_abs).
- **FLAG:** Eq. 39's extraction is garbled; the relationship d_rel/d_abs = √(SNR_rel/SNR_abs) is restated verbatim in §3.5.2 and Figure 5's caption, so it is reliable.
- Metric-selection guidance (§3.5.3): focus on separability S when d < 1, on information content I when d > 3 (S saturates, I keeps improving); effect size d has the most linear relationship with SNR improvement.
- Assumptions (stated): normality of εA, εB, η (CLT/max-entropy justification); independence of competitor-specific errors; perfectly shared environmental effect η (identical for both competitors); static parameters.

## 5. Features / target
- **Simulations:** features = one of (a) single absolute XA, (b) both (XA, XB), (c) relative R = XA − XB; target = binary outcome Ω (which competitor wins); linear SVM classifier.
- **Rugby:** features per KPI = Xi,H | (Xi,H, Xi,A) | Ri = Xi,H − Xi,A; target = match win/loss; logistic regression.
- No engineered feature list beyond the KPI definitions — the "feature" under study is the relativization transformation itself.

## 6. Validation design
- Simulations: 1,000 independent trials per configuration, 2,000 train / 1,000 test, fixed random seed; mean ± SD reported across trials. Parameter landscape sweep over |Δμ| ∈ [0,20], σ_indiv ∈ [1,10], ση ∈ [0,100]. Two spotlight configs: high-noise (all three Thm 2.6 conditions satisfied) and boundary (conditions deliberately violated: ση ≪ σ_indiv, large |Δμ|).
- Rugby: 127 URC matches, logistic regression, AUC-ROC per KPI; no stated train/test split or cross-validation (appears to be in-sample fit — not stated otherwise).
- Baselines compared: single-feature absolute (SA) vs two-feature absolute (TA) vs relative (R) — a three-way comparison, which is the paper's methodological selling point vs prior binary comparisons.

## 7. Numerical results / baselines
Quoted exactly as in the paper:
- **High-noise simulation (Table 4):** Accuracy — SA 0.735 ± 0.014; TA 0.941 ± 0.009; R 0.943 ± 0.009. AUC — SA 0.498 ± 0.02 (≈ chance), TA 0.920 ± 0.013, R 0.920 ± 0.013. Relative beats two-feature in only 51% of accuracy trials / 61% of AUC trials (statistical tie — predicted by theory). Theoretical SNRs: single ≈ 0.0009, two-feature ≈ 0.5, relative = 0.5.
- **Boundary config (Table 5):** SA accuracy 0.991 ± 0.003 / AUC 0.491 ± 0.071; TA 0.999 / 1.000; R 1.000 ± 0.001 / 1.000. Relative advantage vanishes (theoretical 0.50-fold — i.e., can underperform).
- **Parameter landscape:** largest gains at moderate |Δμ| (5–20 units), moderate σ_indiv (2–5); gain scales with ση/σ_indiv; abstract/discussion headline: **up to ~28–28.3% classification-accuracy improvement** under high noise.
- **Rugby (Table 7, AUC-ROC):** Carries over gain line: 0.619 (home) / 0.738 (both) / **0.782 (relative)**; Defenders beaten: 0.642 / 0.744 / **0.771**; Tackle completion: 0.584 / 0.723 / **0.738**. Average improvement: **+21.3% over single absolute, +5.2% over two-feature absolute**. Inferred noise ratio σ_ηi/σ_indiv ≈ 0.46 on average (0.51 carries, 0.45 defenders beaten, 0.39 tackle %); i.e., match-specific environment ≈ 46% of individual KPI variance. Estimated SNR gain ~8.3-fold for rugby. Effect sizes d ≈ 1.0–1.5.
- **Cross-study convergence (Table 9):** SNR improvement at 10× noise — prior literature 4.8–6.5 fold, rugby 8.3 fold, their simulations 5.5 fold; critical noise ratio ση/σ_indiv: 4.3 / 3.8 / 4.5.

## 8. Code / data availability
Rugby data: not published. Simulation code: MATLAB R2023a, "complete implementation is available in the accompanying code repository" — URL not stated in paper. Effectively: none verifiable.

## 9. Leakage & limitations
- **Reviewer (adversarial):** the single-team-absolute predictor (Xi,H only) is a straw man vs. real modeling practice — the fair comparison (two-feature absolute) is essentially tied with the relative predictor, so the honest delta is +5.2%, not the headline +21.3%. Rugby sample is small (127 matches); no train/test split or cross-validation is stated for the rugby logistic regressions (likely in-sample AUCs).
- Paper's own (§6.5): normality assumption; univariate only (bivariate results preliminary — negative cross-dimension correlation enhances benefits when differences have consistent signs); perfect environmental sharing assumed (no differential team sensitivity to conditions — e.g., dome vs. outdoor teams in weather); static parameters (no temporal dynamics).
- NFL external validity: the +21% number is rugby KPIs vs. a weak baseline, not NFL game prediction — do not quote it as expected NFL lift. NFL is already a difference-dominated sport (scores are differences), so the marginal gain over current practice is smaller than the headline.

## 10. GSE overlap
Directly adjacent, **extension not duplicate**. GSE's engine-benchmark lane (NFL efficiency metrics, calibration, ratings work per the existing-research map, read 2026-09-21) is exactly about building predictive team/player metrics, but the map has no formal treatment of *when* differential features beat absolute ones — the ση/σ_indiv diagnostic and the (1,−1)-weight equivalence result are new to the corpus. The portable idea: for environment-heavy metrics (weather-exposed, pace-sensitive), opponent-relative difference features (EPA margin, net efficiency differentials, yards-per-play spread) dominate absolute team stats, and the paper quantifies the regime via the noise ratio. Nothing in the Sports repo corpus formalizes this.

## 11. GSE implementation spec
- **Build: "relativization audit" over the existing nflverse feature set** (effort: ~1–2 analyst days, no new data needed):
  1. For each candidate team metric in the prediction pipeline, estimate the shared-vs-individual variance ratio: decompose within-matchup variance (common to both teams in a game — weather, officiating, pace) vs. across-matchup team-specific variance. The paper's Eq. 12 gives the expected SNR gain directly from this ratio.
  2. Prioritize difference-features (team minus opponent) where the ratio is high; keep absolute features only for low-environment-noise contexts.
  3. Engineering shortcut from §2.4.3: explicitly construct the difference features rather than relying on the model to learn (1,−1) weights — cheaper, more data-efficient, more robust to distribution shift.
- Metric-selection guidance (§3.5.3): when evaluating, use separability-style metrics (AUC) for low-effect-size regimes and information-content measures where AUC saturates.

## 12. Reproducible test
- Dataset: nflverse play-by-play 2020–2025, team-week panel. For each of ~10 candidate efficiency metrics (EPA/play, success rate, yards/play, etc.): build absolute (team) and relative (team − opponent, same game) versions.
- Protocol: logistic regression / gradient boosting predicting game outcome on rolling-origin time-ordered splits (train seasons 2020–2023, test 2024–2025).
- Baselines: absolute-only features vs. absolute+opponent (two-feature) vs. relative-difference features — the paper's three-way design, mirrored exactly.
- Metric: AUC and log-loss; report per-metric ση/σ_indiv estimates alongside the AUC delta.

## 13. Acceptance / rejection gate
**Adopt the principle** if relative-difference features beat the two-feature absolute baseline on held-out 2024–2025 NFL games by ≥ 0.01 AUC on log-loss-neutral comparison (i.e., the honest +5%-style delta, not the straw-man comparison). The paper's theory predicts the gain concentrates in high-environment-noise metrics (weather games, high-variance pace) — so gate on the subset where estimated ση/σ_indiv > 0.4. If no metric clears the gate, keep current feature practice; the principle costs nothing to test.

## 14. Improvement experiment
Go beyond the paper: model *differential sensitivity* to the environment (the paper assumes η hits both teams identically — false in NFL: e.g., a dome team in wind). Estimate team-specific environmental loadings η_i = λ_i·η and use the adjusted relative metric R_adj = (X_A − λ̂_A η̂) − (X_B − λ̂_B η̂). This extends the framework to the heterogeneous-environment case the authors list as future work (§7.3) and is directly testable on weather-split NFL data.
