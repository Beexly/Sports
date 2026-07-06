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
- [x] C6 - Correlation/copula layer for best-ball/parlay consumption.
- [x] C1 - Regression/breakout engine.
- [x] C2 - Opportunity and role-migration engine.
- [x] C3 - Game-script engine.
- [x] C4 - Availability/return and role-tenure engine.
- [x] C5 - Unified divergence layer.
- [x] D1 - Cross-market triangulation through player props.
- [x] D2 - Options-style distribution outputs.
- [x] D3 - Model-parliament public CRPS leaderboard feed, flagged.
- [x] D4 - Replayable-provenance endpoint, flagged.
- [x] D5 - Community calibration-tournament scaffold, draft-only-safe.
- [x] D6 - Active-learning uncertainty map.
- [x] E2 - Scoring-rule and reliability-diagram reporting.
- [x] E3 - Pipeline trace id, degradations, and Board-health badge.
- [x] F1 - Persist-what-we-fetch serving-table/interface seam.
- [x] F2 - Coverage-map UI data.
- [x] F3 - Phase-0 cost-slice confirmation and ledger.
- [x] FINAL - Decisions file and Claude handoff.

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

## 2026-06-24T01:35:19Z - d7d56828 - B6

- WHAT: Added draft-only projection self-publishing artifact data with deterministic pre-game commit fingerprints, MAE-by-position, interval coverage, Spearman rank correlation, Brier/log-loss/CRPS comparisons against market baseline, and review-only `canPublishProjections` criteria; added matching draft-only CLV artifact data.
- FILES: `apps/web/lib/calibration/compute.ts`, `apps/web/__tests__/calibration.test.ts`, `apps/web/lib/tracker/clv.ts`, `apps/web/lib/tracker/clv.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused web tests passed 22 tests; web app typecheck passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: draft-only / no flip; `eligibleIfOwnerApproves` is criteria evidence only and does not change `canPublishProjections`, `PROJECTIONS_PROVIDER`, model version, pricing, or performance gates.
- DECISIONS: Treat public projection calibration as an artifact builder over already-settled rows; require pre-game commit evidence plus model-vs-market scoring-rule wins before a future owner/data gate can even consider publishing.
- NEXT: C6 correlation/copula layer for best-ball/parlay consumption.
- BLOCKED-ON-HUMAN: real settled projection rows, public artifact publication, and every projection provider/publish flip remain `[DATA]/[OWNER]`.

## 2026-06-24T02:05:35Z - 5c4e6f75 - C6

- WHAT: Added a shadow/priced=false Gaussian copula layer over projection marginals with QB/pass-catcher and same-game parlay links; best-ball roster evaluation and Parlay MRI vitals now consume the copula readout without changing live gates or pricing math.
- FILES: `apps/web/lib/projections/correlation.ts`, `apps/web/lib/projections/correlation.test.ts`, `apps/web/lib/fantasy/bestball.ts`, `apps/web/lib/fantasy/bestball.test.ts`, `apps/web/lib/parlay/parlay.ts`, `apps/web/lib/parlay/parlay.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused C6 tests passed 23 tests; web app typecheck passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; copula summaries are readouts only and do not flip projection provider, publish, betting, pricing, or model-version gates.
- DECISIONS: Use projection-band standard deviations as marginals for fantasy players and Bernoulli standard deviations for parlay legs; positive correlations widen portfolio variance but leave existing best-ball recommendations and parlay EV unchanged.
- NEXT: C1 regression/breakout engine extending receiving-opportunity.
- BLOCKED-ON-HUMAN: learned correlation coefficients and any priced parlay/best-ball use remain `[DATA]/[OWNER]`.

## 2026-06-24T02:17:06Z - 2511a89e - C1

- WHAT: Extended receiving-opportunity with process-grade regression/breakout readouts: receiving TD aggregation, position-level xCatch/xTD baselines, expected-versus-actual deltas, regression score, and positive breakout score.
- FILES: `apps/web/lib/intelligence/receiving-opportunity.ts`, `apps/web/lib/intelligence/receiving-opportunity.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused receiving-opportunity tests passed 8 tests; web app typecheck passed; `git diff --check` and suppression scan passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: context/read-only; no projection provider, `canPublishProjections`, pricing, model-version, betting, or publication gate changed.
- DECISIONS: Keep C1 as an explanatory process layer over opportunity divergence; learned xCatch/xTD coefficients and any projection weighting remain gated by historical out-of-sample evidence.
- NEXT: C2 opportunity and role-migration engine with Markov role states, shrunk transitions, and vacated-touch redistribution.
- BLOCKED-ON-HUMAN: learned process coefficients, promotion into projections, and public/priced consumption remain `[DATA]/[OWNER]`.

## 2026-06-24T02:27:41Z - 305776e9 - C2

- WHAT: Extended opportunity-transfer with Markov role states, smoothed role-transition probabilities, and vacated target/carry redistribution across next-men-up while conserving vacated usage.
- FILES: `apps/web/lib/intelligence/opportunity-transfer.ts`, `apps/web/lib/intelligence/opportunity-transfer.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused opportunity-transfer tests passed 13 tests; web app typecheck passed; `git diff --check` and suppression scan passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: context/read-only; `canPublishProjections` remains false and no projection provider, pricing, model-version, betting, or publication gate changed.
- DECISIONS: Use a prior-smoothed Markov transition matrix over weekly target/carry role states so sparse role moves are shrunk rather than overfit; redistribute vacated usage as explanatory context only.
- NEXT: C3 game-script engine from Vegas win-probability path to pass/run rate, plays, and pace.
- BLOCKED-ON-HUMAN: learned transition priors, promotion into projection weights, and any public/priced consumption remain `[DATA]/[OWNER]`.

## 2026-06-24T03:13:42Z - 9ef7304f - C3

- WHAT: Added a shadow game-script engine deriving a Vegas win-probability path from total/spread and mapping average script to pass/run rate, run rate, expected plays, and pace labels.
- FILES: `packages/prediction-engine/src/game-script.ts`, `packages/prediction-engine/src/__tests__/game-script.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused game-script tests passed 5 tests; `@sports/prediction-engine` typecheck passed after a readonly-array fix; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; no projection provider, `canPublishProjections`, pricing, model-version, betting, or publication gate changed.
- DECISIONS: Use a spread-derived Vegas win-probability path and heuristic pass/run/pace assumptions as an explanatory scaffold until learned from historical data.
- NEXT: C4 availability/return and role-tenure engine.
- BLOCKED-ON-HUMAN: learned pass/run/pace coefficients, projection weighting, and any public/priced consumption remain `[DATA]/[OWNER]`.

## 2026-06-24T03:24:49Z - 005a4325 - C4

- WHAT: Added a pure shadow availability/return and role-tenure engine with Kaplan-Meier return curves, Cox-style discrete-time hazard multipliers, P(active), expected snap share, and role half-life outputs.
- FILES: `packages/prediction-engine/src/availability-role-tenure.ts`, `packages/prediction-engine/src/__tests__/availability-role-tenure.test.ts`, `packages/prediction-engine/src/index.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused availability-role-tenure tests passed 5 tests; `@sports/prediction-engine` typecheck passed after strict array-read fixes; C4 engine measured 243 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false; no injury feed automation, projection provider, `canPublishProjections`, pricing, model-version, betting, or publication gate changed.
- DECISIONS: Keep return/spell survival, practice multipliers, and role half-life as explainable scaffolds until historical availability and snap data tune coefficients out of sample.
- NEXT: C5 unified divergence layer.
- BLOCKED-ON-HUMAN: learned hazard coefficients, injury/feed source rights, projection weighting, and any public/priced consumption remain `[DATA]/[OWNER]`.

## 2026-06-24T03:40:28Z - 3e44a995 - C5

- WHAT: Added a unified shadow divergence layer that normalizes B3 market-anchor, C1 regression/breakout, C2 role-migration, C3 game-script, and C4 availability/tenure readouts into standardized signals routed to betting-candidate-shadow, fantasy buy-low/sell-high, and content-draft queues.
- FILES: `apps/web/lib/intelligence/divergence.ts`, `apps/web/lib/intelligence/divergence.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused divergence tests passed 5 tests; web app typecheck passed after fixing a test fixture shape; C5 module measured 239 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false / draft-only; no betting, projection provider, `canPublishProjections`, pricing, model-version, publication, or content-send gate changed.
- DECISIONS: Make divergence the cross-source signal spine while keeping all downstream routes explicit shadow queues rather than live picks or published claims.
- NEXT: D1 cross-market triangulation through player props.
- BLOCKED-ON-HUMAN: learned source weights, betting consumption, public content use, and any priced/public routing remain `[DATA]/[OWNER]`.

## 2026-06-24T03:44:34Z - 81907adc - D1

- WHAT: Added a pure prop-anchor triangulation layer that reconciles third-market player prop medians/fair values against B3 market-anchored player yards, touchdowns, and derived fantasy points, then routes residuals into the C5 shadow divergence board.
- FILES: `apps/web/lib/intelligence/prop-anchor.ts`, `apps/web/lib/intelligence/prop-anchor.test.ts`, `apps/web/lib/intelligence/divergence.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused prop-anchor/divergence tests passed 9 tests; web app typecheck passed; D1 module measured 176 LOC and D1 test measured 117 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false / draft-only; no live prop ingestion, betting, projection provider, `canPublishProjections`, pricing, model-version, publication, or content-send gate changed.
- DECISIONS: Treat posted prop lines as market medians unless a fair value is supplied; compare props to B3 physical units first and fantasy points only as a derived metric.
- NEXT: D2 options-style distribution outputs for floor/ceiling/spike/bust readouts.
- BLOCKED-ON-HUMAN: live player-prop source rights, fair-value derivation, learned residual thresholds, and any priced/public routing remain `[DATA]/[OWNER]`.

