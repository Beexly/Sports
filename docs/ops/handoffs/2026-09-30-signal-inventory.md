# Handoff: total signal wiring program, Session 0 (inventory)

Date: 2026-09-30. Family: all (inventory). Branch `research/total-signal-inventory-2026-09-30`.

## 1. Mission
Session 0 of `docs/ops/total-signal-wiring-program.md`: inventory every signal family, rank by
leverage, revise the wiring queue. Research only.

## 2. What changed
- PR #967 (Beexly/Sports). Commit `ca48b1b64`.
- `docs/engine/research/2026-09-30/total-signal-inventory.md` (ranking, corrections, queue, decisions)
- Appendices `-A-repo-signals.md` (44 rows), `-B-external-sources.md` (~45 rows), `-C-corpus-family-counts.md`
- Filed under `docs/engine/research/` per `AGENTS.md:9-25`, not the `docs/research/` path the program names.
- Precondition: #966 merged first (`2c73597e8`, CI green on the PR).
- No code, schema, flag, env or DB touched. Nothing in `gse-grok-build-sandbox`.

## 3. Proof
- CI run `36759462035` on `ca48b1b64`: `Test, type-check, lint, Prisma` success; Trust gate, Secret scan,
  Model freeze, Draft-only, API v1 boundary, AI transport boundary, Brand safety, AI Council: success.
- RED, not from this PR: `Dependency audit` and `All guardrails` fail on advisory `brace-expansion`
  (4.0.0 - 5.0.11, HIGH, unwaived). `main` fails the same two jobs: run `36754268016` at `2c73597e8`, also
  `36753186138`, `36729969979`. Fix means editing `package-lock.json` or adding a dated waiver, both
  forbidden to agents (`AGENTS.md:1210-1212`). Needs Garrett.
- No test added or changed (docs only). Test counts from the CI log were not extracted. NOT RUN locally:
  vitest, typecheck (no `node_modules` in the worktree). Local `run-all.mjs`: 23/26; the 3 failures are
  missing `typescript` module (2) and the same brace-expansion advisory (1).
- Orchestrator re-verified before writing: devig fix ancestry (`3e074c584` in HEAD), `composeLedger` has 0
  production callers, 8 `return null` ACTIVE registry bodies.

## 4. Calibration state of touched signals
None touched. Inventory states: calibrated = `calibratedWinProb` path (`reasoning.ts:286`) and the signal
slate confidence; uncalibrated = continuous tilt `tanh*0.35` (`continuous-signal-tilt.ts:49`), registry
`trustWeight`s on the 8 never-observed families, the `signals` ledger (no composer); shadow = everything new.

## 5. Resume point (next agent, in order)
1. Read `total-signal-inventory.md` "Corrections" and "Revised queue". Do not repeat the devig fix: it landed in #965.
2. Session 1, test-only: asymmetric-input devig tests that fail on the old code.
   `packages/prediction-engine/src/engine/extended-signal-adapters.test.ts:85` (uses -110/-110) and
   `.../market-odds-adapters.test.ts:77` (passes invalid method `"proportional"`).
3. Session 2: populate injuries (then ratings, weather, snaps) into the bundle at
   `apps/web/lib/picks/intelligence-enrichment.ts:116-145`, fields per `apps/web/lib/intelligence-core/engine.ts:63-75`. Shadow only.
4. Before Session 3 (`composeLedger`, `signal-ledger.ts:76`): get a current `signals` count via
   `apps/web/app/api/ops/signal-ledger-state/route.ts:40`. Last doc figure 84,500 (AGENT_LEDGER.md:563).
5. Blocked on Garrett, do not decide: list in the inventory's "Decisions that belong to Garrett", plus
   the brace-expansion CI failure above.
