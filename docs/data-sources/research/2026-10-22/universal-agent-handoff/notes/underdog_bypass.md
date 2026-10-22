# Underdog — 426 wall bypassed via path downgrade

## What the block was
`api.underdogfantasy.com/beta/v5|v6/over_under_lines` -> 426 `upgrade_required`
("A new version is required to continue"); v7/v8 404. Client-version headers were a red herring:
`X-Client-Version`, `X-App-Version`, `x-client-version` and `?app_version=`/`?client_version=` all
return 426 even with the genuine build string pulled from the app bundle
(`appVersion: "20261021131447"` in `critical.9b4e58d66a0cb86c.js`, alongside
`clientType: "web"`, `defaultApiVersion: "v1"`).

## The bypass: drop the deprecated `beta` prefix
    GET https://api.underdogfantasy.com/v1/over_under_lines     -> 200, 27 MB
`beta/v1` is 404, `beta/v3`/`beta/v4` are still 426; the unversioned `/v1/` route is current and
unauthenticated. `v1` also matches the bundle's own `defaultApiVersion`.

## Payload
`over_under_lines` (10,428 rows), `players` (2,234), `games` (118 across NFL/NBA/NHL/MLB/CFB/LOL/
DOTA/CS/FIFA/VAL), `solo_games`, `opened_lines_count`. Join path is
`over_under.appearance_stat.appearance_id -> appearances[].id -> match_id/player_id`.
Options carry `american_price`, `decimal_price`, `payout_multiplier`, `choice` (higher/lower).

## Extracted
`extracted_data/underdog_nfl_props_2026-10-22.csv` — 4,863 NFL option rows over 14 games
(Q1/Q1H/season splits: Pass Yards, Rec Yards, Receptions, Rush + Rec TDs, ...), with prices.

## Note
`raw_probability` is present as a field but null on these rows, so Underdog's own probability model
is not exposed here; the prices are.
