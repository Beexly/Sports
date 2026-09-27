# [0868] The Impact of COVID-19 on Sports Betting Markets (arXiv:2109.07581)

**Citation:** Qureshi, K. & Zaman, T. (2021). *The Impact of COVID-19 on Sports Betting Markets*. arXiv:2109.07581 [stat.AP]. MIT / Yale. URL: https://arxiv.org/abs/2109.07581
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2109.07581.txt (37,104 bytes, complete incl. references). Cross-checked against https://arxiv.org/abs/2109.07581.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the single best paper in this batch on *regime-driven market inefficiency*: an exogenous shock (no fans) made NBA moneylines systematically mispriced, concentrated in one odds band. GSE needs a regime-flag + continuous efficiency-diagnostic built on this paper's α metric.

## Citation / full-text source
K. Qureshi (MIT), T. Zaman (Yale). Data repo: https://github.com/kai-trading-bot/sports_anomalies. Odds archived from SportsBookReviewsOnline.

## Research question
Did COVID-19 make sports moneyline betting markets inefficient — in which sports, by what mechanism, and how much could a bettor have earned?

## Dataset / schema
- **>130,000 games, 2007–2021**: NFL, NBA, NHL, MLB (from 2010), NCAAF, NCAAB. Analysis restricted to 2010–2021 seasons; **109,249 games** after filters (favorite ≤ −100; underdog ≥ +100 or −200…−100). Per game: opening moneyline odds both sides, date, outcome.
- COVID games defined per league (NBA: bubble from 2020-07-30; NHL: 2020-08-01; MLB: 2020-07-23; NFL/NCAAF: fall 2020; NCAAB: none).

## Method
1. **Implied probability** from moneyline odds: p_u = 100/(100+|o_u|) for o_u ≥ 100 (eq. 1); p_u = |o_u|/(100+|o_u|) for o_u ≤ −100 (eq. 2).
2. **Efficiency diagnostic — average underdog profit margin** (eq. 3): α = −1 + (1/n)Σ_u W_u/p_u, with E[α] = −1 + (1/n)Σ_u q_u/p_u. α = 0 if odds perfectly calibrated; α < 0 in efficient markets; α > 0 when underdogs win more than odds imply.
3. **Testing:** KS + Mann-Whitney U per sport with Holm-Bonferroni correction; Wilcoxon signed-rank for the sign of NBA COVID α; season-by-season and implied-probability-bin breakdowns.
4. **Betting simulation:** daily bankroll M_t, reinvest fraction λ ∈ [0,1] (grid 0.1), bet allocation across day's games via weight functions f(p_u): Uniform, p_u, 1/p_u, √(p_u(1−p_u)) (Bernoulli), 1/√(p_u(1−p_u)), √((1−p_u)/p_u) (Moneyline), √(p_u/(1−p_u)) (Inverse Moneyline). M_0 = $100. Risk-averse = increasing in p_u; risk-seeking = decreasing.
5. **Robust Sharpe:** γ = median(R)/MAD(R) (eq. 4) since moneyline returns are bimodal, not normal.

## Equations / math / assumptions
- eq. 1–2 (implied prob), eq. 3 (α), eq. 4 (robust Sharpe). Assumes underdog defined by strictly larger odds (ties counted as underdogs both sides).

## Features / target
Implied underdog probability (only pre-game information); outcome = actual win/loss.

## Validation
- **NBA underdog win prob: ~0.30 (normal) → ~0.38–0.40 (COVID)**; only NBA shows positive α in COVID. KS/MW p ≤ 0.001 at 1% under Holm-Bonferroni; Wilcoxon signed-rank p ≤ 10^−5. Holds only for the 2019–20 (α = +0.17) and 2020–21 COVID (α = +0.10) seasons; **post-COVID (fans back after All-Star Game): α = −0.9**, negative again (all at 1%).
- **Concentration:** implied-prob bin (0.2, 0.3] — underdog odds **+233 to +400**, 153 games (21.7% of NBA COVID games) — the only bin significant at 1% (MW p = 0.00021/0.0003). A small slice of games carries the inefficiency.
- All other sports' markets stayed efficient (NCAAB MW-significant but negative mean α — not exploitable).
- **Mechanism argument (Table 7):** NBA has the lowest total-points coefficient of variation (0.11) of any sport — inherently least random; removing fans plausibly erased home-field advantage, pushing effective randomness toward NHL/MLB levels, and oddsmakers did not reprice. Bubble-vs-arenas-without-fans comparison supports the fans (not travel) channel.
- **Strategies:** flat $1 on every underdog → **16.7% profit margin**. λ = 1.0 + inverse-probability weights → **$100 → $2,666 (~26-fold)**. Probability-weighting (f = p_u) → **full ruin within a month**. Best risk-adjusted: Bernoulli weights, λ = 0.1 → **$291.73** with the highest robust Sharpe.

