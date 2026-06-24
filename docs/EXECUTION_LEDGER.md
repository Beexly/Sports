# GSE Intelligence Execution Ledger

This ledger is append-only. It records each slice shipped on the GSE Intelligence Core branch. Final commit SHAs are also visible via `git log`; a commit cannot contain its own final SHA without amending.

## Backlog Status

- [x] Slice 0 - Day-0 surface audit, branch/files check, nflverse access probe.
- [x] A1 - LadderEvent shadow reducer, append-only model, invariant tests, two-track rung requirements.
- [x] A2 - GameSettledEvent heartbeat and idempotent DATA/FORECAST/PROOF/UNLOCK fan-out stub.
- [x] E1 - Replay and historical-backtest harness over nflverse regular-season data.
- [x] B1 - Feature-store interface over metrics plus coverage-map row per metric and persistence seam.
- [x] B2 - Player-rate shrinkage layer with empirical Bayes posteriors and published weights.
- [x] B3 - Market-anchored team yards/TD reconciliation with derived fantasy points.
- [x] BT - Tweedie baseline projection, ACI intervals, Clark-West harness scoring.
- [x] B4 - Earned-weight ensemble with bounded loss and Clark-West gates.
- [x] B5 - Adaptive Conformal Inference, Mondrian by position, rolling recalibration.
- [x] B6 - Self-publishing calibration harness and publish-criteria definition only.
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

## 2026-06-23T22:37:00Z - 94ee8bb8 - A1

- WHAT: Added the shadow-only `LadderEvent` contract, `GameSettledEvent` heartbeat contract, two-track `RUNG_REQUIREMENTS`, pure deterministic `reduceLadder()`, invariant tests, and append-only Prisma `LadderEvent` model.
- FILES: `packages/types/src/ladder.ts`, `packages/types/src/heartbeat.ts`, `packages/types/src/index.ts`, `packages/prediction-engine/src/ladder/reduce.ts`, `packages/prediction-engine/src/ladder/__tests__/reduce.test.ts`, `packages/prediction-engine/src/index.ts`, `packages/db/prisma/schema.prisma`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: failing-first ladder test failed on missing reducer; focused ladder test passed 7 tests; `@sports/types` typecheck passed; `@sports/prediction-engine` typecheck passed; repo `typecheck` passed; repo `lint` passed; web Vitest passed with `--testTimeout=30000`; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; Prisma schema validated with dummy local `DATABASE_URL`/`DIRECT_URL`.
- FLAG: no runtime gate changed; reducer returns derived eligibility only and leaves env/operator flags authoritative.
- DECISIONS: `currentRung` is a conservative cross-track summary; consumers must use `trackRungs.fantasy` and `trackRungs.betting` for unlock evidence so fantasy MAE cannot unlock betting pricing and betting CLV cannot unlock projection publishing.
- NEXT: A2 `GameSettledEvent` heartbeat fan-out stub with ordering and idempotency tests.
- BLOCKED-ON-HUMAN: applying a real database migration remains `[SCHEMA]`; publish/pricing/performance/calibration flips remain `[OWNER]/[DATA]`.

## 2026-06-23T22:53:30Z - 84d666ee - A2

- WHAT: Added pure `fanoutGameSettledHeartbeat()` for deterministic DATA -> FORECAST -> PROOF -> UNLOCK processing, idempotent per-stage ledger entries, PROOF-stage canonical settled sample events for both ladder tracks, and recomputed ladder state.
- FILES: `packages/types/src/heartbeat.ts`, `packages/prediction-engine/src/ladder/heartbeat.ts`, `packages/prediction-engine/src/ladder/__tests__/heartbeat.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: failing-first heartbeat test failed on missing module; focused heartbeat test passed 5 tests; `@sports/types` typecheck passed; `@sports/prediction-engine` typecheck passed; repo `typecheck` passed; repo `lint` passed; web Vitest passed with `--testTimeout=30000`; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: no runtime gate changed; fan-out is pure and returns ledger/ladder artifacts for a caller to persist later.
- DECISIONS: PROOF is the only fan-out stage that emits settled-sample ladder events; replaying a prior PROOF ledger stage never double-counts the heartbeat.
- NEXT: E1 replay and historical-backtest harness over nflverse regular-season data.
- BLOCKED-ON-HUMAN: database persistence of fan-out ledger rows remains `[SCHEMA]/[INFRA]`; live score-source automation remains gated by source rights.

## 2026-06-23T23:19:00Z - 8303eec8 - E1

- WHAT: Added the pure nflverse replay substrate: regular-season schedule-row parser for seasons 1999+, deterministic game ordering, historical-week replay with stable fingerprint, purged/embargoed walk-forward split builder, and an out-of-sample market-total MAE report.
- FILES: `packages/prediction-engine/src/nflverse-replay-parser.ts`, `packages/prediction-engine/src/replay-harness.ts`, `packages/prediction-engine/src/__tests__/replay-harness.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: failing-first replay test failed on missing module; focused replay test passed 4 tests; `@sports/prediction-engine` typecheck passed; new/changed TS files measured under 250 pure LOC; repo `typecheck` passed; repo `lint` passed; web Vitest passed with `--testTimeout=30000`; repo `build` passed after replacing a Node-only `node:crypto` import with a runtime-neutral stable fingerprint; trust/model-freeze/draft-only passed.
- FLAG: no runtime gate changed; harness is pure and shadow-only, with no DB writes and no projection/publication flips.
- DECISIONS: E1 uses a deterministic runtime-neutral fingerprint for replay reproducibility; D4 remains responsible for any cryptographic replayable-provenance hash chain.
- NEXT: B1 feature-store interface over metrics, metric coverage-map rows, and R2/DuckDB persistence seam.
- BLOCKED-ON-HUMAN: none for B1 code seam; real R2/DuckDB provisioning remains `[INFRA]`.

