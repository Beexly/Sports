import subprocess
import psycopg2

def get_dev_conn_str():
    cmd = ['npx', 'neonctl', 'connection-string', 'dev-cv-watch-2026-10', '--project-id', 'summer-brook-99380762', '--org-id', 'org-floral-star-55015944', '--role-name', 'neondb_owner']
    res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    for line in res.stdout.splitlines():
        if line.startswith('postgresql://'):
            return line.strip()
    raise RuntimeError(f"Could not get connection string: {res.stdout} {res.stderr}")

def apply_schema():
    conn_str = get_dev_conn_str()
    print("[*] Connecting to Neon branch: dev-cv-watch-2026-10 ...")
    
    with open('packages/prediction-engine/src/watch/watch-schema.sql', 'r', encoding='utf-8') as f:
        ddl = f.read()

    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    with conn.cursor() as cur:
        print("[*] Executing watch-schema.sql ...")
        cur.execute(ddl)
        print("[+] Schema watch.* created successfully!")
        
        # Step 2 Proof query before insert
        cur.execute("SELECT COUNT(*) FROM watch.games;")
        count_before = cur.fetchone()[0]
        print(f"[PROOF 1] SELECT COUNT(*) FROM watch.games = {count_before}")
        
    conn.close()

if __name__ == '__main__':
    apply_schema()
