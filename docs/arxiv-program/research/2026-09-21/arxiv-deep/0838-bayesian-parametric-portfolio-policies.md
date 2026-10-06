# 0838 Bayesian Parametric Portfolio Policies (arXiv:2602.21173v1)

**Citation:** Miguel C. Herculano (2026). *Bayesian Parametric Portfolio Policies*. arXiv:2602.21173v1. URL: https://arxiv.org/abs/2602.21173v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — placing priors on parametric portfolio-policy coefficients and Bayesian-averaging the policies (Laplace approximation at the MAP) lifted OOS Sharpe 1.05→1.32 and halved turnover vs the non-Bayesian PPP on 605 months of equity data; the transferable mechanism is shrinking aggressive policy coefficients toward zero when data are thin — directly applicable to GSE pick sizing when signals are extreme.

## 1. Research question

Parametric portfolio policies (portfolio weights linear in asset characteristics/signals) are powerful but overfit. Can a Bayesian treatment — priors on the policy coefficients θ and Bayesian model averaging over policies via a Laplace approximation around the MAP — improve out-of-sample Sharpe, drawdown, and turnover relative to the standard (frequentist) parametric portfolio policy?

## 2. Dataset / schema

- **Assets:** six Fama–French factors (the "assets" being allocated across).
- **Signals:** 242 signals — 212 Open Source Asset Pricing predictors plus 30 factor-specific signals.
- **Period:** July 1963–December 2023; initial 120-month training window; 605 monthly OOS observations from 1973M8–2023M12.
- **Access:** Fama–French data and OSAP signals are public; replicable.

## 3. Method / model

- **PPP (baseline):** portfolio weights w_t = θᵀx_t (linear in characteristics); θ estimated by maximizing in-sample expected utility (mean-variance, risk aversion γ).
- **BPPP (proposed):** prior p(θ) (shrinkage toward zero); posterior approximated by Laplace (Gaussian at the MAP); the implemented policy averages over the posterior — effectively a ridge-like shrinkage on aggressive coefficients, with the shrinkage strength disciplined by the marginal likelihood rather than cross-validation.
- Evaluated at γ = 2, 5, 10; transaction costs 10 bps and 50 bps.

## 4. Equations & assumptions

- Policy form: w_t = θᵀ x_t (weights linear in signals; paper's formulation).
- Bayesian layer: p(θ|data) ∝ p(data|θ)p(θ); Laplace approximation N(θ_MAP, H⁻¹) with H the Hessian at the MAP.
- Assumptions: Laplace approximation is adequate (posterior unimodal, roughly Gaussian); linear policy class; mean-variance utility with fixed γ; signals are stationary enough that 120-month windows generalize.

## 5. Features / target

- **Inputs:** 242 standardized signals per month; six factor returns.
- **Target:** the policy coefficient vector θ; evaluated on OOS portfolio Sharpe, certainty equivalent, max drawdown, turnover.

## 6. Validation design

- Expanding-window: 120-month initial training, 605 monthly OOS points 1973M8–2023M12; time-ordered.
- Baselines: standard PPP, market portfolio.
- Metrics: Sharpe, max drawdown, turnover, net Sharpe at 10/50 bps costs, certainty-equivalent gain at γ=2/5/10, crisis-period Sharpe (GFC, COVID), bootstrap significance of Sharpe difference.

## 7. Numerical results / baselines

Full-period OOS, quoted exactly:

| | Sharpe | Max DD | Turnover |
|---|---|---|---|
| PPP | 1.05 | −37.21% | 9.54 |
| BPPP | 1.32 | −24.50% | 6.03 |
| Market | 0.74 | — | — |

- Net Sharpe at 10 bps: PPP 0.96, BPPP 1.25. At 50 bps: PPP 0.60, BPPP 0.99.
- CE gain BPPP−PPP: 142 bp (γ=2), 184 bp (γ=5), 255 bp (γ=10).
- Crisis Sharpe — GFC: BPPP 0.56 vs PPP 0.33; COVID: BPPP 0.89 vs PPP 0.66.
- BPPP-vs-market Sharpe difference 0.579, bootstrap SE 0.103, t=5.61, p<0.001.

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- 242 signals on 60 years of equity data is the ideal case for shrinkage; sports pick signals are fewer and noisier — the magnitude of gain may not transfer.
- Linear policy class; no interaction/nonlinear effects.
- Laplace approximation quality is asserted, not diagnosed (no posterior-predictive checks reported).
- Turnover and cost analysis is equity-specific; bet portfolios face different frictions (limits, line moves).
- Single asset universe (FF factors); no cross-universe validation.

## 10. GSE overlap

Per the existing-research map: Bayesian/state-space is covered for team strength (Kalman/particle filters, dynamic Elo, Lopez/Baumer 1701.05976) but Bayesian shrinkage of *sizing/policy* coefficients is not. Kelly papers (0834–0836) give point-optimal sizing; this paper gives the uncertainty-aware shrinkage of the sizing rule itself. Extension, not duplicate.

## 11. GSE implementation spec

- Parameterize GSE stake sizes as w = θᵀx (x = edge, CLV, model agreement, matchup flags); put a Gaussian prior on θ; fit by MAP with Laplace-approximated posterior; size stakes from the posterior-mean policy.
- Refit monthly on the engine's pick history; the prior automatically dampens extreme-signal stakes early in a season when data are thin.
- Effort: 2–3 days.

## 12. Reproducible test

Dataset: GSE engine picks 2023–2024 (need ≥2 seasons of pick history with features). Metric: walk-forward Sharpe of bankroll growth and max drawdown vs 0835's unshrunk Kelly sizing. Pass if posterior-shrinkage sizing cuts max drawdown ≥10% at equal-or-better ROI.

## 13. Acceptance / rejection gate

ADOPT if walk-forward max drawdown improves ≥10% vs plain constrained-Kelly sizing with no ROI loss; REJECT if the prior washes out (θ_MAP ≈ MLE, i.e., the data already dominate — then the Bayesian layer is decoration).

## 14. Improvement experiment

Hierarchical prior: group θ by signal family (efficiency signals, market signals, matchup signals) with group-level variance hyperparameters learned from data. Hypothesis: the hierarchy learns which signal families deserve aggressive coefficients and which get shrunk — beating the single global shrinkage, especially early-season.
