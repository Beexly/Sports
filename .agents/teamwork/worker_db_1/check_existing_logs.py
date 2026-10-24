import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT tgl.id, tgl."teamName", tgl."opponentName", tgl."isHome", tgl."gameDate",
           tgl."teamScore", tgl."opponentScore", tgl.result, tgl.spread, tgl."atsResult",
           g."homeTeamName", g."awayTeamName", g."openingSpread"
    FROM team_game_logs tgl
    JOIN games g ON tgl."gameId" = g.id
    WHERE tgl.sport = 'americanfootball_nfl'
    ORDER BY tgl."gameDate" DESC
    LIMIT 10;
""")
rows = cur.fetchall()
print("Existing team_game_logs samples:")
for r in rows:
    print(r)

cur.close()
conn.close()
