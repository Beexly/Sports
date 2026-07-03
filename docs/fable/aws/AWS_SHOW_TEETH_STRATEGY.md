# AWS Show Teeth Strategy

Updated: 2026-07-03

This is a lawful leverage plan, not marketing copy. The goal is to find small, testable, public-data or partner-approved advantages and reject them quickly when they fail.

## What Incumbents May Miss

- Source freshness decay across public sources.
- Event timing relative to market-open snapshots.
- Roster and depth-chart instability after public transactions.
- Model disagreement entropy as an uncertainty signal.
- Data-quality decay as a no-action signal.

## What AWS Can Help Expose

- Batch replay and artifact governance through SageMaker-shaped local artifacts.
- Partner-safe aggregate questions through Clean Rooms design.
- Agent governance through Bedrock/AgentCore-style firebreaks.
- Evidence storage and audit trails after source rights and owner approval.

## What AWS Cannot Prove By Itself

- Measured model gain.
- Legal clearance.
- Official sports-data parity.
- Partner existence.
- Live market accuracy.
- Production readiness.

## Edge Candidate Matrix

| Edge category | AWS leverage point | Non-AWS alternative | Data needed | Legal status | Expected marginal gain | How to measure | How to falsify | Cost to test | Demo artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| source freshness decay | S3/Athena later for timestamped source logs | local JSON/SQLite replay | source timestamps and event ids | public/registry-reviewed only | small, unknown | stale vs fresh calibration split | no out-of-sample lift after freshness split | $0 local | freshness-decay replay report |
| injury-report timing delta | EventBridge/Lambda later for schedule | local fixture timestamps | injury report time and market-open time | source-specific review | small, unknown | post-event probability delta | no statistically meaningful delta | $0 local | forensic fixture |
| roster transaction shock | Glue/Athena later for event joins | local joins | public transactions and depth chart | source-specific review | small, unknown | error before/after transaction windows | same calibration as baseline | $0 local | transaction shock ledger |
| depth-chart instability | SageMaker Feature Store later | local feature manifest | public depth-chart changes | source-specific review | small, unknown | uncertainty and outcome error by instability bucket | no bucket separation | $0 local | depth-chart instability report |
| public schedule fatigue | Athena later for schedule queries | local schedule parser | rest, travel, body clock, weather, turf | public data if source approved | small, unknown | held-out split by fatigue buckets | no improvement over rest-only baseline | $0 local | fatigue feature card |
| travel/body-clock/weather/turf interaction | S3/Athena later for feature joins | local feature matrix | schedule, venue, weather, turf | public data if source approved | small, unknown | interaction term replay | interaction unstable across seasons | $0 local | interaction falsification table |
| model disagreement entropy | Bedrock not needed; SageMaker later for model registry | local ensemble logs | model probabilities | internal | small, unknown | entropy vs error/correction curve | entropy not monotonic with error | $0 local | entropy uncertainty chart |
| calibration drift after shocks | Model Monitor later | local drift module | prediction/outcome windows | internal plus approved outcomes | small, unknown | ECE/Brier by shock windows | no post-shock drift | $0 local | drift report |
| book dispersion as uncertainty proxy | Athena later for odds snapshots | local odds fixtures | licensed odds snapshots | license required | small, unknown | dispersion vs model miss rate | dispersion adds no signal beyond line movement | $0 with fixtures | dispersion proxy report |
| public-event timestamp versus market movement | Clean Rooms later with partner-approved aggregates | local fixture only | event timestamps and market snapshots | rights/license required | unknown | event-to-move timing analysis | timing does not precede movement | $0 fixture | market forensic report |
| source contradiction detection | AgentCore-style reviewer later | local contradiction rules | multiple public sources | source-specific review | unknown | contradiction rate vs later corrections | contradictions do not predict corrections | $0 local | contradiction queue |
| role elasticity after transaction shock | SageMaker feature governance later | local roster/role feature | public role/usage changes | source-specific review | small, unknown | role-change bucket replay | unstable or overfit effect | $0 local | role elasticity card |
| stale consensus penalty | Model registry later for model cards | local consensus snapshots | consensus probabilities | source/license review | small, unknown | stale consensus vs current model calibration | no delta after freshness control | $0 local | stale consensus penalty report |
| public narrative volatility | Bedrock only after cost/legal gates | local text metadata only | approved public text metadata | high review need | unknown | narrative volatility vs uncertainty | text adds no safe signal | $0 metadata fixture | narrative volatility ledger |
| data quality decay | CloudWatch later for monitoring | local quality scores | source completeness metrics | internal/public | medium as no-action gate | quality score vs model error | quality score not predictive | $0 local | data quality decay report |
| no-`official NGS` approximation layer | SageMaker local feature audit later | local proxy feature docs | public proxies only | must not imply official tracking | unknown | proxy vs baseline replay | proxy adds no robust value | $0 local | approximation limitation card |

## Demo Strategy

1. Keep fixture-only demo as the default.
2. Add one local replay per candidate only after source rights are classified.
3. Publish evidence IDs, commands, sample windows, and falsification rules.
4. Reject candidates that do not beat baseline with a clean split.

## Cost Traps

- Hosted training before local artifacts mature.
- Paid model calls for agent summaries that deterministic validators can handle.
- Managed search/vector infrastructure before source rights and corpus value are proven.
- Clean-room setup without a partner and legal basis.

## Legal Traps

- Treating public availability as commercial-use rights.
- Storing raw partner data without an agreement.
- Inferring official licensed tracking status from approximation features.
- Letting agents scrape restricted sources or store secrets in memory.

## Falsification Strategy

Every candidate must define a baseline, a split, a sample window, and a kill rule. If the effect disappears out-of-sample, conflicts with source rights, or requires paid infrastructure before local proof, it is rejected or held.
