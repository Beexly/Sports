# [0605] Bayesian isotonic logistic regression via constrained splines (arXiv:1909.03802v1)

**Citation:** Montagna, S., Orani, V., Argiento, R. (2019). *Bayesian isotonic logistic regression via constrained splines: an application to estimating the serve advantage in professional tennis*. arXiv:1909.03802v1. URL: https://arxiv.org/abs/1909.03802v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4104 lines, incl. Appendix A proof).
**Verdict:** ADAPT — port the constrained-B-spline isotonic logistic regression machinery (recursive ε-decrement prior, eqs. 8–9) as GSE's standard tool for monotone probability modeling (calibration curves, conversion/success probabilities by distance); skip the tennis serve application itself.

## 1. Research question
How does the server's advantage in professional tennis decay with rally length, and how does rally ability (adjusted for opponent and court surface) separate great players from merely good servers? The paper replaces Kovalchik (2018b)'s exponential-decay serve curve with a player-specific B-spline decomposition of the logit win probability, enforcing non-increasing serve advantage via control-polygon constraints (partial monotonicity), and adds court-surface-specific rally abilities — showing the best players win on rally ability, not serve.

## 2. Dataset / schema
- Point-by-point Grand Slam singles, 2012+, scraped by Jeff Sackmann (also in R package `deuce`); players with ≥3 matches. ATP: 145,510 rallies (130,577 short, i.e. ≤4 shots); WTA: 81,880 (71,592 short). Short rallies = 90% of all points. Rally lengths 0–30, odd/even aggregated → x ∈ {1,…,15}. Courts: hard (AO, USO), clay (RG), grass (Wimbledon).
- Train: 90 servers, 140 (ATP) / 139 (WTA) receivers; test: 50 (ATP) / 49 (WTA) servers — hold-out servers for out-of-sample prediction.
- No tennis-data train/test in the GSE sense; model comparison via LPML/WAIC/DIC/RMSE.

## 3. Method / model
- **Likelihood:** Y_{ij}|p_{ij}(x) ~ Bernoulli(p_{ij}(x)) (eq. 1); logit p_{ij}(x) = f_i(x) + (α_i − α_j) (eq. 2) — serve-advantage curve + Bradley–Terry rally-ability difference.
- **Serve curve:** f_i(s) = Σ_{m=1}^M β_{i,m} b_m(s) (eq. 3), B-splines order k=4, M=9, knots t=(1,1,1,1,2,3,4,7,11,15,15,15,15) on [1,15]; unlike the exponential model it stays non-zero with widening credible intervals in sparse long-rally regions (honest uncertainty).
- **Partial monotonicity (Proposition 1, proof in Appendix A):** if the restricted control polygon (piecewise-linear through knot averages (t̄_m, β_m), t̄_m = mean of t_{m+1}…t_{m+k−1}) is non-increasing on its support, the spline is non-increasing on [L₀,U]. Implemented by **β_{i,m} := β_{i,m−1} − ε_{i,m}**, ε_{i,m}|r_ε,s_ε ~ Gamma(r_ε/s_ε², (r_ε/s_ε)²), r_ε,s_ε ~ U(0,10) (eqs. 8–9); first m_{L₀}−k coefficients free with hierarchical Normal priors (eqs. 6–7). L₀=3 chosen from O'Donoghue & Brown (2008): serve advantage lost after the 4th shot — data-rich region (x≤4) learns freely, sparse region is constrained.
- **Rally ability:** α_i|α₀,σ_α ~ N(α₀,σ²_α) with Σ_i α_i = 0 identifiability (eq. 10); court extension α_{i,c}, c ∈ {clay, grass, hard}, ΣΣα=0 (eqs. 11–12) — surface-specific ability vectors.
- **Fit:** Gibbs via rjags; 20,000 draws, 1,000 burn-in, thinning 20; coda diagnostics.

## 4. Equations & assumptions
Eqs. 1–13 as in §3. Assumes serve curve shape shared within player across opponents (opponent enters only via α_j); odd/even rally aggregation justified by winner-vs-error outcome-type asymmetry; serve advantage eventually vanishes to an α-difference asymptote; constraints encode domain knowledge where data are sparse. Sensitivity analysis for knot/order/L₀ choices in Orani (2019).

## 5. Features / target
Inputs: rally length x, server/receiver IDs, server-win indicator, court surface. Features: B-spline basis evaluations b_m(x), player ability parameters, court indicators. Target: p_{ij}(x) = P(server i beats receiver j at rally length x); secondary targets: total serve advantage f_i(0)−f_i(15), rally abilities α_{i,c}.

## 6. Validation design
Four-way comparison (Table 3): Kovalchik exponential-decay baseline vs. BILR (a) unconstrained, (b) partially monotone on (3,15], (c) fully monotone on [1,15] — via LPML, WAIC, DIC, RMSE. Out-of-sample: posterior-predictive serve curves for hold-out test servers (Gilles Simon, Bouchard) by drawing β from training posterior hyperparameters (hierarchical borrowing).

