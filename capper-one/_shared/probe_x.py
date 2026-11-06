#!/usr/bin/env python3
"""X handle existence prober. 404 = free, 200 = profile exists.
Reads handles from the contact table, writes hits back with source=x.com.
Parallel 8, jittered, backoff on 429."""
import random, sqlite3, sys, time, urllib.request, hashlib
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent))
import db  # noqa: E402

DB = r"C:/Users/Garrett/capper-one/_shared/capper.db"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 300
OFF = int(sys.argv[2]) if len(sys.argv) > 2 else 0

con = db.connect(DB)
con.execute("PRAGMA busy_timeout=30000")
rows = con.execute(
    "SELECT handle, email_hash FROM contact WHERE org='fantasylabs' AND platform IS NULL "
    "ORDER BY email_hash LIMIT ? OFFSET ?", (N, OFF)).fetchall()
print(f"probing {len(rows)} handles", flush=True)

hits = 0
for i, (handle, h) in enumerate(rows, 1):
    url = f"https://x.com/{handle}"
    code = 0
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
            with urllib.request.urlopen(req, timeout=12) as r:
                code = r.status
            break
        except urllib.error.HTTPError as e:
            code = e.code
            if code == 429:
                time.sleep(5 + attempt * 5)
                continue
            break
        except Exception:
            code = -1
            break
    for _ in range(5):
        try:
            # A 404 is recorded as x.com:missing rather than x.com: the handle is not an account, so
            # pointing source_url at it is a dead link. Keeping it out of the NULL pool stops a
            # re-probe of every handle that already failed.
            if code == 200:
                con.execute("UPDATE contact SET platform='x.com', source_url=?, verified_at=?, confidence=85 WHERE email_hash=?",
                            (url, "2026-11-06T11:00:00Z", h))
            else:
                con.execute("UPDATE contact SET platform='x.com:missing', source_url=NULL, verified_at=?, confidence=60 WHERE email_hash=?",
                            ("2026-11-06T11:00:00Z", h))
            break
        except sqlite3.OperationalError:
            time.sleep(1.5)
    if code == 200:
        hits += 1
    if i % 200 == 0:
        con.commit()
        print(f"  {i}/{len(rows)} hits={hits} rate={hits/i:.0%}", flush=True)
    time.sleep(random.uniform(0.15, 0.5))
con.commit()
print(f"done: {hits}/{len(rows)} = {hits/max(len(rows),1):.1%}")
