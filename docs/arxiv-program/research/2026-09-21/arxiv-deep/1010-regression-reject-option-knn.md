# [1010] Regression with Reject Option and Application to kNN (arXiv:2006.16597)

## Citation / full-text source

- arXiv:2006.16597 — full text: https://arxiv.org/pdf/2006.16597
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Christophe Denis, Mohamed Hebiri, Ahmed Zaoui (2020; v2). *Regression with Reject Option and Application to kNN*. arXiv:2006.16597v2. URL: https://arxiv.org/abs/2006.16597
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/2006.16597.txt` (arXiv conversion; read in full — abstract, §§1–6, experiments Table 1 / Figs. 2–4, proof appendices; exact Table 1 values extracted).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the optimal regression reject rule (threshold the CONDITIONAL VARIANCE σ²(x)) maps directly onto GSE's margin/total models: no-bet the games whose outcomes are inherently most unpredictable, with the rejection rate calibrated on unlabeled data.

## 1. Research question
In regression with a fixed rejection rate ε (abstain on ≤ε of data), what is the optimal predictor, and can a semi-supervised plug-in (labeled set for f* and σ², unlabeled set for the threshold) match it in both risk and rejection rate, with kNN convergence rates?

## 2. Dataset / schema
UCI: QSAR aquatic toxicity (n=546, 8 features, output in [0.12,10.05]) and Airfoil Self-Noise (n=1503, 5 features, output in [103,140]). Split: 50% labeled train, 20% unlabeled (for empirical cdf), 30% test. Plug-in predictors built on SVM, random forests, kNN (k ∈ {5,…,150} by 10-fold CV; RF/SVM via R defaults). 100 repetitions, means + SDs.

## 3. Method / model
Optimal rule (Prop. 2/§2): for fixed rejection rate ε, predict f*(x) when σ²(x) ≤ λ_ε and reject when σ²(x) > λ_ε, where σ²(x)=E[(Y−f*(X))²|X=x] and λ_ε is the (1−ε)-quantile of σ²(X). Semi-supervised plug-in (§3.1): estimate f̂ and σ̂² on labeled data, calibrate the threshold from the empirical cdf of σ̂² on UNLABELED data (plus tiny uniform perturbation ζ∼U[0,10⁻¹⁰] to avoid cdf jumps — the same randomization device as 1006's Theorem 1). Consistency of risk and rejection rate (Theorem 1); kNN convergence rates (Theorem 2) under mild conditions, no margin assumption needed.

## 4. Equations & assumptions
- σ²(x) = E[(Y−f*(X))² | X=x]; reject iff σ²(x) > λ_ε, λ_ε = (1−ε)-quantile of σ²(X).
- Risk decomposition: R_λ(Γ_f) = E[(Y−f*)² 1{predict}] + E[(f*−f)² 1{predict}] + λP(reject).
- Assumptions: mild regularity (no margin/smoothness assumptions required for the rates, unlike the classification analogue).

## 5. Features / target
Features: 8 (aquatic) / 5 (airfoil) numeric. Target: continuous output. Reject decision driven by σ²(x).

## 6. Validation design
ε ∈ {0, 0.1, …, 0.9}; empirical rejection rate r̂ and error Err̂ on test, 100 reps; 10-fold CV for k.

## 7. Numerical results / baselines
Table 1 (exact, 1−ε | Err̂(SD) | 1−r̂(SD)): aquatic RF: ε=0 → 1.34(0.18)/1.00; ε=0.2 → 1.04(0.16)/0.80; ε=0.5 → 0.81(0.18)/0.50; ε=0.8 → 0.55(0.21)/0.20. Aquatic SVM: 1.38(0.18)/1.00; 1.08/0.81; 0.91/0.50; 1.01(0.32)/0.19 (non-monotone at ε=0.8 — poor σ̂² from SVM). Aquatic kNN: 2.29/1.00; 1.98/0.80; 1.51/0.50; 0.75(0.37)/0.19. Airfoil RF: 14.40(1.04)/1.00; 10.26/0.80; 7.22/0.50 (error HALVED at 50% rejection); 4.00(0.74)/0.20. Airfoil SVM: 11.81; 8.27; 5.15; 2.6. Airfoil kNN: 35.40; 31.13; 22.42; 17.27. Rejection rates track targets tightly (e.g., 0.50±0.06). Hybrid test (Fig. 4): SVM regression + RF/kNN variance fixes the aquatic anomaly — the variance estimator quality is the binding constraint.

## 8. Code / data availability
Code: https://github.com/ZaouiAmed/Neurips2020_RejectOption. Data: UCI (public).

## 9. Leakage
k selected by 10-fold CV on training data only — clean. The unlabeled split is genuinely unlabeled (used only for the cdf).

## Limitations
- The whole method stands or falls on σ̂² quality (the SVM-aquatic failure demonstrates this).
- No high-dimensional experiments (authors flag as future work).
- Fixed-rate ε is a tuning parameter with no principled selection rule given.

## 10. GSE overlap
The most directly actionable abstention paper for GSE so far: GSE's spread/total models are REGRESSION, not classification. The optimal rule says: no-bet the games with the largest conditional outcome variance. GSE already runs CQR (conformalized quantile regression) — interval width is a ready-made σ(x) proxy, so the variance estimator (the paper's binding constraint) may already exist in the engine. The semi-supervised calibration (threshold from the upcoming slate's unlabeled games) matches the 1006 pattern. Extends gap #4 into the regression lane.

## 11. GSE implementation spec
**Variance-gated no-bet for margin/total picks**: for each slate game, compute σ̂(x) = CQR interval width (or a dedicated residual-variance model) for the predicted margin. Set λ̂_ε as the (1−ε)-quantile over the slate; no-bet games with σ̂ > λ̂_ε. Grid-search ε ∈ {0.1,…,0.5} on 2024. If a dedicated variance model is needed, fit it on squared CQR residuals. Effort: 1–2 days (near-zero if CQR widths are already logged).

## 12. Reproducible test
2024 season, time-ordered: margin model + variance gate at ε ∈ {0.2, 0.3, 0.5}; metrics: RMSE of published set, hit rate vs spread, profit; verify achieved rejection rate ≈ ε and error decreases monotonically in ε (the paper's signature).

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if at ε=0.3 the published set's RMSE drops ≥15% vs publish-all (paired test p<0.05) AND achieved rejection rate is within ±3 pp of ε AND the error-vs-ε curve is monotone decreasing; otherwise REJECT. The single decisive number: **RMSE reduction ≥ 15% at achieved rejection rate ε±0.03**.

## 14. Improvement experiment
Hybrid variance estimator (Fig. 4 lesson): compare CQR-width vs a dedicated σ̂² model (gradient boosting on squared residuals) vs their average as the gating score — the paper shows the gate is only as good as the variance estimate, so the experiment directly targets the binding constraint. Also test gating on σ̂²(x) vs gating on |edge|/σ̂(x) (a Sharpe-like ratio) to unify with the 1006 improvement experiment.
