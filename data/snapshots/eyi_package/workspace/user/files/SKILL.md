---
name: gse-rating-engines
description: "Price and check Galaxy Sports rating engines: Bradley-Terry, Dixon-Coles, normal-margin alt ladders, Shin devig, Kelly, props. Use when landing engine_math.py, a rating atlas, props_optimizer, or a /props bot command into Beexly/Sports or agent-bus. Not for Signal Origin, FrameFit, or the stock desk."
type: workflow
lifecycle: active
---

# GSE Rating Engines — Research packet, not production

Use this when a paste or request touches the rating atlas, `engine_math.py`, `props_optimizer.py`, or a bot `/props` command for Galaxy Sports. Production scoring stays in `packages/prediction-engine` (TypeScript). This skill does not publish picks.

## Workflow

1. Treat the paste as research. Do not push `main`. Do not flip `MODEL_VERSION`, trust gates, Stripe, or `publishes_pick`.
2. Land only under `docs/research/YYYY-MM-DD/rating-atlas/` on a research branch in Beexly/Sports. Dated folders already live under `docs/research/`.
3. agent-bus gets a pointer note only. Do not invent a `/props` handler. Do not delete `/xray`. The paste that targets `/var/minis/workspace` and `divergence.py` is not in either repo.
4. Run `python3 scripts/engine_math.py` and `python3 scripts/props_optimizer.py` from this skill before calling a file runnable. Both print a self-check.
5. Read `references/conventions.md` before changing a spread, a devig, or a status line. Read `references/taxonomy.md` before marking an engine implemented.

## Hard rules

- `listed_spread` is the book home number, favorite negative. `mu_margin = -listed_spread`. A fair −3.5 covers at 50%.
- Shin uses the closed root in `scripts/engine_math.py`. Do not restore the pasted quadratic. It returns `z = 0` on every overround book.
- Do not mark Shin, Kalman, teasers, CRPS, or the HMM as production. They are sketches. Dixon-Coles time decay, a real copula, Glicko, Colley/Massey, and CLV are taxonomy only.
- Part 4 must call `math.exp`, `math.sqrt`, `math.pi`, `math.log`. Bare names NameError on import.
- `market_strengths` is ridge least squares. Do not send a non-square system to `gauss_solve`.
- Brier reliability uses the bin mean forecast, not the bin midpoint.
- SGP gap is joint minus independent, not a tax. One shared `ρ` cannot encode opposing script legs.
- DFS greedy has no FLEX and no 2-swap. Flag over-cap. Do not claim a local search that is not in the function.
- Kelly sketch stays small. 20k paths × 400 iterations will blow a 120s bot budget.

## Checks that must pass

| Check | Expected |
|---|---|
| −110/−110 Shin | `z ≈ 0.048`, fair `0.50/0.50` |
| 0.6667/0.3704 Shin | favorite above multiplicative 0.643 |
| `crps_gaussian(0,1,0)` | `0.2337` |
| listed −3.5 ladder | cover `50%`, `mu_margin +3.5`, win `60.3%` |
| team total 48.5, listed −3 | home `25.75`, away `22.75` |
| Brier | `BS = REL − RES + UNC` within `1e-9` |

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Shin `z = 0` | Wrong quadratic branch | Use `shin_devig` in `scripts/engine_math.py` |
| Favorite scores less on a −3 | `(T+listed)/2` | Use `mu_margin = -listed` |
| Header and ladder disagree | Number used as both mean and line | One convention, see references |
| `/xray` gone | Paste replaced the command | Add `/props` beside it, demo copy only |
