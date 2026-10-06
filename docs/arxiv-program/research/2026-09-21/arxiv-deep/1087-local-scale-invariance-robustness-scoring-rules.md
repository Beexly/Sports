# Ledger 1087 — arXiv:1912.05642v4 — Local scale invariance and robustness of proper scoring rules

## Citation / full-text source

- arXiv:1912.05642v4 — full text: https://arxiv.org/pdf/1912.05642
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- Full-text URL: https://arxiv.org/pdf/1912.05642v4
- Verdict: **ADAPT**
- Lane: calibration_uncertainty
- Assigned paper 10 of 12 (reader 20), ledger sequence 1087

## Research question

How can proper scoring rules be made locally scale-invariant so that forecast comparisons are not dominated by high-variance observations?

## The idea in plain English

How you *score* a probabilistic forecast biases which model wins. Average CRPS rewards
getting easy, low-variance observations right and lets hard, high-variance observations
dominate the comparison: with varying predictive uncertainty, CRPS has unequal
"discriminatory power" across observations. The paper defines **local scale invariance**
via the scoring rule's scale function and builds a scaled CRPS (SCRPS) that gives every
observation equal weight regardless of its predictive variance, plus robust variants
that cap the influence of outliers.

## Key definitions and equations

Local scale invariance: a proper scoring rule `S` on a location–scale family
`Q_θ, θ=(μ,σ)` is locally scale invariant iff its scale function satisfies
`s(Q_θ) σ² = s(Q)` (equivalently the Hessian-based scale function is constant in `θ`).
Equal-weighting consequence used by the paper:
`σ_i² s(Q_{θ_i}) = s(Q)` — each observation contributes equally to discrimination.

Definitions (smaller = better, as stated in the paper):
- CRPS (kernel form): `S₁^ker(P,y) = ½ E|X−Y| − E|X−y|`, with `X,Y ~ P` independent.
- Scaled CRPS: `S₁^sta(P,y) = − E|X−y| / E|X−Y| − ½ log(E|X−Y|)`.
  This is the special case of the standardized kernel score
  `S_g^{−½ log(x)}(P,y) = − E[g(X,y)] / E[g(X,Y)] − ½ log E[g(X,Y)]`
  with `g(x,y) = |x−y|`.
- Robust CRPS: replaces `|x−y|` by the capped kernel
  `g_c(x,y) = 1(|x−y|<c)·|x−y| + 1(|x−y|≥c)·c` with cutoff `c`.
- Generalized proper kernel scores (Theorem 3): `S_g^h(P,y) = h(E[g(X,X')]) − E[g(X,y)]`
  is proper for any increasing concave `h` and negative-definite kernel `g`.
- A closed-form Gaussian version of SCRPS/rSCRPS is given in the appendix
  (the `E(μ,σ,c)` formulas for `N(μ̂,σ̂²)` forecasts), and closed forms for the
  Gaussian expected values under CRPS and SCRPS (Proposition 6).

Results:
- Proposition 1: the log score and Dawid–Sebastiani score are locally scale invariant;
  CRPS and Hyvärinen are not.
- Proposition 4: every standardized kernel score with `h(x) = −½ log(x)` is locally
  scale invariant. Dawid–Sebastiani is the standardized squared-distance kernel.
- Robust CRPS (capped kernel) is proper and robust but *not* locally scale invariant;
  rSCRPS loses local scale invariance (its scale function depends on `c/σ`).
  The paper leaves "simultaneously robust and locally scale invariant" as unresolved —
  conjectured impossible under its robustness definition.

## Experiments in the paper

- Stochastic volatility: 500 simulations, each a length-600 series. SCRPS and the log
  score select the true scale parameter far more often than CRPS and Hyvärinen, which
  are pulled toward high-volatility observations.
- Spatial Gaussian field: n = 100 and n = 200 locations, one injected outlier.
  The robust SCRPS performs well both with and without the outlier; plain CRPS is
  outlier-sensitive.
- Negative-binomial pedestrian counts: 227 street segments. Removing the ~20
  highest-mean observations halves the average CRPS, while SCRPS is much less
  sensitive — a real-data demonstration that average CRPS weights by predictive scale.
- Figure 9 decomposition (Appendix B): `S(P_i,y_i) = H(P_i) + (S(P_i,y_i) − H(P_i))`
  — the entropy term is data-independent and often dominates the score's variability;
  for CRPS the entropy cost of variance is linear, for SCRPS/log-score it is
  logarithmic, and the score-minus-entropy term has constant distribution across
  variances for SCRPS.

## GSE overlap

GSE compares engine variants and player-projection distributions across targets with
radically different uncertainty scales: QB passing yards (σ≈60), receptions (σ≈2.5),
game totals (σ≈14), anytime-TD probabilities, mixed DFS projections. If backtests are
ranked by average CRPS, high-variance targets (passing yards, game totals) dominate
engine selection and a model that is sharp on totals but sloppy on receptions can win
for the wrong reason. SCRPS normalizes by predictive variance so each game/pick
contributes equal discrimination — the same equal-weighting argument the paper proves.
It also strengthens ledger 1083's conclusion: that paper found the ignorance (log)
score identified the true system more efficiently than Brier/RPS; this paper shows the
log score's efficiency comes exactly from its local scale invariance — so GSE's
univariate winner already has the property SCRPS generalizes to distance-based
scoring. For outlier-heavy backtests (weather games, blowouts), the robust rCRPS
gives a principled alternative to GSE's ad-hoc winsorization.

