import psycopg2
import json

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."gameId", p."pickType", p.selection, p.line, p.confidence, p."edgeScore",
           p."isPublished", p.result, p.tier, p.reasoning, p."factorBreakdown",
           g."homeTeamName", g."awayTeamName", g."commenceTime"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY g."commenceTime" ASC, p.id ASC;
""")
all_week6_picks = cur.fetchall()
print(f"Total Week 6 picks in DB (published + unpublished): {len(all_week6_picks)}")

by_game = {}
for p in all_week6_picks:
    matchup = f"{p[13]} @ {p[12]}"
    if matchup not in by_game:
        by_game[matchup] = []
    by_game[matchup].append(p)

for matchup, plist in by_game.items():
    print(f"\nMatchup: {matchup} (Total picks: {len(plist)})")
    for p in plist:
        fb_obj = p[11] if isinstance(p[11], dict) else json.loads(p[11]) if p[11] else {}
        ind_edge = fb_obj.get("independentEdge", {})
        dec = ind_edge.get("decision") if isinstance(ind_edge, dict) else None
        print(f"  ID: {p[0]} | {p[2]} {p[3]} (Line: {p[4]}) | Pub: {p[7]} | Conf: {p[5]} | Edge: {p[6]} | Dec: {dec}")

cur.close()
conn.close()
