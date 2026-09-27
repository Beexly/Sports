import polars as pl
ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
staf = (ps.filter((pl.col("player_display_name")=="Matthew Stafford")&(pl.col("season_type")=="REG"))
        .sort(["season","week"]).select(["season","week","passing_tds","opponent_team"]))
print(staf.to_dicts())
print("games w/ 2+ TDs 2025:", (staf.filter(pl.col("season")==2025)["passing_tds"]>=2).sum(), "/ 17")
