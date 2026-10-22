import os
import re
from urllib.parse import urlparse

db_url = ""
with open("apps/web/.env.local", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if db_url:
    p = urlparse(db_url)
    print("Database Host:", p.hostname)
    print("Database Name:", p.path.strip("/"))
    print("Port:", p.port)
    print("Is Neon:", "neon.tech" in (p.hostname or ""))
else:
    print("DATABASE_URL not found")
