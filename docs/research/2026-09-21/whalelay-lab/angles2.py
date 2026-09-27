import polars as pl

ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
pbp = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/pbp_2025_2026.parquet")
print("score cols:", [c for c in pbp.columns if 'score' in c.lower()])

reg = ps.filter(pl.col("season_type") == "REG")

# A. Corum 2025 receiving
corum = reg.filter((pl.col("player_display_name") == "Blake Corum") & (pl.col("season") == 2025))
print("\n== CORUM 2025 ==")
print(corum.select(["week","team","receptions","targets","receiving_yards"]))
print("games:", corum.height, "rec/g:", corum["receptions"].sum()/corum.height if corum.height else None,
      "games w/ 1+ rec:", (corum["receptions"] >= 1).sum())

# B. Theo Johnson 2025
tj = reg.filter((pl.col("player_display_name") == "Theo Johnson") & (pl.col("season") == 2025))
print("\n== THEO JOHNSON 2025 ==")
print(tj.select(["week","team","receptions","targets","receiving_yards"]))
print("games:", tj.height, "rec/g:", tj["receptions"].sum()/tj.height if tj.height else None,
      "games w/ 1+ rec:", (tj["receptions"] >= 1).sum())

# C. Adams 2025 with/without Puka
puka_games = set(reg.filter((pl.col("player_display_name") == "Puka Nacua") & (pl.col("season") == 2025) & (pl.col("targets") > 0))["game_id"].to_list())
adams = reg.filter((pl.col("player_display_name") == "Davante Adams") & (pl.col("season") == 2025))
ad = adams.with_columns(pl.when(pl.col("game_id").is_in(list(puka_games))).then(pl.lit("puka_in")).otherwise(pl.lit("puka_out")).alias("puka"))
print("\n== ADAMS 2025 by Puka status ==")
print(ad.group_by("puka").agg([pl.len().alias("g"), pl.col("targets").mean().alias("tgt/g"), pl.col("receptions").mean().alias("rec/g"), pl.col("receiving_yards").mean().alias("yds/g")]))

# D. Stafford 0-TD games -> next game TDs (career in sample: 2025 + 2026 w1)
staf = reg.filter((pl.col("player_display_name") == "Matthew Stafford")).sort(["season","week"])
print("\n== STAFFORD game log ==")
print(staf.select(["season","week","team","opponent_team","passing_tds","passing_yards","attempts"]))
rows = staf.select(["season","week","passing_tds"]).to_dicts()
for i, r in enumerate(rows[:-1]):
    if r["passing_tds"] == 0:
        nxt = rows[i+1]
        print(f"0-TD game: {r['season']} W{r['week']} -> next: {nxt['season']} W{nxt['week']} = {nxt['passing_tds']} TDs")
