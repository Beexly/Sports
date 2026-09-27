import polars as pl

ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
pbp = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/pbp_2025_2026.parquet")
reg = ps.filter(pl.col("season_type") == "REG")

# Corum totals 2025 + 2026 W1
for name in ["Blake Corum", "Theo Johnson", "Davante Adams", "Puka Nacua"]:
    d = reg.filter((pl.col("player_display_name") == name) & (pl.col("season") == 2025))
    w1 = reg.filter((pl.col("player_display_name") == name) & (pl.col("season") == 2026) & (pl.col("week") == 1))
    print(f"\n== {name} 2025 totals: g={d.height} rec={d['receptions'].sum()} tgt={d['targets'].sum()} rec/g={d['receptions'].sum()/d.height:.2f}")
    if w1.height:
        print(f"   2026 W1: rec={w1['receptions'][0]} tgt={w1['targets'][0]} yds={w1['receiving_yards'][0]}")

# Rams Q1 2025: score at end of Q1
g = (pbp.filter((pl.col("season")==2025)&(pl.col("season_type")=="REG")&((pl.col("home_team")=="LA")|(pl.col("away_team")=="LA")))
     .filter(pl.col("qtr")==1))
# last play of Q1 per game = max game_seconds_remaining? use quarter_end==1 rows' last play
q1end = g.filter(pl.col("quarter_end")==1).group_by("game_id").agg([
    pl.col("total_home_score").last().alias("hs"),
    pl.col("total_away_score").last().alias("as_"),
    pl.col("home_team").first().alias("home"),
])
rams_home = q1end.with_columns(
    pl.when(pl.col("home")=="LA").then(pl.col("hs")-pl.col("as_")).otherwise(pl.col("as_")-pl.col("hs")).alias("la_diff"),
    pl.when(pl.col("home")=="LA").then(pl.col("hs")).otherwise(pl.col("as_")).alias("la_q1"),
)
print("\n== RAMS Q1 2025 ==")
print("games:", rams_home.height)
print("leading after Q1:", (rams_home["la_diff"]>0).sum(), f"({(rams_home['la_diff']>0).mean()*100:.1f}%)")
print("tied:", (rams_home["la_diff"]==0).sum(), "trailing:", (rams_home["la_diff"]<0).sum())
print("scoreless Q1:", (rams_home["la_q1"]==0).sum())
print("avg LA Q1 points:", rams_home["la_q1"].mean())
# final 4 regular season games
sched = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/sched_2025_2026.parquet")
la_games = sched.filter((pl.col("season")==2025)&((pl.col("home_team")=="LA")|(pl.col("away_team")=="LA"))).sort("week")
print("\nlast 4 weeks:", la_games.select(["week","home_team","away_team"]).tail(4).to_dicts())
