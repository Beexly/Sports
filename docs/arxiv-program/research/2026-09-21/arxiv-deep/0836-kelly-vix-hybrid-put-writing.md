# 0836 Sizing the Risk: Kelly, VIX, and Hybrid Approaches in Put-Writing on Index Options (arXiv:2508.16598v1)

**Citation:** Maciej Wysocki (2025). *Sizing the Risk: Kelly, VIX, and Hybrid Approaches in Put-Writing on Index Options*. arXiv:2508.16598v1. URL: https://arxiv.org/abs/2508.16598v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — a full Kelly × volatility-regime hybrid position-sizing laboratory on SPXW 0–5 DTE puts with honest cost modeling (IB margin, commissions, 50% bid-ask crossing); the hybrid scaling formula and the regime-aware sizing discipline transfer to GSE stake sizing, but the paper's stated in-sample/out-of-sample windows overlap and must be discounted.

## 1. Research question

For systematic short-put writing on SPXW 0–5 DTE options, which position-sizing rule performs best: pure Kelly fractions, VIX-rank-based scaling (bet less when implied vol is expensive), or a hybrid that multiplies the two? The paper asks whether conditioning Kelly size on the volatility regime improves risk-adjusted returns over static Kelly or static VIX scaling.

## 2. Dataset / schema

- **Options:** SPXW 0–5 DTE put options, 2018–2024 (per paper's stated sample).
- **Volatility inputs:** close-to-close, Garman–Klass, and Yang–Zhang estimators; VIX level and VIX percentile rank over lookback W.
- **Costs:** Interactive Brokers margin requirements, commissions, and 50% bid-ask spread crossing on every trade.
- **Benchmarks:** S&P 500 buy-and-hold and the CBOE PUT index.
- **Capital:** $5M starting capital.
- **Simulation:** Monte Carlo GBM for the Kelly fraction calibration.
- **Access:** options data proprietary/vendor; method replicable on any options tape.

## 3. Method / model

- **Kelly sizing:** f*(p, a, b) — the Kelly fraction from win probability p and win/loss payoffs a, b, estimated via Monte Carlo GBM; number of contracts Q_t = floor(PV_t / M_t · f*), with portfolio value PV_t and per-contract margin M_t.
- **VIX-rank scaling:** scale size by (1 − P_rank(VIX_t, W)) — write fewer puts when VIX is high in its lookback window.
- **Hybrid:** Q_t = floor( PV_t / M_t · f*(p,a,b) · (1 − P_rank(VIX_t, W)) ) — multiplicative combination of edge-based (Kelly) and regime-based (VIX) sizing.
- Grid over DTE (0–1 vs longer), moneyness (5%–10% OTM highlighted), and sizing variants; development-period selection, then a 2024 holdout.

## 4. Equations & assumptions

- Hybrid sizing (quoted): Q_t = ⌊ (PV_t / M_t) · f*(p,a,b) · (1 − P_rank(VIX_t, W)) ⌋.
- Kelly fraction from GBM Monte Carlo; VIX percentile rank over window W.
- Assumptions: GBM adequately describes short-horizon index dynamics for calibration; IB margin schedule is the binding capital constraint; 50% spread crossing captures execution cost; VIX rank is a sufficient statistic for the vol regime.

## 5. Features / target

- **Inputs:** option DTE, moneyness, VIX_t, P_rank(VIX_t, W), Monte Carlo win probability p, payoff multiples a/b, portfolio value, margin per contract.
- **Target:** contracts to write per day; evaluated on portfolio-level return, volatility, drawdown, information ratio.

## 6. Validation design

- Development sample 2018–2023 (per "in-sample 2018–2024" wording — see §9), 2024 as the nominal out-of-sample year.
- Baselines: S&P 500 buy-and-hold, CBOE PUT index.
- Metrics: annualized return, volatility, max drawdown, information ratio.

## 7. Numerical results / baselines

- Development: 0–1 DTE, 5%–10% OTM identified as the strongest risk-adjusted region; Kelly variants reached 20%–25% annual returns in the claimed best region; hybrid high-return configurations ≈40%–45% annualized; balanced hybrid configs 10%–11% with information ratios ≈3.
- 2024 (nominal OOS): several configurations 14%–23% annualized with lower volatility/drawdown than buy-and-hold.
- All figures are the paper's claims; treat the development numbers as in-sample-selected.

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- **Critical:** the paper states "in-sample" as 2018–2024 and "out-of-sample" as 2024 — the nominal OOS year overlaps the stated IS window. The 2024 results cannot be treated as a clean holdout.
- Configuration selection on the development period with many sizing/DTE/moneyness variants → selection bias; the 40%–45% hybrid figures are max-over-grid.
- GBM calibration for tail put payoffs understates gap risk; 0–1 DTE put writing has extreme left-tail exposure that a 2018–2024 sample may not contain.
- External validity: options market microstructure ≠ sportsbook markets; the transferable part is the sizing formula, not the put-writing edge.

## 10. GSE overlap

Per the existing-research map: Kelly mentioned 12×, zero papers read — this is the third Kelly-family ledger (0834, 0835). No existing volatility-regime stake sizing in the repo. The VIX-rank idea maps to a GSE analogue: scale stakes by a "market heat" regime indicator (e.g., recent pick volatility or CLV dispersion). Complements 0835 (static constrained Kelly) with a dynamic overlay.

## 11. GSE implementation spec

- Build a GSE stake-scaling overlay: base size from 0835's constrained Kelly; multiply by (1 − rank(recent realized pick-PnL volatility, 90-day window)) so stakes shrink after volatile stretches.
- Backtest on 2024 engine picks; compare Kelly-only vs Kelly × regime vs flat.
- Effort: 1 day on top of the 0835 implementation.

## 12. Reproducible test

Dataset: GSE engine picks 2024, walk-forward monthly. Metric: Sharpe of daily bankroll changes and max drawdown. Baselines: 0835 Kelly-only sizing. Pass if the hybrid overlay reduces max drawdown ≥15% with Sharpe not worse.

## 13. Acceptance / rejection gate

ADOPT the overlay if walk-forward max drawdown drops ≥15% vs Kelly-only at equal-or-better Sharpe; REJECT if the regime signal adds nothing (likely — the paper's own OOS is compromised, so the burden of proof is on our backtest).

## 14. Improvement experiment

Replace VIX-rank with a drawdown-proximity scaler: scale = 1 − (current drawdown / max tolerable drawdown), i.e., CPPI-style dynamic sizing on the bankroll itself rather than a market-vol proxy. Hypothesis: bankroll-aware scaling dominates market-regime scaling because it reacts to realized losses, not ambient volatility.
