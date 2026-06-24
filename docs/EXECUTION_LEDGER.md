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

## 2026-06-24T15:53:34Z - pending commit - E3

- WHAT: Added board pipeline trace IDs, typed `degradations[]`, health status metadata, and a compact Board-health badge on `/board` while preserving the existing confidence redaction route.
- FILES: `apps/web/lib/board/health.ts`, `apps/web/lib/board/health.test.ts`, `apps/web/lib/board/state.ts`, `apps/web/components/board/board-health-badge.tsx`, `apps/web/app/board/page.tsx`, `apps/web/__tests__/board-stale-kill-switch.test.ts`, `apps/web/__tests__/board-state-confidence-gate.test.ts`, `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`
- GATE: focused board health/stale/confidence tests passed 18 tests; E3 new files measured 242 total LOC; static diff/suppression checks passed; repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed; local built-app smoke confirmed `/board` renders Board health and `/api/board/state` returns `traceId`, `degradations[]`, and health status.
- FLAG: draft-only / `priced=false`; no projection provider, `canPublishProjections`, pricing, model-version, public performance gate, publication flag, or provider routing changed.
- DECISIONS: Treat board trace/degradation metadata as request-observability only; it explains suppressed/stale/DB/empty states without changing pick generation or publication logic.
- NEXT: F1 persist-what-we-fetch serving-table/interface seam.
- BLOCKED-ON-HUMAN: durable trace storage, alert routing, SLA thresholds, and any public status claims beyond per-request board metadata remain `[INFRA]/[OWNER]`.
