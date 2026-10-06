# 0793 — Kairosis: dynamical probability forecast aggregation via Bayesian change-point detection (2408.00785v4)

**Verdict:** ADAPT — ensembles / aggregation lane.
**Source:** full text read in full (`/tmp/ledgers-read/2408.00785.txt`), 495 lines. Not from abstract.
**Authors:** Hassoun, Powell, MacKay (University of York, Mathematics) — arXiv 2408.00785v4 (2024). Python code in supplementary materials; data from Metaculus (proprietary question data, obtained from Metaculus).

## Citation / full-text source
- arXiv ID: `2408.00785v4`, "Kairosis: A method for dynamical probability forecast aggregation informed by Bayesian change point detection".
- Full text read from local wrapped cache `/tmp/ledgers-read/2408.00785.txt` (lines 1–495). Code: Python in supplementary materials; no public repo link stated.

## Question
For an outcome resolved at the end of a period, forecasts arrive over time and their distribution shifts as news arrives. How do you aggregate *all* past forecasts at any "present" time better than (a) static aggregation, (b) exponential decay, or (c) keeping only the most recent 20%?

## Dataset / schema
- 650 Metaculus forecasting questions (binary outcomes): mean 145 days open, 893 forecasts per question; topics: international conflict, energy, business/finance. Mean forecast 0.436, median 0.444, per-question SD 0.181.
- Forecasts are anonymous (no forecaster IDs); only the evolving distribution of forecasts is observed.
- Appendix B: 200+ continuous-domain point-forecast questions (mean 85 days, 2321 forecasts each).

## Method
- For each candidate change-point time t_r (in *forecaster time* — forecast order 1..R, which dilates high-activity periods), compute the posterior that t_r is the *most recent* change point:
  - Prior: geometric P(t_CP = t_r) = p(1−p)^{R−r} (constant per-forecast change-point rate p; experiments use 1/p = 10, i.e., ~10 forecasts per change point).
  - Likelihood: split forecasts into pre/post t_r; each side's [0,1] bin counts modeled as compound **Dirichlet-categorical** (closed-form Gamma-ratio PMF, eq. 4). Pre-change pseudo-counts α_k = λ·t_CP (λ = 0.2; models diversified distant history), post-change α′_k = 1 (expects low-entropy/concentrated agreement).
  - Normalize over all r → posterior mass function → cumulative mass function (CMF). The CMF value at time s is E_t[w(s|t_CP=t)] = ∫_{−∞}^s P(t_CP=t) dt — i.e., the posterior probability a forecast at s was made *after* the most recent change point.
- Final aggregate: **kairosis-weighted median** of forecasts (weights from CMF). Interpolation: pure exponential decay when no change detected; hard horizon (old forecasts ≈ 0 weight) when one obvious change point; multi-step weights otherwise.
- Parameters: 5 equal bins, p = 1/10, λ = 0.2; sensitivity analysis shows robustness for p < 0.2, λ > 0.1 — no fine tuning needed.

## Equations / assumptions
- Binary weight given change point: w(s|t_CP=t) = 0 if s < t, 1 if s ≥ t; E_t[w] = CMF of posterior at s (eq. 2).
- Posterior: P(t_CP=t_r|Forecasts) ∝ Dirichlet-cat(n)·Dirichlet-cat(n′)·p(1−p)^{R−r} (eq. 6).
- Dirichlet-categorical PMF: P(n₁,…,n_K) = Γ(Σα)/Γ(Σn+α) · Π Γ(n_k+α_k)/Γ(α_k); large-n limit ∝ negative entropy (favors concentrated forecast distributions).
- Scores: S_Brier(X,p) = −(p−X)²; S_Log(X,p) = X log p + (1−X) log(1−p); skill scores vs unweighted-median benchmark, evaluated at three times (early/mid/late), unweighted and time-decreasing weighted.
- Assumptions: single most recent change point; pre/post forecast sets are independent Dirichlet-categorical draws (knowingly false but quantified); forecaster time ordering; constant change rate.

## Features / target
- Features: anonymous probability forecasts p ∈ [0,1] with timestamps (forecast order).
- Target: binary event outcome X ∈ {0,1}.

## Validation
- 650 Metaculus questions; for each: 3 evaluation times × 4 skill-score variants (Brier/Log × unweighted/time-weighted), benchmark = unweighted median; competitors: uniform weights, most-recent-20% binary weights, exponential decay in forecaster time, universal 0.5.
- Sensitivity analysis over (p, λ) grid; appendix B continuous-domain replication.