## 2026-06-24T04:01:05Z - 9dc2bfac - D2

- WHAT: Added options-style projection distribution outputs with floor, ceiling, spike probability, bust risk, convexity score, posterior weight, and conformal interval provenance; surfaced the distribution board in best-ball evaluation without changing recommendations.
- FILES: `apps/web/lib/projections/distribution.ts`, `apps/web/lib/projections/distribution.test.ts`, `apps/web/lib/fantasy/bestball.ts`, `apps/web/lib/fantasy/bestball.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused distribution/best-ball tests passed 16 tests after correcting a threshold fixture; web app typecheck passed; D2 distribution module measured 174 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false / draft-only; no projection provider, `canPublishProjections`, pricing, model-version, betting, publication, or recommendation-ranking gate changed.
- DECISIONS: Use conformal intervals for distribution bounds when present, posterior variance as an uncertainty floor, and existing best-ball bands only as a labeled fallback.
- NEXT: D3 model-parliament CRPS leaderboard feed, flagged.
- BLOCKED-ON-HUMAN: real posterior/conformal feed wiring, learned spike/bust thresholds, and any public/priced display remain `[DATA]/[OWNER]`.

## 2026-06-24T04:10:44Z - f05af2c3 - D3

- WHAT: Added a flagged model-parliament CRPS leaderboard feed that ranks internal projection models by pre-game-committed settled CRPS, reports MAE and market CRPS edge, prepares public-safe rows, and keeps the public feed disabled.
- FILES: `apps/web/lib/calibration/model-parliament.ts`, `apps/web/lib/calibration/model-parliament.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused model-parliament tests passed 3 tests; web app typecheck passed; D3 module measured 212 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / priced=false / draft-only / public feed `FLAGGED_OFF`; no projection provider, `canPublishProjections`, pricing, model-version, public publication, or model-weight gate changed.
- DECISIONS: Score only settled rows that were committed before settlement; rank by lower CRPS and expose market CRPS edge only when market baselines are supplied.
- NEXT: D4 replayable-provenance endpoint from the hash chain.
- BLOCKED-ON-HUMAN: real model output registry, sample-size approval, public feed enablement, and any model promotion remain `[DATA]/[OWNER]/[INFRA]`.

## 2026-06-24T07:35:13Z - 7ded99ed - D4

- WHAT: Added a replayable-provenance hash-chain module and flagged API endpoint that can verify event ordering, detect payload tampering, and re-derive calibration from settled-pick events while defaulting the public endpoint to `FLAGGED_OFF`.
- FILES: `apps/web/lib/calibration/replayable-provenance.ts`, `apps/web/lib/calibration/replayable-provenance.test.ts`, `apps/web/app/api/calibration/replay-provenance/route.ts`, `apps/web/__tests__/replayable-provenance-route.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused replayable-provenance tests passed 4 tests; web app typecheck passed; D4 module measured 332 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: endpoint defaults to `FLAGGED_OFF`; feed is draft-only and `priced=false`; no projection provider, `canPublishProjections`, pricing, model-version, public publication, or calibration proposal state changed.
- DECISIONS: Use SHA-256 over canonical event payloads and previous-hash links; replay calibration only when the chain verifies, otherwise withhold rows and sample counts.
- NEXT: D5 community calibration-tournament scaffold, draft-only-safe.
- BLOCKED-ON-HUMAN: public endpoint enablement, source hash-chain persistence, and any public calibration claim remain `[DATA]/[OWNER]/[INFRA]`.

## 2026-06-24T07:45:04Z - d1aea679 - D5

- WHAT: Added a draft-only community calibration-tournament scaffold that accepts pre-lock probability submissions, rejects late/pending/invalid rows, scores with bounded Brier/log-loss, maps forecasts through the calibration harness, and ranks a review-only leaderboard.
- FILES: `apps/web/lib/tournament/calibration-tournament.ts`, `apps/web/lib/tournament/calibration-tournament.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused calibration-tournament tests passed 3 tests; web app typecheck passed; D5 module measured 192 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: draft-only / `priced=false` / recognition disabled; no accounts, prizes, content-send, projection provider, `canPublishProjections`, pricing, model-version, publication, or public leaderboard gate changed.
- DECISIONS: Score community forecasts only when submitted before lock and settled; keep ranking review-only and recognition impossible in code until owner/data approval.
- NEXT: D6 active-learning uncertainty map.
- BLOCKED-ON-HUMAN: participant identity, abuse controls, durable submission storage, recognition/public display, and any prize or account flow remain `[OWNER]/[INFRA]/[DATA]`.

## 2026-06-24T07:54:26Z - d20e9b5c - D6

- WHAT: Added a shadow active-learning uncertainty map that ranks segments by mean absolute error, interval under-coverage, interval width, miss rate, and review priority score.
- FILES: `apps/web/lib/metrics/uncertainty-map.ts`, `apps/web/lib/metrics/uncertainty-map.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused uncertainty-map tests passed 3 tests; web app typecheck passed; D6 module measured 180 LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: shadow / draft-only / `priced=false`; no active-learning automation, retraining, projection provider, `canPublishProjections`, pricing, model-version, publication, or public display gate changed.
- DECISIONS: Rank segments for data/model review only; never let high uncertainty automatically widen intervals, retrain models, or alter projection weights.
- NEXT: E2 scoring-rule and reliability-diagram reporting wired to gated public observatory data.
- BLOCKED-ON-HUMAN: durable segment store, review workflow ownership, learned thresholds, and any retraining/promotion remain `[DATA]/[OWNER]/[INFRA]`.

## 2026-06-24T15:41:11Z - d00a4b78 - E2

- WHAT: Added draft-only scoring-rule and reliability-diagram reporting over the gated public calibration report, with Brier score, expected calibration error, max gap, and observatory panel rendering honest collecting states.
- FILES: `apps/web/lib/calibration/scoring-reliability.ts`, `apps/web/lib/calibration/scoring-reliability.test.ts`, `apps/web/components/observatory/scoring-reliability-panel.tsx`, `apps/web/app/observatory/page.tsx`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused scoring-reliability tests passed 2 tests; E2 files measured 247 total LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: draft-only / `priced=false`; no projection provider, `canPublishProjections`, pricing, model-version, public performance gate, or publication flag changed.
- DECISIONS: Wire the observatory panel only to `loadPublicCalibrationReport()` so public calibration remains gated and empty states stay explicit until settled canonical rows exist.
- NEXT: E3 pipeline trace id, degradations, and Board-health badge.
- BLOCKED-ON-HUMAN: public calibration gate enablement, minimum sample approval, and any performance/publishing claim remain `[DATA]/[OWNER]`.

## 2026-06-24T15:53:34Z - 0a039722 - E3

- WHAT: Added board pipeline trace IDs, typed `degradations[]`, health status metadata, and a compact Board-health badge on `/board` while preserving the existing confidence redaction route.
- FILES: `apps/web/lib/board/health.ts`, `apps/web/lib/board/health.test.ts`, `apps/web/lib/board/state.ts`, `apps/web/components/board/board-health-badge.tsx`, `apps/web/app/board/page.tsx`, `apps/web/__tests__/board-stale-kill-switch.test.ts`, `apps/web/__tests__/board-state-confidence-gate.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused board health/stale/confidence tests passed 18 tests; E3 new files measured 242 total LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; local built-app smoke confirmed `/board` renders Board health and `/api/board/state` returns `traceId`, `degradations[]`, and health status.
- FLAG: draft-only / `priced=false`; no projection provider, `canPublishProjections`, pricing, model-version, public performance gate, publication flag, or provider routing changed.
- DECISIONS: Treat board trace/degradation metadata as request-observability only; it explains suppressed/stale/DB/empty states without changing pick generation or publication logic.
- NEXT: F1 persist-what-we-fetch serving-table/interface seam.
- BLOCKED-ON-HUMAN: durable trace storage, alert routing, SLA thresholds, and any public status claims beyond per-request board metadata remain `[INFRA]/[OWNER]`.

## 2026-06-24T16:09:06Z - 0b1c8317 - F1

