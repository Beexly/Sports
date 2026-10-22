import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."pickType", p.selection, p."generatedAt", p."dataFreshnessAt", p."isPublished",
           g."commenceTime", g."homeTeamName", g."awayTeamName"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE p."isPublished" = true
      AND g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15';
""")
rows = cur.fetchall()
print(f"Published Week 6 picks count: {len(rows)}")
for r in rows:
    print(r)

cur.close()
conn.close()
