# Data Intelligence Mesh

*`@sports/data-intelligence` — additive, shadow-only, fixture-safe. No keys, no network, no live
gate. 38 tests green, typecheck clean. `data-ingestion` fetches; `data-intelligence` JUDGES.*

## Thesis

GSE is a **data company** before it is a picks, fantasy, media, or AI company. The moat is not "we
have The Odds API and nflverse." The moat is that **GSE knows which facts exist, when they became
knowable, which source saw them first, which sources disagree, which facts actually change
decisions, and which are too expensive, dirty, late, or legally unsafe to trust.**

The mesh treats every source as an **observer** with its own latency, rights, quality, coverage,
bias, blind spots, cost, and decision leverage — and ranks each by the intelligence it buys per
dollar, per legal risk, per engineering hour.

## Modules (all pure + deterministic)

| Module | What it does |
|---|---|
| `fact-type.ts` | the fact taxonomy — organize strategy by FACT CLASS (market / football-reality / fantasy-market / dfs / attention / identity), not by vendor |
| `entity-spine.ts` | canonical GSE entity ids + external-provider mappings; detects identity collisions |
| `source-genome.ts` | source-level intelligence record; the **legal verdict is the first gate** (forbidden can never go live) |
| `endpoint-genome.ts` | endpoint-level record (fact types, grain, latency, point-in-time safety, replay vs live value) |
| `temporal-fact.ts` | every fact is time-locked; `knowableAt()` **fails closed** — a fact GSE couldn't have seen at decision time earns no decision credit |
| `source-quality-score.ts` | `SourceReliability = accuracy × schema_stability × sla_hit × entity_confidence × correction_transparency` (multiplicative — one weak link drags it down) |
| `data-leverage-field.ts` | per-fact decision leverage = decisions-changed value ÷ (cost + rights + latency + complexity + false-confidence) |
| `source-conflict-court.ts` | classify disagreements (late / bad / entity-collision / stat-def / projection / **fantasy-platform lag** / rumor / book-policy) and route them — sometimes the disagreement IS the edge |
| `source-cost-model.ts` | leverage per dollar — how a free open dataset out-ranks an expensive feed when it's decision-relevant |
| `coverage-gap-radar.ts` | given the facts GSE modules require and the endpoints it has, name the missing facts and rank by modules blocked |
| `acquisition-governor.ts` | rank what to buy / use free / ignore / never touch; legal gate first, then yield-per-cost, weighted by coverage of a target experiment |
| `api-budget-planner.ts` | greedy budget allocation — free first, never spend on a review-gated source |
| `source-dossier.ts` | 27 typed dossiers with honest recommendations (USE_NOW … DO_NOT_USE) |

## The core formulas

```
DataLeverage = P(decision_changes|fact) × EV × proof × freshness × repeatability × uniqueness
             ÷ (cost + rights_risk + latency + complexity + false_confidence_risk)

SourceReliability = historical_accuracy × schema_stability × freshness_sla_hit_rate
                  × entity_mapping_confidence × correction_transparency

AcquisitionPriority = (Reliability + Novelty + FreshnessAlpha + DecisionLeverage + ProofValue)
                    ÷ (1 + Cost + RiskPenalty + IntegrationComplexity)   [× coverage match for a target]
```

## The four knowledge states (the operating model)

GSE will never own every data point. The attainable — and more powerful — version is to know what
it knows, when, and what it's missing:

- **Known Known** — confirmed, source-cleared, timestamped fact (creditable via `knowableAt`).
- **Known Unknown** — a missing fact we can name and price (Coverage Gap Radar).
- **Unknown Known** — a fact observed indirectly through market/fantasy movement before source
  confirmation (the conflict court's `FANTASY_PLATFORM_LAG` / `USE_AS_CONTRADICTION_SIGNAL`).
- **Unknown Unknown** — a recurring residual the ontology can't yet explain (handed to the Genesis
  layer's Unknown-Unknown Scout).

## What is real / fixture-only

All modules are pure, typed, deterministic, and tested on hand-built fixtures. The genome numbers
are reasonable priors for illustration, **not measured values**. Nothing fetches, holds a key, or
wires a provider. `data-ingestion` remains the only fetcher; this package only judges.

## Acceptance (A–I, `__tests__/acceptance.test.ts`)

A forbidden source can't be USE_NOW · a high-cost low-unique source ranks below a cheap high-leverage
one · a stale disagreement is `LATE_SOURCE` (trust the fresher) · a fantasy projection vs injury
truth is `FANTASY_PLATFORM_LAG` (a signal, not an average) · a fact first-knowable after the decision
earns no credit · a high-rights-risk source is `RIGHTS_REVIEW` even with great coverage · the radar
names the missing prop history / DFS salary / ADP / roster % / start % / add-drop velocity · for a
Book DNA target dense odds snapshots outrank trivia · for a DFS salary-lag target SportsDataIO
outranks the odds provider.

## Guardrails honored

No live gate, no `priced=true`, no fabricated data, no scraper wired without rights review, no paid
dependency without a dossier, no public claims, no auto-publishing. Every fact carries provenance,
knowability, rights, and attribution; the legal verdict gates everything.
