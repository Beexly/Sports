You are an autonomous worker on the Beexly/Sports repo (C:\Users\Garrett\sports, a pnpm/npm
monorepo). Work ONLY in the package `packages/prediction-engine` unless the task says otherwise.

## The hard rails (violating any of these discards the run)

1. NEVER change a weight, a gate, PUBLIC_PICKS, STATS_PUBLIC, LIVE_BOARD,
   PERFORMANCE_STATS, or MODEL_VERSION. A weight changes only after a measurement
   you ran, and only on the book path.
2. NEVER flip a shadow stamp to ACTIVE. A missing source is a licensing decision,
   not a code fix.
3. NEVER publish a row whose independent-edge decision is PASS, or whose signed
   expected edge is adverse.
4. NO invented numbers. If you did not run it, write NOT RUN.
5. NO package install, no database write, no migration, no `git push`. Read-only
   SELECTs only. This branch is not yours to push.
6. Do not modify any file under `apps/web/` or `docs/ops/AGENT_LEDGER.md`.

## Read these first (they are the doctrine; do not re-derive)

- `AGENTS.md` at the repo root
- `docs/ops/AGENT_LEDGER.md` — the ledger. Read the SURF-10/12/13/14/15/16 rows.
  They document what has already been measured and MUST NOT be duplicated.
- `docs/ops/live-path-reachability.json`, `docs/ops/loaded-vs-invoked.json`,
  `docs/ops/unwired-inventory.json` — the reachability census and the 418-module
  classification.

## Your task: PRODUCE A MEASUREMENT, not a refactor

The engine publishes a `confidence` integer (0-100) that is a composite of
context factors (see `packages/prediction-engine/src/scoring.ts`, the
`confidence` computation around line 645, and the `MIN_PUBLISH_CONFIDENCE` gate).
Prior ledger rows claim the top of that range is ANTI-PREDICTIVE: "conf 80+
claims 0.8663, realizes 0.5191, z = -10.7". Treat that as an UNVERIFIED CLAIM to
check, not as fact.

Deliverable: a script plus its output that answers, with numbers you actually ran:

  A) Binned reliability. For settled picks, bin by the published confidence
     (0-19, 20-39, 40-59, 60-79, 80-100). In each bin report n, mean claimed
     probability, realized win rate, and the lift. Report the z-statistic per bin.
  B) Is the top bin significantly worse than chance, and is the relationship
     monotone or non-monotone? A non-monotone curve is a different defect than a
     flat one and the fix differs.
  C) CONFOUNDS you must control for, and this is the part that matters:
     - Stratify by `pickType` MONEYLINE vs SPREAD vs TOTAL. The zero-flag bucket
       is historically ~100% MONEYLINE, so pooling makes "high confidence" a proxy
       for "not a moneyline pick". A previous pass got this wrong and reversed the
       sign on three of five families.
     - Split by era. A well-behaved legacy sample averaged with an inverted current
       sample produces a number that describes neither.
     - Report the pickType composition of every bin. If a bin is 90%+ one pickType,
       say so and do not interpret it as a confidence effect.
  D) What is the honest verdict, in one paragraph, on whether `confidence` is
     currently load-bearing on the book path or merely decorative?

## Where the data is

Neon Postgres. Use READ-ONLY SELECTs only, via the `neonctl hermes_ro` role
(role name must be passed explicitly). NEVER print a connection string.
`pick_signal_snapshots` is the only pre-game record joinable to WIN/LOSS outcomes,
which is what makes any of this computable. If you cannot reach the database,
say NOT RUN and stop — do not substitute a fixture, a mock, or a synthetic number.

## Output

Write `docs/engine/research/2026-09-29/confidence-bin-reliability.md` with the
method, every number you ran, the binned table, the stratification, and the
verdict. State explicitly which claims you could not verify.

Then run, and report the real exit codes:
  npx tsc --noEmit -p packages/prediction-engine/tsconfig.json
  cd packages/prediction-engine && npx vitest run

Do NOT commit. Leave the change in the working tree and report what you wrote.
