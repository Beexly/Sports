# Ledger 1089 — arXiv:2004.14108v2 — Static and Dynamic Models for Multivariate Distribution Forecasts: Proper Scoring Rule Tests of Factor-Quantile vs. Multivariate GARCH Models

## Citation / full-text source

- arXiv:2004.14108v2 — full text: https://arxiv.org/pdf/2004.14108
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- Full-text URL: https://arxiv.org/pdf/2004.14108v2
- Verdict: **ADAPT**
- Lane: calibration_uncertainty
- Assigned paper 12 of 12 (reader 20), ledger sequence 1089

## Research question

How can an entire joint predictive distribution be forecast from univariate quantile regressions on common factors, and how do factor-quantile forecasts compare to multivariate GARCH under proper scoring rules?

## The idea in plain English

Forecasting an entire *joint* distribution (not just one margin at a time) is
essential for portfolio-style decisions — in finance, asset allocation; in GSE,
DFS lineups, same-game parlays, prop portfolios. The paper introduces the Factor
Quantile (FQ) model: estimate each margin by univariate quantile regressions on
common factors, interpolate the estimated quantiles into a full conditional CDF
with shape-preserving (PCHIP) interpolation, then glue the margins into a joint
distribution with a conditional copula. Two latent-factor variants: FQ-A
("alpha" version — factors are the *last* principal components, intercept
captures the point forecast with little variation) and FQ-B (bagging over a
Gaussian model of quantile-prediction uncertainty, 25M samples per margin).
It then runs the first large-scale horse race of static vs dynamic joint
distribution forecasters — FQ vs empirical-distribution-function (EDF)
marginals+Gaussian copula vs CCC/DCC-GARCH with Student-t E-GARCH margins —
judged by proper multivariate scoring rules under the Model Confidence Set
protocol.

## Key definitions and equations

- FQ construction, three stages:
  1. `y_t = α^(τ) + B^(τ) x_t + ε_t^(τ)` — factor quantile regressions on a grid
     `Q` of quantile levels (paper uses `|Q| = 9`, tail-concentrated:
     `{0.001, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.999}`).
  2. PCHIP-interpolate `(τ, ŷ_i^(τ)|x*)` into conditional marginal CDFs
     `F̂_i|x*`.
  3. Conditional copula: `F̂(y|x*) = C(F̂_1(y_1|x*), …, F̂_n(y_n|x*) | x*)`.
- Latent factors = principal components of `y`'s own covariance matrix
  (endogenous, no external data needed); bagged predictive density
  `F̂^bag = B⁻¹ Σ_b F̂^b`.
- Weighted CRPS (univariate, strictly proper):
  `C_w(F,y) = 2∫₀¹ (1{y ≤ F⁻¹(α)} − α)(F⁻¹(α) − y) w(α) dα`,
  with `w(α)=1` (uniform), `α(1−α)` (centre), `α²`/`(1−α)²` (tails),
  `(2α−1)²` (both tails).
- Energy score (multivariate, strictly proper):
  `ES(F,y) = −½ E_F‖Y−Y'‖ + E_F‖Y−y‖`.
- Variogram score of order p (proper): 
  `VS_p(F,y) = Σ_{i,j} (|y_i−y_j|^p − E_F|Y_i−Y_j|^p)²`.
  Crucially: the energy score is *insensitive to correlation misspecification*
  (Pinson & Girard 2012); the variogram score is the dependence-structure check.
- Model Confidence Set (Hansen et al. 2011): sequential equivalence tests at
  75%/90% with bootstrap variance and worst-model elimination; a model "wins"
  by surviving in `M*_α`.

## Experiments in the paper

- Three 8-dimensional daily systems, forecasts re-calibrated daily with rolling
  2000-obs (and 250-obs for static models) windows: 8 USD exchange rates
  (1999–2018), US Treasury term structure (1994–2018), 8 Bloomberg commodity
  indices (1991–2018).
- PCHIP with `|Q|=9` reproduces the `|Q|=500` distribution (KS test can't
  distinguish at 1%); kernel needs 35 nodes, step function 50 — 4×+ compute
  savings, and the paper's observed quantile grids never cross.
- Univariate (weighted CRPS, 24 series): FQ-A(250) in the 90% MCS 50% of the
  time; CCC-GARCH 37.5%; FQ wins interest rates decisively, GARCH wins FX and
  commodities on centre/uniform weights.
- Multivariate (energy + 3 variogram scores): FQ-A(250) best overall —
  58.3% MCS inclusion vs DCC-GARCH 50%; FQ beats EDF despite identical copula
  and window, showing latent-factor smoothing beats raw historical simulation.
- FQ calibrates 30%+ faster than CCC-GARCH, 5×+ faster than DCC-GARCH, with no
  convergence failures (DCC needed manual parameter surgery on commodities).
- Smaller (250-obs) calibration windows usually beat 2000-obs — stationarity
  violation over long windows.
- FQ-A ≥ FQ-B everywhere; the simple alpha version dominates the complex
  bagging version.

## GSE overlap

This is the joint-distribution forecasting recipe GSE needs for anything that
prices *correlated* outcomes: same-game parlays (QB yards ↔ WR receptions ↔
game total), DFS lineup covariance (stacking), prop-portfolio risk. GSE's
simulator ensembles produce joint draws, but two gaps exist that this paper
fills:

