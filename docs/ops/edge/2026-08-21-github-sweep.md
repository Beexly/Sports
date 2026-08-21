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
| *(none yet)* | | | | | |

## Negative-space log

Searches that returned nothing relevant. **This is data, not failure** — it is how we learn
what the market does not publish.

| query | axis | returned | interpretation |
|---|---|---|---|
| *(none yet)* | | | |
