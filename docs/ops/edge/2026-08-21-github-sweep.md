# GitHub sweep — 2026-08-21

Research findings from the overnight loop (task T10). **The point of this file is not the
findings — it is the `action enqueued` column.** A finding that sits here unapplied is
worthless. Score 4–5 means you append a concrete apply task to
`docs/ops/hermes/OVERNIGHT-2026-08-21-QUEUE.md` as `TODO` before moving on.

## Rules (binding)

**Clearance posture.** GitHub is **not** registered in
`apps/web/lib/scraping/source-rights-registry.ts`, so a scripted extraction would return
`SOURCE_NOT_REGISTERED` → `allowed=false` → the job must stop. What you may record: **URLs,
repo/issue metadata, and your own written assessment** — the "derived signals we generate,
source references" category CLAUDE.md permits. What you may **never** do: paste README
bodies, issue text, or article prose into this or any committed file. Registering GitHub as a
source is a human review step, not something to self-grant.

**Contradiction rule.** If a finding appears to invalidate a frozen spec decision, record it
here, flag it **LOUD**, and do **not** act on it. Frozen means frozen until the founder is
awake. Amendment v2.2's `D_i` note is the template.

## Scoring

| Score | Meaning | Action |
|---|---|---|
| 5 | Directly closes a named open gap below | Enqueue apply task, cite it here |
| 4 | Strong method match, needs adaptation | Enqueue apply task |
| 3 | Relevant background, no immediate action | Record only |
| 0–2 | Collision or noise | Record the term that produced it, so it can be banned |

## The six axes

1. **Code search** — implementations buried inside repos not named for the method
2. **Issues + discussions** — negative results (*"tried X, it didn't work"*) are free
   Kill-Ledger knowledge and are often more valuable than published successes
3. **Commits** — methodology changes, e.g. *"now estimates dispersion instead of fixing it"*
4. **Users** — people doing sports + empirical Bayes; their repo lists are a curated feed
5. **Packages** — a tested existing implementation beats writing one
6. **Negative space** — if exhaustive search finds **no** public working MLB-totals edge,
   that absence is itself a finding. Record it. It is evidence about the market, not a
   failed search.

## Open gaps these sweeps are aimed at

| Gap | Where it comes from | Search target |
|---|---|---|
| `phi = 12` NB2 dispersion, inherited and never re-derived | `nb-rbpf.ts:263`, carried into prereg §3 pt 9 | NB dispersion estimation / shrinkage (the `edgeR` class of method) |
| `s² = 0.04` fallback and the 8-game threshold — unexplained constants | prereg §3 pt 5 | Anscombe pooled variance on count data |
| Back-transform applies the inverse **once to the average** — a Jensen-gap approximation | prereg §3 pt 8 | back-transform bias in variance-stabilized means |
| Rest-days / schedule-density have no admitting mechanism | prereg §3 pt 3, deferred | Fay-Herriot regression-mean shrinkage |

## Search terms

**Validated — every one produced a real hit during the 2026-08-20 session:**
`empirical Bayes baseball` · `Efron-Morris` · `James-Stein unequal variance` ·
`negative binomial dispersion shrinkage` · `e-process` · `anytime-valid inference` ·
`test supermartingale` · `Shin devig` · `closing line value` ·
`isotonic calibration sports` · `beta-binomial shrinkage batting`

**Banned bare terms — each proven to return pure collisions:**

| Term | What it actually returns |
|---|---|
| bare `MVE` | Multi-View Environment (3D photogrammetry), Model-based Value Expansion (RL) |
| bare `edge` | edge computing / Kubernetes / CDN / IoT |
| bare `shrinkage` | retail theft and inventory loss |
| bare `ECE` | Electrical & Computer Engineering course numbers |

Always pair a domain word with a method word. `shrinkage` alone is noise;
`empirical Bayes shrinkage baseball` is signal.

## Findings

| url | axis | what it is | score | gap it touches | action enqueued |
|---|---|---|---|---|---|
| https://github.com/small-area-estimation/Heteroscedastic-Fay-Herriot | Code | REML fitting algorithm for heteroscedastic Fay-Herriot (HFH) model with usage example and synthetic data | 5 | Gap 4: rest-days/schedule-density Fay-Herriot regression-mean shrinkage | T13 · enqueue to apply HFH to rest-days feature, adapt to NB2 context |
| https://github.com/broxtronix/pymultiscale/blob/master/pymultiscale/anscombe.py | Code | Exact inverse Anscombe transform with bias correction for Poisson-Gaussian noise (Makitalo 2012) | 4 | Gap 3: back-transform Jensen-gap bias | T13 · enqueue to evaluate exact inverse as bias-corrected back-transform alternative |
| https://github.com/gu-mi/NBGOF | Code | R package for NB goodness-of-fit tests and NB dispersion models | 4 | Gap 1: phi=12 NB2 dispersion never re-derived | T13 · enqueue to evaluate NBGOF dispersion estimators for empirical phi |
| https://github.com/stan-dev/rstanarm/blob/master/vignettes/pooling.Rmd | Code | rstanarm vignette: Baseball Hits (Efron and Morris 1975) — the exact same shrinkage model family | 4 | Gap 1 + Gap 2: pooled variance on baseball count data | T13 · enqueue to cross-check s2=0.04 fallback against stan-dev/rstanarm bball2006 fixture |
| https://github.com/thebioengineer/TidyX | Code | James-Stein shrinkage estimator applied to player batting averages | 4 | Gap 2: Anscombe pooled variance threshold | T13 · enqueue to compare shrinkage-to-means implementation |
| https://github.com/muneebalam/Hockey/blob/master/NHL/Posts/CBJ%20Bayesian%20evaluation.ipynb | User | NHL empirical Bayes evaluation notebook referencing baseball empirical Bayes | 3 | Gap 2 + Gap 4: empirical Bayes sports repo curation | Record only — background on sports EB practitioners |

## Negative-space log

Searches that returned nothing relevant. **This is data, not failure** — it is how we learn
what the market does not publish.

| query | axis | returned | interpretation |
|---|---|---|---|
| `site:github.com sports betting "closing line value" "e-process" "anytime valid"` | Issues+Commits | 0 results | Negative-space: no GitHub repo (issues, commits, or code) references "e-process" + "anytime valid" + sports/CLV together. The conformal/e-variable literature is concentrated on arXiv + papers, not GitHub implementations in sports. This confirms the e-process approach is not replicated in public sports code — it is genuinely novel in this context. |
| `site:github.com MLB "total runs" "Poisson" "over under" prediction` | Code | 0 results | Negative-space: no GitHub repo implements an MLB total-runs Poisson or NB model with "over under" prediction in its title/description. Sports prediction repos on GitHub are dominated by soccer xG and NBA point-spreads, not MLB totals. |
| `"s²" OR "sigma squared" "Anscombe" "pooled variance" OR "0.04" baseball site:github.com` | Code | 0 relevant results | Negative-space: no GitHub repo addresses the specific s²=0.04 fallback / 8-game threshold for Anscombe pooled variance on baseball count data. The constant is internal to this project's prereg. |
