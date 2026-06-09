# NFL Data Coverage Audit & Expansion Plan
*As of 2026-06-08 — NFL First*

---

## THE GAP

GSE surfaces roughly **5–8% of the free advanced NFL data universe**. The product fetches
14 datasets (12 in active production use, 2 catalog-registered but never consumed), yet
every loader hard-codes a tiny column allowlist and immediately discards the rest. The
~372-column play-by-play is read through a 12-column keyhole; the 115-column
`player_stats` file is read 3–4 different ways by 3–4 different engines, each pulling
7–10 columns, and the results are never unified. Seven major nflverse families — FTN
charting, participation/personnel, player-stats defense, contracts, weekly rosters,
officials, and win totals — have zero code touching them. The `ff_opportunity` dataset
that the Expected-Points engine **claims** it uses is confirmed present in
`expected-points.ts` (pulling `total/rush/rec_fantasy_points_exp` and `_diff` columns),
but its full opportunity column set (per-attempt xFP, position-level splits) is
unexploited. When a user asks to "pull ALL advanced match data," the product returns the
pre-sliced leader boards each loader baked in at build time — there is no code path to
return the full column set for a specific player, team, or game.

---

## COVERAGE MATRIX

| Dataset | Available (free/legal) | Ingested | Surfaced | Highest-value unused columns |
|---|---|---|---|---|
| **play_by_play** (pbp, ~372 cols) | Y — CC-BY-4.0 | Y — streaming column-projecting parser (`pbp.ts`) | Partial — 12 cols across 2 consumers | `success`, explosive-play rate (`epa` by down/dist/zone), `air_yards`, `yards_after_catch`, `cpoe` per-play, `xpass`, `pass_oe` situational, `wp`/`ep` deltas, `qb_hit`, `drive_*`, `series_success`, RZ & 3rd-down conv, `play_type` tendencies |
| **player_stats offense** (~115 cols) | Y — CC-BY-4.0 | Y — `player_stats.csv.gz` | Partial — ~20 cols across 4 engines, never unified | `racr`, `passing_air_yards`, `passing_yards_after_catch`, `passing_first_downs`, `receiving_first_downs`, `rushing_first_downs`, `special_teams_tds`, `fantasy_points` (std), `completions`, 2pt stats, week-grain trend |
| **player_stats defense** | Y — CC-BY-4.0 | N | N | `def_tackles`, `def_sacks`, `def_interceptions`, `def_pass_defended`, `def_qb_hits`, `def_tackles_for_loss`, `def_fumbles_forced`, `def_tds` — entire IDP universe missing |
| **team_stats** | Y — CC-BY-4.0 | N | N | Team-level EPA, success, turnovers, yards, tds — derived by pbp proxy today |
| **nextgen_stats PASSING** | Y — CC-BY-4.0 | Y — season-aggregate only | Partial — 7 of ~13 cols | `avg_air_yards_to_sticks`, `avg_air_yards_differential`, `max_completed_air_distance`, `max_air_distance`, weekly rows (no recent-form tracking) |
| **nextgen_stats RECEIVING** | Y — CC-BY-4.0 | Y — season-aggregate only | Partial — 6 of ~11 cols | `avg_intended_air_yards`, `avg_expected_yac`, `avg_yac` (raw), `max_speed`, weekly rows |
| **nextgen_stats RUSHING** | Y — CC-BY-4.0 | Y — season-aggregate only | Partial — 4 of ~9 cols | `expected_rush_yards`, `rush_pct_over_expected`, `avg_rush_yards`, weekly rows |
| **pfr_advstats PASS** | Y — CC-BY-4.0 | Y — weekly | Partial — 4 of ~26 cols | `pocket_time`, `on_tgt_pct`, `drop_pct`, `rpo_yards`, `pa_pass_yards`, `batted_balls`, `throwaways` |
| **pfr_advstats DEF** | Y — CC-BY-4.0 | Y — weekly | Partial — 5 of ~21 cols | `def_blitzes`, `def_hurries`, `def_qbkd`, `def_pressures`, `def_sacks`, `def_adot`, `def_missed_tackles` (count), `def_times_blitzed` |
| **pfr_advstats RUSH** | Y — CC-BY-4.0 | Y — season file only | Partial — 4 cols (no weekly) | Weekly grain absent — no per-week YBC/YAC trend; `broken_tackles` count unused |
| **pfr_advstats REC** | Y — CC-BY-4.0 | N — catalog default, never fetched | N | `adot`, `drops`, `drop_pct`, `rat` (target passer rating), `ybc`, `yac`, `broken_tackles` — receiver charting fully absent |
| **ftn_charting** (2022+) | Y — CC-BY-4.0 | N — catalog key wired, no loader | N | `is_play_action`, `is_rpo`, `is_screen_pass`, `is_motion`, `is_qb_out_of_pocket`, `n_blitzers`, `n_pass_rushers`, `read_thrown`, `starting_hash`, `is_throw_away`, `is_catchable_ball`, `is_contested_ball`, `is_created_reception` |
| **participation** (2016+) | Y — CC-BY-4.0 | N — catalog mis-wired (old tag, can 404) | N | `offense_formation`, `offense_personnel`, `defense_personnel`, `defenders_in_box`, `number_of_pass_rushers`, `route` (per-play), `defense_coverage_type` (Cover 0/1/2/3/4/6), `defense_man_zone_type`, `was_pressure`, `players_on_play` |
| **snap_counts** | Y — CC-BY-4.0 | Y — offense side | Partial — offense snap% only | `defense_snaps`, `defense_pct`, `st_snaps`, `st_pct` — defensive and ST snap share absent |
| **depth_charts** | Y — CC-BY-4.0 | Y | Used — Opportunity Transfer beneficiary rank | Primarily well-used; ST depth under-surfaced |
| **injuries** | Y — CC-BY-4.0 | Y | Used — Player Lab + Opportunity Transfer OUT gate | Primarily well-used |
| **espn_qbr** | Y — CC-BY-4.0 | Y — `qbr.ts` | Underused — not wired as independent QB estimator in QB Forward | `epa_total`, `pts_added`, `pass`, `run`, `exp_sack` (week-level components) |
| **schedules / games.csv** | Y — CC-BY-4.0 | Y | Partial — CLV backtest + QB-age trend | `rest` (home/away days), `roof`, `surface`, `temp`, `wind`, `div_game`, `spread_line`, `total_line`, `result`, `overtime`, `coach`, `referee` |
| **rosters (season)** | Y — CC-BY-4.0 | Y | Join/enrichment only (gsis_id, age, headshot) | Well-used for its role |
| **rosters_weekly** | Y — CC-BY-4.0 | N | N | Week-resolved team/status — mid-season trade reflection |
| **players (master)** | Y — CC-BY-4.0 | Y | gsis_id join for age only | Well-used for its role |
| **combine** | Y — CC-BY-4.0 | Y | Player Lab Combine view | Athleticism not joined into player model as a prior |
| **draft_picks** | Y — CC-BY-4.0 | N — catalog wired, no loader | N | `round`, `pick`, `w_av`, `car_av`, `dr_av` (career value), `allpro`, `probowls` — draft capital as talent prior |
| **contracts (OTC)** | Y — free via nflverse OTC scrape | N | N | `apy_cap_pct`, `guaranteed`, `inflated_apy`, `years`, `is_active` — contract security as role signal |
| **ff_opportunity (ffverse)** | Y — free | Y — `expected-points.ts` (per-season CSV) | Partial — 6 of ~40 cols | Per-attempt opportunity splits (pass/rush/rec_attempt_counts), `*_yards_gained_exp`, `*_touchdown_exp`, position-level `_diff` columns |
| **ff_rankings (FantasyPros)** | Y — free | N | N | `ecr`, `sd`, `best`, `worst`, `pos`, `page_type` |
| **ff_playerids** | Y — free | N | N | Cross-platform ID join key (gsis_id ↔ sleeper_id ↔ espn_id ↔ fantasypros_id) |
| **win_totals** | Y — free (nfldata) | N | N | Preseason market prior (team win-total line + over/under odds) |
| **officials** | Y — CC-BY-4.0 | N | N | Referee-tendency angle (flag rates, crew tendencies) |
| **trades** | Y — CC-BY-4.0 | N | N | Asset-movement context |

