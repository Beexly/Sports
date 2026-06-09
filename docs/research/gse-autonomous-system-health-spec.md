# GSE Autonomous System Health Spec

Generated: 2026-06-09

## Principle

Autonomy is only useful if the operator can see whether it is working. Every autonomous system needs a heartbeat, status, runbook, trace identifier, source/run lineage, failure count, and a policy for what to do when it cannot safely continue.

## System Register

| System | Kind | Criticality | Success condition | Telemetry | Fallback behavior |
| --- | --- | --- | --- | --- | --- |
| source-health-monitor | SOURCE_HEALTH_MONITOR | P0 | Every source has health, freshness, legal state, and fallback state. | source.registry.health_status, source.run.freshness, consecutive misses | Mark source degraded/stale/unavailable; activate fallback; open cockpit alert. |
| odds-ingestion-worker | INGESTION_WORKER | P0 | Odds and market data refresh on cadence. | last_success_at, books_count, markets_count, provider_latency, provider_errors | Switch provider if licensed fallback exists; withhold picks if market coverage is blind. |
| football-state-worker | INGESTION_WORKER | P0 | Scores, schedules, rosters, injuries, officials, stadium/weather state refresh. | domain coverage per league/week, source conflicts, stale domains | Use official/licensed fallback; require manual review for conflicts. |
| scheme-aggregation-worker | INGESTION_WORKER | P1 | nflverse play-call aggregates and scheme profiles refresh after game finalization. | season loaded, rows processed, invalid plays dropped, aggregate count | Keep prior profile with stale badge; do not publish new scheme deltas. |
| pick-generation-worker | PICK_GENERATION_WORKER | P0 | Decision traces generated only from active, fresh, allowed sources. | picks_created, gate_decisions, withheld_count, model_version | Withhold output when P0/P1 sources fail; never invent replacement evidence. |
| settlement-worker | SETTLEMENT_WORKER | P0 | Final outcomes and calibration events settle from official/structured scores. | pending age, settled count, score conflicts, bootstrap flag | Do not settle on conflicting data; open manual review. |
| claim-governance-scanner | CLAIM_GOVERNANCE_SCANNER | P0 | All generated user-facing claims are source-linked and policy-safe. | claims scanned, blocked claims, missing source refs, stale refs | Block publish/return path and send to cockpit queue. |
| synthetic-monitor | SYNTHETIC_MONITOR | P0 | Public routes, API shapes, cockpit routes, and health endpoints are probed. | route status, latency, schema errors, banned text | Raise cockpit P1/P2 and prevent release-ready status. |
| cost-monitor | COST_MONITOR | P1 | Claude/API/provider spend stays within configured budgets. | calls, tokens, cost, budget remaining, circuit-breaker trips | Switch to cheaper mode or pause non-critical generation. |
| debug-trace-collector | DEBUG_TRACE_COLLECTOR | P1 | Worker and API steps emit trace IDs for incident debugging. | trace_id, span, source_run_id, decision_id, error_code | Fail debug readiness if traces missing from P0 flows. |
| claude-handoff-runner | CLAUDE_HANDOFF_RUNNER | P2 | Research/build handoffs remain compact, current, and file-path exact. | handoff generated, artifact count, stale tasks, validation status | Warn if handoff is stale or validation not run. |

## Health States

| State | Meaning | Product effect |
| --- | --- | --- |
| HEALTHY | Running on cadence, no failures, source coverage satisfied. | Normal operation. |
| DEGRADED | Some failures, stale support source, low source count, or budget pressure. | Keep working, badge affected outputs, raise cockpit warning. |
| STALE | Last heartbeat or source run is older than the permitted window. | Withhold dependent claims unless stale display is explicitly allowed. |
| FAILED | Consecutive failure budget exhausted or P0 blind spot exists. | Stop dependent output, open runbook, require operator review. |
| PAUSED | Intentionally stopped by operator or gate. | Do not auto-restart without the configured policy. |
| UNKNOWN | Missing telemetry. | Treat as degraded until proven healthy. |

## Debug Contract

Every P0/P1 run should emit:

- system_id
- run_id
- source_run_id where applicable
- decision_id where applicable
- trace_id
- started_at
- completed_at
- status
- error_code
- source domains touched
- withheld output count
- fallback source selected
- runbook_url

OpenTelemetry should be the long-term trace/metrics/log standard because it gives a portable vocabulary for distributed debugging.

## Control Plane Views

- Operator cockpit: traffic-light overview for systems, source coverage, fallback chain status, and manual reviews.
- Source Health tab: every source, last run, health, legal state, freshness TTL, and active fallback.
- Domain Coverage tab: each intelligence domain, criticality, active sources, stale sources, blind spots.
- Debug Trace tab: recent failed or degraded runs with trace IDs and runbook links.
- Revenue Safety tab: cost monitor, provider budget, API call caps, and paused non-critical systems.

## Sources

- [nflreadr reference](https://nflreadr.nflverse.com/reference/) - Public nflverse loader surface for play-by-play, rosters, schedules, injuries, officials, participation, depth charts, Next Gen Stats and FTN charting loaders.
- [nflreadr load_officials](https://nflreadr.nflverse.com/reference/load_officials.html) - One row per game per official; useful public foundation for officials identity and assignment history.
- [nflfastR load_pbp](https://www.nflfastr.com/reference/load_pbp.html) - Public play-by-play foundation for down, distance, play type, game state, EPA, success, weather text and derived football features.
- [nflfastR update_pbp_db](https://nflfastr.com/reference/update_pbp_db.html) - Maintains a database table for nflverse play-by-play; useful pattern for GSE canonical football history.
- [SportsDataIO NFL API](https://sportsdata.io/nfl-api) - Commercial NFL API covering scores, stats, odds, projections, news, injuries, depth charts, weather forecasts, referee crew, stadiums and historical data.
- [TheRundown API](https://docs.therundown.io/introduction) - Sports betting data API with odds, scores, schedules, team/player stats, player props and historical line data.
- [Tom Bliss NFL Weather Data](https://www.datawithbliss.com/weather-data) - Historical NFL game weather archive and stadium coordinates/roof/azimuth documentation.
- [OpenTelemetry observability primer](https://opentelemetry.io/docs/concepts/observability-primer/) - Standard concepts for traces, spans, metrics and logs in distributed debugging.
- [AWS Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) - Reliability design guidance around resilience, monitoring, recovery and consistent change management.
- [Football Zebras](https://www.footballzebras.com/) - Officiating news and crew assignment context; use as secondary/watchlist source, not a sole production truth source.
- [Pro Football Reference officials](https://www.pro-football-reference.com/officials/index.htm) - Historical officials index; useful for public cross-checking and identity resolution.
- [RefMetrics NFL](https://www.refmetrics.com/nfl/home) - Officials analytics platform through 2025; candidate source to evaluate for officiating trend data.
