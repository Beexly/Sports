import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT count(*) 
    FROM picks 
    WHERE "factorBreakdown" ? 'noBet';
""")
print("Picks with noBet in factorBreakdown:", cur.fetchone()[0])

cur.execute("""
    SELECT "factorBreakdown"->'noBet'
    FROM picks 
    WHERE "factorBreakdown" ? 'noBet'
    LIMIT 5;
""")
print("Samples of factorBreakdown->noBet:", cur.fetchall())

cur.close()
conn.close()
