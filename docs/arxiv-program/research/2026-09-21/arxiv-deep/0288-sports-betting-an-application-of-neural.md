# [0288] Sports Betting: an application of neural networks and modern portfolio theory to the English Premier League (arXiv:2307.13807v1)

**Citation:** Vélez Jiménez, R.A., Lecuanda Ontiveros, J.M., & Possani, E. (ITAM / CETYS, Mexico) (2023). *Sports Betting: an application of neural networks and modern portfolio theory to the English Premier League*. arXiv:2307.13807v1. URL: https://arxiv.org/abs/2307.13807v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 530 lines).
**Verdict:** ADAPT — the usable assets are the matrix-form multivariate simultaneous Kelly formulation (Eq. 13, concave → SQP-solvable) and the fractional-Kelly calibration method (17% via Dirichlet simulations); the EPL neural net itself (54% accuracy) is not worth porting, and the 135.8% profit is on 20 matchweeks with non-significant p-values.

## 1. Research question
Given a rational gambler's risk preferences (VNM utility), which bets maximize expected utility — and how do Sharpe-ratio (quadratic utility) and Kelly (log utility) portfolio criteria compare in real EPL betting over the second half of the 2020/21 season?

## 2. Dataset / schema
- 2,660 EPL games, 2014/15–2020/21; train 2014/15–2019/20 (~2,200 obs), validation first half 20/21, test second half 20/21 (20 matchweeks × 10 matches; 30 bets, 59,049 outcome combos per matchweek).
- Features: EA Sports/SoFIFA team ratings (ova/att/mid/def, weekly, 1-matchday delay), Understat xG-family stats (npxGD moving average/variance, exponential decay ξ=0.1 per Dixon–Coles), table position, points, big-six/promoted dummies, transfer budget, and Pinnacle final odds as market features (proba_h/d/a).
- Bets placed at max odds across 6 bookmakers (Bet365, Bwin, Interwetten, Pinnacle, Victor Chandler, William Hill); track take from max-odds book.

## 3. Method / model
- Predictor: funnel-architecture deep neural net (3 hidden layers; variants: elastic net, lasso, ridge, dropout, batch-norm), NAdAM optimizer, hyperparameter search over neurons (70–200% of n vars), learning rate {1e-2,1e-3,1e-4}, penalties; split-temporal CV.
- Staking: (a) Sharpe-ratio portfolio via convex reformulation (Eq. 7), (b) multivariate simultaneous Kelly via SQP on concave objective (Eq. 13); complete (all 30 bets) vs restricted (one max-EV bet per match) strategies; full vs 17%-fractional (fraction calibrated by 200 Dirichlet(1) simulations on validation).
- Gains reinvested weekly: W_n = Π R_i(ℓ̄); negligible wagers < 0.0001 dropped.

## 4. Equations & assumptions
Return: R(ℓ̄) = 1 + ℓ̄′ϱ̄; ϱ̄ = D_o·m − 1, m ~ multinomial(1;p̄).
Sharpe: S(ℓ̄) = (ℓ̄′μ̄ − R_f)/√(ℓ̄′Σℓ̄); convexified via ȳ = κℓ̄ (Eq. 7).
Kelly: ℓ* = (op−1)/(o−1) bivariate; G(ℓ*) = D_KL(p‖p̃) — max log-growth equals KL divergence between true and implied probabilities (Eq. 10).
Multivariate Kelly (matrix form, claimed original): max p̄′log(1 + W′ℓ̄ − Σℓ_i·1) s.t. Σℓ_i ≤ 1, ℓ̄ ≥ 0 (Eq. 11).
Multivariate simultaneous Kelly (claimed novel): same objective over concatenated vector ℓ̄ ∈ ℝ^M across r independent rewards, N = Πm_k outcomes, W ∈ ℝ^{M×N} (Eq. 13) — concave, SQP-solvable.
Stated assumptions: no short selling/borrowing; infinitely divisible money; odds and probabilities fixed over time; independence of match results across matches; true probabilities known (authors later doubt this); risk-free rate zero.

## 5. Features / target
- Features: ~30 match-level covariates per game (team ratings, xG aggregates, market probs).
- Target: 1x2 match outcome probabilities → then portfolio weights ℓ̄.

## 6. Validation design
- Split-temporal CV for the neural net; validation set used for fraction calibration (Dirichlet sims) and architecture choice (dropout best: test loss 0.9819, accuracy 55%).
- Portfolio test: 20 matchweeks out-of-sample; metrics: final wealth, hit rate, Sharpe/log-growth/volatility averages, and p-values for "mean bet outcome > 0" and "wealth > 0" hypotheses.
- Luck-vs-skill check: 500 Dirichlet(1) random fractional strategies on the same test period — model beats 78/100 random sims.