- WHAT: Added a code-only persist-what-we-fetch serving-table seam with deterministic SHA-256 payload hashes, R2 object keys, latest-serving rows, TTL freshness status, and an injected R2/DuckDB persistence interface.
- FILES: `apps/web/lib/data-sources/fetch-serving-table.ts`, `apps/web/lib/data-sources/fetch-serving-table.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused fetch-serving-table tests passed 4 tests; F1 files measured 247 total LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; TSX driver emitted deterministic hash prefix `43258cff783f`, `status=FRESH`, `priced=false`, and an R2-style object key.
- FLAG: code-only / `priced=false` / target status `INFRA`; no R2 bucket, DuckDB relation, database migration, credential, runtime write path, projection provider, pricing, publication, or model gate changed.
- DECISIONS: Use `hash-only` as the default storage mode and derive latest-serving rows from immutable snapshot metadata until infrastructure explicitly provisions `R2_FETCH_ARCHIVE` and `fetch_store.*`.
- NEXT: F2 coverage-map UI data.
- BLOCKED-ON-HUMAN: provisioning `R2_FETCH_ARCHIVE`, DuckDB `fetch_store.source_snapshots` / `fetch_store.latest_by_source`, retention policy, and any runtime writer remain `[INFRA]/[OWNER]`.

## 2026-06-24T16:22:43Z - eb44b04b - F2

- WHAT: Added clearance-gated coverage-map UI data for "stats we have that closed-box products do not show" and surfaced it on `/intelligence/metrics` with cleared/tier/source/withheld counts, competitor-gap framing, transparent-equivalent framing, attribution, and `priced=false`.
- FILES: `apps/web/lib/metrics/coverage-map.ts`, `apps/web/lib/metrics/coverage-map.test.ts`, `apps/web/app/intelligence/metrics/page.tsx`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused coverage-map tests passed 6 tests after red test confirmed missing builder; touched files measured 437 total LOC with max file 206 pure LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; built-app smoke confirmed `/intelligence/metrics` renders the coverage-map headline and `priced=false`.
- FLAG: clearance-gated / `priced=false`; no source-rights gate, projection provider, `canPublishProjections`, pricing, model-version, public performance gate, publication flag, or data-ingestion runtime changed.
- DECISIONS: Derive the UI contract only from `coverageMapRows()` so public coverage claims fail closed with the same clearance engine as B1.
- NEXT: F3 phase-0 cost-slice confirmation and ledger.
- BLOCKED-ON-HUMAN: adding more coverage rows requires source-rights review, metric validation, and owner approval for any public claim beyond cleared derived rows.

## 2026-06-24T16:49:45Z - 42b0c882 - F3

- WHAT: Confirmed shipped Phase-0 cost controls for deploy gating, source snapshot hash-only storage, and CDN/cache policy in a durable F3 artifact without changing runtime behavior.
- FILES: `docs/PHASE0_COST_SLICES.md`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused cost-control tests passed: deploy gate 6 tests, ingestion source-snapshot 6 tests, and cockpit cache policy 25 tests; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; manual artifact check confirmed deploy gate, snapshot hash-only, CDN/cache policy, and confirmation notes render in `docs/PHASE0_COST_SLICES.md`.
- FLAG: documentation/confirmation only; no deploy config, credential, R2/DuckDB/Neon resource, cache header, production route, projection provider, pricing, model-version, publication, or paid-provider gate changed.
- DECISIONS: Treat Phase-0 cost posture as green only for the named code paths and tests; Vercel ignored-build wiring, broader CDN rollout, and storage retention policy remain human-owned.
- NEXT: FINAL decisions file and Claude handoff.
- BLOCKED-ON-HUMAN: Vercel ignored-build command wiring, source snapshot env overrides, storage pruning cadence, and broader CDN/edge cache rollout remain `[OWNER]/[INFRA]`.

## 2026-06-24T17:00:09Z - 1f2e8dd4 - FINAL

- WHAT: Wrote the final branch handoff packet for Claude and added final ratification decisions covering code-ready versus live-ready status, human gates, and post-branch operating ownership.
- FILES: `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`, `docs/CLAUDE_HANDOFF.md`
- GATE: repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; manual handoff check confirmed branch state, final gate result, human gates, and next five Claude tasks are present.
- FLAG: documentation/handoff only; no runtime feature flag, projection provider, pricing rung, model version, data source, credential, schema application, or production setting changed.
- DECISIONS: Treat the branch as code-ready after the final gate, not live-ready; all owner, infra, data, schema, publication, and paid-provider actions remain explicitly gated.
- NEXT: Stop after final commit/push; Claude/owner review and ratification.
- BLOCKED-ON-HUMAN: merge/deploy, schema application, infra provisioning, real-data model promotion, pricing/publication flips, and any live money action remain `[OWNER]/[INFRA]/[DATA]/[SCHEMA]`.

## 2026-06-24T17:22:14Z - e72e420e - AUDIT

- WHAT: Re-audited the completed branch against the full checklist, sensitive-gate constraints, representative core implementation surfaces, and final handoff provenance; added a durable audit artifact and resolved the prior FINAL row's self-commit placeholder.
- FILES: `docs/INTELLIGENCE_CORE_AUDIT.md`, `docs/CLAUDE_HANDOFF.md`, `docs/EXECUTION_LEDGER.md`
- GATE: diff whitespace check passed; changed-file risk scan returned no matches for type suppressions, TODO/FIXME debt, direct live projection flips, or priced outputs; prediction-engine Vitest passed 51 files / 514 tests; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.
- FLAG: documentation/audit only; no runtime code, feature flag, projection provider, pricing rung, model version, data source, credential, schema application, or production setting changed.
- DECISIONS: Treat the audit as confirmation that the branch is code-ready behind gates, not a live-readiness approval; unresolved work remains human/data/infra/schema ratification.
- NEXT: Push audit commit and stop.
- BLOCKED-ON-HUMAN: same as FINAL: merge/deploy, schema application, infra provisioning, real-data model promotion, pricing/publication flips, and live money remain `[OWNER]/[INFRA]/[DATA]/[SCHEMA]`.

## 2026-06-24T19:47:30Z - (self-commit) - KS1 — conformal (n+1) fix + Tweedie truth-in-labeling

- WHAT: Re-created two engine edits that a prior session made locally but never pushed. (1) Split-conformal finite-sample quantile now uses the ceil((n+1)*p) order statistic in both `conformal-intervals.ts` and `tweedie-aci.ts`, so residual quantiles (and "calibrated" interval widths) are no longer systematically too small on small per-position samples; ACI still adapts alpha online, the correction only ever widens intervals. (2) Added a truth-in-labeling note on `fitTweedieBaseline` documenting that it boosts L2 of log1p(y) — a Tweedie-flavoured scaffold, NOT a fitted Tweedie GLM — and forbidding any public surface from calling it "Tweedie" until the deviance gradient is wired.
- FILES: `packages/prediction-engine/src/conformal-intervals.ts`, `packages/prediction-engine/src/tweedie-aci.ts`, `packages/prediction-engine/src/tweedie-baseline.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: prediction-engine Vitest passed 51 files / 514 tests (conformal-intervals + tweedie-baseline suites included); trust-gate + model-freeze + draft-only passed. ENV CAVEAT: repo-wide `npm run typecheck` and apps/web `build`/Vitest could NOT be executed in this sandbox — TypeScript 6.0.2 errors on the repo's `moduleResolution:"node"` tsconfigs (TS5107 deprecation), and `prisma generate` is blocked by the proxy egress policy (ECONNRESET to the Prisma binary CDN), so `@sports/db` cannot be generated here. Both are pre-existing environmental constraints, not introduced by this change; tsc emitted ONLY the deprecation line (no type errors).
- FLAG: no runtime feature flag, projection provider, pricing rung, model version, data source, credential, schema, or production setting changed. Conformal report stays `priced:false`/`status:"shadow"`.
- DECISIONS: Comment-only Tweedie change; conformal change is behaviour-preserving except widening small-sample intervals (verified by hand against both test suites before running, then confirmed green).
- NEXT: stand up + run the real nflverse backtest.
- BLOCKED-ON-HUMAN: unchanged `[OWNER]/[INFRA]/[DATA]/[SCHEMA]` set.

## 2026-06-24T19:50:00Z - (self-commit) - KS2 — real nflverse player-projection backtest driver

- WHAT: Re-created the runnable backtest driver (also lost from the prior unpushed session). `scripts/backtest/player-projection-backtest.ts` fetches real nflverse weekly player stats, engineers leakage-safe trailing-usage features (week W uses strictly weeks < W, per player-season), builds `TweedieProjectionSample[]` with a NAIVE points-persistence baseline, and runs the engine's EXISTING purged+embargoed walk-forward + Clark-West harness (`runTweedieBaselineBacktest`). No new modeling logic. Added `scripts/backtest/README.md` documenting honest scope.
- FILES: `scripts/backtest/player-projection-backtest.ts`, `scripts/backtest/README.md`, `docs/EXECUTION_LEDGER.md`
- GATE: driver compiles + runs under `tsx`; EXECUTED against real nflverse data in this sandbox (network reachable). RESULT — 2023 single-season: 3796 samples, 2955 OOS, model MAE 4.9928 vs naive MAE 4.7573 → beats NAIVE = FALSE (Clark-West t=4.40 but model MAE is HIGHER, so the gate correctly withholds). 2021–2023 full run was launched (11,164 samples built) and is recorded in the handoff once complete. trust/model-freeze/draft-only green.
- FLAG: read-only analysis tool; nothing priced/published; does not touch `canPublishProjections`. Output is a console report only.
- DECISIONS: HONEST SCOPE — this tests "model vs naive points-persistence on real games" (the correct first question), NOT "beats the Vegas market" (needs historical player props, a [DATA] follow-up). The first real number says the boosted-log1p baseline does NOT beat naive persistence OOS on 2023 — i.e. iterate the model, do not publish.
- NEXT: work order — Tweedie labeling, yard coherence, endpoint gating, env docs, shadow wiring.
- BLOCKED-ON-HUMAN: unchanged; plus [DATA] historical player-prop lines for a true market-beat test.

## 2026-06-24T19:53:52Z - (self-commit) - WO1 — wire the real Tweedie deviance gradient

