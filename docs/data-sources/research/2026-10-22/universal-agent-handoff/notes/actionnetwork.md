# Action Network — open multi-book odds (the DK/FD workaround)

Moving fast off the bookmaker dead end: `api.actionnetwork.com` is fully open and aggregates books,
which is exactly what DK and FanDuel refused to give directly.

- `GET https://api.actionnetwork.com/web/v2/scoreboard/nfl` -> 200 `application/json`, 452 KB,
  14 games, `is_free: true`, and a `markets{book_id: {group: {type: [outcomes]}}}` block per game
  with `odds`, `side`, `value`, `is_live`, `deeplink_id`, `book_id`.
- Filters work: `?bookIds=15,30&periods=event` -> 200, 128 KB, narrower payload.
- Extracted `extracted_data/actionnetwork_nfl_odds_2026-10-22.csv` — **948 odds rows across 7 books**
  (moneyline, spread, total, plus a team-score market). Books include the majors by id.
- Player props: `/web/v2/markets` answers 400/404 on both GET and POST with `event_id`/`type`
  payloads tried; not found yet, moving on rather than grinding.

## Why this matters
Seven books on one call beats the two blocked bookmakers, and it composes with everything already
collected: same games as ESPN and scores24, same players as the crosswalk. Consensus price across
books is also the denominator any edge calculation needs.
