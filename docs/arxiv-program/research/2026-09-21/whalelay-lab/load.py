import nflreadpy as nfl
import polars as pl

print("loading pbp 2025-2026...")
pbp = nfl.load_pbp([2025, 2026])
print("pbp rows:", pbp.height)
pbp.write_parquet("/home/hatch/workspace/gse-lab/whalelay/pbp_2025_2026.parquet")
print("loading player stats 2025-2026...")
ps = nfl.load_player_stats([2025, 2026])
print("player stats rows:", ps.height)
ps.write_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
print("loading schedules 2025-2026...")
sched = nfl.load_schedules([2025, 2026])
sched.write_parquet("/home/hatch/workspace/gse-lab/whalelay/sched_2025_2026.parquet")
print("done")
