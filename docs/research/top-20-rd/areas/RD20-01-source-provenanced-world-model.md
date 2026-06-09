# RD20-01: Source-Provenanced World Model

Status: R&D handoff
Priority: P0
Horizon: Foundation
Owner mode: Data + prediction foundation

## Strategic Thesis

The product should be built around evidence lineage, not around untraceable picks. Every visible claim, hidden factor, feature value and model output needs source family, retrieval time, transform version, confidence and legal state.

## Why This Matters Now

Competitors can buy projections and build optimizers. Few show users the chain of custody behind each decision. Provenance is the root of trust, legal safety, debugging, calibration and premium tiering.

## Competitor Pressure

FTN, FantasyPros, Footballguys, RotoGrinders and Action Network sell authority and convenience. GSE can sell accountability: source, freshness, contradiction and decision trace.

## Current Repo Anchors

- docs/brain/source-hierarchy.md
- docs/brain/evidence-vault.md
- docs/research/gse-data-architecture-map.md
- packages/data-ingestion/src
- packages/prediction-engine/src

## External Sources

- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - Provenance vocabulary and interchange model for source lineage.
- [OpenLineage](https://openlineage.io/) - Open standard reference for pipeline, dataset and run lineage.
- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.

## Product Surfaces

- Evidence drawer on pick/player/game cards
- Founder source war room
- Source freshness badges
- Decision trace for generated outputs
- Internal provider/license dashboard

## Data Inputs

- Source registry
- SourceSnapshot
- provider run metadata
- entity graph refs
- feature definitions
- model output ids
- legal state and entitlement state

## R&D Questions

- What is the minimum provenance object needed for every factor?
- How do we store enough for audit without violating provider redistribution terms?
- Which source families are canonical vs cross-check only?
- How should stale or contradicted provenance render in public vs cockpit views?

## MVP Plan

1. Define SourceRegistry and FeatureProvenance schemas in docs/types first
2. Add provenance badges to existing docs/API spec before UI
3. Create a SourceSnapshot-to-feature lineage contract
4. Write tests that reject public claims with missing provenance

## V1 Plan

1. Implement provider adapter registry
2. Build cockpit source war room
3. Expose provenance drawer for internal pick cards
4. Add stale/blocked/contradicted gate states

## V2 / Moat Plan

1. OpenLineage-compatible export for internal pipeline runs
2. Feature lineage graph
3. Source reliability calibration by claim type
4. Provider cost and license impact overlay

## Claude Build Tasks

1. RD20-01-01: Draft TypeScript interfaces for SourceRegistry, SourceRun, FeatureProvenance and DecisionTrace
2. RD20-01-02: Map current SourceSnapshot and prediction output objects to the new provenance contract
3. RD20-01-03: Create a docs-only ADR for canonical source families and cross-check families
4. RD20-01-04: Add guardrail test plan for missing provenance on public responses
5. RD20-01-05: Design the cockpit Source War Room route spec

## Acceptance Criteria

- Every new factor has source_id, retrieved_at, transform_version, freshness_ttl and activation_state
- Public output cannot include a factor without activated source provenance
- Cockpit can explain why a factor is stale, blocked or shadowed
- Docs name the legal/cache/display boundary per source family

## Risk Register

- Over-collecting raw provider payloads
- Treating model output as source truth
- Duplicating truth domains
- Exposing paid/provider data outside license

## Metrics To Track

- Percent of outputs with complete provenance
- stale factor block rate
- source contradiction count
- time to explain a pick decision

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
