# MinimalSurface, mmm-pymc, football-data, causality handbook

Fetched with `gh api` on 2026-10-22. 4 distinct links.

| repo | GitHub licence | stars | verdict |
|---|---|---:|---|
| Mathias-Fuchs/MinimalSurface | GPL-3.0 | 19 | not copied |
| MatheusRabetti/mmm-pymc | NONE | 0 | Hill formula reimplemented |
| MatheusRabetti/football-data | NONE | 0 | conjugate update reimplemented |
| MatheusRabetti/python-causality-handbook | NONE | 0 | not copied |

## Added

Gamma-Poisson goal projection. `football-data` has no licence file. Its model file states the conjugate update `Gamma(alpha + goals, beta + matches)` and a Jeffreys prior of historical goals and matches plus 0.5. The engine function returns the posterior mean rate and the expected season total. It does not draw samples and does not copy their class. Dixon-Coles is already in the engine; this is the single-rate conjugate update, not a replacement. File: `packages/prediction-engine/src/models/gamma-poisson-goals.ts`.

Hill saturation. `mmm-pymc` has no licence file. Its saturation module states `spend / (spend + k)`, with `k` the half-saturation point. That formula is reimplemented. Their PyMC model, Streamlit app, and trained posterior file were not copied. File: `packages/prediction-engine/src/models/hill-saturation.ts`.

## Not copied

`MinimalSurface` is GPL-3.0. It is a Grasshopper plugin that approximates a minimal surface with three harmonic functions. GPL-3 code was not copied. It is not a sports measurement.

`python-causality-handbook` is a fork of `matheusfacure/python-causality-handbook` (MIT, 3,494 stars). The fork itself has no licence file on GitHub. The notebooks are a published handbook. They were not pasted. Causal estimators are already in this engine.
