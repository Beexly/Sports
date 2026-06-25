# Market Reality Twin

*`packages/engine/src/galileo/market-twin.ts` — Invention 1. Pure, shadow-only.*

A game's market is not a price list; it is a belief system with structure. The twin turns a
`MarketSurface` (per-book quotes reduced to consensus + no-vig + best-available + dispersion)
into a **typed graph** other instruments reason over.

## Nodes
`game · team · player · book · market · outcome · timestamp · event (injury/news/weather) ·
role_state`

## Edges
`player_of_team · prop_of_player · book_offered · line_moved_at · market_implies_team_total ·
qb_relates_receiver · rb_relates_script · alt_relates_main · event_affects_role ·
market_moved_after_event · book_lagged_consensus`

## API
```ts
const twin = buildMarketTwin(surface, {
  homeTeam, awayTeam, playerTeam, qbReceivers, scriptRbs, events, laggedBooks,
});
twin.getNode(twinId.market("player_pass_yds:QB1"));
twin.neighbors(twinId.player("QB1"));        // incident edges
twin.neighbors(twinId.market("total"), "market_implies_team_total"); // implied team totals
```
The output is a **market-state object**, never a pick. The incoherence-residual, absorption,
and counterfactual instruments consume it.

## Built on
The tested `market-physics/market-surface.ts` (consensus, de-vig, best line, dispersion,
static book-outlier flags) — the twin adds the relational layer on top.
