# Bayesian libraries, opened past the README

Fetched with `gh api` on 2026-10-22. 8 distinct links. The large trees were not vendored. The files below were opened.

| repo | licence | stars | size | verdict |
|---|---|---:|---:|---|
| CamDavidsonPilon/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers | MIT | 28185 | 172 MB | not vendored |
| Theano/Theano | NOASSERTION; LICENSE.txt says all rights reserved | 10010 | 68 MB | not copied |
| pymc-devs/pymc | GitHub NOASSERTION; LICENSE file says Apache-2.0 | 9818 | 546 MB | not vendored |
| markdregan/Bayesian-Modelling-in-Python | NONE | 2503 | 16 MB | not copied |
| pymc-labs/pymc-marketing | Apache-2.0 | 1290 | 2.7 GB | transforms reimplemented |
| pymc-labs/CausalPy | Apache-2.0 | 1208 | 581 MB | 2x2 contrast reimplemented |
| gkbarbosa/bayesian_nb_model | NONE | 0 | 3 KB | correction reimplemented |
| stefanosbalaskas/gp3bayespy | MIT | 0 | 3 MB | evidence band added |

## What was opened

`pymc-marketing` component directory: additive_effect, budget_optimizer, builders, causal, components, counterfactual, events, fourier, hsgp, incrementality, lift_test, media_transformation, mmm, price_response, sensitivity_analysis, tvp, and the rest of that listing. A recursive tree of the 2.7 GB repo exhausted the GitHub CLI process, so the rest of the pass used direct file reads.

Opened `pymc_marketing/mmm/components/adstock.py`. Geometric adstock calls `geometric_adstock`. The weight at lag t is `alpha^t`. Half-life maps as `alpha = 0.5^(1/h)`.

Opened `pymc_marketing/mmm/transformers.py`. Geometric weights are `alpha ** lags`. Logistic saturation is `(1 - exp(-lambda x)) / (1 + exp(-lambda x))`. Michaelis-Menten is `alpha * x / (lambda + x)`. Hill is `1 - kappa^s / (kappa^s + x^s)`, and `f(kappa) = 0.5` for any slope.

Opened `pymc_marketing/mmm/components/saturation.py`. Classes present: Logistic, InverseScaledLogistic, Tanh, TanhBaselined, MichaelisMenten, Hill, HillSigmoid, Root, Log, NoSaturation.

`CausalPy` experiment modules present: augmented synthetic control, difference in differences, instrumental variable, interactive fixed effects, interrupted time series, inverse propensity weighting, panel regression, piecewise ITS, prepostnegd, regression discontinuity, regression kink, staggered DiD, synthetic control, synthetic difference in differences, up-down geolift. Opened `diff_in_diff.py`. The reported effect is the group-by-post interaction, which in an additive model is the 2x2 contrast.

`gkbarbosa/bayesian_nb_model` is one script. It puts a latent true x under a noisy observation and uses a negative-binomial likelihood. No licence file. The script was not copied. The classical reliability correction was.

`gp3bayespy` package modules include binary, duration, loo, multilevel_mediation, posterior, ppc, sensitivity, specification. Opened `sensitivity.py`. `_classify_upper` returns pass, review, or fail. `ModelEvidence` sets `automatic_model_selection` to false and says no aggregate adequacy verdict is generated.

`Theano/LICENSE.txt` says all rights reserved. The project is abandoned. It was not copied. PyMC's LICENSE file says Apache-2.0 even though the GitHub licence field is NOASSERTION. The 546 MB tree was not vendored. NUTS is not a TypeScript port.

`Bayesian Methods for Hackers` is MIT and 172 MB of notebooks. They were not pasted. Hierarchical pooling is already in `packages/prediction-engine/src/bayesian/hierarchical-shrinkage.ts`.

`markdregan/Bayesian-Modelling-in-Python` has no licence. The four section notebooks were not copied. Partial pooling is already in the engine.

## Added

- `geometricAdstock`, `alphaFromHalfLife`, `hillWithSlope`, `michaelisMenten`, `logisticSaturation` in `packages/prediction-engine/src/models/media-transforms.ts`
- `differenceInDifferences` in `packages/prediction-engine/src/causal/two-by-two-did.ts`
- `classifyUpper` and `automaticAdequacyVerdict` in `packages/prediction-engine/src/evaluation/evidence-band.ts`
- `reliabilityCorrectedSlope` in `packages/prediction-engine/src/evaluation/reliability-ratio.ts`

Negative binomial for red-zone touchdowns is already in the engine. This pass did not add a second one.
