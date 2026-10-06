# Tendency regeneration — 2026-10-02

compute_tendencies.py now reads the committed play_by_play_YYYY.parquet files. It was run with output redirected off the committed CSVs.

Result: 160 offense rows and 160 defense rows, same count as the committed tables.

2024 BAL quick_game_rate matched the committed seed exactly: 0.4680851063829787.
2025 SF matched exactly: 0.526813880126183.
2026 CLE did not: regenerated 0.6293103448275862, committed seed 0.6385542168674698.

The committed 2026 parquet contains weeks 1-4. The seed row was built when that file had fewer weeks. The seed was not overwritten. A later refresh has to be a new vintage, not a silent replace of the pinned 1e-6 expectations.
