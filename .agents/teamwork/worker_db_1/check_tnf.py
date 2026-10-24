import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT p.id, p."gameId", p.result, p.selection, p."edgeScore", p.confidence, p.reasoning
    FROM picks p
    WHERE p.id = 'cmv60xxqc0001qwg9ckumy2hp';
""")
print("TNF pick:", cur.fetchone())

cur.close()
conn.close()