---

## TOP UNSURFACED ADVANCED METRICS

The following are the metrics a serious fantasy/betting user expects to find and cannot
today. Ordered by user-facing impact.

### FTN Charting — Play Design Transparency (2022+)
- **Play-action rate** per QB and team (`is_play_action`) — the single most-cited metric
  in modern QB evaluation outside of EPA
- **RPO rate** (`is_rpo`) — separates designed quarterback decision-making from scripted
  plays
- **Screen rate** (`is_screen_pass`) — the pass-volume inflator that poisons raw target
  share for some receivers
- **Motion rate** (`is_motion`) — pre-snap complexity signal that correlates with
  offensive scheme sophistication
- **QB out-of-pocket rate** (`is_qb_out_of_pocket`) — extension ability and scheme
  dependency
- **Blitzer count per play** (`n_blitzers`) — actual defenders blitzing, not inferred
- **Read thrown** — describes whether the QB went through progressions or threw hot

### Participation — Personnel & Formation Context (2016+)
- **Offense personnel grouping** — e.g. "11" (1 RB/1 TE/3 WR) vs "12" vs "21"; the
  single most important context for understanding a player's role in any given game
- **Defense personnel grouping** and **defenders in box** — the primary box-count signal
  for RB evaluation (more reliable than the NGS proxy)
