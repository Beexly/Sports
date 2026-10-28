"""Measure how long a cf_clearance actually survives. Replaces the 25-minute guess.

Solves once, then polls a cheap URL every 60 s until the wall returns. Records the
real lifetime and whether it dies by time or by IP.
"""
import json, sys, time
sys.path.insert(0, "C:/Users/Garrett/Sports/intelligence")
from ingestion import wall_clear as wc

URL = "https://www.pro-football-reference.com/years/2025/"
POLL = 90
MAX_MIN = 45

rec = wc.solve(URL)
print(f"solved at {rec['solved_at']} cookies={len(rec['cookies'])} ip={rec.get('ip')}", flush=True)
ip0 = rec.get("ip")
t0 = time.time()
out = {"solved_at": rec["solved_at"], "ip_at_solve": ip0, "polls": []}

while (time.time() - t0) / 60 < MAX_MIN:
    time.sleep(POLL)
    mins = round((time.time() - t0) / 60, 1)
    try:
        r = wc.fetch(URL, ttl=10 ** 9, max_solves=0)   # never re-solve; just replay
        # 429 is throttling, not expiry. Only 403 / interstitial means the clearance died.
        throttled = r.status_code == 429
        alive = (r.status_code == 200 and not wc.is_interstitial(r.text)) or throttled
    except Exception as e:
        alive, throttled, r = False, False, None
    ip = wc.egress_ip()
    out["polls"].append({"min": mins, "alive": alive, "throttled": throttled,
                         "status": getattr(r, "status_code", None), "ip": ip})
    print(f"t={mins:>5}m alive={alive} throttled={throttled} status={getattr(r,'status_code',None)}", flush=True)
    if not alive:
        out["died_after_min"] = mins
        out["ip_changed"] = ip != ip0
        out["died_by"] = "403/interstitial"
        break

json.dump(out, open("C:/Users/Garrett/Sports/artifacts/cf-clearance-ttl-2026-10-28.json", "w"), indent=1)
print("RESULT", json.dumps({k: v for k, v in out.items() if k != "polls"}))
