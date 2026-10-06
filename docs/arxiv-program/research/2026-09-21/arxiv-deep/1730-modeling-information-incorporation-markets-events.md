# [1730] Modeling Information Incorporation in Markets, with Application to Detecting and Explaining Events (arXiv:1301.0594)

**Citation:** David M. Pennock, Sandip Debnath, Eric J. Glover, C. Lee Giles (2002, UAI). *Modeling Information Incorporation in Markets, with Application to Detecting and Explaining Events*. arXiv:1301.0594. URL: https://arxiv.org/abs/1301.0594
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF converted to text, 5,858 words).
**Verdict:** ADAPT — the formal CLV justification (prices are martingales under the forecast-accuracy assumption; winner-state updates follow E[p_t|E,p_{t−1}=a] = a + Var(p_t|p_{t−1}=a)/a) plus the log-likelihood-space movement analysis and entropy-loss event attribution give GSE a principled steam-move/surprise score and a news-attribution pipeline; adapt to NFL odds-move data with GSE's injury/news feeds.

## 1. Research question
How is information incorporated into market prices over time, and can the dynamics of price movement be used to (a) detect when significant information arrives and (b) explain which real-world events caused the movement? The paper builds a dynamic model of how prices in information markets (Iowa Electronic Markets) evolve as information arrives, derives testable predictions of the price dynamics under a "forecast accuracy" assumption, and then uses deviations from those dynamics plus a text-mining event detector to identify and explain market-moving events.

## 2. Dataset / schema
- **22 Iowa Electronic Markets (IEM) election markets** — price histories (normalized prices) used for the information-incorporation analysis.
- **Event-explanation corpora:** 622 `ny.politics` newsgroup posts, 480 `us.politics` posts, 127 `sci.space.news` posts, 189 Washington Post articles about Giuliani. Used to demonstrate the event-attribution pipeline on three case studies.
- **Coin-flip simulation:** 22 synthetic markets, n=1200 flips, modeling information arrival as a binomial coin-flip process; used to reproduce the qualitative log-score dynamics.
- Access: IEM data was publicly available; newsgroup corpora are standard public archives. No single downloadable artifact linked in the paper.

## 3. Method / model
- Forecast-accuracy assumption: at any time, the market price is the best available forecast, so prices are martingales: E[p_t | p_{t−1} = a] = a.
- From this, derive the expected update conditional on the winning state: E[p_t | E, p_{t−1} = a] = a + Var(p_t | p_{t−1} = a)/a — i.e., price changes are proportional to the conditional variance (uncertainty) at that point.
- Analyze price changes in log-likelihood space (logit): show changes are approximately symmetric and power-law distributed; the ratio of winner to loser movement is predicted to be ≈ e^ε and found "reasonably close" to that prediction.
- Coin-flip information-arrival simulation: each market's information arrives as n=1200 binomial flips; reproduced the qualitative pattern of linear rise in logarithmic score and late acceleration.
- Event detection: scan text corpora for words and up-to-three-word phrases with high expected entropy loss (information gain) around market-move dates; three case studies show meaningful event terms surfacing.

## 4. Equations & assumptions
- Martingale (forecast accuracy): E[p_t | p_{t−1} = a] = a.
- Winner-conditioned update: E[p_t | E, p_{t−1} = a] = a + Var(p_t | p_{t−1} = a)/a.
- Log-likelihood space: work with logit(p) = ln(p/(1−p)); price changes in this space approximately symmetric, power-law distributed.
- Winner/loser movement ratio predicted ≈ e^ε (ε = log-likelihood step size), empirically "reasonably close."
- Coin-flip simulation: market value = (1/n) Σ flips; log score rises linearly with time, accelerating near resolution.
- Expected entropy loss (information gain) for term w: E[IG] = Σ P(w) · KL(class distribution | w || class distribution) — used to rank event-explaining words/phrases.
- Assumptions: prices are unbiased forecasts (no favorite-longshot bias, no risk premia); information arrives exogenously; text corpora contain the causal events; log-score is the right accuracy measure.

## 5. Features / target
Features: market price series p_t (normalized); log-likelihood-space increments; text corpora (words, 2-grams, 3-grams) with timestamps. Targets: (a) predicted price path under the information-incorporation model; (b) event labels — which news events explain detected price moves. Prediction horizon: intraday-to-campaign price evolution; event attribution is retrospective.

## 6. Validation design
- Qualitative theory-vs-data agreement on 22 IEM markets: log-score linearity, late acceleration, winner/loser movement ratio, power-law increment distribution. No held-out markets, no predictive test — the "validation" is goodness-of-fit of derived dynamics to the same 22 markets.
- Coin-flip simulation (22 markets, n=1200) reproduces qualitative patterns.
- Three event case studies: manual verification that top entropy-loss terms correspond to real known events. No precision/recall numbers.