- **Coverage type per play** — Cover 0/1/2/3/4/6/2-man/combo; the true coverage shell
  behind each target
- **Route per primary receiver** (2023+ FTN-sourced) — actual route assignments

### PFR Advanced — Full Charting Stack
- **Receiver ADOT** (`pfr_advstats rec: adot`) — average depth of target; the primary
  route-tree signal missing entirely
- **Receiver drops / drop%** — true drops (not just statistical incompletions)
- **Receiver broken tackles** — YAC quality decomposition
- **QB on-target rate** (`on_tgt_pct`) — accuracy divorced from completion percentage
- **QB pocket time** (`pocket_time`) — distinguishes O-line protection from QB decision
  speed
- **QB RPO yards** and **play-action yards** — scheme decomposition of passing totals
- **Defensive pass-rush charting** — `def_hurries`, `def_qbkd`, `def_pressures`,
  `def_sacks` at the individual level; currently only team-level inference is possible
- **Defensive ADOT allowed** — the depth of target a corner/safety concedes

### PBP Situational Splits (the 12-column keyhole must open)
- **Success rate by down/distance** — 1st-and-10 vs 3rd-and-short environments are
  entirely different games
- **EPA by game script** — non-neutral-script EPA currently discarded; garbage-time
  separation matters
- **Explosive play rate** (>15-yard passes, >10-yard runs) per team and player
- **Pass rate over expected (PROE) situational** — currently only league-wide; matchup-
  level PROE requires down/distance joins
- **Pace** beyond no-huddle flag — plays per minute, seconds between plays
- **Red-zone EPA and TD rate** per play type — the product claims RZ equity but
  currently reads only a yardline filter without EPA context
- **3rd-down conversion rate** split by distance bucket — the persistence signal for
  team offensive ranking
- **Air yards and YAC per receiver** from pbp — target-quality profiling not dependent
  on NGS era start (1999 vs 2016)
- **CPOE per play** vs season-aggregate only — recent-form accuracy tracking

### Weekly Defensive Player Stats
- **def_sacks, def_interceptions, def_pass_defended, def_qb_hits, def_tackles_for_loss,
  def_fumbles_forced** — the full IDP universe; currently zero defensive player rows
  exist in any output

### Kicking / Special Teams
- Not addressed in this audit (NFL first, ST is secondary scope) — note that
  `st_snaps` and `st_pct` from `snap_counts` are currently dropped, which at minimum
  would enable gunner/returner identification

### Contract / Cap Context
- **APY cap %** (`apy_cap_pct`) — the clearest role-security signal: a back on 4% of
  the cap is not getting benched for a UDFA
- **Guaranteed money remaining** — injury protection signal
- **Years remaining on deal** — free-agency and team-building context

---

## EXPANSION PLAN

