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
    print(f"\nGame {g[0]}: {g[2]} @ {g[1]} | Commence: {g[3]} | OpenSpread: {g[4]} | OpenTotal: {g[5]}")
    
    cur.execute("""
        SELECT market, selection, spread, total, price, "providerName", "capturedAt"
        FROM odds
        WHERE "gameId" = %s
        ORDER BY market, selection;
    """, (gid,))
    odds = cur.fetchall()
    print(f"  Odds rows: {len(odds)}")
    by_market = {}
    for o in odds:
        m = o[0]
        by_market.setdefault(m, []).append(o)
    for m, rows in by_market.items():
        print(f"    Market {m}: {len(rows)} rows")
        for r in rows[:4]: # print first 4
            print(f"      {r[1]} | spread={r[2]} | total={r[3]} | price={r[4]} | book={r[5]}")

cur.close()
conn.close()
