# GSE Current Data State

## 1. Repo Audit Result

| Finding | Result |
| --- | --- |
| Repo root | C:\Users\Garrett\Sports |
| Branch | safety/sports-wip-2026-06-04 |
| Scope | Docs-only NFL world-model R&D packet. No migrations, app code, production routes, or source adapters were changed. |
| Existing research docs | docs/research/anthropic-gate-content-flag-aware-2026-05-21.md and docs/research/evidence-source-strategy-2026-05-21.md |
| Integrated data provider | The Odds API is the only live sports data provider already wired in code and env examples. |
| Core ingestion path | packages/ingestion-pipeline/src/process-sport.ts records SourceSnapshot data and shadowEvidence for blocked signal families. |
| Core prediction path | packages/prediction-engine/src/scoring.ts, game-context.ts, constants.ts, signal-snapshot.ts |
| Evidence readiness path | packages/prediction-engine/src/evidence-readiness-matrix.ts separates future evidence families from active scoring evidence. |
| Public gating | apps/web/app/api/picks/route.ts, apps/web/lib/entitlements.ts, packages/prediction-engine/src/readiness.ts |
| Operational triggers | workers/data-refresh/src/index.ts plus apps/web/app/api/cron/refresh-odds/route.ts and apps/web/app/api/admin/trigger-refresh/route.ts |
| Source policy | docs/source-providers/commercial-crawling-approval-gate.md and docs/source-providers/historical-trends-provider-policy.md prohibit crawling or risky feeds before owner approval. |
| Doctrine vs implementation | docs/brain/source-acquisition-mesh.md, docs/performance/radar-and-tracking-data-layer.md, and docs/models/local-model-lane.md are planning/doctrine, not implemented ingestion proof. |
| Notable current gap | No coded adapters yet for injuries, weather, official depth charts, news, NGS aggregates, officials, stadium/weather, or training camp signals. |

## 2. Existing Provider Reality

The Odds API is the only external sports data provider wired in the repo. Evidence appears in package configuration, data ingestion code, docs/data-sources.md, docs/data-source-options.md, and .env.example through THE_ODDS_API_KEY.

## 3. Current Odds Data Path

packages/data-ingestion/src/odds-api-client.ts exposes sports, odds, scores, and events calls. packages/data-ingestion/src/normalizer.ts normalizes games, odds, and scores. packages/data-ingestion/src/config.ts defines supported sports, markets, bookmaker priorities, and freshness expectations.

## 4. Current Context Enrichment

packages/data-ingestion/src/context-enrichment.ts derives opening lines, line movement, rest days, schedule density, ATS/H2H form, data-quality score, and related context from existing database records. It does not fetch injuries, weather, official depth charts, news, officials, player tracking, or training-camp reports.

## 5. Current Ingestion Pipeline

packages/ingestion-pipeline/src/process-sport.ts is the canonical processing path. It records SourceSnapshot rows and builds shadowEvidence for blocked signal categories such as PLAYER_AVAILABILITY, OFFICIALS, VENUE_ENVIRONMENT, PACE, TEAM_RATES, STANDINGS, DIVISION_CONTEXT, and MILESTONES.

## 6. Current Prediction Engine

packages/prediction-engine/src/scoring.ts, game-context.ts, constants.ts, and signal-snapshot.ts combine market consensus, line movement, rest, history, schedule stress, cross-market checks, and data-quality weighting. Future weather, injury, ratings, player, official, venue, pace, and milestone flags remain gated behind source readiness.

packages/prediction-engine/src/evidence-readiness-matrix.ts should be treated as the bridge between source approval, evidence availability, and scoring eligibility.

## 7. Current Database Models

packages/db/prisma/schema.prisma already includes source-aware structures including IngestionRun, Pick, GateDecision, LossAutopsy, SourceSnapshot, GameSignal, PickSignalSnapshot, SourceCoverageReport, Calibration, DailyBrief, ContentDraft, ContentSource, and ContentReview.

## 8. Current Entitlement and Public Surface