1. **Evaluation protocol.** Ledger 1085 (1910.07325v1) already adapted energy
   score + Diebold–Mariano for joint simulators. This paper adds the missing
   half: the energy score alone cannot see broken correlations — the variogram
   score is the dependence-structure diagnostic. Adopt `VS_p` (p = 0.5, 1, 2)
   as the joint-simulator correlation check; a simulator can pass energy score
   while getting stacking correlations wrong, and GSE prices parlays on exactly
   those correlations.
2. **A cheap joint-distribution builder.** The FQ recipe (per-target quantile
   regressions on latent PCA factors of the projection residuals + PCHIP +
   copula) is a fast alternative to fitting a full joint model over dozens of
   correlated props — univariate quantile regressions scale linearly in the
   number of targets, and FQ-A needs no bagging. For GSE's player-prop residual
   structure (latent factors ≈ game script, pace, weather), the endogenous-PCA
   design needs no external factor data.
3. **Model Confidence Set discipline** for engine selection: sequential
   equivalence testing with bootstrapped variance instead of eyeballing
   average-score leaderboards.

## Implementation

1. **Variogram-score evaluator** (`gse-backtest/scoring/`): for each backtest
   row, engine joint ensemble `{x⁽ᵐ⁾}` over the K correlated targets and
   realized vector `y`: compute `VS_p` for p ∈ {0.5, 1, 2} from the formula
   above (ensemble estimate of `E_F|Y_i−Y_j|^p`). Report per-row alongside
   energy score; rank engine variants by mean `VS_1`.
2. **FQ-style joint forecaster (pilot):** for one correlated prop set (e.g.
   QB pass yards / attempts / completions + team total):
   - Collect engine residual vectors; PCA → first m latent factors.
   - Per-target quantile regression on the factors at the paper's 9-node
     tail-concentrated grid; PCHIP into marginal CDFs.
   - Fit Gaussian (or t) copula on the PIT residuals.
   - Compare vs current joint simulator on energy score *and* variogram score.
3. **MCS wrapper:** implement the Hansen et al. sequential elimination with
   block bootstrap (block length from AR fit on score differentials) for
   engine-variant comparison; run at 75%/90%.

## Leakage

No leakage in the metric itself. Two cautions the paper flags that apply to
GSE: (a) rolling calibration windows must not bleed future data — the paper's
250-vs-2000 result argues for *shorter* honest windows anyway; (b) the bagging
variant (FQ-B) resamples from a Gaussian fit to quantile predictions, which
smooths over regime breaks — GSE must not let the smoothing step see
post-break data when scoring pre-break forecasts.

## Limitations

- Finance data only (FX, rates, commodities); no sports application. Sports
  correlations (game script) are more regime-dependent than FX vol clustering.
- Gaussian copula used throughout the empirical study; tail dependence (blowout
  correlations) likely understated — the Apple/P&G illustration preferred a
  Gumbel copula, but the horse race didn't use it.
- 8 dimensions max (GARCH couldn't scale); GSE prop sets are larger — FQ
  scales, but the paper's empirical validation doesn't cover n = 50+.
- `|Q| = 9` grid sufficiency was shown for smooth return distributions; GSE's
  discrete-ish targets (receptions, TDs) may need denser grids and the
  non-crossing guarantee is empirical, not proven.
- MCS at 75%/90% on long samples can declare single winners confidently; on
  GSE's shorter backtests the sets may include everything (low power).
- Quantile crossing wasn't observed but no enforcement is built in; a
  production implementation needs a non-crossing constraint.

## Numeric gate

Adapt only if, on one GSE correlated-prop backtest set, the FQ-A-style pilot
joint forecaster matches the current joint simulator on mean energy score within
**3%** while calibrating faster — the paper's speed argument only matters if
accuracy is preserved. Separately, if the variogram score VS_1 ranks two engine
variants differently than the energy score does (demonstrating the
dependence-blindness this paper documents), adopt VS_p as a permanent
correlation diagnostic regardless of the pilot outcome.

## Improvement experiment

Once `VS_p` is in the pipeline, run a correlation-stress test: deliberately
break the simulator's cross-target correlations (shuffle each target's
ensemble independently) and confirm energy score barely moves while `VS_1`
degrades sharply. This is the Pinson–Girard validation inside GSE's own stack.
Then test a t-copula or empirical-beta copula in the FQ pilot against the
Gaussian copula on tail-weighted CRPS of parlay legs.

## Reproducible test

- Implement `VS_p` and the MCS wrapper; unit-test `VS_p` against a closed-form
  Gaussian case (independent margins ⇒ `E|Y_i−Y_j|^p` known analytically).
- Reproduce the paper's qualitative finding on synthetic data: two joint
  forecasters with identical margins but different correlations must tie on
  energy score and separate on `VS_1`.
- Pilot FQ-A on one GSE prop set; log mean ES, `VS_{0.5,1,2}`, and calibration
  time vs the current simulator.

## Verdict

**ADAPT.** The variogram score is the dependence-structure diagnostic GSE's
joint-simulator evaluation is missing (energy score alone is correlation-blind),
the FQ recipe is a fast scalable joint-distribution builder for correlated
props and parlays, and the MCS protocol disciplines engine selection. Pilot on
one prop set; promote on the gate.
