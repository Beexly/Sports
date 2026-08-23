# Do not rerun

Canonical freeze for Galaxy Sports Edge research. If a task would do any of
the following, **stop**. Point at this file. Do not invent a fourth model.

## Killed or closed (do not touch)

| Item | Evidence | Forbidden action |
|---|---|---|
| H-F5 MLB totals e-process | `docs/ops/hermes/hf5-mve/RESULTS.md` — KILL n=100, E=0.0204, hash `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8` | `run-mve.ts` or any e-process on the same 337 graded games |
| Spec mismatch | `docs/ops/edge/2026-08-20-hf5-spec-mismatch-audit.md` (C-65, `dd032a5a`) | “Fix” pitcher/park/weather vs team-only and **rerun on those days** |
| Track E / archive as discovery | C-44 | Mine the 241-game archive for a new estimator |
| Residual-info / RBPF as picks | C-46; R-11 shadow `4ed83c75` | Adaptive-λ writeback, pick input, copy of Grok Python into Sports |
| DML real NFL panel | R-13 BLOCKED — `sched_2025.csv` 404 | Pretend nflverse is wired |
| NFL real e-process | C-66 `cf4dda02`, CLOSE=0 | Fire an NFL MVE before CLOSE labels exist |
| PR #438 fire | ARMED, not FIRED; a related increment already KILLed | Fire #438 or resume `OVERNIGHT-2026-08-20-LAGUNA.md` (void vs Downloads recipe) |
| Free-model WRR overnight | CLIProxy weighted Nemotron/Step/Trinity/Gemma/VL | Let a fallback chain “search” for edge |

## Still allowed (only this)

1. **Team-only** Efron–Morris log totals, `D_i = s²/n_i`, φ=12, c=1.5, **new hashed files**, **forward MLB games only** (after prereg SHA). Same frozen H-F5 e-process. FIRE=no until founder types FOUNDER_YES.
2. CLOSE-stamp **liveness** (read-only counts; bugfix if post-settle CLOSE stays 0).
3. LLM-free append of frozen `q_t` on the forward window. No retune knobs.
4. No-claim product / waitlist **owner gates**. Never LIVE_BOARD until a prospective cycle survives.

## Kill rule (unchanged)

E ≤ 0.10 at a checkpoint → KILL. No amendment mid-cycle. No second look.

LIVE_BOARD, PERFORMANCE_STATS, public accuracy, and “we have an edge” stay off.
