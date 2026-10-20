# STAGED-IMPROVEMENT 2 — Give the L1–L5 engine a service entry point (INV-02)

**Changes a published number?** NO.
**Risk:** low, but it creates a new surface that must be auth-gated.
**Files:** new `apps/web/app/api/ops/reasoning/route.ts`,
`apps/web/lib/ops/authorize.ts` (or the existing ops auth helper).

---

## Why

Measured, the whole L1–L5 reasoning engine has **zero callers outside
`intelligence/`** and **no HTTP route**:

| Fact | Evidence |
|---|---|
| The engine entry | `intelligence/reasoning_engine/run_game.py:18` — `from integration.api import analyze` |
| `analyze` reaches the chain builder | `intelligence/integration/api.py:27` — `from .pipeline import TOP_PASS_RUSH_CUTOFF, build_causal_chains` |
| The chain builder is the brief's own acceptance test | `intelligence/integration/pipeline.py:85` `build_causal_chains` → `:131` `CausalLink(cause=..., mechanism=..., outcome=...)` |
| Its only callers | `intelligence/reasoning_engine/emit_slate_board.py:32`, `emit_trace.py:11` — scripts |
| Any web route | **NONE.** `grep -rn 'intelligence' apps/web/app/api/` → no reasoning/chain/trace route |
| Any publish-path import | **NONE.** `packages/prediction-engine/src/scoring.ts` and `packages/ingestion-pipeline/src/process-sport.ts` import nothing from `intelligence/` |

**So "make the loop continuous" currently has no referent.** The engine
cannot be reached by the web app, the crons, or the publish path.

## What changes

### New file: `apps/web/app/api/ops/reasoning/route.ts`

```
GET /api/ops/reasoning?gameId=<id>
  → auth (ops-gate, NOT public)
  → run the Python engine via intelligence/reasoning_engine/run_game.py:reason_game
  → return the ReasoningTrace as JSON
```

**Auth.** The reasoning trace contains internal reasoning — chain links,
weak links, overconfidence scores. It must be behind the ops gate, not the
public surface. The pattern to follow is
`apps/web/app/api/ops/ranked-picks/route.ts` (an existing ops route that
exposes `corpusSituationalShift` and `mindEvaluation`).

**Invocation.** `reason_game` is Python. The web app is TypeScript. Two
options:
1. A subprocess call (`child_process.execFile` on `python -m
   reasoning_engine.run_game`), with a timeout. Simple, but adds ~200 ms
   process startup per call and requires Python on the serverless runtime.
2. A thin HTTP service. More machinery.

**Recommendation: option 1 for a first cut**, with a hard timeout and a
`GSE_REASONING_ENGINE=1` env gate, because the goal is reachability, not
latency. Measure the cold-start cost before deciding.

**Why it matters beyond reachability.** The trace is the substrate for
everything else in this mandate: the counterfactual evaluator
(INV-07) needs a trace to clone; the trace refresh (INV-03) needs to
persist one; the do-calculus work (INV-08) needs its `observed_values` and
`CausalLink`s. **All of them are downstream of "the engine can be called
and its output can be stored."**

## Acceptance

- [ ] `GET /api/ops/reasoning` returns a trace for a valid gameId.
- [ ] The route is auth-gated; an unauthenticated request gets 401/403.
- [ ] `GSE_REASONING_ENGINE` unset ⇒ the route returns 404 and no Python
      process is spawned.
- [ ] The route does NOT write to `picks`, `signals`, or any published
      table. Read-only.
- [ ] A cold-start latency measurement is recorded (it decides option 1 vs
      option 2).
