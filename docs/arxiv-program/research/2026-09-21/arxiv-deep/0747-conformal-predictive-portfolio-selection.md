# [0747] Conformal Predictive Portfolio Selection (arXiv:2410.16333)

**Citation:** Masahiro Kato (2024). *Conformal Predictive Portfolio Selection*. arXiv:2410.16333. URL: https://arxiv.org/abs/2410.16333
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the HR–LR rule (rank candidates by conformal interval lower bound, filter to the m lowest-risk, pick the max upper bound) is a principled, uncertainty-aware pick/slate selection rule that transfers directly to GSE's DFS lineup and posted-pick selection; the finance application and its thin empirical basis (3 assets/market, figures only, no cost model) are not adopted.

## 1. Research question
Portfolio selection usually maximizes predicted return, ignoring prediction uncertainty. Can conformal prediction intervals over candidate portfolios' future returns be used to select portfolios with high upside among provably low-risk candidates — and does this beat return-maximization baselines out of sample?

## 2. Dataset / schema
**US assets**: Apple, Microsoft, Amazon. **Japan assets**: Toyota, SoftBank, Keyence. Monthly returns. Main stated window: 2009-01-01–2018-12-31 (learn through 2011, test 2012–2018 with sequential monthly updates); the paper later inconsistently says 2008–2019 (flagged in §9). Baselines: Mean[1], Mean[3] (rolling-mean returns), AR(1), AR(2), AR(3), Uniform (equal-weight). Candidate portfolios: weight vectors on the simplex over the 3 assets.

## 3. Method / model
**HR–LR (High Return–Low Risk)**: (1) for each candidate portfolio w, form a conformal prediction interval [r̲, r̄] for its next-period return using past prediction residuals; (2) sort candidates by lower bound r̲ (ascending); (3) keep the m candidates with the lowest r̲ ("low risk" — the paper's convention: lower lower-bound = ... see §9 note); (4) among those m, select the portfolio maximizing the upper bound r̄ (highest upside). Compare against return-maximizing selection without intervals. Return forecasts from AR(3) and a 100-hidden-unit feedforward NN, refit sequentially.

## 4. Equations & assumptions
Interval per portfolio: [r̲(w), r̄(w)] from conformalized residuals of the return model. Selection: S = argmax_{w ∈ M_m} r̄(w), where M_m = {m portfolios with smallest r̲}. Assumptions: exchangeability of residuals over time (financial returns — violated by volatility clustering); the candidate set covers the optimum; transaction costs ignored.

## 5. Features / target
Features: lagged monthly returns (AR) / learned representation (NN). Target: next-month portfolio return. Horizon: 1 month, sequential.

## 6. Validation design
Sequential out-of-sample: learn through 2011, then monthly refit-and-select over 2012–2018; cumulative return curves vs. baselines. No train/calibration/test split discipline beyond the sequential scheme; no statistical tests.

## 7. Numerical results / baselines
Results are **figures only** (cumulative-return plots, Figures 1–2): Conformal (AR) and Conformal (NN) curves lie above Mean[1], Mean[3], AR(1–3), and Uniform for both US and Japan asset sets, avoiding sharp drawdowns. **No exact cumulative-return values, Sharpe ratios, or significance tests are printed.** The empirical claim is qualitative: interval-aware selection dominates point-forecast selection visually.

## 8. Code / data availability
None stated. Asset price data is public (Yahoo Finance-type).

## 9. Leakage & limitations
(a) **Results are qualitative** — figures without tables; no numbers to reproduce against. (b) **Date inconsistency**: 2009–2018 vs. 2008–2019 stated in different sections. (c) Only **3 assets per market** — trivial diversification; generalization to large candidate sets untested. (d) **Transaction costs ignored** — monthly rebalancing on 3 assets would eat the visual edge. (e) The "low risk = lowest lower bound" ranking is conceptually odd (a lower r̲ means a WORSE worst case); the rule as written selects the m portfolios with the worst worst-cases, then maximizes upside among them — this reads like a possible sign error in the paper, or "low risk" refers to something else; GSE must re-derive the rule carefully rather than copy it. (f) No coverage level α stated for the experiments. (g) Exchangeability on financial returns is false.

## 10. GSE overlap
Existing-research-map.md: the gap list explicitly calls out **"Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read"** and portfolio-of-bets sizing as product-relevant. This paper is the closest thing in the assignment to that gap: uncertainty-aware selection over candidate slates. Not a duplicate of anything in the map.

## 11. GSE implementation spec
(1) For weekly DFS / posted-pick slates: generate K candidate lineups (or pick sets); (2) for each, build a conformal interval over projected points (or expected profit) from backtest residuals; (3) apply a CORRECTED HR–LR: filter to the m candidates with the HIGHEST lower bound (true low-risk), then pick max upper bound (highest ceiling) — fixing the paper's apparent sign confusion, and A/B test both orientations; (4) backtest on 2023–2025 DK slates vs. pure projection-maximizing selection. Effort: ~1 week.

## 12. Reproducible test
Dataset: 2023–2025 NFL DFS slates (DraftKings classic), GSE projections + backtest residuals. Metric: realized ROI and Sharpe of selected lineups; baselines: projection-max selection, uniform-random from top-K. Success = corrected HR–LR beats projection-max on ROI with lower drawdown over ≥2 seasons.

## 13. Acceptance / rejection gate
ADOPT the corrected rule if it beats projection-maximizing selection on 2024–2025 ROI with statistical significance (paired test over slates); REJECT the paper's as-written orientation if the A/B shows the literal "lowest r̲" version underperforms (confirming the sign error); REJECT entirely if neither orientation beats the baseline — the paper's evidence is too thin to stand alone.

## 14. Improvement experiment
**Cost-aware HR–LR**: add transaction-cost/rake and ownership (chalk) penalties into the interval construction — select max upper bound among low-risk candidates AFTER subtracting expected rake and fading high-ownership lineups; the paper's frictionless 3-asset world is the reason its rule cannot be lifted as-is into DFS.
