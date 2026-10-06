import polars as pl
ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
d = ps.filter((pl.col("player_display_name")=="Isaiah Likely") & (pl.col("season")==2026))
print(d.select(["week","team","opponent_team","receptions","targets","receiving_yards"]).to_dicts())
