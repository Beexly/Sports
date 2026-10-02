# dfs-with-r/coach

**Stars:** 51 | **License:** GPL-3.0 | **Pushed:** 2021-12-08 | **Language:** R | **Forks:** 14

## 1. Vision
An R package for DFS lineup optimization with a modeling-first API: read a site's salaries export into a tibble, declare the contest as a *model* (site + sport constraints), optimize L lineups with exposure caps and projection randomness, and write submission files. It exists to make lineup optimization feel like statistical modeling, not scripting.

## 2. The Ask
- R, `remotes::install_github("dfs-with-r/coach")`.
- Salaries CSV exported from the contest page (`read_dk()`, etc.).
- **Your own `fpts_proj` column — mandatory.** The README shouts this: "This is very important! If your projections aren't good then your optimized lineups won't be good either."
- Then: `model <- model_dk_nfl(data)`; `optimize_generic(data, model, L = 3)`; `write_lineups(results, "mylineups.csv", site = "draftkings", sport = "nfl")`.

## 3. Constraints
- **GPL-3.0 — copyleft.** Cannot be embedded in or linked from GSE's codebase without open-sourcing the derivative work. Study-only for a commercial engine. This is the hard constraint.
- **Maintenance:** pushed 2021-12-08 — stale ~5 years. The R ecosystem has moved on; DK/FD roster rules may have drifted.
- R-only — doesn't fit GSE's TypeScript/Python stack without a rewrite.

## 4. GSE lens
- **Two patterns worth re-implementing despite the license:** (a) per-player `max_exposure` vectors — exposure as a first-class, per-player input column, not a global knob; (b) projection *randomness injection* — a user-supplied function over `fpts_proj` applied before each lineup is generated, which is the poor-man's version of chanzer0's distribution sampling. GSE's optimizer has neither.
- **The README's core sermon is GSE's core problem restated:** "If your projections aren't good then your optimized lineups won't be good either." GSE's optimizer currently consumes an unwired signal registry and a sample slate — the projections feeding it are the weakest link, exactly as this 2021 README warns.
- **The model-as-object pattern** (`model_dk_nfl(data)` encapsulating all site/sport constraints, then `optimize_generic` against it) is cleaner than stringly-typed rule sets — a good API shape for GSE's own optimizer rebuild.
- No gap manufactured on language choice; R is simply not GSE's stack.

## 5. Verdict
**REBUILD** — GPL-3.0 forbids adoption into a commercial engine. Re-implement the exposure-vector and randomness-injection patterns and the model-object API shape in GSE's own code.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/dfs-with-r/coach
- gitdiagram: https://gitdiagram.com/dfs-with-r/coach
- star-history: https://star-history.com/#dfs-with-r/coach (51 stars)
- github.dev: https://github.dev/dfs-with-r/coach
