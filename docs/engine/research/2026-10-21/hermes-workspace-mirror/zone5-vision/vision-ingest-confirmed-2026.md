GSE VISION INGEST CONFIRMED — Pre-Week-6 2026 NGS Tracking Geometry
===================================================================
Generated: 2026-10-18 (Canada/Central CDT)
Repo: Beexly/Sports, data workspace C:/Users/Garrett/Sports
Vision path: intelligence/vision/ + intelligence/coaching/data/
Scope: pre-Week-6 2026 only. Real files only — no synthetic data.
Constraint honored: no code changes, no deploys, no production writes, no bulk broadcast download.

This report supersedes the earlier "no data" conclusion. The tracking parquet
(ngs_highlight_tracking_2026.parquet) IS on disk with real 10 Hz coordinates,
and all pre-Week-6 geometry is readable. The enrichment parquet was never the
geometry source — it is an outcome join without spatial columns.

================================================================
1. FETCH STATUS
================================================================
File intelligence/vision/data/ngs_highlight_tracking_2026.parquet is ALREADY
present on disk. No fetch was required. The loader script
(intelligence/vision/ngs_highlight_tracking_loader.py) produces this file via
token-free HTTP GET from sportsdataverse-data releases:
  https://github.com/sportsdataverse/sportsdataverse-data/releases/download/
  tag nfl_ngs_highlight_tracking / nfl_ngs_highlight_tracking_2026.parquet
If the file were absent, the documented command would be:
  python intelligence/vision/ngs_highlight_tracking_loader.py
    -> fetch_highlight_tracking(season=2026)
  Writes: intelligence/vision/data/ngs_highlight_tracking_2026.parquet
  Also populates intelligence/coaching/data/ with highlights, participation,
  and events parquets for 2018–2026.
REA endpoint inspection: REA could not be installed/run in this environment
(npx rea failed — no executable). Endpoint status from loader source code
only: the loader constructs URLs as
{f"{SDVRELEASES}{tag}/{stem}_{season}.parquet"} with SDVRELEASES =
"https://github.com/sportsdataverse/sportsdataverse-data/releases/download/".
No live HTTP call was made; the local parquet was inspected directly.

File present: C:/Users/Garrett/Sports/intelligence/vision/data/
ngs_highlight_tracking_2026.parquet (60,300,657 bytes ≈ 60 MB)

================================================================
2. TRACKING PARQUET STATUS
================================================================
Shape: 7,345,682 rows x 15 columns
Unique play_id: 1,017
Unique game_id: 128
Unique frame_id: varies per play
Weeks present: [0 (PRE), 1, 2, 3, 4, 5] — ALL pre-Week-6 ✓
season_type values: PRE, REG

Rows per week (pre-Week-6): {0: 79,374, 1: 1,855,394, 2: 1,634,041,
3: 1,694,028, 4: 1,079,905, 5: 1,002,940}
Plays per week (pre-Week-6): {0: 14, 1: 284, 2: 249, 3: 259, 4: 170, 5: 152}
Total pre-Week-6 plays: 1,017

Non-null rates for required geometry fields (validate_2026_highlights_all.py
expects x, y, gsis_id, frame_id, team_abbr, jersey_number, position):
  x:         7,345,682/7,345,682 = 100.0%  (range [-9.8, 129.6] yd)
  y:         7,345,682/7,345,682 = 100.0%  (range [-10.5, 66.5] yd)
  frame_id:  7,345,682/7,345,682 = 100.0%
  gsis_id:   7,233,222/7,345,682 = 98.5%
  team_abbr: 7,233,222/7,345,682 = 98.5%
  jersey_number: 7,233,011/7,345,682 = 98.5%
  position:  7,233,222/7,345,682 = 98.5%
  side:      7,345,682/7,345,682 = 100.0%
  time:      7,345,682/7,345,682 = 100.0% (datetime64[ms, UTC])
  esb_id:    7,231,394/7,345,682 = 98.4%

Coordinate sanity (pre-Week-6):
  x outside [0,120]: present (min -9.8, max 129.6) — out-of-bounds exist
  y outside [0,53.33]: present (min -10.53, max 66.55) — out-of-bounds exist
  y-OOB rows: 78,218 (1.065% of 7,345,682 pre-Week-6 rows)
  Plays with at least one y-OOB row: 564 of 1,017

================================================================
3. NGS FIELD TABLE (tracking parquet)
================================================================
| Field            | Dtype         | Non-null rate | Unit / Meaning                          | Notes                              |
|------------------|---------------|---------------|-----------------------------------------|------------------------------------|
| season           | int64         | 100.0%        | season year                             | 2026                               |
| season_type      | str           | 100.0%        | PRE / REG                               |                                    |
| week             | int64         | 100.0%        | week number (0 = preseason)             | 0–5 for pre-Week-6                 |
| game_id          | int64         | 100.0%        | NFL game id                             | ESPN-style                         |
| play_id          | int64         | 100.0%        | play id within game                     |                                    |
| frame_id         | int64         | 100.0%        | 10 Hz frame index within play           |                                    |
| time             | datetime64    | 100.0%        | UTC timestamp                           |                                    |
| side             | str           | 100.0%        | offense/defense side                    |                                    |
| team_abbr        | str           | 98.5%         | team abbreviation                       |                                    |
| gsis_id          | str           | 98.5%         | player GSIS id                          | matches enrichment nfl_id          |
| esb_id           | str           | 98.4%         | player ESB id                           |                                    |
| jersey_number    | float64       | 98.5%         | jersey number                           |                                    |
| position         | str           | 98.5%         | player position                         | QB, WR, CB, etc.                   |
| x                | float64       | 100.0%        | field coordinate (yd)                   | 0 = back of end zone               |
| y                | float64       | 100.0%        | field coordinate (yd)                   | 0 = near sideline                  |

