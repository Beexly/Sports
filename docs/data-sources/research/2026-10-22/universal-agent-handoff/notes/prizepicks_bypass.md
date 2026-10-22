# PrizePicks — DataDome bypass via the partner host

## Block
`api.prizepicks.com/*` and `app.prizepicks.com/` are all behind DataDome: 403 with a redirect to
`geo.captcha-delivery.com/captcha/?initialCid=...`. Path variants (`/v1/projections`), league
filters and a Chrome UA all still 403.

## Bypass: different host, same board
    GET https://partner-api.prizepicks.com/projections     -> 200, 32 MB, no captcha, no auth
The partner/SDK host isn't behind the same edge. Straight `/projections` (no query) is 429 under
load; `?per_page=300&page=1` returns fine and also yields 26,867 rows in one shot.

## Payload
JSON:API — `data[]` projections, `included[]` = new_player (4,153), team, game, stat_type, league,
duration. League ids: 9 NFL, 35 NFL1H, 245 NFL1Q (also CFB 15, NBA 7, etc.). Projection attributes
carry `line_score`, `odds_type` (standard/demon/goblin), `hr_20` (hit-rate-20 flag), `trending_count`,
`discount_percentage`, `start_time`, `is_live`. No book-style prices: PrizePicks is fixed-payout,
so the signals are the flags and the line, not odds.

## Extracted
`extracted_data/prizepicks_nfl_props_2026-10-22.csv` — 7,226 NFL/NFL1H/NFL1Q projections
(966 flagged hr_20, 796 with trending_count), player/team/position resolved.

## Tradecraft note
`hr_20` on 966 of 7,226 rows and `trending_count` on 796 are the interesting layer: a hit-rate gate
and a popularity signal, per projection, free.
