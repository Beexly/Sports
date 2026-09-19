import os, math
import pandas as pd
import psycopg

conn = psycopg.connect(os.environ["NEON_RO"], connect_timeout=20)

def wilson(w, n, z=1.96):
    if n == 0: return (float("nan"), float("nan"))
    p = w / n
    d = 1 + z*z/n
    c = p + z*z/(2*n)
    h = z * math.sqrt(p*(1-p)/n + z*z/(4*n*n))
    return ((c-h)/d, (c+h)/d)

df = pd.read_sql(
    """
    SELECT s.key AS sport,
           "factorBreakdown"->'independentEdge'->>'decision' AS dec,
           count(*) FILTER (WHERE result = 'WIN') AS wins,
           count(*) FILTER (WHERE result = 'LOSS') AS losses,
           round(avg(("factorBreakdown"->'independentEdge'->>'trueProb')::numeric), 3) AS avg_tp,
           round(avg("confidence")::numeric, 1) AS avg_conf
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports s ON s.id = g."sportId"
    WHERE "factorBreakdown" ? 'independentEdge' AND "isPublished" = true
      AND result IN ('WIN','LOSS')
    GROUP BY 1,2 ORDER BY 1,2;
    """, conn)

rows = []
for _, r in df.iterrows():
    n = int(r.wins + r.losses)
    lo, hi = wilson(int(r.wins), n)
    rows.append({**r.to_dict(), "n": n, "hit": round(int(r.wins)/n, 3),
                 "wil95": f"[{lo:.3f},{hi:.3f}]", "gap_tp": round(int(r.wins)/n - float(r.avg_tp), 3)})
out = pd.DataFrame(rows)
print("=== decision tier calibration by sport (published, decided) ===")
out.to_csv("data/decision_tier_calibration_by_sport.csv", index=False)
print(out.to_string(index=False))

nfl = pd.read_sql(
    """
    SELECT "factorBreakdown"->'independentEdge'->>'sources' AS sources,
           "factorBreakdown"->'independentEdge'->>'decision' AS dec,
           result, count(*) AS n
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports s ON s.id = g."sportId"
    WHERE s.key = 'americanfootball_nfl' AND "factorBreakdown" ? 'independentEdge'
    GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 15;
    """, conn)
print("=== NFL independentEdge rows: sources/decision/result ===")
print(nfl.to_string(index=False))
conn.close()
