# HP-16 — Kalshi (via PredExon) as a real second book beside the paid feed

Priority after HP-14 and before HP-15. Same laws as HP-1..HP-9. Branch `hermes/kalshi-thin-fill`
off `origin/main` of Sports. Founder set `PREDEXON_API_KEY` and `PREDEXON_INGEST=true` in Production
at 01:33 UTC 2026-09-09; measured at 01:48 UTC they do nothing, for two reasons in code:

1. `packages/ingestion-pipeline/src/process-sport.ts:462-468` attaches `createGalaxySecondBook()` only
   inside `fetchEspnOddsForSport`, and that call sits under `if (events.length === 0)`, i.e. only when
   the paid The Odds API feed returned nothing. The paid key is present and the circuit is closed, so
   the Kalshi catalog is never constructed.
2. `apps/web/lib/ops/free-spine-odds-path.ts:42` computes `paidSinglePath` from the registry coverage
   matrix (`requireSpend === criticalGaps`) and hard-codes `primaryOddsSource: "the-odds-api"`. It
   cannot reflect a runtime second book.

## Task
0. FIRST, before any PredExon code (see data/extracted/repo-leverage-2026-09-09.md A1): TheRundown's
   free feed already carries Kalshi as affiliate 25 and `rundown-client.ts:34-49` maps it to book key
   `kalshi`. Verify `kalshi` passes `isRealBookmakerKey`; then make the Rundown thin-fill survive the
   day (only games under MIN_BOOKMAKERS, NFL/NCAAF game days only, one call per sport per cycle,
   30-minute cooldown after a 429). If that alone yields two books on NFL, ship it as its own PR
   (C-278a) and do A-D as C-278b. Apply the Kalshi taker fee at the ask (A2) to any Kalshi quote
   used as a book price.
A. In `process-sport.ts`, after the paid events are collected and BEFORE the Rundown thin-fill (~:479),
   add a Kalshi thin-fill: when `PREDEXON_INGEST` is on and the catalog exists, for each game whose
   priced-book count is under `MIN_BOOKMAKERS`, attach the Kalshi de-vigged quote as one bookmaker
   (bookmaker key from `galaxy-kalshi-book.ts`, never a synthetic key). Only markets Kalshi lists
   (`kalshi-series.ts`: NFL moneyline, `KXNFLSPREAD`, `KXNFLTOTAL`). Never dual-pull a fully covered
   game. Soft-fail empty; a PredExon 429 or error skips the game with a logged reason.
B. In `free-spine-odds-path.ts`, add a measured field `secondBookRuntime: { enabled, source: "predexon-kalshi", lastAttachedAt, gamesThinFilled }` fed from the last refresh cycle's report (same
   place `oddsInserting.dualPath` is populated). Do NOT change how `paidSinglePath` is computed (law 9:
   never weaken a guard); add the new field beside it so the truth surface shows both facts.
C. Registry: `predexon` stays `use-with-caution`; do not edit its verdict. The clearance check
   (`assertIngestible("predexon")`) stays in the call path.
D. Tests, red-checked: (1) game with one paid book + Kalshi quote reaches MIN_BOOKMAKERS and is
   priced; (2) game with two paid books is NOT dual-pulled; (3) PREDEXON_INGEST off → no Kalshi call;
   (4) PredExon error → game skipped, cycle continues; (5) truth-surface field renders from the report.
E. Verify block: typecheck 0, lint 0, `npx vitest run packages/ingestion-pipeline apps/web/__tests__/free-spine*`, `npm run guardrails` green, `npm run build` exit 0. No key in any log line.
F. Ledger row C-278 in Sports (`docs/ops/AGENT_LEDGER.md`), Owner hermes, CLAIMED in the first commit,
   DONE with SHA. Open a READY PR titled "ingest: Kalshi via PredExon thin-fills the paid slate under
   MIN_BOOKMAKERS (C-278)". Two attempts, then BLOCKED with the exact error.
