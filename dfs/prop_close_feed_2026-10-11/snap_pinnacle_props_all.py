"""Pinnacle guest (keyless) NFL player-prop snapshot — ALL player-prop markets (ingest everything).
Same authorized lane as dfs/prop_close_feed_2026-10-11/snap_pinnacle_props.py (books_api.py pattern).
Keyless, no credential, no browser. Started games excluded. Rows exactly as returned. DIAGNOSTIC only.
"""
import json, os, sys, hashlib, urllib.request
from datetime import datetime, timezone

ROOT = r"C:\Users\Garrett\Sports-wt-rating-packet"
HERE = os.path.join(ROOT, "dfs", "prop_close_feed_2026-10-11")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "application/json"}
BASE = "https://guest.api.arcadia.pinnacle.com/0.1/leagues/889"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        b = r.read()
    return json.loads(b.decode()), hashlib.sha256(b).hexdigest()[:16]


def main():
    now = datetime.now(timezone.utc)
    obs = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    mts, s1 = get(f"{BASE}/matchups")
    mks, s2 = get(f"{BASE}/markets/straight")
    by_id = {m["id"]: m for m in mts}
    rows, skipped_started, descs = [], 0, {}
    for mk in mks:
        m = by_id.get(mk.get("matchupId"))
        if not m or m.get("type") != "special":
            continue
        sp = m.get("special") or {}
        if sp.get("category") != "Player Props":
            continue
        desc = sp.get("description") or ""
        par = m.get("parent") or {}
        start = par.get("startTime") or m.get("startTime")
        st = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
        if st is None or st <= now:
            skipped_started += 1
            continue
        names = {p["id"]: p.get("name") for p in m.get("participants") or []}
        teams = {p.get("alignment"): p.get("name") for p in par.get("participants") or []}
        descs[desc] = descs.get(desc, 0) + 1
        for pr in mk.get("prices") or []:
            rows.append({"observed_at": obs, "matchup_id": m["id"], "description": desc,
                         "side": names.get(pr.get("participantId")), "points": pr.get("points"),
                         "price_american": pr.get("price"), "home": teams.get("home"), "away": teams.get("away"),
                         "kickoff_utc": start, "minutes_to_kickoff": round((st - now).total_seconds() / 60, 1),
                         "period": mk.get("period"), "mk_type": mk.get("type"), "is_alt": mk.get("isAlternate")})
    out = {"observed_at": obs, "source_urls": [f"{BASE}/matchups", f"{BASE}/markets/straight"],
           "source_sha16": {"matchups": s1, "markets": s2}, "n_rows": len(rows),
           "n_props": len({r["matchup_id"] for r in rows}), "n_skipped_started": skipped_started,
           "close_status": "PRE-CLOSE SNAPSHOT — not a close unless minutes_to_kickoff is ~0",
           "rows": rows, "label": "DIAGNOSTIC — market snapshot, no residual"}
    fn = os.path.join(HERE, f"pinnacle_props_all_{now.strftime('%Y%m%dT%H%MZ')}.json")
    json.dump(out, open(fn, "w", encoding="utf-8"), indent=0)
    print(json.dumps({"file": fn, "n_rows": len(rows), "n_props": out["n_props"], "skipped_started": skipped_started}))
    for d, n in sorted(descs.items())[:12]:
        print("DESC", d)


if __name__ == "__main__":
    main()
