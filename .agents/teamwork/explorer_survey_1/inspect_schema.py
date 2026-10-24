import psycopg2
import json

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"

conn = psycopg2.connect(URL)
cur = conn.cursor()

# Get all tables
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
""")
tables = [row[0] for row in cur.fetchall()]
print(f"Total tables: {len(tables)}")
print("Tables:", tables)

# Check columns for game/games, team_game_log/TeamGameLog, pick/picks
for target in ["game", "games", "Game", "team_game_log", "team_game_logs", "TeamGameLog", "pick", "picks", "Pick"]:
    if target in tables:
        cur.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{target}'
            ORDER BY ordinal_position;
        """)
        cols = cur.fetchall()
        print(f"\n--- Columns in {target} ({len(cols)} cols) ---")
        for col_name, dtype in cols:
            print(f"  {col_name}: {dtype}")

cur.close()
conn.close()
