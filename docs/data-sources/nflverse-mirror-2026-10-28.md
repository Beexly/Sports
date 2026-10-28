# nflverse mirror — FTN charting and PFR advanced stats

Pulled 2026-10-28 from `nflverse/nflverse-data` GitHub release assets as parquet. **No site was
scraped.** Field lists below are recorded verbatim from the downloaded files; nothing is
interpreted or renamed.

## Attribution

- FTN charting: **FTN Data via nflverse**
- PFR advanced stats: **Pro-Football-Reference via nflverse pfr_advstats mirror**

Both must carry that attribution wherever the data is surfaced.

## Files and checksums

| File | Rows | Cols | SHA-256 |
|---|---|---|---|
| `ftn_charting_2026.parquet` | 18,019 | 29 | `c6d79944c54502c6…` |
| `advstats_season_def.parquet` | 8,146 | 30 | `763addbd1ef64fbe…` |
| `advstats_season_pass.parquet` | 848 | 37 | `8c03634f283043c6…` |
| `advstats_season_rec.parquet` | 4,476 | 25 | `1596cfd510664f08…` |
| `advstats_season_rush.parquet` | 2,996 | 19 | `983e74596effdcec…` |

Local copies under `data/nflverse/`.

## FTN charting

### `ftn_charting_2026.parquet` — 18,019 rows, 29 fields

```
ftn_game_id
nflverse_game_id
season
week
ftn_play_id
nflverse_play_id
starting_hash
qb_location
n_offense_backfield
n_defense_box
is_no_huddle
is_motion
is_play_action
is_screen_pass
is_rpo
is_trick_play
is_qb_out_of_pocket
is_interception_worthy
is_throw_away
read_thrown
is_catchable_ball
is_contested_ball
is_created_reception
is_drop
is_qb_sneak
n_blitzers
n_pass_rushers
is_qb_fault_sack
date_pulled
```

## PFR advanced stats

### `advstats_season_def.parquet` — 8,146 rows, 30 fields

```
season
player
pfr_id
tm
age
pos
g
gs
int
tgt
cmp
cmp_percent
yds
yds_cmp
yds_tgt
td
rat
dadot
air
yac
bltz
hrry
qbkd
sk
prss
comb
m_tkl
m_tkl_percent
loaded
bats
```

### `advstats_season_pass.parquet` — 848 rows, 37 fields

```
player
team
pass_attempts
throwaways
spikes
drops
drop_pct
bad_throws
bad_throw_pct
season
pfr_id
pocket_time
times_blitzed
times_hurried
times_hit
times_pressured
pressure_pct
batted_balls
on_tgt_throws
on_tgt_pct
rpo_plays
rpo_yards
rpo_pass_att
rpo_pass_yards
rpo_rush_att
rpo_rush_yards
pa_pass_att
pa_pass_yards
intended_air_yards
intended_air_yards_per_pass_attempt
completed_air_yards
completed_air_yards_per_completion
completed_air_yards_per_pass_attempt
pass_yards_after_catch
pass_yards_after_catch_per_completion
scrambles
scramble_yards_per_attempt
```

### `advstats_season_rec.parquet` — 4,476 rows, 25 fields

```
season
player
pfr_id
tm
age
pos
g
gs
tgt
rec
yds
td
x1d
ybc
ybc_r
yac
yac_r
adot
brk_tkl
rec_br
drop
drop_percent
int
rat
loaded
```

### `advstats_season_rush.parquet` — 2,996 rows, 19 fields

```
season
player
pfr_id
tm
age
pos
g
gs
att
yds
td
x1d
ybc
ybc_att
yac
yac_att
brk_tkl
att_br
loaded
```

## Note on the FTN row count

The local `intelligence/coaching/data/ftn_charting_2026.parquet` holds 13,438 rows. This mirror
file holds 18,019 for the same season. The mirror is the more complete copy and is the one to
prefer; the local file should be treated as a subset until reconciled.

## What is not here

No interpretation, no derived metrics, no joins. This is the raw mirror plus its field list.
SII already consumes the local charting file; pointing it at this one is a separate change.