## 7. Numerical results / baselines
- **Partial monotonicity wins on all four criteria** (Table 3): LPML −52,739.1, WAIC 105,747.6, DIC 105,828, RMSE 19.32 — vs. exponential −52,813.7 / 105,821.3 / 105,876 / 22.52; unconstrained −52,760.4 / 105,853.9 / 105,818 / 20.71; fully monotone −52,744.9 / 105,790.4 / 105,875 / 20.37. ("No dramatic difference" — the win is principled shape + uncertainty, not fit leaps.) Unconstrained splines learn implausible increasing segments at intermediate rally lengths (Fig. 4).
- **Serve advantage magnitude:** P(server wins | x=1) = 0.83 men (95% CI 0.75–0.94), 0.69 women (0.55–0.83); at x=15 (advantage gone): men (0.51,0.64), women (0.46,0.55) — pure rally-ability contests.
- **Player findings:** Djokovic best overall rally ability (baseline α=0.35); by surface — clay: Nadal 0.52, grass: Federer 0.28, hard: Djokovic 0.34 (Table 4). Federer = first-shot winner, weak rallier; Nadal = both. WTA: Serena Williams highest baseline rally ability 0.26 (0.18–0.35); Kerber strong on hard/grass, weak on clay. **Trade-off conclusion:** top players separate on rally ability, not serve — "what makes a tennis player great is his/her rally ability."
- **Out-of-sample:** hold-out serve curves track observed points (Fig. 8) — hierarchical borrowing works for new players.

## 8. Code / data availability
Data: Jeff Sackmann's GitHub / R `deuce` (public). Fitting code: rjags Gibbs sampler, not released (Orani 2019 thesis has sensitivity details). Proposition 1 + eqs. 8–9 make it reimplementable in Stan in ~50 lines.

## 9. Leakage & limitations
- **Tennis application doesn't transfer** — no serve/rally structure in football; only the statistical machinery ports.
- **Modest fit gains** over the exponential baseline: the value is shape guarantees + sparse-region uncertainty, not predictive leaps — set expectations accordingly.
- **Knot/L₀ choices are hand-tuned** (sensitivity in an unpublished thesis); a GSE port needs its own sensitivity pass or adaptive knot selection.
- **Gibbs via rjags is dated** — a Stan/PyMC reimplementation with NUTS would be faster and more robust; the recursive ε construction is NUTS-friendly (positive-constrained decrements).
- **Identifiability handled by sum-to-zero**, which complicates online updating (adding a new player shifts all α's) — fine for batch GSE pipelines, awkward for streaming.

## 10. GSE overlap
**New methodology, no duplicate.** The existing-research map shows GSE fits many smooth probability curves (calibration, conversion rates, win probability by game state) but no documented monotone-constrained Bayesian spline tool — the map's calibration lane currently has no shape-guaranteed fitter. The transferable core: **impose monotonicity where domain knowledge demands it, learn freely where data are rich** (the paper's partial-monotonicity idea). Candidate GSE ports: (a) **calibration curves** — P(actual win | model-implied probability) must be non-decreasing; an isotonic B-spline gives a smooth calibrated mapping with credible bands instead of binned recalibration; (b) **4th-down/2-pt conversion probability vs. yards-to-go** — monotone non-increasing by physics, data sparse at long distances (exactly the paper's sparse-tail problem); (c) **completion probability vs. air yards / separation** — monotone decreasing; (d) **QB "advantage decay"**: early-drive scripted-play advantage vs. drive-play number — the closest structural analog to serve-advantage decay (scripted plays 1–15 outperform, then decay to baseline), testable on nflverse. Lane: engine calibration + coaching/4th-down content.

## 11. GSE implementation spec
- **Monotone calibration module:** replace binned recalibration with BILR: logit P(win) = Σ β_m b_m(model_prob) with β₁ ≤ β₂ ≤ … ≤ β_M (fully monotone), B-spline order 4, ~9 bases on [0,1], recursive ε-increment prior (mirror of eq. 8 with +ε). Fit in Stan on 2020–2025 game predictions vs. outcomes (spread/ML engine outputs). Output: smooth monotone calibration map + 95% bands; apply to all engine probabilities before publishing.
- **4th-down conversion curves:** logit P(convert | yards_to_go, field zone) with yards-to-go spline monotone non-increasing (partial: free below 2 yards where data are rich, constrained above), zone as additive effect — the paper's §3.4 covariate pattern. Feeds the existing 4th-down/coaching content with honest sparse-tail intervals.
- Effort: ~3 days (Stan model + pipeline wrapper); validate against current binned calibration.

## 12. Reproducible test
Dataset: GSE engine backtest predictions + outcomes, 2020–2025 (or nflverse-derived equivalents). Metric: out-of-sample log-loss and calibration error (ECE) of BILR-calibrated vs. binned-isotonic-calibrated probabilities, 5-fold by season (train 4 seasons, test 1). Success: BILR matches or beats binned isotonic on ECE with strictly monotone smooth curves and narrower credible bands in data-rich regions. Secondary: 4th-down conversion model — check monotonicity violations in current approach and Brier-score improvement on 2023–2025 holdout.

## 13. Acceptance / rejection gate
ADAPT the calibration module into the engine pipeline if BILR-calibrated probabilities achieve lower or equal out-of-sample log-loss vs. current calibration AND zero monotonicity violations by construction (the guarantee is the point). REJECT if it underperforms binned isotonic on log-loss by >1% (the smoothness prior is then hurting). The 4th-down application is independent — accept separately on Brier improvement.

## 14. Improvement experiment
Extend to **partially monotone 2-D surfaces**: conversion probability as f(yards_to_go ↓ monotone, field_position) with a tensor-product B-spline where monotonicity is enforced only along the yards axis via the ε-decrement construction on one margin — the paper does 1-D; a 2-D port would give GSE a "4th-down decision surface" with guaranteed sensible shape (never predicting higher conversion farther from the sticks) plus credible bands, directly usable for go/for-it coaching content and WP-edge calculations. Compare its Brier score against separate per-zone 1-D fits on 2023–2025; hypothesis: the joint surface borrows strength across field zones and wins where data are sparse (own-territory 4th-and-longs).