- WHAT: Replaced the "Tweedie-flavoured" loss with a GENUINE gradient-boosted Tweedie loss in `fitTweedieBaseline`. Each round now fits a stump to the Tweedie negative-gradient pseudo-residuals under a log link (mu=exp(F); pseudo = y*exp((1-p)F) - exp((2-p)F)) with power p=tweediePower (default 1.5); intercept is the Tweedie MLE constant log(mean(y)); predict uses the inverse log link mu=exp(F); numerical clamp on F. The truth-in-labeling note now accurately describes a Tweedie-fitted (not log1p-L2) model that is still shadow/unvalidated. This resolves the "Tweedie that isn't Tweedie" finding (chose the implement-it option over renaming).
- FILES: `packages/prediction-engine/src/tweedie-baseline.ts`, `packages/prediction-engine/src/__tests__/tweedie-baseline.test.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: prediction-engine Vitest green incl. a NEW proof test asserting the loss depends on tweediePower (different p => different leaf adjustments & predictions; would fail if it were plain log1p-L2). Re-ran the real backtest on 2023: model MAE improved 4.9928 -> 4.8679, but still > naive 4.7573, so beats NAIVE = FALSE (gate correctly withholds). trust/model-freeze/draft-only green. (Repo typecheck/apps-web build still env-blocked per KS1.)
- FLAG: priced=false / status=shadow unchanged; no gate, provider, pricing, model-version, or schema change.
- DECISIONS: Making the loss honestly Tweedie improves fit but does NOT make it beat naive persistence on real data — the engine needs richer features (opponent/game-script/role), not a louder label. No "calibrated"/"proven" claim is permitted.
- NEXT: WO2 — reconciliation yard coherence (split pass/rush/receiving pools).
- BLOCKED-ON-HUMAN: unchanged.

## 2026-06-24T20:05:21Z - (self-commit) - WO2 — reconciliation yard coherence (pass/rush/receiving pools)

- WHAT: `market-anchored-reconciliation.ts` previously conserved a single merged team yard pool, so QB passing yards (/25) and skill rush/receiving yards (/10) were drawn from the same bucket — incoherent. Now `decomposeMarketAnchor` splits each team's yards & TDs into a PASSING pool and a RUSHING pool using the C3 game-script (`projectGameScript`) pass/run rate; the RECEIVING pool equals the passing pool (every passing yard is a receiving yard). Each pool is allocated by softmax(usage*efficiency) within its role group (passing->QB, receiving->WR/TE/RB, rushing->RB/QB/WR, with a fallback so any roster conserves) and CONSERVED SEPARATELY. Fantasy points are derived from the coherent components (pass yds/25 + pass TD*4 + rush&rec yds/10 + TD*6). Player projections gain passing/rushing/receiving yard & TD breakdown fields; `projectedYards`/`projectedTouchdowns`/`fantasyPoints`/`divergence` are kept (player totals) so consumers (`apps/web/lib/intelligence/divergence.ts`, `prop-anchor.ts`) stay compatible.
- FILES: `packages/prediction-engine/src/market-anchored-reconciliation.ts`, `packages/prediction-engine/src/__tests__/market-anchored-reconciliation.test.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: prediction-engine Vitest green — 51 files / 518 tests (reconciliation suite rewritten to assert PER-POOL conservation + that player-total yards intentionally exceed the team total, proving the pools are distinct). trust/model-freeze/draft-only green. ENV CAVEAT (unchanged): apps/web typecheck/build not runnable here (Prisma CDN blocked, TS 6.0.2 deprecation); consumer compatibility preserved by keeping all previously-read fields as numbers.
- FLAG: priced=false / status=shadow unchanged; no gate/provider/pricing/model-version/schema change.
- DECISIONS: Allocation still uses one shared usage*efficiency posterior per player; per-phase (pass/rush/receive) usage posteriors are a noted future refinement (a mobile QB's rush share is approximate). Conservation is exact per pool regardless.
- NEXT: WO3 — gate the leaky readiness endpoints.
- BLOCKED-ON-HUMAN: unchanged.

## 2026-06-24T20:13:57Z - (self-commit) - DATA1 — keep nflverse data current through 2025

- WHAT: nflverse renamed the weekly player-stats release asset after 2024 — current seasons (2025+)
  publish ONLY as `stats_player/stats_player_week_<season>.csv` (the legacy `player_stats_<season>.csv`
  404s, and the combined `player_stats/player_stats.csv.gz` is upstream-frozen at 1999-2024). Fixes:
  (1) the backtest driver now defaults to ALL completed seasons 2021-2025 (was 2021-2023) and tries
  both asset names; (2) `fetchNflversePlayerStats` (apps/web data-sources) now tries the legacy name
  then falls back to `stats_player_week_<season>.csv`, so it resolves 2025.
- FILES: `scripts/backtest/player-projection-backtest.ts`, `scripts/backtest/README.md`, `apps/web/lib/data-sources/nflverse.ts`, `apps/web/__tests__/nflverse.test.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: apps/web leaf Vitest `nflverse.test.ts` green (19 tests incl. a new fallback test); live fetch
  verified — 2024 via legacy asset, 2025 via `stats_player_week_2025.csv`. Backtest re-run on real
  2024/2025 data succeeded (driver fetched all 5 seasons).
- FLAG: data adapters only; no gate/provider/pricing/model/schema change; nothing priced/published.
- DECISIONS / CONFIRMED CURRENT: `currentNflSeason()` is date-driven and already returns 2025 (and
  projections default to 2026) — runtime season logic is NOT stale. `resolveActiveSeason` is data-driven.
- BLOCKED-ON-HUMAN: [DATA] the LIVE ingestion path `ingestPlayerWeeklyStats` → `fetchNflverse("player_stats_week")`
  pulls the combined `player_stats.csv.gz` which nflverse has NOT yet populated with 2025; until then the
  DB-backed trend modules show 2024 as the latest season (graceful, not broken). Closing this needs a
  combined+per-season MERGE in `packages/data-ingestion` wired into the ingestion fetcher — addressed in DATA2.

## 2026-06-24T20:19:48Z - (self-commit) - DATA2 — merge current per-season nflverse stats into the live path

- WHAT: Centralized the 2025-currency fix inside `fetchNflverse("player_stats_week", season)` in the
  data-ingestion package. After fetching the combined `player_stats.csv.gz` (upstream-frozen at 2024),
  it now detects the max season covered and, for each season up to the requested one, merges in the
  per-season `stats_player/stats_player_week_<s>.csv` asset — filtered to the combined file's scope
  (offensive positions QB/RB/WR/TE/FB, REG/POST only). Best-effort: a missing/unreachable per-season
  file is skipped, so the result is never worse than the combined asset alone. Because the LIVE
  ingestion (`apps/web/lib/ingestion/player-stats.ts`) and the trend modules all call `fetchNflverse`
  for this key, they now receive 2025 with NO apps/web edit.
- FILES: `packages/data-ingestion/src/nflverse-source.ts`, `packages/data-ingestion/src/nflverse-source.test.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: data-ingestion Vitest green — 13 files / 103 tests, incl. 2 new tests (merge brings in the
  current season filtered to offense+REG/POST; best-effort leaves combined data intact on a missing
  per-season file). This package has no Prisma dependency, so it is fully runnable in this sandbox.
- FLAG: read adapter only; no gate/provider/pricing/model/schema change; nothing priced/published.
- DECISIONS: Kept the combined header to avoid surprising header-iterating consumers (records are
  key-addressed, so per-season columns resolve by name). Filtered to offense+REG/POST to match the
  combined file's scope and avoid polluting the DB with defenders/preseason rows.
- NEXT: WO3 — gate the leaky readiness endpoints.
- BLOCKED-ON-HUMAN: verify end-to-end where the apps/web build + Prisma client are available (this
  sandbox blocks the Prisma engine CDN, so apps/web build/integration tests could not be run here).

## 2026-06-24T20:22:40Z - (self-commit) - WO4 — document the launch switches in both env templates

- WHAT: Added `PROJECTIONS_PROVIDER` to BOTH `.env.example` and `.env.production.example` (documented
  as: leave unset = honest "illustrative" projections; setting it opts into a live source and does NOT
  flip `canPublishProjections`). Added the `STRIPE_FANTASY_MONTHLY_PRICE_ID` / `STRIPE_FANTASY_ANNUAL_PRICE_ID`
  pair to `.env.production.example` (`.env.example` already had them) with the note that Fantasy checkout
  returns a clean 503 until they are set.
- FILES: `.env.example`, `.env.production.example`, `docs/EXECUTION_LEDGER.md`
- GATE: env templates only (no code). trust/model-freeze/draft-only green.
- FLAG: documentation only; no runtime/secret/pricing/model change.
- DECISIONS: The other half of the original item — adding a Fantasy entry to the `VALUE_TIERS` marketing
  strip — was DEFERRED, not done: it requires owner marketing copy + positioning, expands the
  `ValueTierId` union (used by entitlement switches this sandbox cannot typecheck — Prisma/TS6), and
  would publish invented copy. Left as an [OWNER] decision rather than fabricate it.
- NEXT: WO3 — gate the leaky readiness endpoints (assess apps/web gateability first).
- BLOCKED-ON-HUMAN: [OWNER] Fantasy VALUE_TIERS copy + entitlement wiring.

## 2026-06-24T20:27:47Z - (self-commit) - WO3 — ADMIN-gate the operational-posture readiness endpoints

- WHAT: Six read-only endpoints disclosed operational posture without auth. Added an ADMIN gate to
  each, matching the existing `cockpit/*` pattern, via a NEW pure, unit-tested helper `isAdminSession`
  (so the gate is consistent and at least partly verifiable despite the apps/web build being blocked
  here). Gated: `airwave/readiness`, `airwave/intelligence-readiness`, `airwave/intake-readiness`,
  `airwave/review-queue`, `media/readiness`, `health/synthetic-monitoring`.
- FILES: `apps/web/lib/auth/require-admin.ts` (new), `apps/web/__tests__/require-admin.test.ts` (new),
  the six route files above, `docs/EXECUTION_LEDGER.md`
- GATE: `isAdminSession` leaf Vitest green (4 tests). The route files import `@/lib/auth` (NextAuth →
  Prisma), so they cannot be typechecked/built in this sandbox; the guard is a verbatim copy of the
  proven cockpit/* pattern (same `auth()` call, same role check) + a tested helper — verify under the
  full gate in a Prisma-capable env before merge.
- FLAG: access-control hardening only; payloads unchanged; nothing priced/published; no model/schema change.
- DECISIONS: `health/synthetic-monitoring` reports synthetic-monitor posture (not a liveness probe), so
  ADMIN-gating it is appropriate; if an external uptime check hits it, point that check at a dedicated
  public liveness route instead.
- NEXT: rate-limiting + WO5 shadow wiring — see BLOCKED.
- BLOCKED-ON-HUMAN: [FOLLOW-UP, apps/web gate required] Rate-limit the unauthenticated reads
  `human/{readiness,environment,roster-availability,availability}` and `sleeper/{leagues,league,market-signal}`
  using the existing `consumeRateLimit` + `clientIp` (`apps/web/lib/api/rate-limit.ts`). Deferred here
  because it spans 7 routes with mixed signatures (3 lack a `req` param) and `clientIp` is typed for
  `NextRequest` (routes use `Request`) — changes that need apps/web typecheck, which the Prisma CDN
  block prevents in this sandbox.

## 2026-06-24T20:29:28Z - (deferred, not committed as code) - WO5 — shadow activation wiring

- WHAT: The item "wire the LadderEvent reducer in shadow + surface divergence/parliament/uncertainty
  readouts behind off-flags" is intentionally NOT implemented here. The pure reducer
  (`packages/prediction-engine/src/ladder/reduce.ts` `reduceLadder` + `RUNG_REQUIREMENTS`) and the
  heartbeat fan-out already exist and are TESTED in the package; what remains is an APP-level caller
  plus observatory UI readouts — entirely apps/web wiring that imports Prisma and so cannot be
  typechecked/built/tested in this sandbox (Prisma engine CDN is egress-blocked). It also has no app
  callers today, which is the known B- "exported-only, not wired" gap.
- DECISION: Per this session's rule "never ship a feature you can't verify," ungated app wiring is
  DEFERRED rather than committed blind. Precise follow-up: add a shadow caller that runs `reduceLadder`
  over the event log and LOGS its rung verdict vs. the authoritative env flags (no flag flip), and gate
  the divergence/parliament/uncertainty observatory readouts behind their existing off-flags. Verify
  under the full gate (typecheck + apps/web Vitest + build) in a Prisma-capable environment.
- FLAG: nothing changed; shadow-only by design.
- BLOCKED-ON-HUMAN: run in an environment with the Prisma client generated, then wire + verify.

## 2026-06-24T20:52:31Z - (self-commit) - DATA3 — NGS currency: switch to the combined all-seasons asset

- WHAT: Found by an empirical probe of EVERY nflverse dataset (the user asked to truly verify currency,
  not assume it): Next Gen Stats could not reach 2025. The catalog key "ngs" used the per-season
  `nextgen_stats/ngs_<season>_<variant>.csv.gz`, which 404s for 2025 (all variants), while the COMBINED
  `nextgen_stats/ngs_<variant>.csv.gz` exists and covers 2016->2025. Switched the catalog entry to the
  combined asset (seasonal:false, `file: (_s, v) => ngs_<v>.csv.gz`); consumers already filter by season
  via resolveActiveSeason, so NGS is now current without per-season 404s.
- FILES: `packages/data-ingestion/src/nflverse-source.ts`, `packages/data-ingestion/src/nflverse-source.test.ts`
- GATE: data-ingestion Vitest green (13 files / 103 tests; NGS URL assertion updated to the combined name).
  Verified live: combined ngs_receiving/passing/rushing all return rows spanning 2016->2025.
- FLAG: read adapter only; nothing priced/published; no model/schema change. `.seasonal` only affects a
  readiness display string ("all seasons"), which is more accurate for a combined file.
- DECISIONS: Combined NGS files are small (5-15k rows), so always-combined is strictly better than
  per-season here (always current, no 404s, no perf cost).
- EMPIRICAL CURRENCY SWEEP RESULT: all other nflverse datasets reach 2025 (pbp, snap_counts, injuries,
  depth_charts, rosters, weekly_rosters, stats_team_week, pfr_advstats, ftn_charting, pbp_participation,
  espn_qbr, officials) and several reach 2026 (schedules, draft_picks incl. the 2026 draft, combine,
  trades). player_stats fixed via DATA2 merge. Only `contracts` lags (year_signed 2022, upstream OTC).
- BLOCKED-ON-HUMAN: none for NGS; contracts currency is an upstream nflverse/OTC limitation.

## 2026-06-24T20:57:00Z - (self-commit) - DATA4 — currency guard so staleness can never silently regress

- WHAT: Added `scripts/check-nflverse-currency.ts` (npm: `guard:nflverse-currency`) — a catalog-driven,
  runnable probe that, for the current NFL season, checks EVERY nflverse dataset's resolved URL actually
  returns current-season data (per-season assets must exist; combined assets must have maxSeason >= current;
  player_stats_week's per-season merge is accounted for). Exits non-zero with the offending datasets if any
  is stale, pointing at the catalog. Plus deterministic (no-network) unit tests asserting the rename-proof
  datasets (ngs, player_stats_week) resolve to combined assets — caught by the normal gate.
- FILES: `scripts/check-nflverse-currency.ts`, `package.json`, `packages/data-ingestion/src/nflverse-source.test.ts`, `docs/EXECUTION_LEDGER.md`
- GATE: ran the live guard — ALL required datasets reach 2025 (NGS via combined, player_stats via merge,
  several reach 2026), exit 0. data-ingestion Vitest green (19 nflverse tests incl. 2 new catalog guards).
- FLAG: tooling/tests only; nothing priced/published; no model/schema change.
- DECISIONS: Live HTTP check is a standalone script (run periodically / pre-kickoff), NOT a unit test
  (would be flaky); the deterministic catalog assertions live in the gate to prevent regression.
- BLOCKED-ON-HUMAN: optionally wire `guard:nflverse-currency` into a periodic cron / pre-deploy check.

## 2026-06-24T21:09:36Z - (self-commit) - AUDIT1 — Tweedie GBM correctness: Newton (2nd-order) leaf

- WHAT: An adversarial numerical review (multi-agent audit) found a real bug in this session's WO1
  Tweedie boosting: the first-order mean-of-gradient leaf value on a log-link predictor can OVERSHOOT
  and DIVERGE for small tweediePower (it does not provably descend the deviance). Replaced the leaf with
  the Newton (second-order) step: per region, grad = e^{(2-p)F} - y e^{(1-p)F}, hess = (2-p)e^{(2-p)F}
  + (p-1) y e^{(1-p)F} (>0), leaf = -sum(grad)/(sum(hess)+ridge). Split selection still fits the
  negative-gradient pseudo-residuals by SSE. Also tightened the inner loops (no per-threshold array
  allocation) — a ~3x backtest speedup (2023 single-season 42s -> 13s).
- FILES: `packages/prediction-engine/src/tweedie-baseline.ts`, `packages/prediction-engine/src/__tests__/tweedie-baseline.test.ts`
- GATE: prediction-engine Vitest green — 51 files / 519 tests, incl. a NEW regression test asserting the
  total Tweedie deviance is NON-INCREASING round-over-round for p in {1.1,1.5,1.9} (this would have
  caught the divergence the first-order step risked). trust/model-freeze/draft-only green.
- HONEST RESULT: the Newton step is the correct implementation but it does NOT lower OOS MAE on this
  weak baseline — 2023 OOS MAE went 4.87 (under-stepping first-order) -> 5.04 (correct Newton at the
  fixed rounds=8/lr=0.2). Tweedie-deviance-optimal != MAE-optimal, and aggressive correct steps overfit
  OOS at fixed hyperparameters. The model loses to naive (4.76) in BOTH variants — this fix is about
  CORRECTNESS, not about winning. Proper lr/rounds/early-stopping tuning is part of the real ML work.
- FLAG: priced=false / status=shadow unchanged; no gate/provider/pricing/model-version/schema change.
- BLOCKED-ON-HUMAN: none for this fix.

## 2026-06-24T21:09:36Z - (self-commit) - AUDIT2 — backtest becomes an honest ablation harness

- WHAT: Turned the backtest into an experimentation tool and ran the first frontier feature experiment.
  Added leakage-safe opponent defense-strength features (the week-W opponent's trailing points-allowed
  to the player's position + overall + games-of-history; opponent's weeks < W only) as an OPT-IN
  ablation (BACKTEST_OPP=1), off by default. Default seasons already 2021-2025. Prints the active feature
  set. EMPIRICAL RESULT: opponent features are never selected by the greedy booster over trailing usage
  (identical OOS MAE with/without) — i.e. they don't beat the trailing signal as built. Kept opt-in and
  documented rather than piled into the default (more features != better).
- FILES: `scripts/backtest/player-projection-backtest.ts`
- GATE: driver runs clean under tsx on real 2023 data (base and +opp both 5.0437 OOS MAE vs naive 4.76).
- HONEST FRONTIER VERDICT: across every variant tried (log1p, Tweedie first-order, Tweedie Newton, +/-
  opponent), the projection does NOT beat naive points-persistence OOS. Beating naive is a genuine ML
  research effort (regularization, early stopping, orthogonal/role features done carefully, proper CV),
  not a one-session win. The harness now supports that work honestly (ablation + leakage-safe contract).
- FLAG: research tool only; nothing priced/published; canPublishProjections untouched.
- BLOCKED-ON-HUMAN: [DATA/MODEL] the real frontier build — earn the flip with a model that beats naive
  AND the market, validated by the existing Clark-West purged/embargoed harness, before any publication.

## 2026-06-24T21:15:00Z - (record) - Definitive 2021-2025 backtest (current data incl. 2025)

- RESULT: Newton-Tweedie, base trailing-usage features, 71 walk-forward folds, 18,344 OOS player-weeks
  (2025 included via the currency fixes): model MAE 5.3087 vs naive 4.9064 -> beats NAIVE = FALSE
  (Clark-West t=18.8 but model MAE is HIGHER, so the gate correctly withholds).
- This is the owner's originally-requested current-through-2025 number. It confirms, on the largest and
  most current sample, the same verdict as every other variant: the projection does NOT beat naive
  points-persistence out-of-sample. Honest path forward = real ML work (the harness supports it);
  nothing published, canPublishProjections stays off.

## 2026-07-05 - (codex) - Sunday frontier commercial safety guardrails

- WHAT: Added repo-visible commercial safety guardrails for launch-facing media/revenue copy, unsupported
  performance claims, and raw Next Gen Stats export language. Tightened pricing copy from unsupported
  "verified record" / "CLV proves edge" phrasing to safer public-record, calibration-status, and
  line-value-tracker language.
- FILES: `scripts/guardrails/commercial-copy-scan.mjs`,
  `scripts/guardrails/no-unsupported-performance-claims.mjs`,
  `scripts/guardrails/no-raw-ngs-export.mjs`, `package.json`,
  `apps/web/__tests__/guardrails.test.ts`, `apps/web/app/pricing/page.tsx`,
  `docs/ops/SUNDAY_FRONTIER_MAXFORCE_AUDIT_2026-07-05.md`,
  `docs/research/SUNDAY_FRONTIER_R_AND_D_MAP_2026-07-05.md`,
  `docs/ops/CODEX_HANDOFF_SUNDAY_FRONTIER_MAXFORCE_2026-07-05.md`.
- GATE: individual guardrails and focused guardrail Vitest test passed; full validation recorded in the
  Sunday audit and handoff.
- FLAG: local guardrails and public copy only; no model, schema, paid service, live AWS, affiliate,
  sponsor, publishing, or prediction gate changes.

## 2026-07-05 - (codex) - Sunday frontier compliance seams and receiving metrics

- WHAT: Completed the next queued local tasks from the Sunday frontier handoff. Added the partner-offer
  compliance scanner with fail-closed sportsbook/DFS fixtures; added pure fence plugins for commercial
  copy, affiliate disclosure, responsible gaming, source rights, API payload rights, and restricted
  tracking-data export language; added source-rights/IP adapters that reuse the canonical web scraping
  registry; added API-auth/API-v1 pure seams; and implemented Receiver Difficulty Index plus Expected
  YAC as governed `SHADOW` metrics.
- FILES: `scripts/guardrails/partner-offer-compliance-scan.mjs`,
  `scripts/guardrails/fixtures/partner-offer-compliance.json`, `apps/web/lib/fences/*`,
  `apps/web/lib/source-rights/*`, `apps/web/lib/ip/*`, `apps/web/lib/api-auth/*`,
  `apps/web/lib/api-v1/*`, `apps/web/__tests__/fences-and-adapters.test.ts`,
  `packages/prediction-engine/src/metrics/receiving/*`, and receiving metric tests/export updates.
- GATE: partner-offer and raw-tracking-data guard scripts passed; app fence/adapter tests passed from
  `apps/web`; prediction-engine receiving metric tests passed; web and prediction-engine typechecks passed.
  Full root validation passed: `npm run typecheck`, `npm run lint`, `npm run guardrails`,
  `npm run test --workspaces --if-present` (631 files, 8020 tests), and `git diff --check`.
- FLAG: pure local code and docs only; no live API route exposure, no affiliate links, no live AWS, no
  secrets, no dependencies, no DB/schema changes, no publishing, and no prediction gates flipped.

## 2026-07-05 - (codex) - Sunday frontier API payload and OpenAPI guardrails

- WHAT: Completed the next queued API guardrail scripts before commit. Added `api-payload-rights-scan`
  with fixtures proving derived/public/aggregate fields can pass while raw source values, protected
  weights, provider identifiers, raw vendor payloads, unknown sources, missing sources, personal-data
  paths, and partner-sharing payloads fail closed. Added `openapi-security-scan` to check the shadow
  API v1 OpenAPI generator and endpoint contract for bearer auth, required scopes, 401/403 responses,
  data-class metadata, shadow-only markers, and no live-route promotion markers.
- FILES: `scripts/guardrails/api-payload-rights-scan.mjs`,
  `scripts/guardrails/openapi-security-scan.mjs`,
  `scripts/guardrails/fixtures/api-payload-rights.json`,
  `scripts/guardrails/fixtures/openapi-security.json`, `package.json`,
  `apps/web/__tests__/guardrails.test.ts`, Sunday audit/handoff docs, and commercial ledger.
- GATE: both scripts passed directly; focused app guardrail/fence tests passed (2 files, 21 tests);
  root `npm run guardrails` passed with both scripts wired into the composite chain.
- FLAG: local scanner/fixture work only; no live API routes, no persistence, no env vars, no secrets,
  no paid resources, and no production API promotion.

## 2026-07-05 - (codex) - Sunday frontier route-level API shadow harness

- WHAT: Completed the next commercial/API gate from the Sunday handoff without exposing live routes.
  Added a pure `handleApiV1ShadowRouteRequest()` harness that composes the existing API v1 auth,
  shadow consumer registry, origin/scope gateway, monthly quota/rate decision, request id,
  response envelope, usage audit event, payload-rights check, and abuse-response behavior. Denials
  append hash-chained `request_denied` events without debiting quota; allowed requests append
  `request_allowed` and debit local shadow quota. Malformed request ids, malformed idempotency keys,
  method abuse, missing auth, missing scopes, unsafe payload rights, and quota exhaustion all fail closed.
- FILES: `apps/web/lib/api/v1/shadow-route-harness.ts`, `apps/web/lib/api/v1/index.ts`,
  `apps/web/__tests__/api-v1-shadow-route-harness.test.ts`,
  `docs/api/API_V1_SHADOW_ROUTE_HARNESS.md`, `docs/api/API_V1_SHADOW_SEAM.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: focused route harness Vitest passed (1 file, 6 tests); API v1 focused suite passed (5 files,
  40 tests); `@sports/web` typecheck passed after strict generic helper repair; root `npm run typecheck`,
  `npm run lint`, `npm run guardrails`, `npm run test --workspaces --if-present` (632 files, 8028 tests),
  and `git diff --check` passed.
- FLAG: pure local harness only; no `apps/web/app/api/v1` route tree, no durable persistence, no env vars,
  no secrets, no DB/schema changes, no live partner/API access, and no production API promotion.

## 2026-07-05 - (codex) - Sunday frontier draft fence workflow harness

- WHAT: Completed the next workflow gate from the Sunday handoff. Added a pure `runDraftFenceWorkflow()`
  harness that composes the existing fence plugins into content and API draft workflows. Content drafts run
  source-rights, commercial-copy, restricted-tracking-data, affiliate-disclosure, and responsible-gaming fences.
  API drafts run source-rights, API-payload-rights, and restricted-tracking-data fences. Successful automated
  checks only reach `NEEDS_MANUAL_REVIEW`; blocked checks reach `BLOCKED`. The harness never allows publish,
  external send, route exposure, or live integration.
- FILES: `apps/web/lib/workflows/draft-fence-workflow.ts`,
  `apps/web/__tests__/draft-fence-workflow.test.ts`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, execution ledger, and commercial ledger.
- GATE: focused app tests passed (`draft-fence-workflow.test.ts` and `fences-and-adapters.test.ts`, 2 files,
  13 tests); `@sports/web` typecheck passed; `git diff --check` passed. Full root validation is recorded
  in the Sunday audit before commit.
- FLAG: local draft workflow only; no content publish, no email/newsletter send, no affiliate link activation,
  no live API route exposure, no durable persistence, no secrets, no paid services, and no production gate flip.

## 2026-07-05 - (codex) - Sunday frontier local draft review packets

- WHAT: Extended the draft fence workflow harness with `createDraftFenceReviewPacket()`, a local review artifact
  object that serializes workflow results, stage summaries, blockers, warnings, fix hints, inspected source ids,
  and owner checklist fields. Checklist fields are informational: even `APPROVED_FOR_DRAFT_USE` keeps
  `approvalIsAutomatic=false` and all live-action locks false.
- FILES: `apps/web/lib/workflows/draft-fence-workflow.ts`,
  `apps/web/__tests__/draft-fence-workflow.test.ts`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and execution ledger.
- GATE: focused app test passed (`draft-fence-workflow.test.ts`, 1 file, 6 tests); `@sports/web`
  typecheck passed; `git diff --check` passed. Full root validation is recorded in the Sunday audit before commit.
- FLAG: local review packet object only; no persisted approval, no publish/send/API exposure, no partner activation,
  no DB/schema changes, no secrets, no paid services, and no production workflow automation.

## 2026-07-05 - (codex) - Sunday frontier review packet renderer and memory ledger

- WHAT: Extended local draft review packets with markdown rendering and an append-only in-memory packet ledger.
  The renderer reports workflow ids, stage severities, blockers, warnings, fix hints, source ids, and payload
  presence without echoing protected payload values. The memory ledger rejects duplicate packet ids, returns
  defensive copies, and keeps live-action locks false.
- FILES: `apps/web/lib/workflows/draft-fence-workflow.ts`,
  `apps/web/__tests__/draft-fence-workflow.test.ts`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and execution ledger.
- GATE: focused app test passed (`draft-fence-workflow.test.ts`, 1 file, 8 tests); `@sports/web`
  typecheck passed; `git diff --check` passed. Full root validation is recorded in the Sunday audit before commit.
- FLAG: local markdown/object/ledger only; no file persistence, no content publish, no email/newsletter send,
  no affiliate activation, no API route exposure, no secrets, no paid services, and no production workflow automation.

## 2026-07-05 - (codex) - Sunday frontier review queue filters and summary counts

- WHAT: Extended the in-memory draft review packet ledger with status filters and queue summary counts.
  Callers can list `BLOCKED` and `NEEDS_MANUAL_REVIEW` packets, count total/blocked/waiting/reviewed packets,
  and inspect deduplicated source ids. Summary live-action locks remain false for publish, external send,
  route exposure, and live integration.
- FILES: `apps/web/lib/workflows/draft-fence-workflow.ts`,
  `apps/web/__tests__/draft-fence-workflow.test.ts`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and execution ledger.
- GATE: focused app test passed (`draft-fence-workflow.test.ts`, 1 file, 9 tests); `@sports/web`
  typecheck passed; `git diff --check` passed. Full root validation is recorded in the Sunday audit before commit.
- FLAG: local in-memory queue helpers only; no file persistence, no publish/send/API exposure, no partner activation,
  no secrets, no paid services, and no production workflow automation.

## 2026-07-05 - (codex) - Sunday frontier representative review packet fixtures

- WHAT: Added representative local content/API review packet fixtures and a claim-safety batch report. Fixtures cover
  a safe No-Bet Clinic content draft, unsafe tout-claim draft, partner mention without disclosure, safe derived
  nflverse API packet, and blocked raw-vendor API packet. The batch report summarizes workflow statuses, claim-safety
  hits, evidence-required language, source ids, payload presence, and live-action locks without exposing protected
  payload values.
- FILES: `apps/web/lib/workflows/draft-review-fixtures.ts`,
  `apps/web/__tests__/draft-review-fixtures.test.ts`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and execution ledger.
- GATE: focused app tests passed (`draft-review-fixtures.test.ts` + `draft-fence-workflow.test.ts`, 2 files,
  12 tests); `@sports/web` typecheck passed; `git diff --check` passed. Full root validation is recorded
  in the Sunday audit before commit.
- FLAG: local fixtures/report only; no content publish, no email/newsletter send, no affiliate activation,
  no API route exposure, no secrets, no paid services, and no production workflow automation.

## 2026-07-05 - (codex) - Sunday frontier first-month media queue fixtures

- WHAT: Added the first 30-day media queue as local draft fixtures plus a claim-safety batch report. The queue contains
  90 content drafts across daily watch posts, long-form YouTube, short-form clips, newsletters, founder build logs,
  and weekly board meetings. It also includes 30 manual partner-outreach batches at 10 targets per day. The batch
  report scans generated titles, hooks, script beats, and CTAs while keeping all live-action locks closed.
- FILES: `apps/web/lib/media-revenue/first-month-content-seeds.ts`,
  `apps/web/lib/media-revenue/first-month-content-queue.ts`,
  `apps/web/__tests__/first-month-content-queue.test.ts`,
  `docs/media/FIRST_MONTH_CONTENT_QUEUE_FIXTURES.md`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: focused app tests passed (`first-month-content-queue.test.ts` + `media-revenue-claim-safety.test.ts`,
  2 files, 9 tests). Root `npm run typecheck`, `npm run lint`, `npm run guardrails`,
  `npm run test --workspaces --if-present` (635 files, 8052 tests), and `git diff --check` passed.
- FLAG: local draft fixtures/report only; no content publish, no social upload, no newsletter send,
  no partner email, no affiliate activation, no sponsor claim, no secrets, no paid services, and no production automation.

## 2026-07-05 - (codex) - Sunday frontier first-month review queue export

- WHAT: Added a local review-queue export for the first-month media queue. The export converts the 90 draft content
  items into bounded review packet summaries with workflow status, content score, claim-safety result, script-beat
  count, cadence summary, blockers, warnings, fix hints, and live-action locks. It can also represent unsafe custom
  drafts as `BLOCKED` without allowing publish, send, route exposure, or live integration.
- FILES: `apps/web/lib/media-revenue/first-month-review-queue.ts`,
  `apps/web/__tests__/first-month-review-queue.test.ts`,
  `docs/media/FIRST_MONTH_REVIEW_QUEUE_EXPORT.md`, `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: focused app tests passed (`first-month-review-queue.test.ts` + `first-month-content-queue.test.ts`
  + `draft-fence-workflow.test.ts`, 3 files, 16 tests); `@sports/web` typecheck passed;
  `npm run guardrails` passed; `git diff --check` passed.
- FLAG: local export only; no persistent queue storage, no content publish, no social upload, no newsletter send,
  no partner email, no affiliate activation, no sponsor claim, no secrets, no paid services, and no production automation.

## 2026-07-05 - (codex) - Sunday frontier API v1 idempotency replay simulation

- WHAT: Added a local in-memory replay wrapper around the API v1 shadow route harness. Successful idempotent
  requests are stored by a replay key built from method, endpoint path, hashed request payload, parsed key id,
  and external idempotency key. Duplicate successful requests return the same response envelope without
  double-counting quota usage or appending a second audit event. Denied requests and malformed idempotency keys
  do not create reusable success records.
- FILES: `apps/web/lib/api/v1/shadow-route-replay.ts`,
  `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`,
  `apps/web/lib/api/v1/index.ts`, `docs/api/API_V1_SHADOW_ROUTE_REPLAY.md`,
  `docs/api/API_V1_SHADOW_ROUTE_HARNESS.md`, Sunday audit/handoff docs, and commercial ledger.
- GATE: focused app tests passed (`api-v1-shadow-route-replay.test.ts` + `api-v1-shadow-route-harness.test.ts`
  + `api-v1-persistence.test.ts`, 3 files, 19 tests); `@sports/web` typecheck passed;
  `npm run guardrails` passed; `git diff --check` passed.
- FLAG: local replay simulation only; no live API route, no durable persistence, no Prisma model, no migration,
  no env vars, no generated keys, no network call, no paid service, and no production API promotion.

## 2026-07-05 - (codex) - Sunday frontier AWS compatibility indexes

- WHAT: Added exact `docs/aws` and `infra/aws-shadow` visibility paths without creating a parallel AWS
  source of truth. The docs index points to canonical `docs/fable/aws` and `infrastructure/aws` artifacts,
  explains the AWS Well-Architected six-pillar GSE lens, and records the local-only AWS shadow boundary.
  The infra path adds local fixture aliases for Shadow Control Tower, Step Functions, EventBridge,
  SageMaker Model Monitor, Bedrock Guardrails, AgentCore, and Clean Rooms patterns.
- FILES: `docs/aws/*`, `infra/aws-shadow/*`, `scripts/guardrails/aws-compatibility-index-scan.mjs`,
  `scripts/guardrails/fixtures/aws-compatibility-index.json`, `apps/web/__tests__/aws-compatibility-index.test.ts`,
  `package.json`, Sunday audit/handoff docs, and commercial ledger.
- GATE: first scanner run correctly failed on two command-shaped deployment phrases; wording was tightened.
  `npm run guard:aws-compatibility-index`, `npm run test --workspace=apps/web -- aws-compatibility-index.test.ts`,
  `npm run fable:aws-gates`, `npm run fable:aws-fixtures`, `npm run fable:aws-governance`, and
  `git diff --check` passed.
- FLAG: compatibility indexes and local fixtures only; no AWS credentials, account IDs, ARNs, CLI calls,
  deploy code, DNS changes, paid resources, SDK dependencies, cloud mutation, or production gate flips.

## 2026-07-05 - (codex) - Sunday frontier no-bet governor integration hardening

- WHAT: Added a focused no-bet governor integration harness proving high modeled edge cannot override
  missing required evidence, stale market-gravity inputs, unclear source rights, calibration drift, or
  calibration debt. The first red run exposed two real failures: drift pressure and ECE/Brier debt still
  allowed a `PLAY`. Hardened `computeGseActionScore` with a calibration action policy: validated
  calibration can score normally, WATCH/insufficient calibration caps action below LEAN/PLAY, and
  DRIFTING/BLOCKED calibration hard-passes. Added a public driver for the probability-claim cap without
  exposing protected weights.
- FILES: `packages/prediction-engine/src/gse-score/gse-action-score.ts`,
  `packages/prediction-engine/src/gse-score/calibration-action-policy.ts`,
  `packages/prediction-engine/src/gse-score/__tests__/no-bet-governor-integration.test.ts`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: initial targeted test failed exactly on drift/debt still producing `PLAY`; after the policy patch,
  targeted no-bet integration passed (1 file, 5 tests), adjacent governor/metric suite passed (7 files,
  23 tests), full prediction-engine tests passed (85 files, 786 tests), and prediction-engine typecheck
  passed after fixing one fixture literal from uppercase `UNKNOWN` to lowercase `unknown`.
- FLAG: local shadow decision-quality hardening only; no pick publication, probability claim activation,
  model-version promotion, pricing, betting, schema, route exposure, live API, paid service, or production
  gate flip.

## 2026-07-05 - (codex) - Sunday frontier launch page visual and copy QA

- WHAT: Added a route-level launch commercial QA harness for `/media-kit`, `/partners`, `/newsletter`,
  `/content-lab`, `/podcast`, and `/pricing`. The test locks canonical route metadata, shared Nav/Footer/main
  anatomy, responsive source contracts, page-specific launch promises, newsletter lead magnets, podcast
  coming-soon/no-auto-publish language, sponsor/editorial boundaries, no live provider markers on media pages,
  and no unsupported public proof, fake traffic, fake sponsor, ROI, CLV-ledger, or verified-win-rate claims.
  Then captured desktop and mobile full-page screenshots from a local Next dev server for all six routes.
- FILES: `apps/web/__tests__/commercial-pages-launch-qa.test.ts`,
  `reports/launch-page-visual-qa/2026-07-05/*`, Sunday audit/handoff docs, and commercial ledger.
- GATE: focused page tests passed (`commercial-pages-launch-qa.test.ts`, `media-kit-page.test.ts`,
  `partners-page.test.ts`, `pricing-honesty.test.ts`, and `pricing-value-architecture.test.ts`:
  5 files, 40 tests). Local render captured all six routes at desktop 1440px and mobile 390px after
  starting `npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3065`; final route captures
  returned HTTP 200. The first screenshot attempt exposed Git Bash path conversion and was rerun with
  `MSYS_NO_PATHCONV=1`.
- FLAG: local source/render QA only; no production preview, no email provider, no podcast feed,
  no affiliate link, no sponsor integration, no API route exposure, no AWS action, no paid service,
  no auto-publish, and no commercial/performance claim activation.

## 2026-07-05 - (codex) - Sunday frontier YAC Creation and Rush Environment metrics

- WHAT: Added two governed `SHADOW` proprietary football metrics on the existing metric foundation.
  `yac-creation-gse` measures actual YAC over `expected-yac-gse` with shrinkage and public after-catch
  drivers. `rush-environment-index` measures rushing context before crediting/blaming the ball carrier,
  using down-distance, box/front pressure, line continuity, run-direction leverage, game script, and weather.
  Both carry birth certificates, public drivers without protected weights, source-policy passthrough,
  uncertainty bands, and confidence meanings that explicitly avoid probability/talent claims.
- FILES: `packages/prediction-engine/src/metrics/receiving/yac-creation.ts`,
  `packages/prediction-engine/src/metrics/rushing/rush-environment-index.ts`,
  `packages/prediction-engine/src/metrics/__tests__/yac-creation.test.ts`,
  `packages/prediction-engine/src/metrics/__tests__/rush-environment-index.test.ts`,
  metric birth certificate/export updates, `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: first targeted metric run failed because `metric-asset-graduation.test.ts` still pinned the old
  six-metric asset order. After updating the registry expectation, targeted metric tests passed
  (6 files, 20 tests), prediction-engine typecheck passed, and full prediction-engine tests passed
  (87 files, 790 tests). Escape-hatch scan over new metric code found no `as any`, `as unknown`,
  `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, or enums. `npm run guardrails`
  and `git diff --check` passed. `npx prettier --check ...` could not run because npm attempted a
  network fetch for Prettier and failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; no package install
  or dependency change was attempted.
- FLAG: local metric primitives only; no public/API metric exposure, no model-card or drift-card
  promotion, no validation claim, no source-rights legal clearance claim, no prediction publication,
  no model-version bump, no schema change, and no production gate flip.

## 2026-07-05 - (codex) - Sunday frontier Expected Rush Yards and Rush Over Expected metrics

- WHAT: Added two governed `SHADOW` rushing metrics on the proprietary metric foundation.
  `expected-rush-yards-gse` derives expected rushing yards from Rush Environment Index,
  down-distance/field constraints, designed-rush context, and shrunk rusher/defense priors.
  `rush-over-expected-gse` derives rushing yards over expectation from actual rush yards versus
  GSE expected rush yards, stabilized by shrunk rusher residual prior and source-cleared contact
  proxies. Both return public drivers without protected weights, source-policy passthrough,
  uncertainty bands, and confidence meanings that explicitly avoid outcome-certainty/talent claims.
- FILES: `packages/prediction-engine/src/metrics/rushing/expected-rush-yards.ts`,
  `packages/prediction-engine/src/metrics/rushing/rush-over-expected.ts`,
  `packages/prediction-engine/src/metrics/__tests__/expected-rush-yards.test.ts`,
  `packages/prediction-engine/src/metrics/__tests__/rush-over-expected.test.ts`,
  metric birth certificate/export/test updates, `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: targeted metric tests passed after splitting the growing birth-certificate registry into a
  compact contract/lookup module plus `metric-birth-certificate-registry.ts` (5 files, 15 tests).
  LOC check: `metric-birth-certificate.ts` 74 pure LOC, registry 193, `expected-rush-yards.ts`
  95, `rush-over-expected.ts` 88, and both new test files under 60 pure LOC. Prediction-engine
  typecheck passed; full prediction-engine Vitest passed (89 files, 794 tests); root typecheck
  and lint passed; root guardrails passed; `git diff --check` passed. The full all-workspaces test
  wrapper hit the 300s tool ceiling, so validation was decomposed by workspace: apps/web passed in
  six chunks (531 files, 7056 tests), crypto passed (1 file, 13 tests), data-ingestion passed
  (16 files, 131 tests), ingestion-pipeline passed (6 files, 60 tests), prediction-engine passed
  (89 files, 794 tests), and types passed (1 file, 31 tests).
- FLAG: local metric primitives only; no public/API metric exposure, no model-card or drift-card
  promotion, no validation claim, no source-rights legal clearance claim, no prediction publication,
  no model-version bump, no schema change, no live route, and no production gate flip.

## 2026-07-05 - (codex) - Sunday frontier receiver/rusher residual rollups

- WHAT: Added a governed player-season residual rollup helper for `yac-creation-gse` and
  `rush-over-expected-gse`. The helper groups play-level residual rows by metric, player, and
  season; rejects mixed direct rollups; emits `SHADOW` / `INTERNAL` summaries only; carries
  source-policy validation forward; fails source posture closed for blocked modeling sources; and
  keeps residual totals/per-play values separate from evidence confidence.
- FILES: `packages/prediction-engine/src/metrics/core/residual-rollup.ts`,
  `packages/prediction-engine/src/metrics/__tests__/residual-rollup.test.ts`,
  metric core/package export updates, `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: targeted residual tests passed with adjacent residual metrics (3 files, 9 tests), the
  direct mixed-rollup guard passed (1 file, 6 tests), prediction-engine typecheck passed, full
  prediction-engine Vitest passed (90 files, 800 tests), root typecheck passed, root lint passed,
  root guardrails passed, and `git diff --check` passed.
- FLAG: local aggregation primitive only; no public leaderboard, no API exposure, no raw tracking
  rows, no protected weights, no model-card or drift-card promotion, no validation claim, no source
  legal-clearance claim, no schema change, no live route, and no production gate flip.

## 2026-07-05 - (codex) - Sunday frontier metric evidence-card generators

- WHAT: Added governed model-card and drift-card generators for proprietary metric assets.
  Model cards are draft-first and consume asset metadata, validation reports, residual rollups,
  limitations, and evidence refs without changing lifecycle, API exposure, licensing status, or
  public approval. Drift cards consume explicit drift checks plus residual-rollup risk signals and
  classify local evidence as `MISSING`, `STABLE`, `WATCH`, or `SEVERE`.
- FILES: `packages/prediction-engine/src/metrics/core/metric-evidence-cards.ts`,
  `packages/prediction-engine/src/metrics/__tests__/metric-evidence-cards.test.ts`,
  metric core/package export updates, `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`,
  Sunday audit/handoff docs, and commercial ledger.
- GATE: targeted evidence-card, residual-rollup, and graduation tests passed (3 files, 18 tests);
  evidence-card cleanup test passed (1 file, 6 tests); prediction-engine typecheck passed; and
  escape-hatch scan found no TS escape hatches or type assertions in the new evidence-card files.
  Full prediction-engine Vitest passed (91 files, 806 tests), root typecheck passed, root guardrails
  passed, root lint passed, and `git diff --check` passed.
- FLAG: local evidence-card generation only; no metric approval, no lifecycle promotion, no public/API
  exposure, no licensing readiness claim, no validation claim beyond supplied fixtures, no source
  legal-clearance claim, no schema change, no live route, and no production gate flip.
