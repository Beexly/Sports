# MINIS OVERNIGHT — GSE ENGINE TEST RUN (paste into Minis as one message)

You're Hermes. Tonight (~1 AM to 6 AM CT) you're not building — you're testing. Galaxy Sports Edge's prediction engine gets a full overnight validation pass before NFL Sunday. I run the same battery on my own machine; we compare in the morning.

## SETUP

1. Pull latest `Beexly/Sports` (main). Read the repo-root `AGENTS.md` FIRST — its LAWS bind you tonight, especially:
   - NEVER `git push` unless explicitly told (default: no push).
   - NEVER flip a gate or env flag, never edit code so a gate resolves differently.
   - NEVER weaken a guard to make a test pass. A red guard means the code is wrong or the guard needs narrower context — never less power.
   - NEVER write a claim you did not observe. Not run → write `NOT RUN`. Failed → paste the error. An honest gap is a contribution; an invented fact is sabotage.
   - Bare `npm install` is fine; never install extra packages, never run migrations, never touch a database. If `.npmrc` blocks an install on script policy, that is the control working — mark BLOCKED and report which package, don't bypass it.
2. Testing only. No code changes, no ledger row claims, no commits. Read-only plus test execution.

## THE BATTERY (run all, in order)

1. `npx vitest run apps/web/__tests__/elo-backtest-loader.test.ts apps/web/__tests__/elo-backtest-route.test.ts` — Elo backtest integrity.
2. `npx vitest run apps/web/__tests__/market-backtest.test.ts apps/web/__tests__/market-backtest-route.test.ts apps/web/__tests__/backtest-calibration-cron-route.test.ts` — market backtest + calibration cron.
3. `npx vitest run apps/web/__tests__/player-projections.test.ts apps/web/__tests__/projections-route.test.ts` — projections.
4. `node scripts/ops/check-agent-ledger.mjs` — ledger guard. Record the real exit code and any SLA warnings verbatim (never pipe the exit code away).
5. Read-only recon: `git log --oneline -15`; skim `docs/ops/AGENT_LEDGER.md` for rows still OPEN/BLOCKED in the calibration sequence (C-29x/C-30x); note the calibration gate state as documented — observe it, don't touch it.

## REPORT

Write `GSE-TEST-REPORT-2026-09-13.md` and push it to the agent-bus `inbox/from-builder/` per the normal flow:
- Per battery item: PASS/FAIL (or NOT RUN with the exact error), failing assertion or error pasted.
- Ledger guard output verbatim.
- Open calibration rows worth knowing about.
- RED FLAGS section: anything that looks wrong with the engine, with file paths and the output you saw.

Then one morning summary: green/red per battery item, red flags with file links. Nothing else.

Two attempts per command, then mark NOT RUN with the exact error and move on. Don't ask questions; figure it out. Go.
