# GSE Intelligence Execution Ledger

This ledger is append-only. It records each slice shipped on the GSE Intelligence Core branch. Final commit SHAs are also visible via `git log`; a commit cannot contain its own final SHA without amending.

## Backlog Status

- [x] Slice 0 - Day-0 surface audit, branch/files check, nflverse access probe.
- [x] A1 - LadderEvent shadow reducer, append-only model, invariant tests, two-track rung requirements.
- [ ] A2 - GameSettledEvent heartbeat and idempotent DATA/FORECAST/PROOF/UNLOCK fan-out stub.
- [ ] E1 - Replay and historical-backtest harness over nflverse regular-season data.
- [ ] B1 - Feature-store interface over metrics plus coverage-map row per metric and persistence seam.
- [ ] B2 - Player-rate shrinkage layer with empirical Bayes posteriors and published weights.
- [ ] B3 - Market-anchored team yards/TD reconciliation with derived fantasy points.
- [ ] BT - Tweedie baseline projection, ACI intervals, Clark-West harness scoring.
- [ ] B4 - Earned-weight ensemble with bounded loss and Clark-West gates.
- [ ] B5 - Adaptive Conformal Inference, Mondrian by position, rolling recalibration.
- [ ] B6 - Self-publishing calibration harness and publish-criteria definition only.
- [ ] C6 - Correlation/copula layer for best-ball/parlay consumption.
- [ ] C1 - Regression/breakout engine.
- [ ] C2 - Opportunity and role-migration engine.
- [ ] C3 - Game-script engine.
- [ ] C4 - Availability/return and role-tenure engine.
- [ ] C5 - Unified divergence layer.
- [ ] D1 - Cross-market triangulation through player props.
- [ ] D2 - Options-style distribution outputs.
- [ ] D3 - Model-parliament public CRPS leaderboard feed, flagged.
- [ ] D4 - Replayable-provenance endpoint, flagged.
- [ ] D5 - Community calibration-tournament scaffold, draft-only-safe.
- [ ] D6 - Active-learning uncertainty map.
- [ ] E2 - Scoring-rule and reliability-diagram reporting.
- [ ] E3 - Pipeline trace id, degradations, and Board-health badge.
- [ ] F1 - Persist-what-we-fetch serving-table/interface seam.
- [ ] F2 - Coverage-map UI data.
- [ ] F3 - Phase-0 cost-slice confirmation and ledger.
- [ ] FINAL - Decisions file and Claude handoff.

## 2026-06-23T21:46:09Z - 0c13254f - Slice 0

- WHAT: Created the Day-0 surface audit; confirmed branch reality; confirmed read-only nflverse access by byte-range probes.
- FILES: `docs/SURFACE_AUDIT.md`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: typecheck passed; lint passed; full web Vitest passed with `--testTimeout=30000` after the default 5s run exposed suite-concurrency timeouts in three existing slow tests; build passed with existing Sentry/OpenTelemetry and stub-Prisma warnings; trust/model-freeze/draft-only passed. Data probe passed with `node --use-system-ca` against nflverse byte ranges.
- FLAG: n/a - documentation/audit only; no runtime feature flag changed.
- DECISIONS: Use isolated `codex/intelligence-core` worktree cut from `origin/claude/sweet-fermi-sk9gws` because the primary `C:\Users\Garrett\Sports` checkout was dirty on another branch.
- NEXT: A1 `LadderEvent` shadow reducer and invariant test.
- BLOCKED-ON-HUMAN: none for A1; later money/secrets/infra/calibration flips remain owner-gated.

## 2026-06-23T22:37:00Z - pending commit - A1

- WHAT: Added the shadow-only `LadderEvent` contract, `GameSettledEvent` heartbeat contract, two-track `RUNG_REQUIREMENTS`, pure deterministic `reduceLadder()`, invariant tests, and append-only Prisma `LadderEvent` model.
- FILES: `packages/types/src/ladder.ts`, `packages/types/src/heartbeat.ts`, `packages/types/src/index.ts`, `packages/prediction-engine/src/ladder/reduce.ts`, `packages/prediction-engine/src/ladder/__tests__/reduce.test.ts`, `packages/prediction-engine/src/index.ts`, `packages/db/prisma/schema.prisma`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: failing-first ladder test failed on missing reducer; focused ladder test passed 7 tests; `@sports/types` typecheck passed; `@sports/prediction-engine` typecheck passed; repo `typecheck` passed; repo `lint` passed; web Vitest passed with `--testTimeout=30000`; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; Prisma schema validated with dummy local `DATABASE_URL`/`DIRECT_URL`.
- FLAG: no runtime gate changed; reducer returns derived eligibility only and leaves env/operator flags authoritative.
- DECISIONS: `currentRung` is a conservative cross-track summary; consumers must use `trackRungs.fantasy` and `trackRungs.betting` for unlock evidence so fantasy MAE cannot unlock betting pricing and betting CLV cannot unlock projection publishing.
- NEXT: A2 `GameSettledEvent` heartbeat fan-out stub with ordering and idempotency tests.
- BLOCKED-ON-HUMAN: applying a real database migration remains `[SCHEMA]`; publish/pricing/performance/calibration flips remain `[OWNER]/[DATA]`.
