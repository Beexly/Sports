# [1731] Volatility in Prediction Markets: A Structural Approach (arXiv:2607.08199)

**Citation:** Weiye Xi, Ciamac C. Moallemi, Mallesh Pai, Shouqiao Wang (2026). *Volatility in Prediction Markets: A Structural Approach*. arXiv:2607.08199. URL: https://arxiv.org/abs/2607.08199
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 15,253 words).
**Verdict:** ADAPT — the deadline-resolution + Glosten–Milgrom order-flow structural variance h_t² = p_t(1−p_t)/τ_t + K·ν(V_t)·s_t²/4 beats plain GARCH(1,1) by 34% on ~880,000 out-of-sample hourly forecasts; adapt the closed-form predictor as GSE's forward-looking uncertainty engine for market-implied probabilities (sizing, abstention, CLV confidence).

## 1. Research question
Can we forecast the conditional volatility (scale of the next price move) of a binary prediction-market contract from structural state variables — time to resolution, current price, bid-ask spread, and volume — rather than from backward-looking return dynamics (ARCH/GARCH)? The paper asks whether a structural variance model combining (i) Wright–Fisher deadline-resolution mechanics and (ii) Glosten–Milgrom adverse-selection/order-flow effects predicts next-hour price-move scale better than GARCH workhorses, and whether the specification transfers across market categories (Sports, Politics, Economics, etc.).

## 2. Dataset / schema
- **Hourly Kalshi panel, August 2021 – April 2026:** contract-hour observations of binary contracts. Per contract-hour: mid implied probability p_t, bid-ask spread s_t, traded volume V_t, time to resolution τ_t; target = size of the next-hour probability move conditional on an active update occurring.
- **Scale:** ~880,000 out-of-sample forecasts across 56 monthly test windows (expanding fit: all preceding active-update observations train, next month tests).
- **Categories:** Sports, Politics, Economics, Elections, Crypto, Entertainment + smaller categories; 1,624 contract-hours unlabeled. Category sample-composition table (Table 6); Economics has 8.0% of observations but only 4.9% of large-move hours.
- Access: Kalshi data via public API (no direct download link stated in paper). No code artifact identified.

## 3. Method / model
- Structural variance (closed form): h_t² = p_t(1−p_t)/τ_t + K · ν(V_t) · s_t²/4. First term = Wright–Fisher deadline-resolution component (Bernoulli boundary shape: variance highest at p=0.5, forced to zero at resolution). Second term = Glosten–Milgrom order-flow component: spread s_t scaled by an activity proxy ν(V_t) (headline: ν = √V), with one nonnegative scale parameter K fit by MLE.
- Benchmarks: plain GARCH(1,1); deadline-resolution-only (DR); DR + adverse selection (DR-AS) with ν = √V; probit-Brownian variance shape (Archak & Ipeirotis 2010); GARCH+DR-AS hybrid (residual GARCH on top of structural).
- Evaluation: 95% prediction intervals for the next-hour price; scored by volume-weighted Winkler interval score (VW-IS); paired bootstrap over contract-level clusters for model comparison.

## 4. Equations & assumptions
- h_t² = p_t(1−p_t)/τ_t + K·ν(V_t)·s_t²/4, ν(V) = √V (headline), K ≥ 0 estimated.
- Winkler interval score: penalizes interval width plus a multiple of the miss distance when the realized price falls outside the 95% interval; volume-weighted across contract-hours (VW-IS, lower is better).
- Assumptions: binary contracts with known resolution date; mid-quote is the "price"; active-update conditioning (headline) with zero-update-hour robustness checks in Appendix D; spread reflects adverse selection (Glosten–Milgrom); volume proxy √V captures informed-trading intensity; contract-hours are conditionally independent given state variables (clustered bootstrap handles dependence).

## 5. Features / target
Features: mid probability p_t, bid-ask spread s_t, volume V_t, time to resolution τ_t. Target: scale of the next-hour probability move conditional on an active update (the conditional standard deviation h_t, evaluated via the implied 95% prediction interval). Horizon: 1 hour.

## 6. Validation design
- Expanding monthly walk-forward: fit on all prior active-update observations, test on the next month; 56 test months, ~880,000 OOS forecasts, pooled and per-category.
- Baselines: plain GARCH(1,1), DR alone, Archak–Ipeirotis probit-Brownian shape, DR-AS(√V), GARCH+DR-AS.
- Metric: volume-weighted Winkler interval score; paired contract-cluster bootstrap for significance.
- Robustness: two zero-update-hour checks (Appendix D) — evaluate active-update-fitted forecasts on the full panel; refit without the zero-update filter. Structural ranking preserved in both.

