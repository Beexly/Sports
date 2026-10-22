import psycopg2
from dotenv import dotenv_values
import json

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."gameId", g."awayTeamName" || ' @ ' || g."homeTeamName" as matchup,
           p."pickType", p.selection, p."edgeScore", p.confidence, p.reasoning, p."factorBreakdown"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE p."isPublished" = true
      AND g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
    ORDER BY g."commenceTime" ASC;
""")
rows = cur.fetchall()
print(f"Published Week 6 picks: {len(rows)}")
for r in rows:
    fb = r[8] or {}
    print(f"\nID: {r[0]} | GameId: {r[1]} | Matchup: {r[2]} | PickType: {r[3]} | Selection: {r[4]} | EdgeScore: {r[5]}")
    print(f"Reasoning ({len(r[7] or '')} chars): {r[7]}")
    print(f"FB keys: {list(fb.keys())}")
    print(f"  independentEdge: {fb.get('independentEdge')}")
    print(f"  injuryEvidence: {fb.get('injuryEvidence') is not None}")
    print(f"  continuityDeltas: {fb.get('continuityDeltas') is not None}")
    print(f"  noBet: {fb.get('noBet')}")

cur.close()
conn.close()
