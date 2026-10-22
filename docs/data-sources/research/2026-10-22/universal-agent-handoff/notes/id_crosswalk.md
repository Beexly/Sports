# Universal player ID crosswalk — 12,608 players, 13 id systems

`dariushafshar/bdb-2027-public-enrichment` (CC-BY-SA-4.0) ships `nfl_id_crosswalk.csv`:
12,608 rows, every row carrying `nfl_id` **and** `gsis_id`, plus ten further systems.

Non-null coverage per id system:
`gsis_id` 12,608 (100%) · `esb_id` 11,914 · `smart_id` 11,914 · `espn_id` 11,525 · `pfr_id` 11,465 ·
`pff_id` 10,787 · `otc_id` 8,977 · `sleeper_id` 4,768 · `sportradar_id` 4,767 · `rotowire_id` 4,835 ·
`fantasy_data_id` 4,405 · `yahoo_id` 4,069.

This supersedes the 477-player name-fuzzy `PLAYER_CROSSWALK_2026-10-22.csv` for every source that
speaks an id. It is the single most reusable artifact in the KB: NGS (`gsisId`), ESPN (numeric),
Sleeper, Sportradar, PFF, PFR, Yahoo, OTC and Rotowire ids all resolve through one row per player.

Same dataset also carries `coverage.csv` (54 rows: entry_year × season × position_group with
`with_public_nfl_id`, `on_weekly_roster`, `with_reg_snap`), `rookie_class_seasons_2023_2025.csv`,
`data_dictionary.csv` and `provenance.csv` — i.e. the BDB 2027 competition's own coverage gaps are
quantified, which matters before trusting any join rate.

Licence note: CC-BY-SA-4.0, share-alike, unlike the CC0 stats pull — attribution required.
