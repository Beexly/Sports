---
name: falsifier-run
description: Run a bind through falsifyBind and record verbatim SURVIVOR, KILLED, STARVED, or PARKED verdicts.
allowed-tools: Read, Grep, Glob, Bash(npx vitest run *), Bash(git show *)
---

# Falsifier run

## Before Running: Verify the Instrument
Confirm `packages/prediction-engine/src/edge-lab/falsify.ts` and `packages/prediction-engine/src/edge-lab/__tests__/falsify.test.ts` pass locally:
```powershell
npx vitest run --minWorkers=1 --maxWorkers=2 packages/prediction-engine/src/edge-lab/__tests__/falsify.test.ts
```
Green before use. Stop if the harness test fails.

## Executing `falsifyBind`
- Supply real backtest rows: `{ knownAtWeek, outcomeWeek, season, outcome, modelProb }`.
- Never pass `confidence / 100` as `modelProb` (C-28: confidence is market-structural, not independent model probability), and never pass `last_price` as `q`. Compute independent `p` first, then `e = p - q`.
- Record the verdict verbatim with exact e-values (`SURVIVOR`, `KILLED`, `STARVED`, `PARKED`). Never soften a `KILLED` verdict.

## After the Run & Boundaries
- Commit the verdict log under `handoff/` and cite its verified SHA in `docs/ops/AGENT_LEDGER.md`.
- Have an independent reviewer subagent (`auditor` / `code-reviewer`) audit headline metrics before citing them in `docs/ops/STATE.md`.
- Never arm a live track, flip public gates, or claim an edge beyond recorded falsifier statistics.

## Completion Criteria
Done when `falsify.test.ts` passes, verbatim verdict log is written with exact sample sizes/e-values, and independent verification is logged.
