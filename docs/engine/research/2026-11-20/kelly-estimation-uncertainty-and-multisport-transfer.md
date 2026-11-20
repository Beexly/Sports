# Baker-McHale Kelly Estimation Uncertainty & Hierarchical Multi-Sport Transfer (`2026-11-20`)

## 1. Optimal Betting Under Parameter Uncertainty (Baker & McHale 2013)
- Reference: Baker, R. D., & McHale, I. G. (2013), *Optimal Betting Under Parameter Uncertainty: Improving the Kelly Criterion*, Decision Analysis 10(3), 189-199.
- Using plug-in estimated win probability `q` inside full Kelly causes systematic overbetting because estimation error inflates tail risk quadratically in log-wealth.
- Implemented `baker_mchale_shrunk_kelly(...)` inside `evaluation/frozen/score_walkforward_calibration_v1.py`:
  - `mu = q * d - 1` (expected return per dollar), `f_kelly = max(0, mu / (d - 1))`
  - `k_bm = mu^2 / (mu^2 + (d * sigma_p)^2)` where `sigma_p` is supplied directly or estimated via `sqrt(q * (1 - q) / n_eff)`
  - Strictly zeroes negative-EV bets and shrinks stakes monotonically as parameter estimation uncertainty rises.

## 2. Bayesian Hierarchical Multi-Sport Calibration & Drift Transfer Notes
- Hierarchical partial pooling (Baio & Blangiardo 2010; non-centered hyperpriors with adaptive shrinkage control) prevents small-sample teams/players in NFL weeks 1-4 or low-volume secondary markets from swinging wildly toward naive unadjusted rates while guarding against over-shrinkage of true outliers.
- Non-stationary distribution drift across market slates (`real_moneyline`, `real_spread`, `real_total`) requires coupling hierarchical shrinkage with sequential Gibbs-Candès ACI (`ladder_4_aci_online`) rather than static post-hoc calibrators alone.