## Exact results / baselines
- **Kairosis-weighted median is best on all four skill-score variants** (benchmark = unweighted median = 0.000): Brier unweighted 0.060 (0.009), Brier time-weighted 0.054 (0.009), Log unweighted 0.046 (0.006), Log time-weighted 0.042 (0.006). Only method to beat benchmark on all four.
- Competitors all worse: exponential-decay median −0.211/−0.252/−0.040/−0.061; most-recent-20% median −0.135/−0.159/−0.011/−0.023; uniform mean −0.657/−0.652/−0.199/−0.198. Universal 0.5: −18.658/−18.525/−2.170/−2.154.
- **Kairosis-weighted mean is terrible** (−0.540/−0.545/−0.139/−0.143) — the aggregation function matters as much as the weights: median wins, mean loses.
- Raw crowd baselines: mean Brier −0.179, Log −0.560 (all individual forecasts); median forecasts −0.138/−0.438 (crowd wisdom).
- Continuous-domain (Appendix B, ~2 SD margins): kairosis median 0.042/0.047 skill; still best; competitors worse.
- Worked example (Trump presidency question, Oct 10 2017): probable change point early Aug 2017 (coincides with news); post-change forecasts weighted 0.8–1.0, pre-change < 0.25 (3–4× downweighting).

## Code / data
- Python code in supplementary materials (no standalone repo). Data from Metaculus (provided to authors; not publicly downloadable in this form).

## Leakage
- Evaluation is properly retrospective: at each evaluation time, only forecasts submitted *before* that time are used. Time-decreasing weighting rewards prescience explicitly. No leakage evident.

## GSE overlap
- Checked against `~/workspace/arxiv-sweep/existing-research-map.md`: no Bayesian change-point aggregation or time-decay-of-forecasts method documented. Ledger 0789 (median-consensus) covers static median aggregation; kairosis is the dynamic/time-aware extension — no overlap, and it directly generalizes the 0789 finding (median beats mean).

## Implementation (GSE adaptation)
- **GSE's engine probabilities evolve as kickoff approaches** (injury news, line moves, weather). Static averaging of the engine's daily probability stream, or an arbitrary exponential half-life, is what this paper proves suboptimal. Kairosis gives a data-driven weighting: detect when the market/information regime shifted and downweight stale engine probabilities accordingly.
- Direct applications: (a) intraweek engine-probability aggregation for a single game (weights across daily snapshots); (b) weighting the crowd/market signal history — prediction-market prices also arrive as a stream with regime shifts; (c) **kairosis-weighted median as the aggregation function** — the paper's weighted-mean failure is a warning against weighting means.
- Forecaster-time insight: bursts of line movement = "forecaster clock" dilation; weight by event order, not calendar time, when information arrives in bursts (e.g., injury report day).

## Reproducible test
- On GSE's historical picks: for each game, take the time series of engine probabilities (daily snapshots from first publish to kickoff); aggregate with (a) uniform median, (b) exponential decay, (c) kairosis weights → kairosis median; score with Brier/log-loss at outcome; compare skill vs (a) benchmark.
- Expectation per paper: kairosis median > benchmark ≥ exponential decay, on all games where the information regime shifted midweek (injury news).

## Numeric gate
- Kairosis median achieves positive skill vs uniform median benchmark on both Brier and log-loss across the pick set; margin should exceed the paper's ~0.04–0.06 skill units to justify the added machinery.

## Improvement experiment
- Combine kairosis with the 0789 median-consensus + 0790 ICI ideas: first detect change points, then fuse *sources* (engine, market, weather) within the post-change regime using inverse-covariance intersection — time-aware AND correlation-aware aggregation.
- Online version (Adams & MacKay 2007 Bayesian online changepoint detection) for real-time kickoff-approach aggregation instead of recomputing.

## Verdict
**ADAPT** — ensembles/aggregation lane. A coherent, robust, assumption-light method for time-weighting forecast streams that beat static, exponential, and recency-window aggregation on 650 real questions. The transferable principle for GSE: weight engine/market probability histories by detected information-regime shifts, not by arbitrary decay — and always aggregate with the weighted *median*, never the weighted *mean*.

## Limitations

1. **Recomputation cost / scalability (authors' own flag):** "A sequential, online approach in which the change point CMF and/or the forecast aggregation weights are updated rather than recomputed may be necessary to scale up and speed up our calculations to larger systems." The batch CMF is fine for 650 questions, not obviously for GSE-scale streaming odds.
2. **Combinatorial explosion with multiple change points (authors' own words):** generalizing to "situations in which multiple change points are identified" is unaddressed because "a problem which otherwise threatens a combinatorial explosion in the number of likelihood evaluations" — the method effectively handles one regime break, not the chained breaks of a real news cycle.
3. **Weaker on continuous/point domains (authors' own test):** on Metaculus continuous-domain point forecasts, "kairosis works better than other methods, but by a smaller margin." GSE's point predictions (spread/total numbers) sit in that weaker territory.
4. **My observations — attribution is inferred, skill unweighted:** the change-point→"new information" link is asserted ("which we attribute primarily to new information emerging"), never verified against actual events; and the CMF uses "only raw forecast data" with no forecaster-skill weighting, so a loud unskilled source counts as much as a sharp one in detecting the break.