### Priority Tiers
- **P0 — Highest impact, lowest effort:** new columns from datasets already being
  fetched (the streaming pbp parser and existing loaders are already in place)
- **P1 — High impact, moderate effort:** new loaders for datasets already in the
  catalog
- **P2 — High impact, higher effort:** new catalog entries + loaders for absent
  families
- **P3 — Supporting infrastructure:** per-entity full-profile assembler that closes
  the architectural root cause

---

### GROUP A — NEW COLUMNS FROM ALREADY-FETCHED DATASETS

These require zero new fetches. The data is already downloaded; the only change is
widening the column allowlist.

#### A1. PBP — Widen the column allowlist (P0)
**Source:** `play_by_play_{season}.csv` — already streaming via `pbp.ts`
**Architecture note:** the existing column-projecting parser supports any allowlist.
Adding columns costs only heap proportional to the new columns — no OOM risk for
reasonable additions.

| New columns to add | Metric | Engine / View |
|---|---|---|
| `success`, `epa` (with `down`, `ydstogo`, `yardline_100`) | EPA by down/distance/zone | New Team Environment situational split |
| `air_yards`, `yards_after_catch`, `receiver_player_id` | Air-yard profile per receiver | New Receiver Depth view |
| `cpoe` | Per-play accuracy — recent-form QB tracking | QB Forward weekly |
| `xpass`, `pass_oe` (with `down`, `ydstogo`, `score_differential`) | Situational PROE | Team Environment matchup view |
| `qb_hit`, `sack` | Pressure rate from pbp (pre-2018 PFR coverage) | QB pressure trend |
| `drive_play_count`, `drive_time_of_possession`, `series_success`, `series_result` | Pace and drive efficiency | Team Environment pace table |
| `fixed_drive_result` | Drive conversion rate | Team Environment |
| `play_type` split within `yardline_100 <= 20` | True RZ play-mix | Scoring Zone engine enrichment |

**Effort: S** — column allowlist widening in team-environment.ts and scoring-zone.ts;
new situational aggregators in 1–2 engine files.
**Perf:** pbp is 40MB / ~50k rows. Projecting 20 cols instead of 12 stays well inside
the 1GB heap; max `maxDuration` of 60s on Vercel Pro handles the parse.

#### A2. player_stats — Unified advanced profile (P0)
**Source:** `player_stats.csv.gz` — already fetched
**Problem:** four engines each pull 7–10 different columns. No "all advanced metrics
for this player" view exists.

Add a `loadPlayerAdvancedProfile(gsis_id)` path that reads the full week-grain file
and returns all advanced columns for one player: `racr`, `passing_air_yards`,
`passing_yards_after_catch`, `receiving_first_downs`, `rushing_first_downs`,
`special_teams_tds`, `fantasy_points` (standard), `completions`, week-by-week time
series.

**Effort: S** — extend the existing gzip fetch with a broader column projection; add a
player-lookup route.
**Surfaces in:** new "Full Advanced Profile" tab in Player Lab.

#### A3. NGS — Unlock weekly grain and missing cols (P0)
**Source:** `ngs_{variant}.csv.gz` — already fetched (all three variants)
**Problem:** `seasonAggregateRows` filter discards every weekly row. Recent-form
tracking (last 4 weeks) requires the weekly grain.

Add a `loadNgsWeekly(playerId, season)` path alongside the existing season-aggregate.
Also surface the dropped columns: `avg_intended_air_yards` and `avg_expected_yac`
(receiving), `avg_air_yards_to_sticks` (passing), `expected_rush_yards` and
`rush_pct_over_expected` (rushing).

**Effort: S** — filter change + new export; existing combined file already has the rows.
**Surfaces in:** Player Lab NGS view (weekly spark lines); QB Forward recent-form card.

#### A4. pfr_advstats PASS — RPO, play-action, pocket-time, on-target (P0)
**Source:** `advstats_week_pass_{season}.csv` — already fetched in `pressure-coverage.ts`
**Unused columns:** `pocket_time`, `on_tgt_pct`, `drop_pct`, `rpo_plays`, `rpo_yards`,
`pa_pass_att`, `pa_pass_yards`, `batted_balls`, `throwaways`

