# nflverse-data — the public warehouse (GitHub releases)

The nflverse project publishes its own datasets as GitHub release assets, unauthenticated.
`GET https://api.github.com/repos/nflverse/nflverse-data/releases` -> 200, 6.4 MB of release
metadata, 25 releases. Asset counts: {"trades": 7, "teams": 7, "schedules": 6, "stats_team": 554, "stats_player": 554, "ftn_charting": 21, "espn_data": 12, "weekly_rosters": 104, "players_components": 12, "players": 7, "pbp_participation": 46, "officials": 7, "misc": 17, "test": 5, "draft_picks": 7, "contracts": 7, "snap_counts": 77, "rosters": 434, "player_stats": 1822, "pfr_advstats": 209, "pbp": 164, "nextgen_stats": 95, "injuries": 77, "depth_charts": 109, "combine": 7}.

## Charting layer extracted
`ftn_charting` release, 2022-2026 per-season parquet (0.2-0.6 MB each). Downloaded 2026 and 2023:
- 2026: 15,904 plays; 2023: **48,225 plays** (full season)
- columns: `ftn_game_id, nflverse_game_id, ftn_play_id, nflverse_play_id, starting_hash,
  qb_location, n_offense_backfield, n_defense_box, is_no_huddle, is_motion, is_play_action,
  is_screen_pass, is_rpo, is_trick_play, is_qb_out_of_pocket, is_interception_worthy,
  is_throw_away, read_thrown, is_catchable_ball, is_contested_ball, is_created_reception, is_drop,
  is_qb_sneak, n_blitzers, n_pass_rushers, is_qb_fault_sack`
- joins on `nflverse_play_id` to every other play-level feed in this KB

This is the situational/charting feature layer (motion, play-action, RPO, box count, blitz count,
catchable/contested/drop grading) that had no public source until now.

## Correction worth recording
FTN's public releases carry **no coverage column** in either season (`is_*` only), so coverage
classification is not solved by this source — the versioned `ftn_charting` files are lighter than
the paid FTN charting product. Route-level data likewise absent.
