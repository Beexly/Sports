# scores24.live — GraphQL paging solved, live odds + trends extracted

## The paging problem, solved
Earlier cycles were stuck because `Match` returns oldest-first and caps at 1,500 rows, and
`datebetween` silently returns empty. The answer is not paging at all — the public site's own
**date pages** carry the slugs:

    GET /en/american-football/2026-10-25   ->  20 `m-DD-MM-YYYY-home-away` links (NFL included)

and the **API slug drops the leading `m-`** ("25-10-2026-baltimore-ravens-cincinnati-bengals").
Feed that to GraphQL and everything works.

## Working live calls (all 200, api key from the page config)
- `MatchHeaderOdds(match_slug, sport_slug:"american-football", location, audience)`
  -> live moneylines. `location:"US"` + `audience:"default"` changes prices (1.93 -> 1.971 on
  BAL/CIN) and flips `is_alt`; the free tier only returns aggregated rows (2 per game,
  `bookmaker_slug: null`); without location it names `mybookie`.
- `TrendList(sport_slug, league_slug:"usa-nfl", first, after)`
  -> Relay connection: `edges[].node.match.slug` + `node.trends[]` where each trend has
  `prediction{value, live_value, initial_live_value, type[], bookmaker_slug}`, `facts[]`
  (natural-language trend statements), `facts_count`, `surefire`, `created_at`, plus
  `trend_key` and `operation_type` on the node and `pageInfo{hasNextPage, endCursor}`.
  `live_value` / `initial_live_value` are the odds-movement pair.
- `MatchPredictionQuery(match_slug, lang)` -> resolves to `TrendsByMatch` (same shape, per game).

All arguments typed `String!`; `Match` sub-fields are `teams{name slug}` (no homeTeam/awayTeam)
and `status` needs a sub-selection.

## Snapshots
`extracted_data/scores24_nfl_odds_2026-10-22.csv` (6 rows, 3 games)
`extracted_data/scores24_nfl_trends_2026-10-22.csv` (6 trends, incl. "Bears lost 1st half in 6 of
last 7 vs Patriots", surefire flags, implied odds)

## Caveats
- Free tier returns one bookmaker and 2 outcomes per game; location/audience only nudge prices.
- `trend_type` on ResultTrend 500s per-row while `type` inside `prediction` works — use the latter.
- `Match(slug:...)` with a live slug returns `[]` even though odds/trends accept the same slug;
  the odds/trends resolvers are the usable surface.
