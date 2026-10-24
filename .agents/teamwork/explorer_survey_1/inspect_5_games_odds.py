import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# The 5 games
games_info = [
    ("NO@NYG", "cmt4fewko00gieat56ic5u7jf"),
    ("TEN@IND", "cmt4fewkd00geeat523o50d5p"),
    ("PIT@TB", "cmt4fewkt00gkeat56ofx8wb5"),
    ("DAL@GB", "cmt4fewlc00gteat5pomz642j"),
    ("BAL@CLE", "cmqfv6aix0047mk73yc2c0tm3"),
]

for name, gid in games_info:
    print(f"\n==================== {name} (ID: {gid}) ====================")
    cur.execute("""
        SELECT "homeTeamName", "awayTeamName", "commenceTime", status, "openingSpread", "openingTotal",
               "restDaysHome", "restDaysAway"
        FROM games WHERE id = %s;
    """, (gid,))
    g = cur.fetchone()
    print(f"Matchup: {g[1]} @ {g[0]} | Kickoff: {g[2]} | Rest: Home={g[6]}, Away={g[7]}")
    print(f"Opening Spread: {g[4]}, Opening Total: {g[5]}")

    # Opening lines table
    cur.execute('SELECT market, spread, total, "homePrice", "awayPrice" FROM opening_lines WHERE "gameId" = %s;', (gid,))
    print("OpeningLines table:")
    for ol in cur.fetchall():
        print(f"  {ol[0]}: spread={ol[1]}, total={ol[2]}, homePrice={ol[3]}, awayPrice={ol[4]}")

    # Latest odds summary by market
    cur.execute("""
        SELECT market, count(*), 
               avg(spread) as avg_spread, avg(total) as avg_total,
               avg("homePrice") as avg_home_ml, avg("awayPrice") as avg_away_ml,
               min("homePrice") as min_hml, max("homePrice") as max_hml,
               min("awayPrice") as min_aml, max("awayPrice") as max_aml
        FROM odds
        WHERE "gameId" = %s
        GROUP BY market;
    """, (gid,))
    print("Odds table summary:")
    for o in cur.fetchall():
        print(f"  Market: {o[0]} | count: {o[1]} | avgSpread: {o[2]} | avgTotal: {o[3]} | avgHomeML: {o[4]} | avgAwayML: {o[5]}")

    # Check distinct bookmakers
    cur.execute('SELECT DISTINCT bookmaker FROM odds WHERE "gameId" = %s;', (gid,))
    books = [b[0] for b in cur.fetchall()]
    print(f"Bookmakers ({len(books)}): {', '.join(books[:10])}")

cur.close()
conn.close()
