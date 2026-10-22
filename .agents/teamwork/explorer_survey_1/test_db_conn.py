import os
import psycopg2
from urllib.parse import urlparse

def test_url(name, url):
    if not url:
        print(f"{name}: not set")
        return False
    # parse url
    try:
        # For psycopg2 with channel_binding=require, remove channel_binding if psycopg2 doesn't like it or keep sslmode=require
        conn_str = url
        # Clean params if needed
        print(f"Testing {name}...")
        conn = psycopg2.connect(conn_str, connect_timeout=10)
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user, version();")
        res = cur.fetchone()
        print(f"SUCCESS {name}: db={res[0]}, user={res[1]}, version={res[2][:30]}")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"FAILED {name}: {e}")
        return False

# Read from .env.production.local and .env.local
envs = {}
for env_file in [".env.local", ".env.production.local"]:
    full_path = os.path.join("c:\\Users\\Garrett\\Sports", env_file)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    v = v.strip('"').strip("'")
                    envs[f"{env_file}:{k}"] = v

print("Found env variables:", [k for k in envs.keys() if "DATABASE_URL" in k or "POSTGRES" in k])

for k, v in list(envs.items()):
    if "DATABASE_URL" in k or "POSTGRES_URL" in k or "DIRECT_URL" in k:
        test_url(k, v)
