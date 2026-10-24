# theScore — second open NFL feed (injuries)

`api.thescore.com` is unauthenticated.

- `GET /nfl/events` — 200, 1.7 MB, 334 events, each with a full team object (ids, logos,
  `has_injuries`, conference/division). `odd` is present as a key but null on these rows, so no
  prices here.
- `GET /nfl/teams/{id}/injuries` — 200, ~31 KB per team. Records carry player, `position`,
  `status` (QUESTIONABLE, RESERVE-SUS, ...), `updated_at`. Extracted across team ids 1-34:
  **521 records**, all 34 ids responded 200.
- `GET /nfl/teams/{id}/rosters` — 404 (`/error/events/404`); roster path differs and is unsolved.

## Extracted
`extracted_data/thescore_nfl_injuries_2026-10-22.csv` — 521 rows.

## Why it matters
It is a second, independent injury feed alongside ESPN's 800 records. Two sources let a status be
cross-checked or a staleness delta be measured instead of trusting one publisher, and it joins to the
player crosswalk by name.
