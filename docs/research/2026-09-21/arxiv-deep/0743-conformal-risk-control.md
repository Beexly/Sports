# [0743] Conformal Risk Control (arXiv:2208.02814)

**Citation:** Anastasios N. Angelopoulos, Stephen Bates, Adam Fisch, Lihua Lei, Tal Schuster (2022). *Conformal Risk Control*. arXiv:2208.02814. URL: https://arxiv.org/abs/2208.02814
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the headline result (choose any threshold λ̂ on a calibration set to guarantee E[L_{n+1}(λ̂)] ≤ α for ANY bounded monotone loss) is the cleanest known formalism for GSE's selective-prediction/abstention problem: controlling the expected fraction of posted picks that are wrong, or expected slate drawdown, with a finite-sample guarantee. Strong fit.

## 1. Research question
Conformal prediction controls coverage P(Y ∈ C(X)) ≥ 1−α, but practitioners care about arbitrary risks (false positive rate, F1-derived losses, tumor-miss rate). Can we choose a prediction-set threshold λ̂ from calibration data such that the EXPECTED value of any bounded monotone loss is controlled, E[L_{n+1}(λ̂)] ≤ α, with a tight finite-sample guarantee — generalizing conformal prediction beyond miscoverage?

## 2. Dataset / schema
(1) **Gut-polyp segmentation**: n=1,000 calibration images, 781 validation images; loss = 1 − recall (fraction of tumor pixels missed); prediction sets = pixel masks at confidence threshold λ. (2) **MS COCO multi-label classification**: n=4,000 calibration, 1,000 validation; loss = false negative rate over labels; prediction sets = label sets with score ≥ λ. Both are standard public vision benchmarks.

## 3. Method / model
**Conformal Risk Control (CRC)**: given nested prediction sets C_λ (λ larger ⇒ larger sets), a loss L_i(λ) nonincreasing in λ bounded by B, and risk level α: compute empirical risks R̂_n(λ) = (1/n)Σ_i L_i(λ) and choose λ̂ = inf{λ : R̂_n(λ) ≤ α − (B−α)/n}. Theorem 1: E[L_{n+1}(λ̂)] ≤ α (finite-sample, distribution-free). Tightness: cannot improve the (B−α)/n correction in general (lower-bound theorem). Extensions in the paper: risk control under covariate shift (weighted version), quantile risk control (high-probability rather than expectation), multiple risk control, adversarial risk, U-statistic risks.

## 4. Equations & assumptions
λ̂ = inf{λ : (1/n)Σ_{i=1}^n L_i(λ) ≤ α − (B−α)/n}. Guarantee: E[L_{n+1}(λ̂)] ≤ α. Assumptions: (i) exchangeability of calibration and test points; (ii) L_i(λ) monotone nonincreasing in λ for each i; (iii) L_i(λ) ≤ B < ∞; (iv) right-continuity of the loss in λ (mild). Note the guarantee is on the EXPECTATION over the calibration/test draw, not conditional on the observed calibration set.

## 5. Features / target
Vision tasks (pixels, labels). The transferable abstraction: any score-indexed nested family of prediction sets and any monotone bounded loss.

## 6. Validation design
1,000 independent trials on the polyp data (resampling calibration/test splits); same protocol on COCO with 1,000 trials. Metrics: mean realized risk vs. α, standard deviation of risk, and realized set sizes.

## 7. Numerical results / baselines
Polyp segmentation (α=0.1): mean realized risk **0.0987**, SD **0.0114** over 1,000 trials — tightly controlled just under 0.1. MS COCO (α=0.1): mean risk **0.0996**, SD **0.0052** over 1,000 trials. Histograms show the risk concentrates near α from below, confirming the guarantee is nearly tight (not conservative). No competing method comparison — the claim is the guarantee itself, validated empirically.

## 8. Code / data availability
Standard public datasets (COCO, polyp segmentation); no dedicated repo named in the paper (the method is ~10 lines on top of any scoring model).

## 9. Leakage & limitations
(a) Guarantee is marginal over calibration draws — a single unlucky calibration set can yield λ̂ with realized risk > α; the quantile-risk extension addresses this but is more conservative. (b) Exchangeability required — NFL regime drift violates it (the covariate-shift extension in the paper is the remedy, at the cost of needing the likelihood ratio). (c) Monotonicity in λ must hold per-instance — fine for thresholded pick sets, but exotic losses (e.g., non-monotone profit functions) are excluded. (d) The (B−α)/n correction bites at small n — with a 50-game calibration window the effective target is α − B/n, materially stricter. (e) No comparison to simple empirical-threshold baselines.

## 10. GSE overlap
Existing-research-map.md covers conformal prediction generally (CQR Drive doc, conformal audit) but **nothing on risk control beyond coverage** — no formalism for controlling expected loss of a pick slate, no abstention/selective-prediction theory. The map's "pick selection/abstention" keyword lane has zero papers read per the gap list. This fills a documented gap.

## 11. GSE implementation spec
(1) **Posted-pick risk control**: let C_λ = {games with |edge| ≥ λ} (nested in λ); loss L(λ) = fraction of posted picks that lose (bounded by 1, monotone decreasing in λ). On a rolling calibration window of past posted picks, choose λ̂ per the CRC rule at α = 0.45 (control expected loss-rate below 45%, i.e., win-rate above 55%); post only C_{λ̂}. (2) **Slate drawdown control**: loss = max drawdown of the week's posted slate (bounded, monotone in stake threshold). (3) Use the covariate-shift extension with a simple regime indicator (QB-change weeks) as the weight. Effort: ~3 days including backtest.

## 12. Reproducible test
Dataset: GSE posted picks 2023–2025 with model edges and outcomes. Rolling calibration (trailing 100 picks), α ∈ {0.4, 0.45}. Metric: realized loss-rate on the next 50 picks after each recalibration, averaged over recalibration dates; also realized pick volume. Success = mean realized loss-rate ≤ α with margin and volume ≥ 60% of the unfiltered baseline.

## 13. Acceptance / rejection gate
ADOPT if rolling backtest shows mean realized loss-rate ≤ α − 0.01 (tight, like the paper's 0.0987 vs 0.1) at acceptable volume; REJECT the drawdown variant if the (B−α)/n correction makes λ̂ so conservative that volume collapses below 30% of baseline (small-n conservatism, limitation (d)).

## 14. Improvement experiment
**Conditional (Mondrian) risk control**: run CRC separately within strata (favorites/dogs, high/low totals) with stratum-specific α_b, then test whether conditional control improves worst-stratum realized risk vs. a single global λ̂ — the paper's guarantee is marginal, and GSE's failure modes are stratum-specific (e.g., primetime dogs).
