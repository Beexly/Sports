import psycopg2
from dotenv import dotenv_values
import json

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# 1. Settled games count
cur.execute("""
    SELECT count(*)
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
      AND g."homeScore" IS NOT NULL
      AND g."awayScore" IS NOT NULL;
""")
print('Settled games count:', cur.fetchone()[0])

# 2. Week 6 games count
cur.execute("""
    SELECT count(*), min(g."commenceTime"), max(g."commenceTime")
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL;
""")
print('Week 6 games count & range:', cur.fetchone())

# 3. Check 14 Week 6 games details
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g."restDaysHome", g."restDaysAway", g."openingSpread", g."openingTotal"
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY g."commenceTime" ASC;
""")
games = cur.fetchall()
print(f"\n14 Week 6 games (count={len(games)}):")
for g in games:
    print(f"  {g[0]}: {g[2]} @ {g[1]} | Kickoff: {g[3]} | Rest: Home={g[4]}, Away={g[5]} | OpenSpread={g[6]}, OpenTotal={g[7]}")

# 4. Check existing picks for Week 6
cur.execute("""
    SELECT p.id, p."gameId", g."awayTeamName" || ' @ ' || g."homeTeamName" as matchup,
           p."pickType", p.selection, p.line, p.odds, p.confidence, p."edgeScore",
           p."isPublished", p."noBet", p.reasoning, p."factorBreakdown"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY p."isPublished" DESC, g."commenceTime" ASC;
""")
picks = cur.fetchall()
print(f"\nWeek 6 picks total={len(picks)}:")
for p in picks:
    fb = p[11]
    has_injury = fb.get('injuryEvidence') is not None if fb else False
    has_continuity = fb.get('continuityDeltas') is not None if fb else False
    reasoning_len = len(p[10]) if p[10] else 0
    print(f"  ID: {p[0]} | Game: {p[2]} | Type: {p[3]} | Selection: {p[4]} | EdgeScore: {p[8]} | Pub: {p[9]} | noBet: {p[10]} | ReasoningLen: {reasoning_len} | HasInj: {has_injury} | HasCont: {has_continuity}")

cur.close()
conn.close()
