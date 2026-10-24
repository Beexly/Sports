import psycopg2
from dotenv import dotenv_values
import json

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

remaining_game_ids = [
    'cmt4fewko00gieat56ic5u7jf', # NO @ NYG
    'cmt4fewkd00geeat523o50d5p', # TEN @ IND
    'cmt4fewkt00gkeat56ofx8wb5', # PIT @ TB
    'cmt4fewlc00gteat5pomz642j', # DAL @ GB
    'cmqfv6aix0047mk73yc2c0tm3', # BAL @ CLE
]

for gid in remaining_game_ids:
    cur.execute("""
        SELECT id, "homeTeamName", "awayTeamName", "commenceTime", "openingSpread", "openingTotal"
        FROM games WHERE id = %s;
    """, (gid,))
    g = cur.fetchone()
    print(f"\n=======================================================")
    print(f"GAME: {g[2]} @ {g[1]} (id={g[0]}) | Commence: {g[3]}")
    print(f"OpeningSpread: {g[4]} | OpeningTotal: {g[5]}")

    # Check existing picks
    cur.execute("""
        SELECT id, "pickType", selection, line, confidence, "edgeScore", "isPublished", reasoning, "factorBreakdown"
        FROM picks
        WHERE "gameId" = %s;
    """, (gid,))
    picks = cur.fetchall()
    print(f"Existing picks in DB ({len(picks)}):")
    for p in picks:
        fb = p[8] or {}
        print(f"  pick {p[0]}: {p[1]} {p[2]} | line={p[3]} | conf={p[4]} | edgeScore={p[5]} | isPub={p[6]} | reasoningLen={len(p[7] or '')}")
        print(f"    fb: {fb.get('independentEdge')}")

    # Check odds summary
    cur.execute("""
        SELECT market, 
               avg(spread) as avg_spd, 
               avg("homeSpreadPrice") as avg_hspd_pr, avg("awaySpreadPrice") as avg_aspd_pr,
               avg(total) as avg_tot, 
               avg("overPrice") as avg_ov_pr, avg("underPrice") as avg_un_pr,
               avg("homePrice") as avg_h_pr, avg("awayPrice") as avg_a_pr,
               count(*) as cnt
        FROM odds
        WHERE "gameId" = %s
        GROUP BY market;
    """, (gid,))
    odds = cur.fetchall()
    print("Market odds summary:")
    for o in odds:
        print(f"  Market: {o[0]} (count={o[9]}):")
        if o[1] is not None:
            print(f"    Spread: {o[1]} | HomePr: {o[2]} | AwayPr: {o[3]}")
        if o[4] is not None:
            print(f"    Total: {o[4]} | OverPr: {o[5]} | UnderPr: {o[6]}")
        if o[7] is not None:
            print(f"    Moneyline: HomePr: {o[7]} | AwayPr: {o[8]}")

cur.close()
conn.close()
