import polars as pl

ps = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/player_stats_2025_2026.parquet")
pbp = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/pbp_2025_2026.parquet")
sched = pl.read_parquet("/home/hatch/workspace/gse-lab/whalelay/sched_2025_2026.parquet")
reg = ps.filter(pl.col("season_type") == "REG")

# teams for Likely / Mevis in 2025
for name in ["Isaiah Likely", "Harrison Mevis"]:
    d = reg.filter(pl.col("player_display_name").str.contains(name.split()[-1]) & (pl.col("season")==2025))
    print(name, "->", d.select(["team"]).unique().to_series().to_list())

def hit_rate(name, season, cond):
    d = reg.filter((pl.col("player_display_name") == name) & (pl.col("season") == season))
    hits = d.filter(cond).height
    return d.height, hits, hits/d.height if d.height else 0

legs = []
n, h, r = hit_rate("Matthew Stafford", 2025, pl.col("passing_tds") >= 2); legs.append(("Stafford O1.5 pass TDs", n, h, r))
n, h, r = hit_rate("Isaiah Likely", 2025, pl.col("receiving_yards") >= 30); legs.append(("Likely 30+ rec yds", n, h, r))
n, h, r = hit_rate("Davante Adams", 2025, pl.col("receptions") >= 4); legs.append(("Adams 4+ rec", n, h, r))
n, h, r = hit_rate("Blake Corum", 2025, pl.col("receptions") >= 1); legs.append(("Corum O0.5 rec", n, h, r))
n, h, r = hit_rate("Theo Johnson", 2025, pl.col("receptions") >= 1); legs.append(("T. Johnson O0.5 rec", n, h, r))
n, h, r = hit_rate("Harrison Mevis", 2025, pl.col("fg_made") >= 2); legs.append(("Mevis 2+ FGs", n, h, r))

# Rams -5.5: win by 6+ in 2025 REG
la = sched.filter((pl.col("season")==2025)&(pl.col("game_type")=="REG")&((pl.col("home_team")=="LA")|(pl.col("away_team")=="LA"))).with_columns(
    pl.when(pl.col("home_team")=="LA").then(pl.col("home_score")-pl.col("away_score")).otherwise(pl.col("away_score")-pl.col("home_score")).alias("margin"))
cover = la.filter(pl.col("margin") >= 6).height
legs.append(("Rams -5.5 (win by 6+)", la.height, cover, cover/la.height))

# Rams 1Q ML: leading after Q1 2025 (computed before: 8/17)
legs.append(("Rams 1Q ML (led after Q1)", 17, 8, 8/17))

print("\n== LEG HIT RATES (2025 regular season) ==")
prod = 1.0
for name, n, h, r in legs:
    print(f"{name:32s} {h:2d}/{n:2d}  {r*100:5.1f}%")
    prod *= r
print(f"\nNaive all-8 parlay (independent): {prod*100:.2f}%  (~1 in {1/prod:.0f})")
