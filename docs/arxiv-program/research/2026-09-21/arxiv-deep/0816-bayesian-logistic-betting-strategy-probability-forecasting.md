# [0816] Bayesian logistic betting strategy against probability forecasting (arXiv:1204.3496)

**Citation:** Masayuki Kumon, Jing Li, Akimichi Takemura, Kei Takeuchi (2012). *Bayesian logistic betting strategy against probability forecasting*. arXiv:1204.3496. URL: https://arxiv.org/abs/1204.3496
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; LateXML conversion; read §§1–6 in full).
**Verdict:** ADAPT — the Kelly-derived stake fraction ν_n = (p̂_n − p_n)/(p_n(1−p_n)) and the Bayesian logistic "Skeptic" that bets against a forecaster's probabilities are a principled, proven framework for fading biased market/bookmaker probabilities; directly adaptable as a GSE overlay that sizes bets against stale or shaded lines, but the game-theoretic SLLN theorems are not needed for the application and the JMA empirical win is figure-only (no exact capital numbers).

## 1. Research question
In the game-theoretic probability framework (Shafer & Vovk), can a bettor ("Skeptic") systematically beat a probability forecaster ("Forecaster") whose announced probabilities p_n are miscalibrated, using only the forecasts plus side information c_n? The paper builds a Bayesian logistic betting strategy, proves it weakly forces the strong law of large numbers (i.e., it bankrupts any forecaster whose probabilities don't match reality), and demonstrates it empirically by beating the Japan Meteorological Agency's precipitation forecasts — exploiting JMA's tendency to avoid clear-cut forecasts.

## 2. Dataset / schema
(a) Simulations: three synthetic cases — Case 1: x_n ~ Bernoulli(0.7), p_n alternating 0.4/0.6; Case 2: x_n ~ Bernoulli(0.5), p_n alternating 0.4/0.6; Case 3: p_n = 0.5, x_n from a Markov chain (transition probs in Figure 2). (b) Real: JMA probability-of-precipitation forecasts for Tokyo, 3 years (2009-01-01 to 2011-12-31, ~1,096 days), collected from Mainichi Daily News morning-edition archives; outcomes from weather-eye.com (rain at 09:00 or 15:00 = rainy day). Forecasts quantized to multiples of 10%. Table 1 (exact counts): p=0%: 1 rain/61 dry (1.6%); 10%: 10/324 (3.0%); 20%: 24/193 (11.1%); 30%: 36/117 (23.5%); 40%: 20/26 (43.5%); 50%: 67/56 (54.5%); 60%: 38/14 (73.1%); 70%: 36/7 (85.7%); 80%: 36/4 (90.0%); 90%: 22/1 (95.6%); 100%: 3/0 (100%).

## 3. Method / model
Game protocol (BPFSI): Forecaster announces p_n ∈ (0,1) and side info c_n ∈ R^d; Skeptic stakes M_n (possibly negative); Reality reveals x_n ∈ {0,1}; capital K_n = K_{n−1} + M_n(x_n − p_n), K_n ≥ 0 (collateral duty). Skeptic models Reality as Bernoulli(p̂_n) and sets the Kelly-optimal fraction ν_n = M_n/K_{n−1} maximizing E_{p̂_n}[log(1+ν(x_n−p_n))] → ν_n = (p̂_n − p_n)/(p_n(1−p_n)); capital becomes a likelihood ratio K_n = ∏ p̂_i^{x_i}(1−p̂_i)^{1−x_i} / ∏ p_i^{x_i}(1−p_i)^{1−x_i}.
Logistic model: log(p̂_n/(1−p̂_n)) = log(p_n/(1−p_n)) + θ'c_n, i.e., Skeptic's edge is a logistic correction to the announced log-odds. Bayesian strategy: prior π(θ) (positive near origin) → K_n^π = ∫ K_n^θ π(θ) dθ (universal-portfolio-style mixture). Three strategies tested: S1: θ scalar, c_n=1, prior Uniform[0,1]; S2: θ'=[θ_1, β−1], c_n'=[1, log(p_n/(1−p_n))]; S3: adds θ_3 with c = x_{n−1} (Markov term). For JMA: S3 with β prior Uniform[0,2] (hindsight β≈1.5), p_n=0%/100% clipped to 1%/99%.

## 4. Equations & assumptions
Capital: K_n = ∏_{i=1}^n (1 + ν_i(x_i − p_i)) (Eq. 1). Kelly fraction: ν_n = (p̂_n − p_n)/(p_n(1−p_n)) = p̂_n/p_n − (1−p̂_n)/(1−p_n) (Eq. 2). Likelihood-ratio form (Eq. 3): K_n = p̂(x_1..x_n)/∏ p_i^{x_i}(1−p_i)^{1−x_i}.
Logistic: log(p̂_n/(1−p̂_n)) = log(p_n/(1−p_n)) + θ'c_n (Eq. 5); p̂_n = p_n e^{θ'c_n}/[1 + p_n(e^{θ'c_n}−1)] (Eq. 6); K_n^θ = e^{θ'Σc_i x_i}/∏(1 + p_i(e^{θ'c_i}−1)) (Eq. 7).
Auxiliary processes: S_n = Σc_i(x_i−p_i), V_n = Σc_i c_i' p_i(1−p_i).
Theorems: 4.1 — Bayesian logistic Skeptic weakly forces E_1 ⇒ lim V_n^{−1}S_n = 0 (SLLN with side info) under regularity (λ_min(V_n)→∞, bounded condition number, bounded c_n). 4.2 — stronger: lim g(V_n)^{−1}S_n = 0 for g(V) ≈ V^{1/2+ε}.
Assumptions (stated): p_n ∈ (0,1) strictly; collateral duty (K_n ≥ 0); prior supports a neighborhood of the origin; regularity conditions E_1; side information announced by Forecaster (authors note Skeptic announcing it may be more natural — open question).

## 5. Features / target
Side information c_n (d-vector; in experiments: 1, log(p_n/(1−p_n)), and x_{n−1}). Target: binary outcome x_n (rain / no rain). Skeptic's model target: the correction θ to Forecaster's log-odds. Horizon: per-day (per-event) sequential betting.

## 6. Validation design
Simulations (3 cases × 3 strategies, capital curves in Figures 3–7, no exact numbers): S1 beats only Case 1; S2 fixes Case 2; S3 (with Markov term x_{n−1}) fixes Case 3 — demonstrating "more flexible strategy utilizing more side information" wins. Real data: JMA 2009–2011 Tokyo, strategy 3 with β~Uniform[0,2]; Figure 8 shows capital growth "works very well" plus the theoretical approximation S_n'V_n^{−1}S_n/2. No holdout split (sequential game is inherently walk-forward); no statistical tests; no competing baseline beyond the naive strategies. Time-ordered by construction.

## 7. Numerical results / baselines
Exact numbers quoted: Table 1 counts/ratios above (the empirical core). Key finding: JMA "tends to be closer to 50% than the actual ratio" — announces 20% when actual is 11.1%; announces 80% when actual is 90.0% — "tendency of avoiding clear-cut forecasts". Hindsight β ≈ 1.5 (the logistic slope on announced log-odds needed to correct JMA). Capital process (Figure 8): "works very well against JMA" — NO exact final capital, growth rate, or drawdown numbers in text (figure-only). Seasonal note: capital "shows a seasonal fluctuation and does not perform well for the rainy season (June and July)". These are the paper's claims; the no-numbers caveat applies to the profit claim.

## 8. Code / data availability
None stated. JMA forecasts from Mainichi Daily News archives; outcomes from weather-eye.com (both public-ish Japanese sources, URLs partially given).

## 9. Leakage & limitations
- Adversarial: the JMA "beats the agency" claim has no numbers — no final capital, no Sharpe, no max drawdown; Figure 8 only. The β prior was tuned with hindsight (Uniform[0,2] chosen because hindsight β≈1.5) — a form of data snooping on the strategy hyperparameter, though the sequential capital process itself is walk-forward.
- The logistic model assumes Skeptic's edge is linear in log-odds space with fixed θ — real bookmaker biases are regime-dependent (the paper's own seasonal-fluctuation note shows this).
- Clipping 0%/100% to 1%/99% is ad hoc; Kelly fractions explode near p_n→0/1, and the paper doesn't discuss stake caps.
- Game-theoretic theorems (4.1/4.2) are asymptotic (n→∞) — GSE operates on ~3,400 picks, finite-sample behavior is what matters.
- External validity: precipitation forecasts are low-dimensional and stationary-ish; NFL betting lines are adversarial and adaptive — books shade lines in response to action, JMA doesn't respond to Skeptic.

## 10. GSE overlap
Existing-research map: calibration lane exists (conformal WP 2208.08598, LRD calibration dashboard 2207.13770 absorbed); Kelly mentioned 12× with this being the second Kelly paper read (ledger 0813 was first). No duplication: nothing in the map does "bet against the forecaster" — i.e., treat the sportsbook's line as Forecaster and GSE's model as Skeptic. This is a new capability framing: a Skeptic overlay that only bets when its logistic correction to the market's implied probability clears a threshold. Connects to the markets lane (market microstructure/CLV) and the abstention lane.

## 11. GSE implementation spec
Adaptation: "Skeptic overlay" for GSE pick selection/sizing. Forecaster = sportsbook (Pinnacle/book consensus implied probability p_n from the moneyline/spread). Skeptic = GSE engine: fit Bayesian logistic regression log(p̂/(1−p̂)) = log(p/(1−p)) + θ'c_n where c_n = engine features (model edge, line movement, steam indicators, rest/situational flags), θ with weakly informative prior. Stake: Kelly fraction ν_n = (p̂_n − p_n)/(p_n(1−p_n)) capped at [−ν_max, ν_max] (the paper's missing stake cap — add it), bet only when |ν_n| > threshold (abstention built in). Update θ online (Laplace approximation / streaming Bayes) as picks settle — the sequential protocol maps exactly onto the weekly slate. Backtest on the 3,411-pick DB. Effort: ~3–5 days (logistic model + Kelly sizing + walk-forward harness).

## 12. Reproducible test
Dataset: GSE predictions DB picks table (3,411 picks) with closing lines (implied p_n) and outcomes, 2024 season walk-forward + 2025 holdout. Protocol: for each pick, compute p_n from closing line, fit the Bayesian logistic Skeptic on history through week w−1, compute p̂_n and ν_n, stake Kelly-capped; compare cumulative log-growth vs (a) flat-stakes engine picks, (b) raw engine-probability Kelly without the Skeptic correction. Metric: log-bankroll growth, max drawdown, ROI. Baseline to beat: flat stakes. Time window: walk-forward 2024, final verdict on 2025 Weeks 1–17.

## 13. Acceptance / rejection gate
ADAPT if on the 2024→2025 walk-forward the Skeptic overlay (a) achieves higher log-bankroll growth than flat-stakes engine picks AND (b) the fitted θ on log(p/(1−p)) is significantly ≠ 0 (i.e., the market's probabilities are systematically correctable — the JMA analog), with max drawdown no worse than 1.25× flat stakes. REJECT if either fails — the logistic correction then adds no edge over GSE's raw probabilities, and the game-theoretic machinery stays in the library unused.

## 14. Improvement experiment
Two extensions: (1) Regime-dependent θ: let θ vary by detected market regime (the paper's seasonal-fluctuation observation) — fit θ separately for early-season vs late-season, high-total vs low-total games, or via a changepoint detector; test whether regime-θ beats pooled-θ on the 2025 holdout. (2) Multi-book Skeptic: treat each sportsbook as a separate Forecaster and let Skeptic's logistic model include book-identity dummies — this directly estimates which books shade which way (the "avoiding clear-cut forecasts" analog: books shading toward 50%/public side), turning the Skeptic into a book-profiling tool for line shopping.