Widen the pass variant column projection in `pressure-coverage.ts`; expose on the QB
pressure board.

**Effort: S** — column allowlist + type extension.
**Surfaces in:** Player Lab Pressure view (pocket-time + on-target% column);
QB Forward engine (play-action/RPO decomposition card).

#### A5. pfr_advstats DEF — pass-rush charting (P0)
**Source:** `advstats_week_def_{season}.csv` — already fetched
**Unused:** `def_blitzes`, `def_hurries`, `def_qbkd`, `def_pressures`, `def_sacks` (individual),
`def_adot`, `def_missed_tackles` (count not pct), `def_times_blitzed`

**Effort: S** — widen the def column allowlist.
**Surfaces in:** Player Lab Coverage view (add individual pass-rush columns); new
"Pass Rush" sub-table.

#### A6. snap_counts — Defensive and ST snap share (P0)
**Source:** `snap_counts_{season}.csv` — already fetched
**Problem:** `buildLeaders` filters to `isSkill(position)` and reads only `offense_pct`.
`defense_snaps`, `defense_pct`, `st_snaps`, `st_pct` are read from the file but
discarded.

Add a defensive snap-share variant to `snap-share.ts` (DL, LB, CB, S) and a ST track.

**Effort: S** — extend the existing loader; new `defense` and `specialTeams` sub-arrays
in the return value.
**Surfaces in:** Player Lab Snaps view (defensive side-tab).

#### A7. schedules — Rest, venue, weather context (P0)
**Source:** `games.csv` — already fetched
**Unused:** `home_rest`, `away_rest`, `roof`, `surface`, `temp`, `wind`, `div_game`,
`spread_line`, `total_line`, `result`, `overtime`

Add a `loadGameContext(game_id)` helper that returns the full environment row.

**Effort: S** — extend the CLV loader's column list; expose on Team Environment matchup
view and a new Game Context card.
**Surfaces in:** Team Environment (home/away rest + dome/outdoor flag); CLV (result
and OT confirmation).

---

### GROUP B — NEW DATASETS TO INGEST

These require a new loader (fetch + parse + project + cache pattern) but the data is
free and nflverse-sourced.

#### B1. FTN Charting — the single biggest unrealized moat (P1, HIGH)
**Source:** `ftn_charting_{season}.csv` — catalog key wired, zero loaders
**Columns:** `is_play_action`, `is_rpo`, `is_screen_pass`, `is_motion`,
`is_qb_out_of_pocket`, `is_throw_away`, `is_catchable_ball`, `is_contested_ball`,
`n_blitzers`, `n_pass_rushers`, `n_offense_backfield`, `read_thrown`, `starting_hash`,
`qb_location`
**Grain:** play-level, 2022–present

Build `lib/nflverse/ftn-charting.ts` following the `pbp.ts` streaming pattern with
column projection. Aggregate per QB (play-action rate, RPO rate, out-of-pocket rate),
per receiver (screen share, contested catch rate), and per team (motion rate, blitz
exposure).

**Effort: M** — new loader + 3 aggregator functions + 2–3 new engine output shapes.
**Surfaces in:** QB Forward (play-action/RPO decomposition); new "Play Design" engine
or Player Lab view; Team Environment (team-level motion and blitz exposure).
**Perf:** the file is smaller than pbp (~50k plays × ~16 cols); column projection keeps
memory trivial.

#### B2. Participation — Personnel & Coverage Context (P1, HIGH)
**Source:** FTN-sourced `participation` release, season-end only (2023+); legacy
`pbp_participation_{season}.csv` (2016–2022)
**Problem:** catalog key `pbp_participation` points at the old tag that can 404.
Requires updating the tag to the `participation` release for 2023+ and falling back
to the `pbp_participation` tag for 2016–2022.

Build `lib/nflverse/participation.ts`: load, aggregate personnel groupings per team
(11/12/21/22 package rates), box counts per RB situation, coverage types per defender
target sample, and `defenders_in_box` distribution.

**Effort: M** — catalog tag fix + new loader + personnel/coverage aggregators.
**Surfaces in:** Team Environment (formation package rate table); Rushing Contact
engine (box-count context next to RYOE); Player Lab (coverage type faced per receiver,
personnel package of each target).

