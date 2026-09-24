# [1752] Drawdowns of diffusions (arXiv:2411.18374)

## 1. Citation and full-text-read statement
**Citation:** Paavo Salminen (Åbo Akademi), Pierre Vallois (Univ. de Lorraine / CNRS) (2024). *Drawdowns of diffusions*. arXiv:2411.18374. URL: https://arxiv.org/abs/2411.18374
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; Theorem 3.1 / Lehoczky formula and the Malyutin setup read in full, excursion-theory proofs skimmed).
**Verdict:** ADAPT — one sentence: Lehoczky's and Malyutin's formulas give GSE closed-form drawdown-time/maximum-drawdown distributions for a diffusion model of log bankroll (replacing Monte Carlo drawdown gates), but the excursion-theory machinery must be reduced to the Brownian-with-drift special case with a numerical implementation.

## 2. Research question
For a one-dimensional diffusion X, what are the exact joint distributions of (a) the first drawdown time θ_δ = inf{t : M_t − X_t > δ} and the running maximum M_{θ_δ} at that time (Lehoczky's formula, extended to diffusions with a finite lower bound l > −∞), and (b) the first hitting time H_η of a level η and the maximum drawdown D⁻_{H_η} before it (Malyutin's formula) — proved via excursion theory?

## 3. Method / model
Regular one-dimensional Itô–McKean diffusion on an interval I (classes 1/2: roughly, diffusions that can reach +∞ / have finite lower bound). Excursion-theoretic proofs: the point process of excursions from the running maximum is a Poisson point process indexed by local time; drawdown events correspond to excursions exceeding δ. Corrects misprints in Fitzsimmons' earlier excursion proof of Lehoczky. Also analyzes the pure-jump process (M_{θ_δ})_{δ≥0} (maximum before first drawdown as the drawdown size varies) and generalizations with varying drawdown size.

## 4. Mathematics / equations / assumptions
- Drawdown: D_t = M_t − X_t, M_t = max_{s≤t} X_s; θ_δ = inf{t ≥ 0 : M_t − X_t > δ} (1.1); max drawdown D⁻_t = max_{s≤t}(M_s − X_s) (1.2); H_η = inf{t : X_t = η} (1.3).
- Lehoczky (Theorem 3.1, extended): joint Laplace transform E_x[exp(−αθ_δ − βM_{θ_δ})] = [ψ_α(x)/ψ_α(x∨(δ+l))] ∫_{x∨(δ+l)}^∞ c_α(y;δ) exp(−βy − ∫_{x∨(δ+l)}^y b_α(z;δ)dS(z)) dS(y) (3.1), with b_α, c_α given by Wronskian-type ratios (3.2) of the fundamental solutions ψ_α (increasing), φ_α (decreasing) of d/dm d/dS u = αu (2.2), S = scale function, m = speed measure.
- Hitting Laplace transform: E_x[e^{−αH_y}] = ψ_α(x)/ψ_α(y) (x≤y), φ_α(x)/φ_α(y) (x≥y) (2.1).
- Malyutin: joint law of (H_η, D⁻_{H_η}) derived from the same excursion apparatus ("remarkable — but there is a clean explanation").
- Taylor's formula: the Brownian-motion-with-drift specialization (Example 3.9, Eq. 3.15).
- Assumptions: regular diffusion, continuous paths, strong Markov, not killed inside I.

## 5. Dataset / schema
None — probability theory. No empirical data.
## 6. Features and target
Not applicable (theory). Inputs: diffusion characteristics (S, m), drawdown size δ, target level η. Outputs: joint laws of drawdown times/maxima.

## 7. Validation design
None empirical.

## 8. Exact results and baselines with numbers
No numerical results. Exact formulas: (2.1), (2.2), (3.1), (3.2), Taylor's BM formula (3.15), Malyutin joint law.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Very heavy machinery for the payoff: the general formula needs S, m, ψ_α, φ_α — for a general bankroll process these are unknown; only the BM-with-drift case (Taylor) is directly usable; Laplace transforms must be numerically inverted for probabilities; diffusion model of log bankroll is an approximation of discrete weekly betting; no estimation error; no transaction costs.

## 11. GSE overlap
GSE currently prices drawdown risk by Monte Carlo/backtest (per the existing-research map, no analytic drawdown laws). This paper supplies the analytic alternative: model weekly log-bankroll as BM with drift (μ, σ from the sizer's backtest), then P(drawdown of size δ before the season ends) and P(hit profit target η before suffering drawdown δ) come from Taylor/Malyutin in closed form — instant drawdown gates for the 1749 α-governor and the 1751 frozen-max mode, no simulation needed. New capability: analytic drawdown-probability pricing.

## 12. Implementation specification
Build the "analytic drawdown pricer": (a) fit (μ, σ) of weekly log-bankroll returns from the 1744/1746 sizer backtest; (b) implement Taylor's BM-with-drift formula (Eq. 3.15) for P(θ_δ ≤ T) and the Malyutin joint law for P(D⁻_{H_η} ≤ δ) — numerical Laplace inversion via mpmath/scipy; (c) expose as a function drawdown_prob(δ, T, η) used by the bankroll manager to set α (1749) and the safe level (1751): choose α so the analytic P(drawdown > 1−α within the season) ≤ 5%; (d) validate the pricer against Monte Carlo of the same BM. Effort: ~1–2 days (formula implementation + inversion + validation).

## 13. Reproducible test
Dataset: 2023–2025 NFL backtest of the sizer; fit (μ, σ) per season on a rolling basis. For each week, compute the analytic P(drawdown ≥ 30% before season end) from the pricer; compare against the realized drawdown frequency across seasons and against a Monte Carlo benchmark of the same BM. Metrics: calibration of the pricer (predicted vs realized drawdown frequencies in decile bins), Brier score vs Monte Carlo.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the analytic pricer if its drawdown-probability predictions are calibrated (calibration slope in [0.8, 1.2], Brier within 5% of Monte Carlo) while running ≥ 100× faster than Monte Carlo; REJECT if Laplace inversion is unstable or the BM approximation miscalibrates on real weekly data. Improvement experiment: replace BM with a jump-diffusion (to capture weekly tail losses) — re-derive the ψ_α/φ_α for the jump case numerically and test whether the pricer calibrates better on the heavy-tailed weekly returns; this extends the paper's diffusion-only scope toward real betting data.

**Verdict:** ADAPT — Lehoczky/Malyutin/Taylor give GSE closed-form drawdown laws that replace Monte Carlo gates, but only the BM-with-drift special case is implementable and it needs calibration validation on discrete weekly data.