## 2026-06-23T23:58:52Z - 95524c2f - B1

- WHAT: Added a typed feature-store seam over cleared metrics, starting with opponent-adjusted EPA snapshots, coverage-map integrity checks, and an R2/DuckDB persistence contract marked INFRA-only.
- FILES: `apps/web/lib/metrics/coverage-map.ts`, `apps/web/lib/metrics/feature-store.ts`, `apps/web/lib/metrics/feature-store.test.ts`, `apps/web/vitest.config.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused metrics tests passed 18 tests; repo `typecheck` passed; repo `lint` passed; exact web Vitest passed 151 files / 1,934 tests after moving the existing slow-suite timeout into `vitest.config.ts`; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: no runtime gate changed; feature-store snapshots are code-only/shadow and persistence is an `[INFRA]` interface with no writes.
- DECISIONS: B1 keeps persistence as an injected `FeatureStorePersistence` contract with `FEATURE_STORE_PERSISTENCE_TARGET` documenting the future R2/DuckDB binding; missing or uncleared metric coverage fails closed.
- NEXT: B2 player-rate shrinkage layer with empirical-Bayes posteriors and published weights.
- BLOCKED-ON-HUMAN: provisioning `R2_FEATURE_STORE` and DuckDB relation `feature_store.metric_snapshots` remains `[INFRA]`.

## 2026-06-24T00:09:08Z - 4e4a5560 - B2

- WHAT: Added a pure player-rate posterior layer with empirical-Bayes peer priors, beta-binomial bounded-rate shrinkage, normal-normal continuous-rate shrinkage, published `w = n / (n + k)`, and `priced=false` shadow outputs.
- FILES: `packages/prediction-engine/src/player-rate-posteriors.ts`, `packages/prediction-engine/src/__tests__/player-rate-posteriors.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused posterior tests passed 5 tests; `@sports/prediction-engine` typecheck passed; new TS/test files measured under 250 pure LOC; repo `typecheck` passed; repo `lint` passed; exact web Vitest passed 151 files / 1,934 tests; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; no projection publication, model version, pricing, or runtime flag changed.
- DECISIONS: Use `DEFAULT_PLAYER_RATE_SHRINKAGE_K = 12` as reversible pseudo-sample strength until E1-backed walk-forward evidence tunes per-position/per-metric k values.
- NEXT: B3 market-anchored reconciliation conserving team yards and TDs with derived fantasy points.
- BLOCKED-ON-HUMAN: per-position/per-metric k tuning and any priced/public projection promotion remain `[DATA]/[OWNER]`.

## 2026-06-24T00:33:21Z - 52c39ecd - B3

- WHAT: Added market-anchored reconciliation that decomposes total/spread into team point, yard, and touchdown anchors; allocates team yards and TDs by softmax usage-efficiency posteriors; derives fantasy points after physical-unit conservation; and emits player divergence.
- FILES: `packages/prediction-engine/src/market-anchored-reconciliation.ts`, `packages/prediction-engine/src/__tests__/market-anchored-reconciliation.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused market-anchor tests passed 4 tests; `@sports/prediction-engine` typecheck passed; new TS/test files measured under 250 pure LOC; repo `typecheck` passed; repo `lint` passed; exact web Vitest passed 151 files / 1,934 tests; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; no fantasy projection publication, model version, pricing, or runtime flag changed.
- DECISIONS: B3 conserves team-level yards and TDs first, with fantasy points derived afterward; pass/rush/receiving splits remain downstream inputs for C3/C5 rather than a reason to delay the corrected physical-unit invariant.
- NEXT: BT Tweedie baseline projection, flagged/shadow with ACI intervals and Clark-West scoring hook.
- BLOCKED-ON-HUMAN: fitting historical points-to-yards/TD conversion coefficients and promoting any derived projections remain `[DATA]/[OWNER]`.

## 2026-06-24T00:52:42Z - 9684385e - BT

- WHAT: Added a shadow Tweedie-family projection baseline scaffold with cleared-feature boosted stumps, non-negative Tweedie deviance scoring, ACI interval generation, purged/embargoed temporal splits, and Clark-West market-baseline comparison.
- FILES: `packages/prediction-engine/src/tweedie-baseline.ts`, `packages/prediction-engine/src/tweedie-aci.ts`, `packages/prediction-engine/src/projection-evaluation.ts`, `packages/prediction-engine/src/__tests__/tweedie-baseline.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused Tweedie tests passed 6 tests; new TS/test files measured under 250 lines each; repo `typecheck` passed after strict index-access fixes; repo `lint` passed; exact web Vitest passed after rerunning with a longer tool timeout; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; Clark-West `beatsMarket` requires at least 30 out-of-sample samples, positive adjusted mean, t-statistic > 1.64, and model MAE below market MAE before any future promotion can be considered.
- DECISIONS: Keep the Tweedie baseline as a pure boosted-stump scaffold over explicitly cleared features until E1-backed data supplies enough out-of-sample evidence; export Clark-West as a shared evaluator for B4 rather than burying it in the Tweedie module.
- NEXT: B4 earned-weight ensemble with bounded loss and must-beat equal-weight plus market-only gates.
- BLOCKED-ON-HUMAN: real nflverse/player-feature training data, estimator promotion, public projection use, and pricing remain `[DATA]/[OWNER]`.

