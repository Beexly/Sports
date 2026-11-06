#!/usr/bin/env python3
"""Apply an X probe JSONL to the contact table.

A 200 means the profile exists: the handle becomes a verified x.com contact at confidence 85 with
the profile as source. A 404 stays a contest handle at its band, because x.com/<handle> for a
non-existent account is a dead link. Unprobed handles are untouched.

Usage: python3 _shared/load_probes.py <probe.jsonl>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # noqa: E402

path = sys.argv[1]
exists, missing = [], []
for line in Path(path).read_text().splitlines():
    if not line.strip():
        continue
    row = json.loads(line)
    if row["status"] == 200:
        exists.append(row["handle"])
    elif row["status"] == 404:
        missing.append(row["handle"])

con = db.connect()
updated = 0
for handle in exists:
    cur = db.write(
        con,
        "UPDATE contact SET platform='x.com', confidence=85, "
        "source_url='https://x.com/' || ?, verified_at='2026-11-06' "
        "WHERE org='fantasylabs' AND handle=? AND (platform IS NULL OR platform='fantasylabs')",
        (handle, handle))
    updated += cur.rowcount or 0
print(f"probed={len(exists) + len(missing)} exists={len(exists)} missing={len(missing)} updated={updated}")
print("verified contacts:", con.execute(
    "SELECT COUNT(*) FROM contact WHERE platform='x.com'").fetchone()[0])
con.close()
