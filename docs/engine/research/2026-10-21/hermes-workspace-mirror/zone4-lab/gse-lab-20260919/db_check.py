import os
import psycopg

conn = psycopg.connect(os.environ["NEON_RO"], connect_timeout=20)
queries = {
    "=== team_game_efficiency by season ===": """
        SELECT season, "seasonType", count(*), min(week), max(week), max("fetchedAt")::date
        FROM team_game_efficiency GROUP BY 1,2 ORDER BY 1,2;
    """,
    "=== picks with independentEdge ===": """
        SELECT count(*) AS total_picks,
               count(*) FILTER (WHERE "factorBreakdown" ? 'independentEdge') AS has_indep
        FROM picks;
    """,
    "=== independentEdge sources distribution ===": """
        SELECT "factorBreakdown"->'independentEdge'->'sources' AS sources, count(*)
        FROM picks
        WHERE "factorBreakdown" ? 'independentEdge'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 12;
    """,
    "=== ingestion freshness (latest days) ===": """
        SELECT "fetchedAt"::date AS d, count(*)
        FROM team_game_efficiency GROUP BY 1 ORDER BY 1 DESC LIMIT 8;
    """,
    "=== independentEdge trueProb vs decision (published, pending) ===": """
        SELECT "isPublished", "result",
               "factorBreakdown"->'independentEdge'->>'decision' AS dec,
               count(*), round(avg(("factorBreakdown"->'independentEdge'->>'trueProb')::numeric),3) AS avg_tp
        FROM picks
        WHERE "factorBreakdown" ? 'independentEdge'
        GROUP BY 1,2,3 ORDER BY 1,3,2 LIMIT 25;
    """,
}
for title, q in queries.items():
    print(title)
    try:
        rows = conn.execute(q).fetchall()
        for r in rows:
            print(r)
    except Exception as e:
        print("ERR:", str(e).splitlines()[0])
        conn.rollback()
conn.close()