packages/types/src/index.ts defines FREE, PRO, and ELITE entitlements. apps/web/lib/entitlements.ts keeps server-side entitlement checks. apps/web/app/api/picks/route.ts gates public picks, filters bootstrap samples, and only exposes factor breakdowns through entitlement logic.

## 9. Current Readiness Gates

packages/prediction-engine/src/readiness.ts and .env.example separate canonical history, derived model history, public picks, featured picks, performance stats, public blog, and outcome-learning flags. This is compatible with a phased world-model rollout.

## 10. Current Cockpit/Source UI

apps/web/app/cockpit/sources/page.tsx is currently a stub/queued rewrite. It is a natural future target for source registry, approval state, freshness, blocked-source disclosure, and founder-only source-risk views.

## 11. Current Demo/Sample Boundary

packages/db/src/sample-picks.ts and packages/db/prisma/seed.ts contain demo/sample pick paths. These should not be mistaken for production model truth.

## 12. Current Source Policy Docs

docs/source-providers/commercial-crawling-approval-gate.md and docs/source-providers/historical-trends-provider-policy.md require approval before crawling or risky source use. Those policies should be treated as hard gates.

docs/brain/source-acquisition-mesh.md, docs/performance/radar-and-tracking-data-layer.md, and docs/models/local-model-lane.md are useful doctrine/planning inputs but are not proof of implemented ingestion.

## 13. Current Rejected Sources

docs/rejected-data-sources.md rejects sources with legal, security, data-quality, or operational problems. The new source register extends that posture by blocking direct sportsbook/media/social/video scraping unless approved and licensed.

## 14. Current Source Docs

docs/data-sources.md and docs/data-source-options.md already mention The Odds API, API-Sports, SportsDataIO, ESPN caution, and sportsbook scraping rejection. This packet updates the research map but does not overwrite those existing docs.

## 15. Current API and Worker Surfaces

apps/web/app/api/cron/refresh-odds/route.ts, apps/web/app/api/admin/trigger-refresh/route.ts, and workers/data-refresh/src/index.ts handle scheduled/admin refresh patterns. apps/web/app/api/picks/[id]/audit/route.ts and apps/web/app/api/performance/route.ts expose gated audit/performance behavior. Future adapters should fit those patterns only after contract/source approval.

## 16. Redundancy Reality

The highest redundancy risk is ingesting the same truth through multiple wrappers: nflverse, nflreadr, nflreadpy, nflfastR, raw NFL pages, Pro Football Reference, SportsDataIO, API-Sports, and odds APIs. The canonical strategy is one provider per truth domain with cross-checks, not additive duplicate pulls.

## 17. Immediate Gaps

- Weather and venue features are modeled as future flags but lack adapters.
- Injury/availability features are modeled as future flags but lack approved ingestion.
- News, training camp, and public attention signals are not currently source-governed.
- Officials, NGS aggregates, participation/snap counts, and player development data are not wired.
- Product tier split for new world-model signals needs implementation design before public exposure.

## 18. Mocked, Demo, and Shadow-Only Boundaries

- packages/db/src/sample-picks.ts is demo-only through DEMO_PICKS_ENABLED or stub DB mode.
- packages/db/prisma/seed.ts contains v5.0.0-seed sample output, and public performance paths should exclude seed/demo truth.
- apps/web/app/api/cron/settle-picks/route.ts is a placeholder; worker settlement is the real settlement path.
- packages/prediction-engine/src/poisson.ts is not wired into live scoring and remains gated by future team-rate ingestion.
- Shadow evidence in process-sport.ts is not the same as licensed canonical inputs.

## 19. Do-Not-Touch Expansion Rules

- Do not touch scoring.ts or bump MODEL_VERSION just to consume unlicensed or shadow stats.
- Do not flip CANONICAL_HISTORY_ENABLED, DERIVED_MODEL_HISTORY_ENABLED, PUBLIC_PICKS_ENABLED, PERFORMANCE_STATS_ENABLED, OUTCOME_LEARNING_ENABLED, TEAM_RATES_AVAILABLE, DEMO_PICKS_ENABLED, or DEV_FAKE_ADMIN as part of R&D.
- Do not relax public filters such as isBootstrap: false or PRO/ELITE audit gates to make demos visible.
