# [1733] Decentralized Prediction Markets and Sports Books (arXiv:2307.08768)

**Citation:** Hamed Amini, Maxim Bichuch, Zachary Feinstein (2023). *Decentralized Prediction Markets and Sports Books*. arXiv:2307.08768. URL: https://arxiv.org/abs/2307.08768
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 19,679 words).
**Verdict:** ADAPT — the liquidity-based-utility AMM framework with marginal-price oracles, fee-compensated liquidity provision, and the Super Bowl LVII result (optimal fee γ ≈ 1% yielding 1–6% expected return over 2 weeks at much tighter spreads than the book) gives GSE a synthetic fair-price oracle and a liquidity/slippage diagnostic; adapt the oracle as a cross-book mispricing detector, not as a sportsbook operator.

## 1. Research question
Can automated market makers (AMMs) for prediction markets be generalized from binary outcomes to general probability spaces (multi-outcome, continuous), while (i) preserving price-discovery via marginal-price oracles, (ii) handling liquidity provision/withdrawal after market opening, and (iii) compensating liquidity providers with explicit fees? The paper builds a liquidity-based utility framework, derives bid/ask marginal prices, and tests it numerically on a real sports case (Super Bowl LVII).

## 2. Dataset / schema
- **Deterministic backtest:** Super Bowl LVII (Kansas City vs Philadelphia) money-line archive from Bookmaker via pregame.com odds archive (https://pregame.com/game-center/193165/odds-archive); time series of quoted implied bid/ask probabilities for KC (PHI derived as complements).
- **Stochastic backtest:** Monte Carlo with 500 price paths, 1-minute time step, Brownian-motion true-probability dynamics at volatilities σ ∈ {5%, 25%, 50%}, calibrated to the Super Bowl LVII setting; fees γ ∈ {0%, 0.5%, 1%, …, 5%}.
- Access: pregame.com archive (public webpage); no packaged dataset.

## 3. Method / model
- Liquidity-based utility functions u(x, y) over cash x and share vector y; the AMM cost is the minimal payment preserving utility: C(q) = min{Δx : u(x₀+Δx, y₀−s) ≥ u(x₀, y₀)} for a share purchase s.
- Bid/ask marginal-price oracles: directional derivatives of the cost function — the instantaneous price per share is ∇C(q); bid/ask spreads emerge from the utility curvature.
- Liquidity provision/withdrawal after opening: formulas for adding/removing liquidity at fair value without diluting existing LPs.
- Fees: explicit fee γ compensating LPs; fee revenue vs adverse-selection loss tradeoff determines the optimal fee.
- Utilities tested: logarithmic utility and Liquid StableSwap utility.
- Deterministic backtest: normalize ask probabilities to a midprice, reconstruct LP liquidity and profits along the realized Super Bowl LVII price path. Stochastic backtest: expected LP profit vs fee level and volatility.

## 4. Equations & assumptions
- AMM cost via utility preservation: C(q+s) − C(q) with u held constant; marginal (instantaneous) price π(q) = ∇C(q).
- Bid/ask marginal prices from one-sided directional derivatives of C.
- Liquidity add/remove: priced at the current marginal oracle so existing LPs are not diluted.
- Fee γ applied to trades; LP expected profit = fee income − adverse-selection (loss-versus-rebalancing) cost.
- Assumptions: utility-based (not order-book) price formation; Brownian true-probability dynamics in the stochastic test; terminal mid-price of the external data = true KC win probability (deterministic test); no informed-trader microstructure beyond the volatility parameter; fees are the only LP compensation; **explicitly does not model in-game information evolution**.

## 5. Features / target
Features: quoted bid/ask probability time series, utility-function choice, fee γ, volatility σ, liquidity depth. Target: LP expected profit (average + 95% CI over 500 paths) and the optimal fee γ*; secondary: reconstructed liquidity/profit paths on the deterministic Super Bowl LVII series.

## 6. Validation design
- Deterministic: single realized event (Super Bowl LVII) — reconstruct LP P&L for log and StableSwap utilities at γ = 1% (illustration); normalize asks to midprice.
- Stochastic: 500 Monte Carlo paths × 3 volatilities × 11 fee levels; report mean and 95% CI of expected profit; locate the fee maximizing expected profit.
- No out-of-sample across events; no comparison to real bookmaker P&L; one event, one sport.

## 7. Numerical results / baselines
- Optimal fee ≈ γ ≈ 1%, yielding significant expected profits of **between 1% and 6% return in a 2-week period** (across the σ grid), at a much lower bid-ask spread than Bookmaker quoted.
- Deterministic illustration at γ = 1% shows the AMM creating a "win-win": LPs earn optimized expected profits while takers face a more efficient (tighter) market than the book.
- Result: the AMM with ~1% fee dominates the traditional sportsbook on both LP profit and taker spread in this single-event test.
- No head-to-head accuracy numbers (not a forecasting paper).

## 8. Code / data availability
None stated — no public code or data artifact identified. Data source URL given (pregame.com game-center archive).

## 9. Leakage & limitations
- Single event (Super Bowl LVII), one matchup, one book's archive — no cross-event or cross-sport validation; the 1–6% figure is conditional on this calibration.
- Deterministic test assumes the terminal mid-price equals the true probability — uses the outcome-implied "truth" retrospectively.
- Brownian true-probability dynamics are a modeling convenience; real sports probabilities jump on news (the paper notes it does not model in-game information evolution).
- AMM mechanics (utility-based pricing, LP fee compensation) do not describe how real sportsbooks operate (books shade, limit, and balance flow rather than run constant-utility curves).
- No informed-trader/adverse-selection microstructure beyond the σ parameter.

## 10. GSE overlap
Existing map: market microstructure lane covers de-vigged consensus and devig/parlay build specs (docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md); no AMM/liquidity-utility machinery exists in the repo. The marginal-price oracle is a *new* capability: a synthetic fair-price generator from a liquidity-utility curve, usable as an independent "fair price" to compare against book prices (a mispricing detector), and the fee-vs-spread analysis gives a principled way to think about what spread a market "should" quote. Extension, not duplicate.

## 11. GSE implementation spec
- Build the marginal-price oracle on GSE's multi-book NFL snapshots: fit a logarithmic-utility AMM curve through each book's bid/ask (moneyline) quotes; the oracle's mid marginal price becomes a synthetic consensus; flag books whose quotes deviate from the oracle by more than the paper's implied fee band (~1%) as candidate mispricings for manual review.
- Liquidity diagnostic: invert the framework — from observed cross-book spreads, back out the implied LP fee γ* each book is effectively charging; track γ* over the week as a market-tightness index (falling γ* into the weekend = sharpening market).
- Effort: ~1 week (closed-form log-utility oracle + per-book γ* inversion + dashboard).

## 12. Reproducible test
Dataset: The Odds API NFL moneyline bid/ask (or best-back/best-lay across books) for 4 weeks of the 2025 season. Metric: hit rate of oracle-flagged mispricings — do books flagged >1% off the oracle mid move toward the oracle by kickoff (CLV test)? Baseline: random flags. Pass if flagged books converge toward the oracle ≥58% of the time (baseline 50%) with ≥150 flagged instances.

## 13. Acceptance / rejection gate
ADAPT is confirmed if the oracle-mid predicts the direction of subsequent book-specific line moves at ≥58% on the 4-week sample (paired test vs 50%, p < 0.05). REJECT the oracle as a mispricing detector if the hit rate is within noise of 50% — then the log-utility curve adds nothing over a simple cross-book median, and GSE should keep its existing consensus approach.

## 14. Improvement experiment
Replace the static logarithmic utility with a time-varying liquidity parameter fit from GSE's line-move data (liquidity deepens toward kickoff), and add the paper's fee-compensation logic in reverse: estimate each book's *effective* fee from its spread and test whether books with higher effective fees get picked off less (their lines move less post-flag). This turns the paper's LP-design tool into a book-profiling instrument: which books are the "sharp" low-fee venues vs high-fee recreational ones — directly actionable for GSE's line-shopping guidance.

**Verdict:** ADAPT — the liquidity-utility AMM with marginal-price oracles (optimal fee ≈1%, 1–6% expected 2-week return in the Super Bowl LVII test) gives GSE a synthetic fair-price oracle and book-profiling instrument; adapt as a mispricing detector, not a market operator.
