# SGP Copula Engine — theory, Higham repair, and honest limits

Artifact: `intelligence/sgp/sgp_copula_engine.py`
Tests: `intelligence/sgp/test_sgp_copula_engine.py` — **26 passed** (verified fresh, `-o pythonpath=.`)
Bucket: `docs/predictions/research/2026-10-11/`
Filed late: this document was **missing** on first delivery of Mission 1 and was written
during the session audit. The code and tests had landed; the research filing and the
`gse/sgp-engine` bus broadcast had not.

---

## 1. Why a copula at all

A same-game parlay is a bet on a joint event, and books price joint events with
correlation either ignored or handled by primitive linear heuristics. If the legs
are positively correlated (a QB's passing yards and his WR's receiving yards share
a drive), the true joint probability of "both over" is **higher** than the product
of the marginals, and a book pricing them as independent is selling the over at
too long a price.

The engine computes the true joint by simulation rather than by assuming a
multivariate normal, because the marginals here are not normal — passing yards are
right-skewed and non-negative, passing touchdowns are discrete counts.

## 2. Marginals

| Marginal | Used for | Notes |
|---|---|---|
| `PoissonMarginal` | passing TDs, discrete counts | matched on its rate |
| `LogNormalMarginal` | passing / receiving / rushing yards | non-negative, right-skewed |
| `NormalMarginal` | whatever the book itself quotes as a mean/sd pair | round-trips through its own ppf |

Each marginal is a real distribution object exposing a CDF/PPF pair, and the
tests assert that each reproduces its declared moments (`test_poisson_marginal_matches_its_analytic_moments`,
`test_lognormal_marginal_matches_its_declared_mean`,
`test_normal_marginal_round_trip_through_its_own_ppf`). This is what lets the
simulation be checked against analytic answers instead of against itself.

## 3. Copulas

| Copula | Kernel | Why it is here |
|---|---|---|
| `GaussianCopula` | Cholesky of the correlation matrix | the neutral baseline; correct when dependence is symmetric |
| `StudentTCopula(nu=4)` | Cholesky + a chi-square scale mixture | fatter joint tails — joint blowups happen more often than a Gaussian allows |
| `ClaytonCopula(theta)` | gamma-frailty construction | **asymmetric lower-tail** dependence: legs collapse together, but do not spike together |

The three are not interchangeable and the tests pin the difference:
`test_student_t_has_fatter_joint_tails_than_gaussian` and
`test_clayton_is_asymmetric_lower_tail_dependent`. A same-game parlay is exactly the
kind of bet where a Gaussian's tail is the wrong shape: the catastrophic case is
"my QB got hurt and my WR's yards vanished", which is lower-tail co-movement.

`test_frechet_hoeffding_bounds_hold_in_high_dimension` checks every copula against
the Fréchet–Hoeffding bounds, and `test_all_three_copulas_reproduce_the_marginals`
checks that the copula changes the *dependence* and not the marginals — the failure
mode that would silently corrupt every price.

## 4. Higham (1988) nearest-PSD repair

The engine needs a Cholesky factor of the correlation matrix. An empirically
estimated correlation matrix frequently is **not** positive semi-definite — a
three-way correlation measured from short samples can be mutually inconsistent
(rho_ab = 0.9, rho_bc = 0.9, rho_ac = -0.9 is not realizable) — and Cholesky then
raises and the whole parlay fails to price.

`nearest_psd_higham` implements Higham's nearest symmetric PSD matrix in the
Frobenius norm: symmetrize, then iterate the Dykstra-style correction that pins the
diagonal to 1 while projecting the spectrum non-negative. `is_psd` and
`correlation_from_covariance` support it, and the repair runs automatically inside
the copula constructor (`corr = nearest_psd_higham(corr)`), so **no caller has to
know it happened** — which is the point.

Verified by test, exactly as the mission required:
* `test_higham_repairs_intentionally_non_psd_matrix` — asserts every eigenvalue is
  `>= 0` after repair;
* `test_repair_makes_cholesky_succeed_on_an_empirical_matrix` — the Cholesky that
  would have raised now succeeds;
* `test_higham_preserves_an_already_psd_matrix` — a valid matrix is returned
  essentially unchanged, so repair is not a silent global mutation;
* `test_copula_constructor_repairs_without_raising`.

## 5. Pricing and edge

`price_sgp(legs, correlation, copula=..., n_draws=50_000)` runs the mission's
specified 50,000-draw joint simulation and returns an `SGPResult` carrying the true
joint probability, the book's implied price, and the alpha.

The correlation bound the mission asked for is pinned:
`test_positive_correlation_increases_joint_probability_vs_independent_legs` asserts
that with `rho = 0.65` on QB yards + WR yards, `P(QB over AND WR over)` is strictly
greater than the independent product; `test_negative_correlation_lowers_the_joint_probability`
asserts the mirror; `test_gaussian_correlation_is_monotone_in_rho` asserts
monotonicity across rho.

Edge handling is more careful than "+15% means edge", and the tests show why:
* `test_edge_is_isolated_against_a_de_vigged_book_price` — alpha is measured against
  a **de-vigged** price, not a raw one;
* `test_vigged_price_alpha_is_flagged_as_conservative` — when only a vigged price is
  available the alpha is labelled conservative rather than presented as clean;
* `test_sub_noise_alpha_is_not_reported_as_edge` — a Monte Carlo standard error is
  computed and a surplus inside the noise is not called an edge;
* `test_no_edge_declared_when_the_book_price_is_fair`;
* `test_seeded_runs_are_reproducible` — the RNG is seedable, so a price is
  reproducible rather than a fresh roll each time.

---

## 6. Honest limits (read before trusting any number it emits)

1. **The engine has never been pointed at a real correlation or a real book SGP
   price.** Every test uses constructed inputs. Its correctness as *mathematics* is
   well covered; its accuracy as a *model of a real parlay market* is untested and
   unknown.
2. **Correlations must come from somewhere real, and today they do not.** The
   dependency structure is an input. Nothing in the repo currently estimates
   same-game leg correlations from data, so the engine is a price calculator with no
   fuel line attached.
3. **No book SGP prices are ingested.** There is no feed of multi-leg prices in the
   repo, so the edge comparison in production would have no counterparty price to
   compare against. (The de-vig side of that gap is separately blocked: see the
   props spec — the harvested sheets carry lines and no prices.)
4. **50,000 draws bounds the resolution of the alpha.** Sub-noise alpha is correctly
   refused rather than reported, but the practical floor on a detectable edge is set
   by the draw count.
5. **The Clayton copula is one-parameter and exchangeable.** Real same-game
   dependence is neither, so treat it as a shape, not a fit.

## 7. What would make this real (ranked)

1. **Estimate same-game leg correlations from historical play-by-play** (nflverse is
   free and already in the repo's stack). Without this the engine prices a
   correlation you made up.
2. **Ingest multi-leg SGP prices** — any of the props/odds paths — so the edge has a
   counterparty price. This is the same missing-prices blocker the props engine hit.
3. **Cross-check the joint against the marginals' own historical co-movement** once
   correlations are estimated, so the copula family choice is falsifiable rather
   than assumed.
