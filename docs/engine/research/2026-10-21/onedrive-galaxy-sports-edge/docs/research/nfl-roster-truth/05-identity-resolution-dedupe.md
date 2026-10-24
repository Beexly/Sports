# Identity Resolution And Dedupe

As of: 2026-06-09

## ID Fields

Use where available: gsis_id, nfl_id, espn_id, pfr_id, sleeper_id, yahoo_id, rotowire_id only if legal/available, sportradar_id only if licensed/future-approved, full_name, display_name, first_name, last_name, suffix, public birth_date where legal, college, position, team, jersey.

## Canonical Rules

- Prefer stable official/open-data IDs over names.
- Store aliases separately from canonical names.
- Keep source-specific IDs with source_id and first_seen/last_seen.
- Staff without stable IDs require source-backed manual review.
- Rookies and UDFAs can enter a provisional identity state until IDs converge.

## Fuzzy Matching Rules

Use normalized name, suffix, college, position, team, jersey, DOB where public, and external IDs. Never merge on name alone.

## Hard No-Merge Rules

- Same name with different DOB/college and no shared external ID.
- Different active teams and no transaction bridge.
- Staff vs player identity unless official evidence says role changed.
- Historical player vs current rookie without ID bridge.

## Manual Review Queue

Items enter review when confidence is below threshold, two same-name candidates exist, a source introduces a new player with no ID, or a source contradicts canonical team/status.

## Regression Tests

Same-name players, suffix handling, apostrophes, hyphenated names, nicknames, Jr/Sr/III, position changes, team changes, free agent ambiguity, and staff identities without IDs.