Required geometry fields per validate_2026_highlights_all.py (x, y, gsis_id,
frame_id, team_abbr, jersey_number, position): ALL PRESENT, x/y/frame_id at
100% non-null.

Shared fields with other parquets:
  Tracking ∩ Participation: esb_id, game_id, gsis_id, jersey_number,
      play_id, position, season, season_type, side, week
  Tracking ∩ Events: frame_id, game_id, play_id, season, season_type,
      time, week
  Tracking-only: team_abbr, x, y

================================================================
4. PARTICIPATION / EVENTS STATUS
================================================================
ngs_highlight_participation_2026.parquet:
  Present: C:/Users/Garrett/Sports/intelligence/coaching/data/
  Shape: 25,540 rows x 44 columns (0.7 MB)
  Key fields: game_id, play_id, side, play_type, quarter, down,
      yards_to_go, game_clock, gsis_id, display_name, position,
      is_offense_play, is_defense_play, was_running_route, was_blitzing
  Shares 10 fields with tracking (game_id, play_id, gsis_id, position, etc.)

ngs_highlight_events_2026.parquet:
  Present: C:/Users/Garrett/Sports/intelligence/coaching/data/
  Shape: 10,828 rows x 9 columns (53 KB)
  Fields: game_id, play_id, event, event_type, time, frame_id (+ season,
      season_type, week)
  Shares frame_id, game_id, play_id, time with tracking — enables
      frame-aligned event join.

ngs_highlights_2026.parquet (also present):
  Shape: 1,161 rows x 39 columns — play-level metadata (play_type, down,
      yardline, scores, big_play flag, etc.)

================================================================
5. PROOF-PLAY D1 CROSS-CHECK
================================================================
proof_play_2026101200_4579.parquet (6,791 rows x 16 cols, week 5):
  y-OOB rows: 37 (min y = -0.82, max y = 45.97)
  x-OOB rows: 0
  OOB frames: 277–296 (consecutive burst)

ngs_highlight_tracking_2026.parquet, play_id 4579:
  Rows: 6,791 — identical to proof play parquet
  y-OOB rows: 37 — IDENTICAL count, min y = -0.82, max y = 45.97
  x-OOB rows: 0 — IDENTICAL
  OOB frames: 277–296 — IDENTICAL

Conclusion: proof_play_2026101200_4579.parquet is a direct subset/extract of
ngs_highlight_tracking_2026.parquet for play_id 4579. The D1 defect (37 rows
with y outside [0,53.33], min −0.82 yd beyond the sideline) is confirmed in
BOTH files — it is a real geometry defect in the source tracking data, not an
artifact of the proof-play extraction. Do not fix (per constraints).

Global pre-Week-6 context: 564 of 1,017 plays have at least one y-OOB row;
worst offenders by row count: play 3817 (3,038 rows), play 4402 (2,375),
play 411 (2,052), play 4039 (1,728), play 2584 (1,401).

================================================================
6. REA OBSERVATIONS
================================================================
REA could not be installed in this environment (npx rea failed — no
executable available after install attempt). No live endpoint inspection was
performed. Endpoint information is limited to the loader source code:
  SDVRELEASES = "https://github.com/sportsdataverse/sportsdataverse-data/releases/download/"
  URL pattern: {SDVRELEASES}{tag}/{stem}_{season}.parquet
  For highlight_tracking, season 2026:
    tag = "nfl_ngs_highlight_tracking", stem = "nfl_ngs_highlight_tracking"
    Full URL:
    https://github.com/sportsdataverse/sportsdataverse-data/releases/download/
    nfl_ngs_highlight_tracking/nfl_ngs_highlight_tracking_2026.parquet
The local parquet at intelligence/vision/data/ngs_highlight_tracking_2026.parquet
was inspected directly — no network call was made or needed.

================================================================
7. IS GEOMETRY READABLE FOR PRE-WEEK-6 2026 PLAYS?
================================================================
YES.

Evidence:
  - ngs_highlight_tracking_2026.parquet is present on disk (60 MB).
  - It contains 7,345,682 rows across 1,017 unique pre-Week-6 play_ids
    (weeks 0–5), 128 unique game_ids.
  - All geometry fields are present: x, y (100% non-null), frame_id (100%),
    gsis_id (98.5%), team_abbr (98.5%), jersey_number (98.5%), position
    (98.5%), side (100%), time (100%).
  - validate_2026_highlights_all.py's required fields (x, y, gsis_id,
    frame_id, team_abbr, jersey_number, position) are all readable.
  - Participation and events parquets are present for frame-aligned joins.
  - The proof-play D1 defect is cross-confirmed between the proof-play
    parquet and the full tracking parquet (identical 37 y-OOB rows).

Caveats:
  - x range [-9.8, 129.6] and y range [-10.5, 66.5] extend beyond the legal
    field [0,120] x [0,53.33] — out-of-bounds coordinates exist in 1.065% of
    pre-Week-6 rows (78,218 rows across 564 plays). These are real data
    defects, not missing columns.
  - No broadcast MP4 frames exist for any play — this is NGS 10 Hz Zebra
    UWB field-coordinate data, not video. Homography from broadcast pixels
    cannot be tested against these tracks; they are already field-projected.
  - Coverage shell, pocket depth, separation, and SOE are NOT columns in the
    tracking parquet — they must be derived from x/y tracks plus a homography
    and play-boundary alignment. The enrichment parquet (tracklet outcome
    join) also lacks these spatial columns.

Report file: C:/Users/Garrett/vision-ingest-confirmed-2026.md
