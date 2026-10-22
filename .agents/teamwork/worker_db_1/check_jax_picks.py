import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."gameId", g."awayTeamName" || ' @ ' || g."homeTeamName" as matchup,
           p."pickType", p.selection, p."edgeScore", p.confidence, p.reasoning
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE p."isPublished" = true
      AND g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g.id = 'cmqfv6aio0043mk734dgvw0zu';
""")
rows = cur.fetchall()
print(f"HOU @ JAX published picks: {len(rows)}")
for r in rows:
    print(r)

cur.close()
conn.close()
