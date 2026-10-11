"""Keyless DK DFS pool pull for one draft group (getavailableplayers lane, measured OPEN 2026-10-10)."""
import json, sys, hashlib, urllib.request
from datetime import datetime, timezone

dg = sys.argv[1]
out = sys.argv[2]
url = f"https://www.draftkings.com/lineup/getavailableplayers?draftGroupId={dg}"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
      "Accept": "application/json"}
with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
    b = r.read()
    status = r.status
d = json.loads(b.decode())
obs = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
env = {"observed_at": obs, "source_url": url, "http_status": status,
       "raw_sha16": hashlib.sha256(b).hexdigest()[:16], "draft_group": int(dg),
       "label": "DIAGNOSTIC — DFS pool snapshot", **d}
json.dump(env, open(out, "w", encoding="utf-8"))
pl = d.get("playerList") or []
print(json.dumps({"status": status, "players": len(pl), "keys": sorted(pl[0])[:40] if pl else None, "raw_sha16": env["raw_sha16"], "obs": obs}))
if pl:
    print(json.dumps(pl[0])[:700])