#### B3. pfr_advstats REC — Receiver charting (P1, HIGH)
**Source:** `advstats_week_rec_{season}.csv` — catalog default is `'rec'` but nothing
fetches it
**Columns:** `adot`, `rec`, `targets`, `ybc`, `yac`, `broken_tackles`, `drops`,
`drop_pct`, `rat`, `int`

Build a `loadPfrAdvstatsRec` function in `pressure-coverage.ts` or a new
`pfr-advstats-rec.ts` file. Aggregate per receiver across weeks: ADOT (average depth
of target), drop rate, contested-catch rate, YAC quality.

**Effort: S–M** — same fetch pattern as the existing pass/def variants.
**Surfaces in:** Player Lab (new "Receiving Charting" column group); Route Rate engine
(replace the TPRR proxy label with ADOT + drop% context).

#### B4. pfr_advstats RUSH weekly — Per-week contact trend (P1, MEDIUM)
**Source:** `advstats_week_rush_{season}.csv` — described in catalog, never fetched
(Rushing Contact engine uses the season file `advstats_season_rush.csv` instead)
**Columns:** `att`, `yac`, `ybc`, `brk_tkl` — same as season file but per-week

Add the weekly rush variant to the pressure-coverage loader cycle. The season file
stays for full-season context; the weekly file enables 4-week trailing trend.

**Effort: S** — near-identical fetch to the existing rush season variant.
**Surfaces in:** Rushing Contact engine (weekly YBC/YAC trend tab).

#### B5. player_stats DEFENSE (P1, HIGH)
**Source:** `player_stats.csv.gz` with `stat_type='defense'` or separate defense load
**Columns:** `def_tackles`, `def_tackles_solo`, `def_tackle_assists`,
`def_tackles_for_loss`, `def_sacks`, `def_sack_yards`, `def_qb_hits`,
`def_interceptions`, `def_interception_yards`, `def_pass_defended`, `def_tds`,
`def_fumbles_forced`, `def_safeties`

The nflverse player_stats release ships offensive and defensive stat types in the same
file with a `stat_type` column. The defensive side is simply never filtered for.

Add a `loadPlayerStatsDefense` path that filters `stat_type === 'defense'`, project to
the defensive columns, aggregate per player/season.

**Effort: S–M** — same gzip fetch, different column filter.
**Surfaces in:** New "Defensive Stats" engine or Player Lab defensive view;
IDP fantasy users currently have zero data.

#### B6. Contracts (P2, MEDIUM)
**Source:** nflverse `contracts` release — OTC-sourced, free
**Columns:** `apy_cap_pct`, `guaranteed`, `inflated_apy`, `years`, `is_active`, `value`
**Join key:** `gsis_id` or name match

Build `lib/nflverse/contracts.ts`. Focus on `apy_cap_pct` (role security proxy) and
`guaranteed` (injury protection signal). Join to player_stats by gsis_id.

**Effort: M** — parquet format requires a parquet reader or pre-converted CSV mirror;
nflverse provides a CSV alternative via `contracts.csv` in some releases.
**Surfaces in:** Player Lab (contract security card alongside snap share); Opportunity
Transfer (cap penalty if a starter is benched).

#### B7. rosters_weekly (P2, LOW)
**Source:** `roster_weekly` release — CC-BY-4.0
**Value:** resolves mid-season team moves; the season roster shows a player on their
original team even after a trade

Swap `loadRosters` to prefer the weekly file during the active season and fall back to
the season file in the offseason.

**Effort: S** — same CSV parse pattern; filter to the latest week.

#### B8. win_totals (P3, LOW)
**Source:** `win_totals` release (Lee Sharpe nfldata) — free
**Value:** preseason market prior for team outlook; useful context for the Team
Environment engine narrative

**Effort: S** — simple non-seasonal table, ~32 rows.

#### B9. officials (P3, LOW)
**Source:** `officials` release — CC-BY-4.0
**Value:** referee-crew tendency (flag rates, game pace, crew-specific passing vs running
game tendencies) — a niche but real context signal