## 7. Numerical results / baselines
- Plain GARCH(1,1): VW-IS **0.7675**.
- Deadline resolution alone: **0.5829**.
- DR-AS(√V): **0.5085** — 34% better than GARCH, 13% better than deadline alone.
- GARCH+DR-AS: **0.4620** — best overall, 9% better than DR-AS alone.
- Category portability: global fit is best or near-best in most major categories (Sports, Politics, Economics, Elections, Crypto, Entertainment); category-specific refitting does NOT systematically improve OOS.
- Sports contracts are more event-concentrated/jump-like than Economics contracts (Economics: deadline resolution alone nearly matches the winner; only 4.9% of large-move hours vs 8.0% observation share).
- Zero-update robustness checks preserve the structural ranking.

## 8. Code / data availability
None stated — no public code or data artifact identified in the paper. Kalshi data is obtainable via Kalshi's public API.

## 9. Leakage & limitations
- Active-update conditioning: headline results condition on an update occurring; the unconditional (including zero-move hours) problem is checked only in an appendix.
- Prediction-market contracts (bounded [0,1], known resolution) differ from sportsbook odds: books shade lines, limit bettors, and have no bid-ask spread in the same sense; the spread term must be re-mapped (e.g., cross-book dispersion or book-vs-consensus gap).
- Kalshi categories are heterogeneous; the "Sports" category pools many sports with different information structures.
- No causal identification: spread/volume correlate with informed flow but the paper does not isolate manipulation vs information.
- Volume proxy √V is a modeling choice; alternatives (log V, V) are mentioned but the headline uses √V.

## 10. GSE overlap
Existing map: market microstructure lane tracks CLV, de-vigged consensus, beat-the-close, steam; calibration lane has CQR/conformal intervals (existing-research-map.md). GSE has no forward-looking volatility model for market-implied probabilities — its uncertainty quantification is on its own model outputs (CQR), not on the market's likely movement. This paper fills exactly that gap: a structural, interpretable volatility forecaster for the *market side*. Extension, not duplicate.

## 11. GSE implementation spec
- Rebuild h_t on GSE's odds data: p_t = de-vigged consensus probability (from The Odds API multi-book snapshot); τ_t = hours to kickoff; s_t = cross-book spread (max−min implied prob) as the Glosten–Milgrom proxy; V_t = proxied by number of books moving / line-move count if true volume unavailable. Fit K by MLE on 2024–2025 NFL.
- Serve two uses: (a) **CLV confidence** — expected scale of remaining line movement tells GSE whether a current edge is likely to persist or be arbed away before kickoff; (b) **abstention/sizing** — scale bet size by predicted market volatility (high predicted move-scale → wait or reduce; this complements GSE's own-model CQR intervals).
- Effort: ~1 week (data plumbing from The Odds API + closed-form fit + walk-forward backtest).

## 12. Reproducible test
Dataset: The Odds API NFL snapshots, 2024 season, hourly from 7 days to kickoff, de-vigged consensus + cross-book spread. Target: absolute next-6-hour move of consensus probability. Metric: Winkler 90% interval score. Baselines: trailing GARCH(1,1) on consensus moves; constant-volatility benchmark. Pass if DR-AS beats GARCH by ≥15% VW-IS OOS on 2025 season holdout.

## 13. Acceptance / rejection gate
ADOPT the structural forecaster if, on the 2025 NFL holdout, DR-AS improves on the GARCH(1,1) baseline by ≥15% in volume-weighted interval score with the paired-bootstrap difference significant at 5%. REJECT (keep GARCH or constant vol) if the gain is <10% or insignificant — then cross-book spread is not a sufficient adverse-selection proxy in bookmaker (non-CLOB) markets.

## 14. Improvement experiment
Add a scheduled-information term to h_t²: NFL information arrives on a calendar (injury reports Wed–Fri, inactives 90 min pre-kickoff). Fit h_t² = p(1−p)/τ + K·√V·s²/4 + Σ_j β_j·1{t in window j} with windows for report releases. Test whether calendar terms improve VW-IS by ≥5% over the paper's spec on NFL data — this adapts the continuous-time finance model to the discrete news calendar of sports betting.

**Verdict:** ADAPT — the deadline-resolution + order-flow structural variance beats GARCH by 34% on ~880k OOS forecasts; adapt as GSE's forward-looking market-volatility engine for CLV confidence, sizing, and abstention.
