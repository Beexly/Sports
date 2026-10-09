# Rating atlas — 2026-10-09

Research only. No picks. No production scoring. `packages/prediction-engine` was not edited. `MODEL_VERSION`, trust gates, and Stripe were not touched. `main` was not committed. The `/xray` router is not in Beexly/Sports or Beexly/agent-bus, so no `/props` handler was added and `/xray` was not replaced.

Shin in this packet is the closed root in Appendix B v4.10. The minus-branch quadratic and the swapped-coefficient `S = sum(p^2)` iteration are not implemented. Both of those return `z = 0` on an ordinary overround book.

## Re-verified by self_check

Printed by `python3 engine_math.py`, `glicko2.py`, `props_optimizer.py`, `verify_claims.py`.

- Shin on 0.52381/0.52381: z = 0.0476, fair 0.50/0.50.
- Shin on 0.6667/0.3704: z = 0.0372, favorite 0.6482, above multiplicative 0.6429.
- Shin on 0.90/0.20: z = 0.1087, favorite 0.8500, multiplicative 0.8182.
- Shin on 0.48/0.48: z = 0, fair 0.50/0.50. Sub-1 books use multiplicative.
- `crps_gaussian(0, 1, 0) = 0.233695 = (sqrt(2)-1)/sqrt(pi)`. Not `1/sqrt(pi)`.
- Brier on the bin-mean forecast: BS = REL − RES + UNC within 1e-9. Reliability uses the bin mean forecast. The bin midpoint is a different REL.
- Listed −3.5, sd 13.45: mu = +3.5, P(cover) = 0.5000, P(home win) = 0.6027 (60.3%).
- Team totals, listed −3 on 48.5: home 25.75 / away 22.75. `(total + listed_spread) / 2` is the wrong split (home 22.75).
- `market_strengths` solves the ridge normal equations. A non-square system is rejected by Gaussian elimination. One game, margin 10, ridge 1: strength gap 20/3.
- Glicko-2 period-parallel, scale 173.7178, tau 0.5, Illinois: 1464.05 / 151.52 / 0.059996. Paper 1464.06 / 151.52 / 0.05999. The 0.01 rating gap is the scale constant. Sigma is 0.059996, not 0.06. First chord C = −5.626955, f ≈ 1.5e-8. Reversing the games does not change the parallel result.
- Same example, one game per period: 1463.79 / 151.87 / 0.06000. Sigma stays near 0.06. It does not go to 2.
- 12 wins vs a 1900 opponent with RD 30: parallel 2581.0, sequential 2143.1. Prompt said about 2577 / about 2143. The gap is RD shrinkage between games.
- Illinois on `x^3 - 2x - 5` over [2, 3] reaches 2.094551. False position with no halving leaves the right endpoint at 3.
- Teaser MC, both legs mu = 0, +6, n = 20000, seed = 7, sd = 14, half-point continuity correction: rho 0 → P(win) 0.468, fair +114. rho 0.35 → P(win) 0.506, fair −102. Gap +0.038. That gap is correlation, not a tax. Fair price is standard American on P(win): a 46.8% ticket is plus money. `american(1-p)` is −114 / +102 and is the other side, not the ticket.
- One-leg push reduces to the other leg. Both-push is removed from the denominator. Checked on a fixed ticket.
- Split conformal on N(0,1), `q = residuals[ceil((n+1)(1-alpha))-1]`, seed 2, n_cal = n_test = 1000, alpha = 0.1: coverage 0.913. At least 0.90. This is not 0.908.
- Bivariate Poisson P(1, 1; λ1=1, λ2=1, λ3=0.2) = 0.1330. Inputs are named in `verify_claims.py`.
- Skellam P(0; λ=1, μ=1) = 0.308508.
- Dixon-Coles tau identities. An absent team (Ipswich) gets attack/defense 0, not a KeyError. No EPL showdown was scored.
- 2-state Gaussian HMM log-likelihood rose on the toy series (−29.1 → −7.0).

## Re-derived here

Derived in this folder and printed. Not copied from a dossier table.

- Devig: multiplicative, additive, power, Shin closed root.
- Bradley-Terry MM (numerator = wins) and Elo on the 400-point logistic.
- Normal alt ladder, sd 13.45. Live final margin `N(lead + base_mu*tau, sd*sqrt(tau))`.
- Prop edge = model P(over) − book implied probability. Not a hold.
- Half margin uses `sqrt(tau)`. At tau = 0.5, sd scales by `1/sqrt(2)`.
- OT blend inserts the published rate 5.8%. A normal margin has no tie atom. The 5.8% is a published magnitude, not a fit.
- Weather, injury, and situational addends are labeled published magnitudes, not fits. Home field +2.5 and short week −1.0 move a margin by +1.5 in the check.
- SGP, seed 3, n = 20000: rho 0 gap −0.0002, rho 0.35 gap +0.0558. Gap = joint − independent.
- Correlated-Kelly sketch, two even-money 0.55 bets: rho 0 growth 0.0108 at fractions (0.100, 0.100); rho 0.5 growth 0.0072 at (0.075, 0.075). These are this grid, not any other pair.
- Greedy DFS, no FLEX, not an ILP. Toy lineup salary 45500, `over_cap` false. A bloated lineup flags `over_cap` true.
- Toy slate only, not a canonical vector: Colley, Massey ridge, SRS damped 0.7 mean-zero, PageRank loser→winner, Keener. Keener row-normalization stays uniform; the column-normalized vector does not. TrueSkill ties are skipped. Plackett-Luce numerator is wins, not appearances. `ensemble_margin` reports the spread of views and is not a pick.
- Platt, temperature, and beta calibration. Seed 21 overconfident demo: Brier 0.2325 → 0.2139 after temperature refit. That drop is this seed, not a backtest.
- Deflated Sharpe falls as the trial count rises (0.50 SR, 80 observations: trials 1 → 1.000, trials 50 → 0.972).
- PAV isotonic, log-odds stack, scalar Kalman with process noise q.

## Dossier-only

Not re-run. Not claimed.

- Shin lines that say the map does not recover z. Those describe the broken paste, not Appendix B v4.10.
- CRPS written as `1/sqrt(pi)`.
- Conformal coverage 0.908. Different draw. Seed 2 here printed 0.913. Seed 7 on 1000 test points printed 0.883, which is a finite test set under the marginal floor, not this packet's cited draw.
- Bivariate 0.1231. Inputs were not named. This packet's named inputs give 0.1330.
- Teaser −155 → −127. Different setup. `teaser_mc` here does not produce it.
- ESPN backtest: 93 games, 77 predictions, Brier 0.2868 → 0.2464, T = 7.51, pick 55.8%, PIT max dev 0.082. Scoreboard was not re-hit.
- DK hold 4.2–4.8%. Not re-probed.
- Kelly growth 0.0167 vs 0.0115, and a correlated leg at fraction 0.
- CLV +1.19u on −2.70% average CLV. No ledger was built. CLV was not defined on implied probability.
- Bot battery, 0 handler errors, daemon heartbeat.
- EPL Dixon-Coles showdown, 21.58 nats/match vs Pinnacle 0.97, and any +2062% gap. Not run. A score-matrix log-likelihood is not a 1X2 log-loss. Karlis-Ntzoufras EM collapsing lambda3 to 0.001 was not re-fit and is not called identified.
- The xi grid was not swept. xi is not in `engine_math.py`.
