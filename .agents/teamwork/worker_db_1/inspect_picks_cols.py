import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'picks'
    ORDER BY ordinal_position;
""")
cols = cur.fetchall()
print("Picks columns:")
for c in cols:
    print(f"  {c[0]} ({c[1]})")

cur.close()
conn.close()
