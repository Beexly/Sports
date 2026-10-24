import psycopg2
import json

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

ids = [
    'cmt4ffet008xzeat5r0j6sgjf', # NO@NYG
    'cmt4ffert08xteat5hf9rpsqd', # TEN@IND
    'cmvcqdphc00e645ukzeniy5tt', # PIT@TB
    'cmt4ffevb08ybeat5dx8rs01s', # DAL@GB
]

for pid in ids:
    cur.execute('SELECT id, selection, line, confidence, "edgeScore", "isPublished", reasoning FROM picks WHERE id = %s;', (pid,))
    r = cur.fetchone()
    print(f"\nID: {r[0]} | Sel: {r[1]} {r[2]} | Pub: {r[5]} | Conf: {r[3]} | Edge: {r[4]}")
    print(f"Reasoning: {r[6]}")

cur.close()
conn.close()