## Exact results with baselines
- NBA COVID α = +0.17 / +0.10 vs ≈0 (calibrated) and negative (efficient); post-COVID −0.9.
- 16.7% flat-stake ROI; 26-fold with full reinvestment + risk-seeking weights; $291.73 with risk-averse Bernoulli λ=0.1 (Sharpe-optimal).
- Baseline: every non-NBA sport ≈ efficient, α ≤ 0.

## Code / data availability
Full dataset + odds in public repo (github.com/kai-trading-bot/sports_anomalies); no model code, but all formulas and strategy parameters are specified.

## Leakage
Retrospective/backtested; strategies use only pre-game odds. The 26-fold is in-sample on a known regime — not a forward claim.

## Limitations
- Causal mechanism is hypothesized, not identified ("remains an open question"); the fans channel rests on timing evidence, not a controlled test.
- α = −0.9 post-COVID is reported without the same decomposition; a single-regime, single-league finding — generalization to NFL/NCAA requires its own shocks.
- Backtest assumes available liquidity at archived odds and no limits; no transaction-cost modeling.

## GSE overlap vs existing-research-map
- Directly complements ledgers 0862 (racetrack efficiency phases), 0863 (herding), 0866 (market consensus): this is the *shock-driven* efficiency break, the missing piece in the market-microstructure lane.
- GSE currently has no regime-flag: the engine's home-field priors and market-implied features assume stationary conditions. This paper is the case study for why that assumption breaks and how to detect the break (α per league per window).

## Implementation spec (GSE adaptation)
1. **Continuous efficiency monitor:** compute α = −1 + mean(W/p) per league × market × rolling 4-week window on GSE's own pick/market history. Alert when α > 0 with Wilcoxon p < 0.01 — a live "market mispricing" detector.
2. **Regime flags in the engine:** hard-coded structural-break covariates — neutral-site games, no/limited attendance, extreme weather, short-rest schedule disruptions — that shrink the home-field advantage prior and widen outcome uncertainty when active. The paper's mechanism (erased HFA → more randomness → underdogs underpriced) is the template.
3. **Odds-band conditioning:** replicate the bin analysis — GSE's edge estimates should be reported per implied-probability band (+200…+400 was the entire inefficiency here), not as one global number; concentrate bankroll where α > 0.
4. **Bankroll mapping:** the λ/weight-function grid is a ready-made stake-sizing laboratory; cross-reference with the Kelly lane — note the paper's empirical finding that max-return (λ=1, 1/p) and max-Sharpe (Bernoulli, λ=0.1) are opposite corners.

## Reproducible test
1. Recompute α per league per season on GSE's historical market data; verify ≈0/negative in normal periods (sanity check against the paper's efficient-sport baselines).
2. Identify a past structural break in GSE's data (e.g., 2020 season, neutral-site games) and test whether α > 0 in the affected league × odds band. Gate: if no break shows α > 0 at 5%, the monitor is calibrated but the regime playbook stays hypothetical.

## Numeric gate
**NBA COVID α = +0.17 / +0.10 (1% significant) vs −0.9 post-fans; inefficiency concentrated at implied 0.2–0.3 (odds +233…+400, 21.7% of games); 16.7% flat-stake ROI; $100 → $2,666 with λ=1, 1/p weights.** For GSE: gate is detecting α > 0 at 1% in any league × window before staking — the paper's +0.10–0.17 is the magnitude that justified real money.

## Improvement experiment
Replace the paper's static λ grid with the Kelly lane's fractional-Kelly sizing on the same weight functions, and run the α-monitor forward (paper is retrospective): paper-test whether a live α > 0 trigger in a new regime (e.g., future neutral-site stretches) fires before the inefficiency is arbitraged away — measuring detection latency, which the paper never addresses.

## Verdict
**ADAPT.** The α efficiency metric, the regime-flag mechanism, the odds-band concentration, and the return-vs-Sharpe staking grid are all directly portable to GSE's market-monitoring and bet-timing stack. Honest about its own causal limits, which makes the adaptation safer.