## 2026-06-24T01:03:57Z - 7bfb81ff - B4

- WHAT: Added a sequential Hedge/multiplicative-weights ensemble backtest with capped absolute loss, pre-outcome earned predictions, equal-weight and market-only Clark-West comparisons, and a report-only promotion gate.
- FILES: `packages/prediction-engine/src/earned-weight-ensemble.ts`, `packages/prediction-engine/src/__tests__/earned-weight-ensemble.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused earned-weight tests passed 4 tests; new TS/test files measured under 250 lines each; `@sports/prediction-engine` typecheck passed; repo `typecheck` passed; repo `lint` passed; exact web Vitest passed with the longer tool timeout; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; `promotionGate.passes` is evidence only and requires both `ensembleVsEqualWeight` and `ensembleVsMarket` to pass Clark-West plus lower MAE than each baseline.
- DECISIONS: Use pre-outcome sequential weight updates so a sample can only affect later samples; cap per-model absolute loss before the Hedge update to prevent one outlier from dominating the ensemble.
- NEXT: B5 Adaptive Conformal Inference, Mondrian by position, rolling recalibration with non-overlapping calibration weeks.
- BLOCKED-ON-HUMAN: real out-of-sample projection samples, any estimator promotion, and any public/paid consumption remain `[DATA]/[OWNER]`.

## 2026-06-24T01:16:49Z - 635c6c44 - B5

- WHAT: Added rolling Adaptive Conformal Inference with Mondrian position buckets, non-overlapping fit/calibration/test windows, per-position alpha updates, coverage summaries, and shadow/priced=false interval reports.
- FILES: `packages/prediction-engine/src/conformal-intervals.ts`, `packages/prediction-engine/src/__tests__/conformal-intervals.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused conformal tests passed 3 tests; new TS/test files measured under 250 lines each; `@sports/prediction-engine` typecheck passed; repo `typecheck` passed; repo `lint` passed; exact web Vitest passed with the longer tool timeout; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; interval reports define evidence only and do not flip public projection, provider, model-version, pricing, or publishing flags.
- DECISIONS: Use rolling fit/calibration/test windows where calibration weeks never overlap fit weeks; ACI recalibrates alpha by position so Mondrian buckets can widen independently for worse-calibrated positions.
- NEXT: B6 self-publishing calibration harness and publish-criteria definition only.
- BLOCKED-ON-HUMAN: real calibration rows, public artifact publication, and any `canPublishProjections` flip remain `[DATA]/[OWNER]`.

## 2026-06-24T01:35:19Z - pending commit - B6

- WHAT: Added draft-only projection self-publishing artifact data with deterministic pre-game commit fingerprints, MAE-by-position, interval coverage, Spearman rank correlation, Brier/log-loss/CRPS comparisons against market baseline, and review-only `canPublishProjections` criteria; added matching draft-only CLV artifact data.
- FILES: `apps/web/lib/calibration/compute.ts`, `apps/web/__tests__/calibration.test.ts`, `apps/web/lib/tracker/clv.ts`, `apps/web/lib/tracker/clv.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused web tests passed 22 tests; web app typecheck passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: draft-only / no flip; `eligibleIfOwnerApproves` is criteria evidence only and does not change `canPublishProjections`, `PROJECTIONS_PROVIDER`, model version, pricing, or performance gates.
- DECISIONS: Treat public projection calibration as an artifact builder over already-settled rows; require pre-game commit evidence plus model-vs-market scoring-rule wins before a future owner/data gate can even consider publishing.
- NEXT: C6 correlation/copula layer for best-ball/parlay consumption.
- BLOCKED-ON-HUMAN: real settled projection rows, public artifact publication, and every projection provider/publish flip remain `[DATA]/[OWNER]`.
