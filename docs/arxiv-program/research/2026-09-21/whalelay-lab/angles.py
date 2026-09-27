import polars as pl

ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
pbp = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/pbp_2025_2026.parquet")
print("player_stats cols:", ps.columns)
print("pbp cols sample:", [c for c in pbp.columns][:40])
