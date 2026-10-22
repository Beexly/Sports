import psycopg2
from dotenv import dotenv_values
import json

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."gameId", g."awayTeamName" || ' @ ' || g."homeTeamName" as matchup,
           p."pickType", p.selection, p.line, p.confidence, p."edgeScore",
           p."isPublished", p.reasoning, p."factorBreakdown"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY p."isPublished" DESC, g."commenceTime" ASC;
""")
picks = cur.fetchall()
print(f"Total Week 6 picks in DB: {len(picks)}")
for p in picks:
    fb = p[10]
    reasoning_len = len(p[9]) if p[9] else 0
    print(f"\nID: {p[0]} | Matchup: {p[2]} | Type: {p[3]} | Selection: {p[4]} | EdgeScore: {p[7]} | Pub: {p[8]} | ReasoningLen: {reasoning_len}")
    if fb:
        print("FactorBreakdown keys:", list(fb.keys()))
        print("noBet in fb?:", "noBet" in fb, fb.get("noBet"))
        print("independentEdge:", fb.get("independentEdge"))
        print("injuryEvidence:", fb.get("injuryEvidence"))
        print("continuityDeltas:", fb.get("continuityDeltas"))

cur.close()
conn.close()
