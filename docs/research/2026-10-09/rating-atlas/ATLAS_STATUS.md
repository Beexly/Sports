# Atlas status correction — 2026-10-09

The pasted Rating & Prediction Atlas (60 engines) is the taxonomy. Its footer
is behind the code that was pasted with it.

## Was marked "next builds"

Shin devig, Kalman ratings, quantile props, copula teasers.

## Actually present in the pasted engine_math.py

Shin devig, Kalman ratings, prop quantile ladder, teaser MC with a shared
game factor (not a full Gaussian copula), live √τ repricing, weather/injury/
situational addends, CRPS, PIT histogram, deflated Sharpe, market-strength
inversion, log-odds stack, 2-state HMM.

## Actually present after this packet's fixes

Same list, plus the Part 4 names resolve, market inversion is least squares,
Brier reliability uses mean forecast, and the spread convention matches
props_optimizer.py.

## Shin inversion — fixed and checked 2026-10-09

The pasted quadratic used the minus branch. Iterating S = Σp² on the other
branch also never crossed Σp = 1. Working form is the closed root used in
the implied-probability literature:

p_i(z) = (sqrt(z² + 4(1−z) π_i² / Σπ) − z) / (2(1−z)), z bisected so Σp = 1.

Checked: −110/−110 → z = 0.0476, 0.50/0.50. About −200/+170 → z = 0.037,
favorite 0.648 vs multiplicative 0.643. A 0.90/0.20 book → z = 0.109,
favorite 0.850 vs multiplicative 0.818. Juice comes off the longshot.
Sub-1 books still fall back to multiplicative.

## Still not implemented (taxonomy only)

Glicko / Glicko-2, TrueSkill, Plackett-Luce, Colley, Massey, SRS, PageRank,
Keener, Karlis-Ntzoufras bivariate Poisson, negative binomial, Pythagorean,
Gaussian copula for margin×total, EPA/SP+/KenPom/DVOA/FPI/xG/RAPM as data
models, hierarchical shrinkage, empirical Bayes, Platt, temperature, beta
calibration, conformal intervals, CLV ledger, opinion pools, steam/RLM,
simultaneous Kelly with a real covariance, risk of ruin, logistic/boosting/
nets. Dixon-Coles time decay ξ is described in the atlas and not in the code.

## Class ladder (honest)

data → devig sketch → BT/Elo sketch → DC grid / normal-margin ladder →
calibration sketch (PAV) → market stack sketch → Kelly sketch.

Production scoring remains `packages/prediction-engine` (TypeScript). This
folder does not publish picks.
