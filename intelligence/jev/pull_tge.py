import os
import pandas as pd
import psycopg

conn = psycopg.connect(os.environ["NEON_RO"], connect_timeout=20)

tge = pd.read_sql(
    'SELECT "gameKey", season, week, "seasonType", team, opponent, "isHome", plays,'
    ' "offEpaPerPlay", "offSuccess", "defEpaPerPlay", "defSuccess"'
    ' FROM team_game_efficiency ORDER BY season, week',
    conn,
)
print("tge rows:", len(tge), "| seasons:", sorted(tge.season.unique()))

nfl_src = pd.read_sql(
    """
    SELECT p."factorBreakdown"->'independentEdge'->'sources' AS sources, count(*) AS n,
           round(avg((p."factorBreakdown"->'independentEdge'->>'trueProb')::numeric), 3) AS avg_tp
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports s ON s.id = g."sportId"
    WHERE p."factorBreakdown" ? 'independentEdge' AND s.key = 'nfl'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 15;
    """,
    conn,
)
print("=== NFL-only independentEdge sources ===")
print(nfl_src.to_string(index=False))

dec = pd.read_sql(
    """
    SELECT "factorBreakdown"->'independentEdge'->>'decision' AS dec,
           count(*) FILTER (WHERE result IN ('WIN')) AS wins,
           count(*) FILTER (WHERE result IN ('LOSS')) AS losses,
           round(avg(("factorBreakdown"->'independentEdge'->>'trueProb')::numeric), 3) AS avg_trueprob
    FROM picks
    WHERE "factorBreakdown" ? 'independentEdge' AND "isPublished" = true
    GROUP BY 1;
    """,
    conn,
)
print("=== published: decision vs realized (all sports) ===")
print(dec.to_string(index=False))

conn.close()
tge.to_csv("data/team_game_efficiency_prod.csv", index=False)
print("saved data/team_game_efficiency_prod.csv")