**Effort: S** — join to schedules by `game_id`.

---

### GROUP C — NEW ENGINES / PLAYER LAB VIEWS

These are the surfaces that expose the Group A + B data. Listed by priority.

#### C1. Per-Player Full Advanced Profile Assembler (P0 — closes the owner's complaint)
**Problem:** "pull ALL advanced match data" has no code path — every loader returns
leader slices, not a full entity profile.
**Solution:** a `loadPlayerFullProfile(gsis_id | name, season)` server function that
joins ALL of:
- `player_stats` (all offensive advanced columns)
- NGS passing/receiving/rushing (weekly + season)
- `pfr_advstats` pass/rec/rush/def
- FTN charting aggregated to player
- `snap_counts` offense + defense
- `injuries` trailing
- `combine` athletic profile
- `contracts` security
- `draft_picks` capital

Returns a single serializable object with all of the above, keyed by player.

**Effort: L** — orchestration layer + join logic; individual loaders built in A/B above
reduce this to wiring.
**Surfaces in:** Player Lab "Full Profile" tab; a new `/api/players/[id]/advanced`
endpoint the owner's "pull all data" query hits.

#### C2. Play Design Engine (B1 FTN data)
**Slug:** `play-design`
**Group:** Quarterback / Team & market
**Metrics:** Play-action rate, RPO rate, screen rate, motion rate, out-of-pocket rate,
blitzer count per game
**Tables:** QB play-design profile (PA%, RPO%, OOP%); Team play-design environment
(motion%, blitz exposure, screen concentration)
**Effort: M** — loader (B1) + two data-table shapes in the engine.

#### C3. Personnel & Coverage Engine (B2 participation data)
**Slug:** `personnel`
**Group:** Team & market
**Metrics:** Package distribution (11/12/21/22/etc.), box counts, coverage shell
distribution (Cover 0 through Cover 6), formation pass/run tendency
**Tables:** Team formation table; RB box-count table; Receiver coverage-faced table
**Effort: M** — loader (B2) + three data-table shapes.

#### C4. Receiver Charting View in Player Lab (B3 pfr rec data)
Adds a "Receiver Charting" tab to the existing Player Lab alongside the existing Snaps /
NGS / Pressure views. Columns: ADOT, drop%, contested-catch target%, broken tackles,
YBC/YAC split.
**Effort: S** — loader (B3) already a small extension.

#### C5. Defensive Player Board (B5 player_stats_def)
**Slug:** `defensive-players`
**Group:** Team & market (or new "Defense" group)
**Metrics:** Sacks, QBH, TFL, INT, PD per game; tackle efficiency (solo tackle rate)
**Effort: M** — loader (B5) + new engine entry.

#### C6. Game Context Card on Team Environment (A7 schedules)
Adds a contextual card per matchup: rest differential, dome/outdoor, surface, temperature
(from Open-Meteo API for future games), divisional flag.
**Effort: S** — extend the existing schedules column list.

---

## SEQUENCING — BIGGEST VISIBLE JUMP IN ADVANCED DEPTH

The goal is to move from "curated leader boards" to "the complete picture" as fast as
possible. The following four-sprint sequence delivers the visible depth improvement
the owner is asking for.

### Sprint 1 — Column Liberation (1–2 days, pure server-side, zero new fetches)
These changes require no new HTTP requests — only allowlist widening on files already
in memory/cache.

1. **A1 (pbp)** — widen pbp column allowlist to include `success`, `down`, `ydstogo`,
   `yardline_100`, `air_yards`, `yards_after_catch`, `cpoe`, `xpass`; add situational
   EPA table to Team Environment.
2. **A4 (pfr pass)** — add `pocket_time`, `on_tgt_pct`, `rpo_yards`, `pa_pass_yards`
   to QB pressure board.
3. **A5 (pfr def)** — add `def_blitzes`, `def_hurries`, `def_qbkd`, `def_pressures`
   to coverage table.
4. **A3 (NGS weekly)** — remove the `week === 0` filter gate; add a 4-week trailing
   NGS card to Player Lab.
5. **A6 (snap_counts defense)** — extend `snap-share.ts` to include defensive
   positions; add a "Defense" tab to Player Lab Snaps.
