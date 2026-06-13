# File Map

## Product pages
- `apps/web/app/stats/page.tsx`
- `apps/web/app/stats/players/page.tsx`
- `apps/web/app/stats/player/[id]/page.tsx`
- `apps/web/app/stats/compare/page.tsx`
- `apps/web/app/stats/teams/page.tsx`
- `apps/web/app/stats/sources/page.tsx`
- `apps/web/app/stats/coverage/page.tsx`
- `apps/web/app/stats/source-graph/page.tsx`
- `apps/web/app/stats/media/**/page.tsx`
- `apps/web/app/stats/ask/page.tsx`
- `apps/web/app/stats/proof/page.tsx`

## Admin pages
- `apps/web/app/admin/statking/**/page.tsx`

## Data loaders
- `apps/web/lib/statking/product.ts`

## Source registry
- `data/source-atlas/source_registry.json`
- `data/source-atlas/source_candidate_graph.json`

## Rights system
- `lib/statking/rights/index.ts`
- `data/statking/rights/rights_ledger.json`

## Metrics
- `data/statking/active_metric_manifest.json`
- `data/statking/metric_ontology.yaml`
- `data/statking/snapshots/derived_player_metrics.json`

## Proof/backtesting
- `data/statking/proof/proof_report.json`
- `data/statking/proof/metric_reliability.json`
- `data/statking/backtests/backtest_summary.json`

## Media intelligence
- `data/statking/media/*.json`
- `lib/statking/media/**/index.ts`

## Expert signals
- `data/statking/experts/*.json`

## Decision cards / UI components
- `components/statking/*.tsx`
- `apps/web/app/stats/_components.tsx`

## Explanation engine
- `lib/statking/explanations/index.ts`
- `data/statking/explanations/*`

## Tests
- `apps/web/__tests__/statking-*.test.ts`

## Docs
- `docs/statking-*.md`
- `docs/claude-handoff.md`
- `docs/claude-handoff-prompt.md`
