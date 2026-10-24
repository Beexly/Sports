import psycopg2
from dotenv import dotenv_values

config = dotenv_values('.env.production.local')
db_url = config.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

enum_types = ['PickType', 'PickTier', 'PickGrade', 'RiskLevel', 'PickResult', 'GameLogResult', 'AtsResult']
for et in enum_types:
    cur.execute("""
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = %s
        ORDER BY e.enumsortorder;
    """, (et,))
    vals = [r[0] for r in cur.fetchall()]
    print(f"Enum {et}: {vals}")

cur.close()
conn.close()