## Implementation

A small `gse-backtest/scoring/` module (no new dependencies; works on ensemble
samples so it plugs into the existing simulator output):

1. **Inputs:** for each backtest row, an ensemble of simulated outcomes
   `{x₁…x_M}` from the engine's predictive distribution and the observed outcome `y`.
2. **SCRPS computation:** `Ê|X−y| = mean_m |x_m − y|`,
   `Ê|X−Y| = mean_{m<m'} 2|x_m − x_{m'}| / M(M−1)` (pairwise mean; O(M²) but M is
   small, or use the sorted-sample O(M log M) estimator).
   `score = − Ê|X−y| / Ê|X−Y| − 0.5 · log(Ê|X−Y|)`. Guard: if `Ê|X−Y| < ε`
   (degenerate/identical ensemble), skip the row and flag — SCRPS is undefined at
   zero variance.
3. **rCRPS option:** cap pairwise distances at `c` (default `c = 3·median(|x_m−y|)`)
   before both means; proper and blowout-robust.
4. **Model selection:** average SCRPS across all backtest rows; engine A beats B when
   `mean_SCRPS(A) < mean_SCRPS(B)`.
5. Report alongside the existing average-CRPS leaderboard as a second,
   scale-normalized ranking; log any rank flip between the two.

## Leakage

No leakage problem exists for the scoring rule itself — SCRPS is a function only of
the predictive distribution and the realized outcome. The *calibration* of this
paper's lesson for GSE, though, is a model-selection integrity issue: if GSE's
backtest pipeline reports average CRPS rankings without a scale-normalized twin,
its engine-selection decisions are silently weighted toward high-variance targets.
No train/test contamination is introduced by adopting the metric; keep the usual
no-future-data backtest discipline on the forecasts being scored.

## Limitations

- The formal local-scale-invariance theory applies to location–scale families; the
  negative-binomial application lies outside the formal definition.
- SCRPS is not robust: extreme outliers inflate `E|X−Y|` and distort the
  normalization; the robust variants sacrifice local scale invariance.
- Dependence among forecast observations is not handled; the theory assumes
  independent cases.
- SCRPS cannot score deterministic or near-zero-variance forecasts (division by
  `E|X−Y| ≈ 0`); identical ensemble members break it.
- A score both robust and locally scale invariant is conjectured impossible under
  the paper's robustness definition — no such score is offered.
- No sports data; all demonstrations are stochastic-volatility, spatial, and
  pedestrian-count examples.
- SCRPS is strictly proper only through the general transformation theorem (it is
  *proper*, with strict propriety inherited from the standardized-kernel
  construction) — incentives are correct but the paper's strictness argument is
  abstract, not empirical.

## Numeric gate

Adapt only if, on GSE's last 3 seasons of spread + total backtests, the engine
ranking under mean SCRPS differs from the ranking under mean CRPS for **≥ 2**
games-target pairs — i.e. the scale-normalization changes at least one engine
selection decision, demonstrating the scale dominance this paper predicts. If the
rankings agree everywhere, average CRPS is not distorting selection and SCRPS
stays a diagnostic, not the selector.

## Improvement experiment

Once SCRPS is the comparison metric, test whether GSE's ensemble *sharpness*
objectives also need it: train a small ablation where the projection-model loss
minimizes mean CRPS vs. mean SCRPS against held-out seasons and compare
out-of-sample pinball/log-score on high- vs. low-variance targets separately.
Expectation from the paper: the SCRPS-trained model will be closer on low-variance
props (receptions, completions) without losing totals. If the CRPS-trained model
wins everywhere, GSE's backtest target mix is not scale-heterogeneous enough for
this to matter — report that as a negative result.

## Reproducible test

- Take `gse-backtest` history: for each row, engine predictive ensembles + outcomes.
- Compute mean CRPS and mean SCRPS for engines v5.2.7 vs. v5.3 candidate; record
  both rankings.
- Recompute both after dropping the top-5% highest-variance rows (variance of the
  engine's own predictive ensemble).
- Pass criteria: (a) code reproduces the paper's Gaussian closed form for SCRPS to
  within 1e-6 against the appendix formula on synthetic `N(μ,σ²)` data; (b) the
  scale-dominance check in the gate holds or fails cleanly with numbers logged.

## Verdict

**ADAPT.** SCRPS gives GSE a scale-normalized engine-selection metric with a
closed-form Gaussian version and ensemble estimators that drop straight into the
backtest pipeline. It also explains *why* ledger 1083's log-score winner works
(log score is locally scale invariant). Adopt SCRPS as the second leaderboard
alongside average CRPS, use rCRPS for outlier-heavy slices, and let the numeric
gate decide whether it becomes the primary selector. Skip nothing on the
guardrails: skip degenerate ensembles, keep no-future-data discipline, and don't
expect robustness from SCRPS itself.
