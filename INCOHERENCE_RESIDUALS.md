# Incoherence Residuals

*`packages/engine/src/galileo/incoherence-residual.ts` — Invention 2. Pure, shadow-only.*

A residual is the gap between what a self-consistent market SHOULD show and what it shows. Each
residual is a uniform record: `residualType · affectedMarket · affectedBook · expectedDirection ·
observedDirection · magnitude · timestamp · explanation · confidence · dataQualityStatus`.

## The eight residuals
| # | Type | Detects |
|---|---|---|
| 1 | `spread_total_team_total` | team totals that don't reconcile with spread+total algebra |
| 2 | `game_total_to_prop` | total moved but a player prop didn't (temporal) |
| 3 | `qb_passing_to_receiver_yardage` | receiver yards that can't fit (or far under) the QB line |
| 4 | `qb_passing_to_receptions` | QB line moved but receptions stale (temporal sibling) |
| 5 | `rb_rush_receiving_gamescript` | high RB rush line on a likely-trailing team |
| 6 | `alt_line_curvature` | monotonicity / negative-density / non-unimodal / mispriced tail |
| 7 | `book_outlier_stale` | a book off consensus (static) or left behind a move (temporal) |
| 8 | `role_change_to_prop_lag` | a prop unmoved after a role shock |

## API
```ts
computeStaticResiduals(surface, { homeTeam, awayTeam, qbKey, receiverYardKeys, rb, altLadders });
computeTemporalResiduals(after, { before, transmissionPropKeys, qbKey, receptionKeys, roleLags });
computeResiduals(after, ctx); // both
```

`confidence` rises with magnitude/severity — it is **not** a probability of profit. A residual is
a hypothesis that must clear the Edge Immune System + Ledger before it can be anything more.

## Built on
The tested `market-physics/coherence.ts` + `alt-line-curvature.ts` checks; this is the structured
scoring/observability surface over them. Tests cover every required artificial-inconsistency
scenario (total moves but props don't, QB down but receivers stale, role shock but prop unmoved,
alt monotonicity break, a lagging book).