## 7. Numerical results / baselines
- 22 IEM markets analyzed; winner/loser movement ratio "reasonably close" to predicted e^ε (no exact ratio quoted).
- Price changes in log-likelihood space approximately symmetric and power-law distributed (exponent not numerically fitted in text).
- Coin-flip simulation (n=1200) reproduces linear log-score rise with late acceleration, matching IEM qualitatively.
- Event corpora: 622 / 480 / 127 / 189 documents across the four sources; three case studies yielded meaningful event terms.
- No baseline comparison, no accuracy/error metrics, no confidence intervals. Results are qualitative.

## 8. Code / data availability
None stated — no public code or data artifact identified in the paper.

## 9. Leakage & limitations
- Old, small, political-market sample (22 IEM election markets, 2002-era); external validity to 2026 NFL betting markets is untested — sports markets have scheduled information release (injury reports) and much heavier informed flow.
- Retrospective and outcome-conditioned: the winner-state update equation conditions on knowing the winner — for live GSE use this must be replaced with a real-time surprise score.
- No held-out prediction test; qualitative figures only; the "reasonably close" ratio claim is not a statistical test.
- Event attribution is demonstrated on 3 hand-picked case studies with no precision/recall; entropy-loss text mining will surface correlated-but-non-causal terms.
- The martingale assumption fails under favorite-longshot bias and time-varying risk premia, both documented in sports markets.

## 10. GSE overlap
Existing map: market microstructure lane already tracks CLV as training label, beat-the-close, line movement/steam (existing-research-map.md); repo has CLV slices (docs/ops/calibration/2026-08-19-l9-clv-slices) and CLV forensics (docs/ops/edge/2026-08-19-clv-forensics-verdict.md). This paper supplies the missing formal justification for *why* CLV works (forecast-accuracy martingale) and a variance-scaled update equation GSE does not currently use. The event-attribution pipeline is new capability — GSE has no odds-move → news-event attribution. Extension, not duplicate.

## 11. GSE implementation spec
- **CLV surprise score:** for each NFL market, track the book's implied probability p_t over the pre-kickoff window; compute the realized move Δlogit(p) and compare to the expected scale from the paper's variance relation (move ∝ conditional variance). Flag "steam" when |Δlogit| exceeds k × predicted scale — a variance-normalized surprise score rather than a raw points-moved threshold.
- **Event attribution:** ingest GSE's injury/news text feeds; when a surprise move fires, run the expected-entropy-loss scan over a ±30-minute news window to surface candidate causal terms (player names, "out", "questionable", weather terms).
- Data: The Odds API line history (already evaluated per docs/source-providers/kalshi-and-odds-api-io-evaluation-2026-06-03.md); text from GSE's existing news ingestion. Effort: ~1 week for the surprise score; ~2 weeks for the attribution pipeline.

## 12. Reproducible test
Dataset: The Odds API NFL moneyline/spread histories for the 2025 season (or season-to-date 2026), sampled hourly from open to kickoff. Metric: variance-normalized surprise score S = Δlogit(p) / sqrt(Var_t) per the paper's relation; test whether S > 3 flags predict the sign of subsequent CLV (i.e., do flagged moves continue toward the close?). Baseline: raw move-size flags (|Δp| > 2%). Pass if surprise-flagged moves have ≥10pp higher directional-continuation rate than raw-move flags.

## 13. Acceptance / rejection gate
ADAPT is confirmed if, on the 2025 NFL season, variance-normalized surprise moves predict the direction of the remaining move to close at ≥55% accuracy (baseline 50%) with ≥200 flagged events. REJECT the pipeline if the surprise score adds nothing over raw move size (continuation-rate gap < 5pp) — then the martingale-variance scaling does not transfer to NFL odds data.

## 14. Improvement experiment
Replace the paper's static variance estimate with a GARCH-style conditional variance of logit-price increments fit on GSE's own line history, and condition the surprise score on time-to-kickoff (information flow is scheduled: injury reports Wed–Fri, inactives 90 min before). Test whether a time-varying variance model cuts false-positive steam flags by ≥25% vs the paper's constant-variance version — this adapts the 2002 election-market model to the scheduled-information structure of NFL markets.

**Verdict:** ADAPT — the formal CLV justification plus variance-scaled update dynamics and entropy-loss event attribution give GSE a principled steam-move surprise score and news-attribution pipeline; adapt to NFL odds data with scheduled-information adjustments.
