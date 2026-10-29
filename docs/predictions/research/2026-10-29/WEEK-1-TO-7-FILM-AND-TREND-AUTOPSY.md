# Weeks 1-7 measured notes — 2026-10-29 Round 3

Not a side. Not a total. Not a prop. Gate remains PASS.

## What was counted

Source: `intelligence/coaching/data/play_by_play_2026.parquet`. Season column is 2026 only. Week column is 1 through 7. 18,738 rows. This is not the 2022 tracking CSV in `intelligence/vision/data/`.

CAR and GB games in that file: 13. Week 7 games are `2026_07_TB_CAR` and `2026_07_GB_DET`. They have not played each other in weeks 1-7.

Offense filter: `posteam` is the team, and `play_type` is `pass` or `run`. First-and-10 is `down == 1` and `ydstogo == 10`. No-huddle is `no_huddle` in (1, true).

- Carolina offense, weeks 1-7: 392 pass-or-run plays. 25 no-huddle (0.0638). First-and-10: 89 passes out of 155 (0.5742).
- Green Bay offense, weeks 1-7: 423 pass-or-run plays. 34 no-huddle (0.0804). First-and-10: 74 passes out of 145 (0.5103).

These rates are not compared to the posted number. They are not an expected CLV.

## What was not counted

- No pocket depth, separation, or rush-threat number. `ngs_highlight_tracking_2026.parquet` is season 2026 but weeks 0-5 only (7,345,682 rows). It does not cover week 6 or week 7. The 2022 tracking CSVs were not used.
- Charting copy under `nfl-farm/extracted_data` has weeks 1-6 only (15,904 rows). The coaching copy has weeks 1-7 (18,019 rows). Week 7 was not joined into a new file this round.
- `docs/research/2026-10-28/full-tables/courseiq-simulated-box-score-car-gb-tnf-2026.csv` is a simulated box score in the filename. It was not used as a prop line.
- The week-7 coverage chart file has a Packers row and a Panthers row. It was not turned into a shell call. A chart share is not a model probability.

## Gate

Posted TNF number remains the scoreboard field from the 2026-10-29T05:53:36Z fetch: GB -3.5, total 47.5. No book-last comparison was computed. PASS.
