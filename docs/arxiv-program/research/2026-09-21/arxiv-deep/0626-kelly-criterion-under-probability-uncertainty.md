# 0626 Kelly Criterion Under Probability Uncertainty (arXiv:1701.02814v2)

**Citation:** Smoczynski, P., & Tomkins, D. *Optimal betting under parameter uncertainty: improving the Kelly criterion* (arXiv:1701.02814v2; published Decision Analysis 2018). URL: https://arxiv.org/abs/1701.02814
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the expected-log-wealth Kelly (integrating over parameter uncertainty) with a mild chance constraint beats both standard and fractional Kelly in the paper's simulations; GSE should replace its plug-in Kelly sizing with uncertainty-aware sizing before touching any other staking change.

## 1. Research question
Standard Kelly maximizes expected log wealth using *point estimates* of outcome probabilities — but those estimates are uncertain, and estimation error is known to destroy Kelly's growth optimality. Can Kelly be repaired by (a) maximizing expected log wealth *over the posterior of the probability parameters*, and/or (b) adding a chance constraint that the true expected log return is positive with high probability?

## 2. Dataset / schema
- **Simulated data only** — no real betting data. Four experiments × 2,500 trials each, with true data-generating parameters known, so estimation error can be measured exactly.
- Experiment details (paper's Table 1): **E1: n=2 outcomes, odds 1.1; E2: n=2, odds 1.2; E3: n=10, odds 2; E4: n=30, odds 4.**
- Estimation setup: multinomial logistic regression coefficients β with simulated standard errors σ_i drawn so each coefficient's p-value ≤ 0.05; Σ taken diagonal.
- Computation: Matlab R2017a, fmincon, Windows 10 i5-7200U. 1,000,000 MC samples for n=2; 2,000,000 for n=10/30.

## 3. Method / model
- **(P)** Standard Kelly: max Σ_h π_h log(x_h O_h + w − Σ_i x_i) s.t. Σx ≤ w, x ≥ 0, using estimated π.
- **(S)** Plug-in ("standard" with estimated probabilities — the paper's baseline for what practitioners actually do).
- **(F)** Fractional Kelly (fixed fraction of the (P) wager).
- **(Elb)/(Emc)** Expected log wealth: maximize E_β[log wealth] with the expectation over β ~ N(β̂, Σ) computed by lower-bound approximation (Elb) or Monte Carlo (Emc).
- **(CCx)** Chance-constrained Kelly: max t s.t. P(t ≤ Σ_h π_h log(...)) ≥ 1−α; exact solution (CC2) derived in the appendix for the two-outcome case; approximation (CCN) for n > 2. Tested at α = 0.4, 0.25, 0.1.
- **(ECCx)** Combined: expected log wealth + chance constraint.
- Evaluation metric: **expected exponential return** E[log(w_i / w_{i−1})] under the *true* probabilities — not realized final wealth (reduces simulation noise).

## 4. Equations & assumptions
- Kelly program (P): **max Σ_{h=1}^n π_h log(x_h O_h + w − Σ_i x_i)** s.t. Σ_h x_h ≤ w, x_h ≥ 0. (Paper equation; reproduced faithfully.)
- Probability model: multinomial logit **π_h = exp(β'v_h) / Σ_i exp(β'v_i)**; uncertainty **β ~ N(β̂, Σ)** with sandwich covariance. (Paper's specification.)
- Chance constraint (CC): **max t s.t. P(t ≤ Σ_h π_h log(x_h O_h + w − Σ_i x_i)) ≥ 1−α**. Two-outcome exact reformulation (CC2) uses the normal quantiles of the logit to build worst-case probabilities π^H/π^L (appendix derivation).
- Assumptions: logit model correctly specified; β uncertainty is Gaussian with known covariance; odds O_h fixed and known; the MC sample (1–2M draws) adequately represents the posterior.

## 5. Features / target
- Inputs: outcome feature vectors v_h, estimated coefficients β̂, covariance Σ, decimal odds O_h, current wealth w.
- Target: the stake vector x* maximizing the chosen objective. No outcome prediction per se — this is a pure *sizing* paper.

## 6. Validation design
- Four simulation experiments (E1–E4) × 2,500 trials; true probabilities known; models compared on expected exponential return under truth.
- Baselines: true-probability Kelly **(T)** (the unattainable ceiling), plug-in (S), fractional (F).
- The (T)-vs-(S) gap quantifies the cost of estimation error itself.

## 7. Numerical results / baselines
Paper's Table 2, total expected return summed over experiments (quote exactly):
- **(T) 27.463** | **(S) 18.134** | **(F) 13.268** | **(Elb) 18.206** | **(Emc) 18.471** | **(CCx) α=0.40: 18.253** | **(CCx) α=0.25: 16.454** | **(CCx) α=0.10: 12.158** | **(ECCx) α=0.40: 18.484** | **(ECCx) α=0.25: 17.61 (truncated in extraction; see full text)**.
- Headline: **(Elb), (Emc), (CCx) and (ECCx) at α=0.4 all beat plug-in Kelly (P)/(S)**; **(Emc) and (ECCx) at α=0.4 beat (S) in every single experiment**; **(ECCx) α=0.4 is best overall (18.484)**.
- Estimation error cost: (T) 27.463 vs (S) 18.134 — a third of achievable growth is lost to estimation error.
- Fractional Kelly (13.268) is the worst of the serious methods here — the paper's data do not flatter the folk remedy.
- Chance-constraint caution: small α (0.10) is "overly aggressive... dampening long term growth" (12.158) — the constraint level must be calibrated per application.

## 8. Code / data availability
None stated. Simulated data; Matlab implementation described but not linked.

## 9. Leakage & limitations
- Pure simulation: the logit model is *correctly specified* by construction, so the uncertainty being integrated over is exactly the assumed Gaussian — real model misspecification (wrong features, regime change) is a larger and unmodeled error source.
- Diagonal Σ: coefficient correlations ignored; the sandwich covariance is asserted rather than estimated from a real fitting procedure.
- Odds fixed and known: real books move lines, limit stakes, and charge vig — none of which enters the objective.
- The α calibration ("will likely need to be calibrated in each application") is punted; α=0.4 winning is a simulation artifact until replicated on real probabilities.
- fmincon on a 2017 laptop: the chance-constrained programs are non-trivial optimizations; at GSE scale (many markets, daily), the compute budget needs re-examination.
- The evaluation metric (expected return under *true* probabilities) is only computable in simulation — on real data you're back to noisy realized wealth.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. Direct overlap: prediction-market-ecosystem-triage-2026-08-09.md documents **oracle3 (Wang Transform + Kelly)** — GSE already has a Kelly sizing lane. This paper is an **extension** of that lane: oracle3 covers the transform + point-estimate Kelly; this adds the missing piece — *parameter uncertainty* in the probability inputs. It also connects to the calibration lane (2210.16315 grouping loss): better-calibrated probabilities shrink Σ, which is exactly what makes uncertainty-aware Kelly converge toward full Kelly.

## 11. GSE implementation spec
- Data: GSE's existing probability outputs + their historical calibration errors (the grouping-loss/temperature-scaling lane gives the empirical error distribution — use it to estimate Σ instead of a sandwich guess).
- Build: (1) for each bet, draw M samples of the true probability from the calibrated uncertainty distribution around the model price; (2) maximize mean log-wealth over the samples (the Emc approach — simplest and best-in-class here); (3) add the chance constraint P(true expected log return > 0) ≥ 1−α with α = 0.4 as the starting value, tuned on backtest.
- Replace the current plug-in Kelly fraction with this sizing in the paper-trading harness first.
- Effort: ~1 week (MC integration over existing price outputs; the optimizer is the only new code).

## 12. Reproducible test
Backtest on the 3,411 engine picks: for each pick, the engine's model price and the market price at release. Baselines: (a) current flat/fractional staking; (b) plug-in Kelly on model prices. Treatment: Emc sizing + chance constraint (α=0.4). Metric: log-wealth growth and max drawdown over the chronological pick sequence. Success: Emc log-wealth ≥ plug-in Kelly log-wealth with max drawdown ≤ plug-in's.

## 13. Acceptance / rejection gate
ADOPT uncertainty-aware Kelly iff, on the chronological 3,411-pick backtest, Emc sizing achieves terminal log-wealth ≥ plug-in Kelly's AND max drawdown no worse than plug-in's. If Emc underperforms plug-in (possible if the uncertainty distribution is miscalibrated), reject and fix the uncertainty estimates first — the paper's gains assume honest Σ. Gate set before running the test.

## 14. Improvement experiment
Estimate the probability-uncertainty distribution **empirically from the engine's own calibration residuals** (grouped by sport/market/edge bucket) instead of a Gaussian sandwich, and re-run Emc. Why it might win: the paper's Gaussian β assumption is its weakest link; GSE has thousands of realized (price, outcome) pairs, so the true error distribution — fat tails, edge-dependent bias — can be sampled directly, making the expected-log-wealth integral honest in exactly the way the simulation cannot.