6. **A7 (schedules context)** — widen the schedules column list; add rest/roof/surface
   to Team Environment matchup header.

**Outcome:** The Player Lab and Team Environment immediately show 3–4x the column depth
with no new data sources and no performance risk.

### Sprint 2 — FTN + Participation Loaders (2–3 days)
1. **B1 (FTN charting)** — new `ftn-charting.ts` loader; add Play-Action / RPO / Motion
   rate columns to QB Forward engine and Team Environment.
2. **B2 (participation)** — fix the catalog tag, build `participation.ts` loader;
   add personnel package distribution to Team Environment.
3. **C2 (Play Design engine)** — wire FTN data into a new `play-design` engine entry.

**Outcome:** GSE becomes one of the few public surfaces that shows play-action rate,
RPO rate, and personnel groupings transparently — the core of the "moat" argument.

### Sprint 3 — Receiver Charting + Defense (2 days)
1. **B3 (pfr advstats rec)** — new `loadPfrAdvstatsRec`; add ADOT / drop% to Player
   Lab.
2. **B5 (player_stats defense)** — extend the player_stats fetch to the defense
   `stat_type`; add a Defensive Players engine.
3. **C4 (receiver charting view)** + **C5 (defensive player board)**.

**Outcome:** Receiver ADOT and defense player stats close the two most-requested gaps
from fantasy users.

### Sprint 4 — Full Profile Assembler (3–5 days)
1. **C1 (per-player full advanced profile assembler)** — orchestrates all Sprints 1–3
   loaders into a single `loadPlayerFullProfile` join; exposes via a new Player Lab
   "Full Profile" tab and `/api/players/[id]/advanced` endpoint.
2. **B6 (contracts)** — add contract security card.
3. **A2 (player_stats unified)** — replace the per-engine cherry-pick with the unified
   profile path.

**Outcome:** "Pull ALL advanced match data for this player" returns the complete column
set across every available dataset. This is the direct fix for the owner's complaint.

---

## PERFORMANCE NOTES

- The `pbp.ts` streaming column-projecting parser is already the right architecture.
  Widening the allowlist from 12 to ~30 columns adds roughly 30–50MB of retained record
  heap per request — well within Vercel Pro's 1GB limit. The 40MB CSV text is
  transient and GC-eligible immediately after parse. Set `maxDuration: 60` on any route
  that calls `loadPbp`.
- FTN charting is a smaller file (~50k plays × ~16 cols vs ~372). A non-projecting
  parse is safe; use projection anyway for consistency.
- Participation is season-end only (one file per season, not streamed mid-season). Cache
  at the CDN layer with a 24h TTL — it does not change during the season.
- NGS weekly adds ~10x more rows per request (18 weeks vs 1 aggregate row). Retain the
  existing season-aggregate path for the leader boards; add the weekly path only for
  per-player lookups, with the standard 30-min in-memory cache.
- The per-player full profile assembler (C1) will fan out to 6–8 loaders. Use
  `Promise.all` across all fetches; most will already be warm in the 30-min cache on
  the first real-user call after warm-up.

---

## SOURCES

- nflverse-data releases: https://github.com/nflverse/nflverse-data/releases
- nflreadr field dictionary: https://nflreadr.nflverse.com/articles/dictionary_pbp.html
- nflfastR field descriptions: https://nflfastr.com/articles/field_descriptions.html
- FTN charting methodology: https://opensourcefootball.com/
- OTC contracts source: https://overthecap.com/
- Lee Sharpe nfldata (schedules / win totals): https://github.com/nflverse/nfldata
- GSE catalog: `C:\Users\Garrett\Sports-canonical-2026-06-03\packages\data-ingestion\src\nflverse-source.ts`
- GSE nflverse loaders: `C:\Users\Garrett\Sports-canonical-2026-06-03\apps\web\lib\nflverse\`
- GSE intelligence engines: `C:\Users\Garrett\Sports-canonical-2026-06-03\apps\web\lib\intelligence\`
- GSE engine registry: `C:\Users\Garrett\Sports-canonical-2026-06-03\apps\web\app\intelligence\engines\registry.tsx`