## 7. Numerical results / baselines
- Neural net: 54% accuracy vs crowd (Pinnacle-implied) 51.5%, nulls 38/20/42%; cross-entropy 1.0318 vs crowd 0.9966 (model WORSE than market on information loss — accuracy edge without calibration edge).
- Best portfolio: restricted + 17% fractional Sharpe → 135% final wealth (i.e., +35.8% profit); restricted fractional Kelly 111%; complete fractional Kelly 102%; complete fractional Sharpe 97%. Full-stake strategies: 24% (Kelly restricted), 16%, 3%, 0% — and Sharpe complete went to ruin two weeks before the end (final wealth 0%, log-growth −∞).
- Betting/wealth p-values: 0.16–0.50 — NONE significant; the 135.8% is statistically indistinguishable from luck on this sample.
- Arbitrage found 3 times (e.g., Everton–Aston Villa 2021-06-05, tt = −0.0085); Sharpe converges to the arbitrage vector ℓ_A with infinite Sharpe (zero variance).
- Kelly max bet averaged 29.7% of portfolio stake (vs Sharpe 25.9%); SQP convergence 20.9 s/fixture (Kelly), 5.3 s (Sharpe); matchweek 23 Kelly optimization failed (gradient overflow — used last-iteration stakes as approximation).

## 8. Code / data availability
None stated — no repo; data from public sources (SoFIFA, Understat, football-data.co.uk).

## 9. Leakage & limitations
- Pinnacle final odds used as model INPUT features (proba_h/d/a) — the model partially learns the market it then bets against; the accuracy-vs-crowd comparison is contaminated.
- No p-value below 0.16: the headline 135.8% profit on 20 matchweeks cannot be distinguished from chance; the Dirichlet check (beats 78%) is modest.
- SQP non-convergence on matchweek 23 (gradient overflow) patched with last-iteration stakes — ad hoc.
- "Odds fixed over time" assumption is false in real betting; no line-movement handling.
- Soccer 1x2 with 30 bets/matchweek; the multivariate Kelly machinery scales as N = Πm_k — for NFL slates this explodes (fine for moneyline-only, intractable for full prop portfolios without factorization).
- Sharpe full-stake ruin event is a feature of the quadratic-utility/no-ruin-constraint setup, not a general result.

## 10. GSE overlap
Per existing-research-map: Kelly/fractional-Kelly/portfolio bet sizing is a PRIORITY GAP — no in-repo implementation of multivariate or fractional Kelly exists; the closest coverage is the systematic-review ledger's pointer to Matej et al. 2021 (adaptive fractional Kelly) and Abinzano et al. 2021 (Black–Litterman betting portfolios) from paper 0282. This paper FILLS the gap with the only corpus entry giving an explicit concave matrix formulation of multivariate simultaneous Kelly (Eq. 13) plus a concrete fraction-calibration protocol (Dirichlet simulations → 17%). Complements, not duplicates, the review pointers. Does not duplicate any prediction method (the EPL net is soccer-specific and weak).

## 11. GSE implementation spec
- Implement the multivariate simultaneous Kelly (Eq. 13) as GSE's portfolio staking layer: inputs = engine outcome probabilities p̄ and best-available odds ō across books; objective max p̄′log(1 + W′ℓ̄ − Σℓ_i·1), constraints Σℓ_i ≤ 1, ℓ̄ ≥ 0; solve with SQP (scipy) — concave, converges in seconds per slate per the paper.
- Calibrate the Kelly fraction the paper's way: Dirichlet(1) simulations over engine backtest picks on validation seasons, choosing the fraction maximizing median final wealth (paper found 17%; expect GSE's to differ).
- Restricted-vs-complete analog: compare staking all +EV edges vs top-edge-per-game only.
- Effort: 2–3 days for the optimizer + calibration harness.

## 12. Reproducible test
- Dataset: GSE engine backtest picks with engine probabilities and recorded best-odds, 2023–2024 NFL seasons (validation), 2025 (test).
- Strategies: flat stakes vs full multivariate Kelly vs fractional Kelly at calibrated f vs Sharpe portfolio; reinvest weekly.
- Metrics: final wealth, max drawdown, ruin events, log-growth — with the paper's p-value discipline (test H₀: mean log-growth ≤ 0).

## 13. Acceptance / rejection gate
Adopt fractional multivariate Kelly as GSE's staking layer if, on 2025 holdout, it beats flat staking on final wealth with max drawdown ≤ flat's AND the wealth p-value < 0.10 (a stricter bar than the paper met). If it fails, keep flat/fractional-single-bet Kelly and retain the paper as the reference implementation for the multivariate formulation.

## 14. Improvement experiment
Adaptive fraction (connects to the Matej et al. 2021 pointer from paper 0282): make the Kelly fraction a function of recent calibration error (shrink f when the engine's probability estimates are miscalibrated, expand when calibrated) — a dynamic fractional Kelly that the paper's fixed 17% does not attempt. Test whether adaptive-f beats fixed-f on 2025 holdout wealth and drawdown.
