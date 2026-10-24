import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

cur.execute("SELECT id, key, name FROM sports;")
for row in cur.fetchall():
    print(row)

cur.execute("""
    SELECT DISTINCT g."sportId", s.key, s.name, count(*)
    FROM games g
    LEFT JOIN sports s ON g."sportId" = s.id
    GROUP BY g."sportId", s.key, s.name;
""")
print("\nGames by sportId:")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
