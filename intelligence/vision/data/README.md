# vision/data — raw inputs (large), re-downloadable; extracts are tracked

The raw BDB tracking CSVs and full-season 10 Hz NGS highlight tracking parquets
are tens to hundreds of MB each and re-downloadable from keyless public mirrors.
They stay OUT of git. The extracted proof-play parquets
(`proof_play_2022091113_1766.parquet`, `proof_play_2026101200_4579.parquet`),
the multi-era canonical validation sample (`bdb_ngs_canonical_validation_sample.parquet`),
the nflverse players crosswalk, and pbp 2022 ARE tracked (small, and the
identity-chain + SkeleTrack v2 proofs depend on them).

## 1. BDB 2025 (2022 season 10 Hz tracking, weeks 1..9)

Re-download command (no account, keyless):

  python -c "
  import urllib.request, shutil
  base='https://huggingface.co/datasets/ameau01/Big-Data-Bowl-2025/resolve/main/big-data-bowl-data/'
  for f in ['tracking_week_1.csv','plays.csv','players.csv','games.csv','player_play.csv']:
      req=urllib.request.Request(base+f, headers={'User-Agent':'Mozilla/5.0'})
      with urllib.request.urlopen(req, timeout=120) as r, open('intelligence/vision/data/'+f,'wb') as out:
          shutil.copyfileobj(r, out, length=8*1048576)
  "

tracking_week_1.csv = 926 MB, ~11 s on this connection.

## 2. SDV / nfl-ngs-raw 10 Hz Highlight Tracking & 22-Man Participation (2018..2026)

Re-download command (token-free, keyless via `intelligence/vision/ngs_highlight_tracking_loader.py`):

  python intelligence/vision/ngs_highlight_tracking_loader.py

Pulls:
- `intelligence/coaching/data/ngs_highlights_{2018..2026}.parquet` (17,770 highlight plays)
- `intelligence/coaching/data/ngs_highlight_participation_{2018..2026}.parquet` (390,899 on-field player-play rows)
- `intelligence/coaching/data/ngs_highlight_events_{2018..2026}.parquet` (164,428 frame events)
- `intelligence/vision/data/ngs_highlight_tracking_2026.parquet` (7,345,682 rows of 10 Hz coordinates across 1,161 plays in 2026; 2018-2025 seasons available via `fetch_highlight_tracking(season=...)`)

## 3. Historical BDB 2019 (10 Hz) & AMF 2016 (30 Hz) Ground-Truth Archive

Stored under `intelligence/vision/data/bdb_archive/`:
- `bdb2019_tracking_gameId_2017090700.csv` + `bdb2019_plays.csv` + `bdb2019_players.csv` (`https://raw.githubusercontent.com/nfl-football-ops/Big-Data-Bowl/master/Data/`)
- `amf_2016_01_NE_ARI.parquet` (`https://github.com/sportsdataverse/amf-location-data/releases/download/amf_tracking_parquet/2016_01_NE_ARI.parquet`)

## 4. Pre-2023 (NGS) vs 2023+ (FTN) `pbp_participation` Rule

- 2016–2022: Sourced from NGS (`pbp_participation_2016..2022.parquet`, 341,718 plays).
- 2023–2025: Sourced from FTN Data (`pbp_participation_2023..2025.parquet`, 137,271 plays), released only after the entire postseason ends.
- Mid-season (2026): Upstream `pbp_participation_2026.parquet` is structurally HTTP 404 until after Super Bowl LX. Never fabricate `players_on_play`; use `ngs_highlight_participation_2026.parquet` (full 22-man MEASURED roster on 787 regular-season highlight plays) + `pbp_participation_2026_reconstructed.parquet` (involved PBP players + FTN 2026 charting box/rushers/formation + game snap-active pools).
