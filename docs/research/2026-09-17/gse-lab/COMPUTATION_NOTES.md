# Computation Notes — GSE Team Advanced Metrics (nflverse)
**Worker B, 2026-09-17.** Every number in `team_metrics_2025.csv` / `team_metrics_2026.csv`
was computed by `compute_team_metrics.py` (same directory) from downloaded nflverse
play-by-play. No mock data, no copied tables.

## Data source
- nflverse GitHub release CSVs, downloaded 2026-09-17 ~13:25 CDT:
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{2025,2026}.csv.gz`
  plus `.../ftn_charting/ftn_charting_2025.csv`.
- License: nflverse data CC-BY 4.0 (credit "nflverse"); FTN charting subset CC-BY-SA 4.0
  (credit "FTN Data via nflverse", share-alike).
- **2025:** 48,771 raw plays, 285 games (weeks 1–18 REG + weeks 19–22 POST). Analysis uses
  REGULAR SEASON ONLY (46,452 REG plays → 29,239 after filters).
- **2026:** **Week 1 only** — 16 games, 2,756 raw plays → 1,673 after filters.
  Week 2 Thursday game (BUF @ DET, tonight) is not yet in nflverse. nflverse usually
  updates within ~24h of games completing.

## EP/EPA model
- The `epa`/`ep` columns ship in the nflverse play-by-play and come from the **nflfastR
  Expected Points model** (multinomial logistic regression on down/distance/field position).
  I did not re-estimate EP; EPA is taken as published.

## Success rate
- **nflfastR convention: a play is successful iff EPA > 0.** Verified empirically on the
  data: `(success == 1) == (epa > 0)` on 100% of pass/run plays (0 mismatch). This is the
  definition Garrett's task specified.

## Filters (exact)
1. `season_type == 'REG'` (2025 file contains postseason weeks 19–22).
2. `play_type in ('pass','run')` — no punts/FGs/kickoffs in the efficiency sample.
3. `qb_kneel == 0`, `qb_spike == 0` (453 kneels + 82 spikes in 2025 excluded).
4. **Garbage time:** exclude plays with `qtr == 4 AND (wp > 0.95 OR wp < 0.05)`, where `wp`
   is the nflfastR possession-team win probability. This removed 3,702 plays in 2025
   (11.2%) and 238 in 2026 week 1 (12.4%). OT (qtr == 5) is NOT filtered — every OT play
   is high leverage by construction.

## Play-type classification (documented convention)
- **Dropback** = `pass_attempt == 1` OR `qb_scramble == 1` (4for4 convention: sacks count
  as pass attempts — verified `sack==1` implies `pass_attempt==1` — and scrambles count as
  dropbacks). 2025: 17,626 dropbacks. 2026 wk1: 1,015.
- **Designed rush** = `rush_attempt == 1` AND `qb_scramble == 0` AND `qb_kneel == 0`.

## Explosive-play rate
- **4for4 convention from the metrics catalog:** dropback with `yards_gained >= 15` yards,
  or designed rush with `yards_gained >= 10` yards. Threshold choice is documented here;
  other providers use 20-yard passes — do not compare across conventions.

## Turnover luck (actual vs expected)
- Expected INTs = **league-average INT rate per dropback × team dropbacks**.
  Baselines computed on the same filtered sample: 2025 = **1.867%**, 2026 wk1 = **2.069%**.
- Expected fumbles lost = **league-average fumble-lost rate per play × team plays**:
  2025 = **0.640%**, 2026 wk1 = **1.076%**.
- `*_diff_actual_minus_expected`: negative = lucky (fewer giveaways than rate-implied),
  positive = unlucky. Same construction on defense for takeaways.
- **Turnover-worthy-play proxy (2025 only):** FTN `is_interception_worthy` charting joined
  at 100% coverage on (game_id, play_id). ~3.0% of dropbacks are flagged; 52.3% of flagged
  throws were actual INTs. Reported as `int_worthy_throw_rate` (per dropback). **Not
  available for 2026** — FTN charting for 2026 isn't published; those columns are NaN in
  the 2026 file. No other charting proxies (drops, throwaways) were needed for this task.

## Pressure — NOT AVAILABLE, partial proxies provided
- The nflverse FTN charting subset has **no hurry/pressure columns** (only play-action,
  RPO, blitzers, box counts, interception-worthy, etc.). True pressure rate (hurries +
  hits + sacks) **cannot be computed** from this data.
- Partial proxies included with explicit caveat: `qb_hit_rate_allowed/forced` (pbp
  `qb_hit` flag; note ~6% of sacks are coded without a qb_hit) and `sack_rate_allowed/
  forced`, all per dropback. These UNDERESTIMATE true pressure because hurries without
  a hit/sack are invisible. Real pressure rate needs PFF/SIS/ESPN charting (paid or
  manually scraped), per the catalog.

## Points / drives (grounding)
- `points_per_game`: from final `total_home_score`/`total_away_score` per game (unfiltered
  scoring, REG only). `points_per_drive` = total points / distinct drives
  (`drive != 0`, game_id × fixed_drive × posteam); drives come from the *filtered* sample
  so the denominator is slightly understated — treat as approximate.

## Strength of schedule
- Skipped per task brief (not trivially computable without an iterative opponent model).
  Note for the engine: none of the EPA numbers here are opponent-adjusted; DVOA-style
  adjustment is the known next step (see sanity check below re: SF/JAX).

## Sanity checks (independent sources, no tables copied)
1. **2025 standings/EPA agreement.** My offensive EPA/play top-5: NE +0.186, LA +0.147,
   GB +0.140, DAL +0.135, BUF +0.132. Published cross-checks: (a) StatMuse 2025
   standings show NE 14-3, BUF 12-5, LA 12-5 — consistent with efficiency; (b) PFF's
   final 2025 power rankings (pff.com) had LAR #1, SEA #2, BUF #3 and stated Buffalo's
   offense was "third in EPA per play" — my BUF is 5th at +0.132 vs DAL 4th at +0.135,
   within filter noise of their #3; (c) an independent GitHub EPA analysis
   (rstrube92/nfl_2025_epa_analysis) reports GB pass EPA **$0.278** — mine is **+0.288**
   (they had NE run EPA −0.074, mine −0.050 — same story, pass-driven). (d) My defense
   leader SEA +0.112; Seahawks won Super Bowl LX 29-13 over NE (confirmed in my own
   postseason data: 2025_22_SEA_NE). Magnitudes match published EPA scales
   (elite ≈ +0.13–0.19/play, worst ≈ −0.17–−0.23/play). **Verdict: sane, ordinal
   agreement within a couple of ranks.**
2. **2026 week 1 vs FTN DVOA** (ftnfantasy.com, published same week). FTN: "Without
   [opponent] adjustments, Jacksonville would be first after their 34-10 win over
   Cleveland" — **my unadjusted EPA/play has JAX #1 (+0.400)**. FTN named CHI the top
   offense (mine: CHI #3, +0.360, 59 pts scored) and PIT the top defense (mine: PIT
   def-EPA #2 at +0.321 behind JAX's +0.493). FTN ranks SF #1 overall *after*
   opponent adjustment (SF beat the SB-favorite Rams 27-7 in Australia); mine has SF #5
   (+0.262) unadjusted. **All differences are explained by their opponent adjustment,
   which I do not apply.** Scores in the data match public reporting exactly
   (e.g. JAX 34–CLE 10, BUF 36–HOU 31, NE 10–SEA 13, CHI 59–CAR 37).
3. **The Dallas 2025 case (turnover-luck demo):** DAL finished 7-9-1 (StatMuse) despite
   +0.135 EPA/play (4th) and 27.7 ppg. My luck columns: offense threw 5.2 fewer INTs
   than expected, but the DEFENSE generated 4.6 fewer INTs than expected and the team
   lost 1.7 more fumbles than expected — textbook efficiency-vs-record split, exactly
   the regression signal the Elo engine is missing.

## Known limitations
- **2026 = one game per team** (~45–65 filtered plays each). Week-1 leaderboards are
  dominated by single-game blowouts (JAX +0.40, CLE −0.49). Do NOT treat as ratings;
  the catalog's DAVE/shrinkage lesson applies double here.
- No opponent adjustment anywhere in these files.
- `qb_hit` undercounts pressure (no hurries); sack+hit proxy is a floor, not the rate.
- 2026 `int_worthy_*` columns are NaN (no FTN 2026 charting yet).
- Drive counts exclude garbage-time/kneel drives, so points_per_drive is approximate.
- Interception expectation uses a single league rate; a downfield-throw-rate-adjusted
  baseline would be better (not attempted here).

## Files
- `team_metrics_2025.csv` — 32 rows (one per team), 48 columns.
- `team_metrics_2026.csv` — 32 rows, 48 columns (int_worthy_* NaN).
- `compute_team_metrics.py` — the exact script that produced them; re-runnable.
- Column glossary: `epa_per_play/dropback/rush`, `success_rate` (off, EPA>0),
  `def_epa_per_*` (sign-flipped, positive = good defense), `def_success_rate_allowed`,
  `explosive_rate[_allowed]` (15/10-yd thresholds), `int_thrown`, `int_rate_per_dropback`,
  `int_expected`, `int_diff_actual_minus_expected`, `fumbles[_lost]`,
  `fumble_lost_rate_per_play[_expected/_diff]`, `takeaways_int[_expected/_diff]`,
  `opp_fumbles[_lost]`, `opp_fumbles_lost_expected`, `opp_fumble_recovery_rate`,
  `qb_hit_rate_allowed/forced`, `sack_rate_allowed/forced`, `int_worthy_throws`,
  `int_worthy_throw_rate` (2025 only), `points_per_game`, `n_drives`, `points_per_drive`,
  `n_games`, `n_plays`, `n_dropbacks`, `n_rushes`, `team`, `season`.

Data: nflverse (CC-BY 4.0). FTN charting via nflverse (CC-BY-SA 4.0).

---

## Advanced-metrics depth pass (Worker A, 2026-09-17 ~14:00 CDT)
Script: `compute_advanced_metrics.py` (same directory). It imports
`load()`/`base_sample()` from `compute_team_metrics.py`, so every new file
uses the exact same filters (REG only, pass/run, no kneels/spikes,
garbage-time excluded) except `drive_stats_*`, which deliberately uses the
*unfiltered* REG sample — see below. New files (all in this directory):

- `metric_percentiles_2025.csv` / `_2026.csv` — one row per team, `<metric>_pct`
  for every metric column of the existing team_metrics CSVs.
- `epa_distributions_2025.csv` / `_2026.csv` — long format: team × season ×
  side (offense/defense) × split (all/dropback/rush); columns n, mean,
  p10/p25/median/p75/p90, share_neg_epa, share_chunk_epa (EPA > 1.0).
- `weekly_trends_2025.csv` — 544 rows (32 teams × 17 weeks, bye weeks absent):
  team, week, n_games, n_plays, n_dropbacks, n_rushes, epa_per_play,
  epa_per_dropback, epa_per_rush, success_rate, def_epa_per_play,
  def_epa_per_dropback, def_epa_per_rush, def_success_rate_allowed.
- `unit_matchups_2025.csv` / `_2026.csv` — pass_off/rush_off EPA + success,
  pass_def/rush_def EPA (sign-flipped) + success allowed, stuff_rate and
  stuff_rate_allowed, int_worthy_throw_rate (2025 only), n_plays, plus `_pct`
  percentile ranks for each matchup-relevant column.
- `drive_stats_2025.csv` / `_2026.csv` — drive-level outcomes.
- `down_splits_2025.csv` / `_2026.csv` — team × season × side × down_group
  (early_1_2 / late_3_4): n_plays, epa_per_play (defense sign-flipped),
  success_rate.
- `extra_metrics_2025.csv` / `_2026.csv` — stuff_rate, stuff_rate_allowed,
  air_epa/yac_epa/air_yards per dropback and allowed versions, late-and-close
  EPA (4th quarter, possession-team wp in [0.20, 0.80]).

### Percentile method
pct = (rank − 1) / (n − 1) × 100 with `rank(method="average")`, computed per
season (n = 32). **100 = best in the league, 0 = worst.** Lower-is-better
metrics (`def_success_rate_allowed`, `explosive_rate_allowed`,
`int_rate_per_dropback`, `int_diff_actual_minus_expected`,
`fumble_lost_rate_per_play`, `fumble_lost_diff_actual_minus_expected`,
`qb_hit_rate_allowed`, `sack_rate_allowed`, `int_worthy_throw_rate`,
`stuff_rate`, `stuff_rate_allowed`, and `_allowed` success rates in the
matchup table) are inverted. Identifier/volume/baseline columns (team,
season, n_games, n_plays, n_dropbacks, n_rushes, n_drives, all `*_expected`
and raw count columns like int_thrown/fumbles/takeaways_int) get no
percentile. NaN in → NaN out (2026 `int_worthy_throw_rate_pct` is all-NaN).

### Drive identification (exact)
A drive = one `(game_id, fixed_drive)` group (nflverse's corrected drive
counter, stable across OT), with `drive != 0`. Offensive team = majority
`posteam` over scrimmage plays (pass/run/punt/field_goal) in the group —
robust to kickoff-return bookkeeping. Result = last play's
`fixed_drive_result`. Points = the offense's score differential across the
drive: `(total_home_score` or `total_away_score` at last play) minus the same
at first play, chosen by whether the drive team is the home team — captures
PATs, 2-pt conversions, and safeties exactly. Definitions: td_rate =
share of drives ending 'Touchdown'; fg_rate 'Field goal'; punt_rate 'Punt';
three_and_out_rate = exactly 3 plays (drive_play_count) AND result 'Punt';
turnover_drive_rate = result in ('Turnover', 'Opp touchdown') — pick-sixes
count as turnovers against the offense; downs_rate = 'Turnover on downs'.
avg_drive_start_own = mean drive start in yards from the offense's own goal
line (parsed from `drive_start_yard_line`, mirrored when listed team ≠
offense). No play-level filters applied: punts/FGs/garbage-time drives are
real drives, so `drive_stats` is the unfiltered REG record — not directly
comparable to the filtered EPA sample. League 2025 checks: 2.10 points per
drive, 24.0% TD rate, 20.4% three-and-out, 11.1% turnover-drive rate, avg
start own 30.4 — all at known NFL norms.

### Small-sample handling
- 2026 files (Week 1 only, ~45–65 filtered plays per team) are computed with
  identical code but are one-game samples: percentiles, distributions, and
  unit matchups swing on a single blowout (JAX +0.400). 2026 `weekly_trends`
  is not produced (one week). Flag before use in any graphic.
- Late-and-close sample is ~50–80 plays/team/season; reported alongside
  `n_late_close`.
- Stuff rate = designed rushes (rush_attempt = 1, no scramble, no kneel) with
  yards_gained ≤ 0. Early/late down groups: downs 1–2 vs 3–4 (defense EPA
  sign-flipped). Air/YAC per dropback use nflverse `air_epa`/`yac_epa`/
  `air_yards` (scrambles have no air component; means are over dropbacks with
  non-null values).

### Tonight's matchup sheet (BUF @ DET, from 2025 baselines)
unit_matchups_2025: BUF pass off +0.174 (84th pct) vs DET pass def +0.014
(61st); BUF rush off +0.078 vs DET rush def −0.001; DET pass off +0.168 (81st)
vs BUF pass def +0.108 (94th); DET rush off −0.055 vs BUF rush def −0.064.
Both attacks are pass-first by EPA; both run defenses were below average.

### Spot checks (independent public statements; nothing copied)
1. **2026 Week 1 unadjusted EPA leader.** FTN's DVOA column said Jacksonville
   would be #1 unadjusted after the 34–10 win over Cleveland. Mine:
   JAX #1 at +0.400. Confirmed.
2. **Seattle defense, 2025.** The Athletic (TruMedia) reported SEA led the
   league in defensive EPA, 12.5 per 100 snaps (+0.125/play). Mine: SEA #1 at
   +0.112/play — same rank, magnitude within ~11% (filter differences).
3. **Buffalo offense, 2025.** PFF's final power rankings said BUF was 3rd in
   EPA/play and 2nd in success rate. Mine: BUF 5th in EPA/play (+0.132) and
   5th in success rate (0.4864) — same neighborhood, a couple of ranks lower,
   attributable to my 11% garbage-time exclusion (PFF includes those plays).
   Honest verdict: ordinal agreement within a few ranks, not exact.
4. BUF 2025 percentile of EPA/play = 87.1 (5th), DET = 74.2 (9th) —
   consistent with the task brief's stated baselines (+0.132 / +0.078).

### Known limitations of the new files
- Nothing is opponent-adjusted.
- `weekly_trends` 2025 uses the same filtered sample; a team's weekly EPA
  excludes garbage-time plays, so blowout weeks read slightly different from
  unfiltered sources.
- Three-and-out uses nflverse `drive_play_count` (includes penalty/no-play
  plays? it counts plays in the drive record); convention documented above.
- `share_chunk_epa` (EPA > 1.0) and the 10th/90th percentiles are noisy for
  2026 single-game samples.

---

## Kicker / defensive-detail / special-teams / luck-layer pass (Worker, 2026-09-17 ~14:30 CDT)
Script: `compute_kicker_defense_metrics.py` (same directory). Imports
`load()`/`base_sample()` from `compute_team_metrics.py` and
`drive_team_frame`/`percentile_100` from `compute_advanced_metrics.py`.
New files (all in this directory):

- `kicker_metrics_2025.csv` / `_2026.csv` — per-team kicking: FG attempts and
  make rate by distance bucket, XP make rate, kicking points/game, FG/XP EPA
  per attempt, kicker names from `kicker_player_name`.
- `defense_detail_2025.csv` / `_2026.csv` — INT forced rate/dropback, forced
  fumble rate/play, opponent fumble recovery share, TFL rate/rush, takeaway
  rate/drive, defensive TD rate/drive, points allowed/drive.
- `special_teams_2025.csv` / `_2026.csv` — kickoff touchback rate, opponent
  avg start after kickoffs, kickoff/punt EPA, kick/punt return EPA and yards
  per return, FG/punt/XP blocks forced.
- `turnover_luck_2025.csv` / `_2026.csv` — occurrence-vs-recovery luck-layer
  decomposition (see below).

All team CSVs start with `team,season` and carry `_pct` percentile columns
(100 = best, same `(rank-1)/(n-1)*100` convention) for quadrant-style
plotting of any metric pair.

### Filter choices (deliberate deviations from the efficiency sample)
- **Kicking and special teams use the FULL-game REG record** (no garbage-time
  filter). Attempts per game and return rates must reflect whole games; a
  garbage-time FG still counts on the scoreboard. Documented here so nobody
  compares these denominators to the filtered EPA sample.
- **Defensive play-level rates** (INT forced, forced fumbles, TFL) use the
  filtered sample, matching `team_metrics` conventions.
- **Drive-based defensive rates** (takeaway/drive, defensive TD/drive, points
  allowed/drive) use the unfiltered REG sample with the `drive_team_frame`
  convention, matching `drive_stats`.

### Kicker computation
- `field_goal_result`: 'made'/'missed'/'blocked' (blocked = attempt + miss).
  `extra_point_result`: 'good'/'failed'/'blocked'.
- Distance buckets on `kick_distance`: under 30, 30–39, 40–49, 50+ yards.
  Buckets cross-foot to the total (verified).
- `kicking_points_per_game` = (3 × FG made + XP made) / team REG games.
  2-point conversions excluded (not kicking plays).
- FG/XP EPA per attempt = mean of the shipped nflverse `epa` on those plays
  (100% non-null on FG/XP in 2025).
- Kicker names are raw `kicker_player_name` values joined with ';' — e.g.
  2025 BUF shows 'M.Badgley;M.Prater' (Bass did not kick in 2025 per the
  data); 2026 Week 1 confirms **T.Bass (BUF)** and **J.Bates (DET)**,
  tonight's kickers, from the data — not memory.
- League 2025 checks: FG make 85.6%, XP make 95.9%, 7.36 kicking pts/game.

### Defensive detail
- **No `tackle_for_loss` column exists in nflverse pbp.** `tfl_rate_per_rush`
  is COMPUTED: opponent designed rushes with `yards_gained < 0` ÷ opponent
  designed rushes. Every negative-yardage designed run is a tackle for loss
  by definition; this is exact, not a proxy — but it is computed, not
  charted, so it will not match charting vendors' TFL counts exactly
  (they exclude aborted plays etc.).
- INT forced rate per opponent dropback (filtered sample).
- Forced fumbles = opponent `fumble == 1` plays; recovery share =
  `fumble_lost / fumble` on those plays.
- Defensive TD = `return_touchdown == 1` on an opponent pass/run play
  (verified: all 46 in 2025 sit on INT/fumble-return plays; 29 INT-TD +
  18 fumble-TD with 1 play flagged both). Rate = drives containing ≥1 such
  play ÷ opponent drives.
- Takeaway = INT or (fumble AND fumble_lost) on an opponent pass/run play;
  `takeaway_rate_per_drive` = share of opponent drives containing ≥1.
- `points_allowed_per_drive` = opponent's total points (final scores) ÷
  team's defensive drives. The offensive counterpart is in `drive_stats`;
  this is the defensive side, not a duplicate.

### Special teams
- **Kickoff bookkeeping (verified empirically):** on a kickoff play,
  `posteam` = the RETURN team and `defteam` = the KICKING team, and the
  kickoff groups into the return team's `(game_id, fixed_drive)`.
  `drive_start_yard_line` on the kickoff row is the return team's start.
- Touchback spot in 2025 = the **35**-yard line (confirmed in
  `drive_start_yard_line`), i.e. the post-2024 dynamic-kickoff rule.
- `opp_avg_start_after_kickoff` excludes 93/2785 kickoffs where the kicking
  team kept possession (onside recovered or return fumble — onside kicks
  cannot be identified; there is no column). Exclusion count is per-team in
  `n_ko_excluded_onside_kept`.
- **EPA bundling caveat:** nflverse has NO per-return EPA column. Play-level
  `epa` on a kickoff/punt play bundles the kick/punt WITH its return.
  `kick_return_epa_per_return` (return-team perspective) and
  `punt_return_epa_per_return` are the return-inclusive play EPA, not
  isolated return skill. A "punt return" = punt with no touchback, fair
  catch, out-of-bounds, or downing.
- League 2025: 20.5% touchback rate, opp avg start own 29.8, kickoff EPA
  −0.257/kick (kicking off is negative-EPA in the dynamic-kickoff era),
  punt EPA −0.127/punt, 23 FG blocks / 9 punt blocks / 12 XP blocks.

### Turnover luck layer (occurrence vs recovery)
- Occurrence (partially skill): forced fumbles per play vs league-rate
  expectation (same construction as the INT luck columns).
- Recovery (near-pure noise): recovery share minus the league mean share
  (2025: 46.3%) — a luck meter, not a skill rating. Literature: fumble
  recovery is ~0.00 year-to-year (pure noise); forced-fumble occurrence
  shows weak repeatability. Textbook 2025 case: DET forced 19 fumbles
  (+6.5 over expected) but recovered only 26.3% (−20 pts vs league) —
  process good, results unlucky, positive regression expected.

### Spot checks
1. **Kicker identity:** 2026 Week 1 data shows T.Bass kicking for BUF and
   J.Bates for DET — matches tonight's matchup from the data.
2. **Cross-foots:** FG buckets sum to totals; league FG 85.6% / XP 95.9%
   match known 2025 norms; 46 defensive TDs = the `return_touchdown` count
   found independently.
3. **DET kicking paradox:** Bates 79.4% FG (below avg) but 7.94 kicking
   pts/game (above avg) — volume (34 att) plus 9 attempts from 50+
   (44.4%) explains the negative FG EPA/attempt (−0.080): long attempts are
   negative-EPA on average. Not an error.

### Known limitations
- No passes-defensed column in nflverse pbp — omitted, not proxied.
- No true pressure/hurry column in nflverse or FTN — the hit+sack proxy is
  a floor (see rush/pressure section below).
- No isolated return-only EPA; no onside-kick identification.
- 2026 = one game per team; kicker rows are 3–4 attempts — role/identity
  only, not ratings.

---

## Player first-downs / QB aggressiveness / rush-vs-pressure pass (Worker, 2026-09-17 ~15:00 CDT)
Script: `compute_player_metrics.py` (same directory). New files:

- `player_first_downs_2025.csv` / `_2026.csv` — per-player rushing
  first-down rate and receiving first-down rate (per reception and per
  target). Columns: `player,team,season` first.
- `qb_aggressiveness_2025.csv` / `_2026.csv` — per-QB aDOT, comp%,
  expected comp% (nflfastR `cp`), CPOE in percentage points.
- `rush_pressure_2025.csv` / `_2026.csv` — per-team 4-man rush rate (FTN
  `n_pass_rushers`) and pressure proxies (nflverse hit+sack).

Quadrant support: team CSV has team + both metrics + `_pct`; player CSVs
have player, team, both rate metrics, and within-sample percentiles
(`rush_fd_rate_pct`, `rec_fd_rate_pct`, `cpoe_pct`, `adot_pct`).

### FTN 2026 charting — NOW PUBLIC
`ftn_charting_2026.csv` downloaded 2026-09-17 from the nflverse-data
releases (`.../ftn_charting/ftn_charting_2026.csv`, 458,719 bytes, Week 1
only). Joins the 2026 pbp at **100% on dropbacks** via
(nflverse_game_id, nflverse_play_id). Saved to `/tmp/nflverse/ftn2026.csv`.
The @GridironInfo_ "FTN Charting + nflverse PBP" chart for 2026 Week 1 is
therefore reproducible from our stack.

### Player first-down rates
- Same filtered sample as team metrics (REG, pass/run, no kneels/spikes,
  garbage-time excluded).
- Rushing: `rusher_player_name`, `rush_attempt == 1` (includes QB
  scrambles — documented; they land on the QB's row, not RBs'),
  `first_down_rush == 1`.
- Receiving: `receiver_player_name`, `pass_attempt == 1` (targets),
  `complete_pass == 1` (receptions), `first_down_pass == 1`. Reported per
  reception (`rec_fd_rate`) and per target (`target_fd_rate`).
- Qualifiers: 2025 — 50+ rushes OR 30+ targets (225 players); 2026 Week 1 —
  8+ / 8+ (55 players, single-game role check).
- Team = modal `posteam`. 2026 data confirms the structural breaks the
  props desk flagged: **D.Montgomery → HOU** (20 rushes, wk1) and
  **D.Moore → BUF** (8 targets, 5 receptions, wk1) — from the data.
- 2025 extremes: rush FD% leaders T.Lawrence (52.1%, 71 rushes), J.Allen
  (49.4%) — QB scrambles inflate QB rows, as documented; receiving leaders
  T.McLaurin (88.9%), A.Pierce (87.8%) on 30+ receptions.

### QB aggressiveness (aDOT + CPOE)
- aDOT = Σ`air_yards` ÷ attempts with non-null `air_yards`. Sacks have null
  air_yards and are excluded by construction (they are not targets).
- **CPO n/a on throwaways — handled:** nflfastR ships `cp` = NA on
  throwaway passes (verified: 100% of the 2,132 null-cp plays in 2025 are
  incomplete). An early version compared completions over ALL attempts to
  expected over non-throwaways and wrongly made nearly every QB negative —
  caught and fixed: `comp_pct`, `exp_comp_pct`, and `cpoe` are all computed
  on the cp-available (non-throwaway) subset; `n_cpoe` is reported.
- nflverse ships `cpoe` on the 0–100 scale (verified
  `cpoe == 100*(complete_pass - cp)` on 100% of non-null rows); our `cpoe`
  is in percentage points and matches it.
- Qualifiers: 2025 — 100+ attempts (45 QBs); 2026 Week 1 — 10+ (32 QBs).
- 2025: aDOT leaders M.Mariota 10.18, D.Maye 9.36, M.Stafford 9.30; CPOE
  leaders D.Maye +10.6, B.Purdy +7.6, J.Love +6.2; worst B.Cook −12.6,
  D.Gabriel −8.5, S.Sanders −7.0. Maye's +10.6 is consistent with his
  MVP-caliber 2025 (NE 14–3, +0.186 EPA/play).
- `adot_pct`: higher = deeper (style descriptor, NOT "better").

### 4-man rush rate vs pressure rate
- `four_man_rush_rate` = share of dropbacks with `n_pass_rushers == 4`
  (FTN charting; defense-generated on opponent dropbacks,
  `four_man_rush_rate_faced` on own dropbacks). Rows with
  `n_pass_rushers == 0` excluded as a data quirk (54 in 2025, 4 in 2026 wk1).
- **FTN has NO hurry/pressure column**, so `pressure_proxy_rate_*` =
  (qb_hit OR sack) per dropback from nflverse — a floor, not true pressure.
- Sanity check vs the @GridironInfo_ chart's 2026 Week 1 reference values
  (used ONLY as a check, never as input): chart BUF ~65% 4-man / ~19%
  pressure, DET ~60% / ~12%. Computed: **BUF 64.3% / 21.4%**,
  **DET 63.5% / 14.3%** — 4-man rates match within a point; pressure proxy
  runs 2–3 pts higher (definition/sample differences), ordinal agreement
  holds (BUF > DET on both). 2025 full-season: BUF 70.4% / 16.0%,
  DET 64.3% / 14.4%.
- `four_man_rush_rate_pct`: higher = more 4-man (style, not quality).

### Known limitations
- No SIS on-target rate — proprietary, not replicable; CPOE from the
  nflfastR `cp` model is the honest public proxy.
- First-down rates include garbage-time-excluded sample only; short-yardage
  specialists (Lawrence/Allen) top rushing FD% via scrambles — read with
  the documented caveat.
- 2026 player/QB files are single-game samples; thresholds lowered to 8
  (players) / 10 (QB attempts) purely for role checks.
- Passes defensed, true pressure rate, isolated return EPA, and onside-kick
  identification remain unsupported by the data (documented above, not
  proxied).
