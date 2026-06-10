# GSE NFL World-Model Claude Build Queue

Generated from the R&D packet on 2026-06-09. This queue is implementation guidance only. It does not approve migrations, source contracts, scraping, or production feature exposure.

## Counts

- Total build cards: 120
- P0 cards: 10
- P1 cards: 35
- P2 cards: 45
- P3 cards: 30

## By Category

- foundation: 15
- nfl_core: 15
- market: 10
- weather_stadium_travel: 12
- injury_availability: 12
- training_development: 10
- video_game_analog: 20
- news_reporting: 10
- product_engagement: 12
- founder_only: 4

## Top 10 First Builds

- [BUILD-001 - Source license registry and allow deny ingestion gate](./BUILD-001-source-license-registry-and-allow-deny-ingestion-gate.md)
- [BUILD-002 - Canonical NFL entity graph for teams players coaches venues seasons](./BUILD-002-canonical-nfl-entity-graph-for-teams-players-coaches-venues-seasons.md)
- [BUILD-003 - Provider adapter interface with mocked licensed feed contract tests](./BUILD-003-provider-adapter-interface-with-mocked-licensed-feed-contract-tests.md)
- [BUILD-004 - Provenance ledger for every stat report model feature and output](./BUILD-004-provenance-ledger-for-every-stat-report-model-feature-and-output.md)
- [BUILD-005 - Historical warehouse for schedules rosters play by play injuries markets weather](./BUILD-005-historical-warehouse-for-schedules-rosters-play-by-play-injuries-markets.md)
- [BUILD-006 - World model feature store with versioned feature definitions](./BUILD-006-world-model-feature-store-with-versioned-feature-definitions.md)
- [BUILD-007 - Model evaluation harness with backtest splits and leakage checks](./BUILD-007-model-evaluation-harness-with-backtest-splits-and-leakage-checks.md)
- [BUILD-008 - Stadium weather canonical map with roof turf altitude coordinates](./BUILD-008-stadium-weather-canonical-map-with-roof-turf-altitude-coordinates.md)
- [BUILD-009 - Official injury status normalization schema and confidence ladder](./BUILD-009-official-injury-status-normalization-schema-and-confidence-ladder.md)
- [BUILD-010 - Founder only source risk dashboard](./BUILD-010-founder-only-source-risk-dashboard.md)

## Usage Rule

Before Claude Code implements any card, it should read:

1. ../gse-source-risk-register.md
2. ../gse-current-data-state.md
3. ../gse-data-architecture-map.md
4. The specific card file

Cards touching external sources must start with source approval and contract review. Cards touching product surfaces must keep formulas, weights, and founder-only source-risk details private by default.
