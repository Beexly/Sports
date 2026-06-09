# GSE Data Architecture Map

## Current Compatible Architecture

| Layer | Current Repo Evidence | World-Model Extension |
| --- | --- | --- |
| Source acquisition | packages/data-ingestion and packages/ingestion-pipeline | Provider adapter registry with allow/deny, rate limits, source family, and legal state |
| Raw evidence | SourceSnapshot model and source-snapshot.ts | Immutable raw snapshot ledger for all approved external and manual sources |
| Normalized entities | Prisma Team, Game, Odds, SourceCoverageReport and related models | Canonical NFL entity graph for players, teams, coaches, venues, seasons |
| Feature store | Prediction engine context and signal snapshots | Versioned feature definitions with source lineage and freshness |
| Model output | Pick, PickSignalSnapshot, GateDecision, LossAutopsy | World-model scenarios, confidence bands, simulator outputs, autopsy |
| Product gate | entitlements.ts, readiness.ts, picks route | Tier-driven signal projection and founder-only reveal controls |
| Ops/cockpit | cockpit source stub and readiness docs | Source war room, approval queue, stale/blocked alerts, budget and license dashboard |

## Data Flow

1. Source registry approves or blocks a source family.
2. Adapter fetches or accepts manual input within rate/contract limits.
3. Raw response is hashed and stored as a SourceSnapshot.
4. Normalizer maps source records to canonical entities and game state.
5. Feature builder writes versioned features with source lineage.
6. Model creates outputs and confidence bands.
7. Product projection hides or reveals signals by entitlement and legal state.
8. Settlement/autopsy records forecast error and source quality.

## Storage Principle

Store enough to reproduce a decision and respect source contracts. Do not store protected article bodies, video/audio, social content, raw proprietary feed payloads, or copied rating assets unless an explicit contract allows it.
