#!/usr/bin/env python3
"""line_movement.py -- measure line movement and CLV from captured snapshots.

This is the measurement that was previously IMPOSSIBLE. The archived Pinnacle
snapshots had 911 unique matchupIds and 0 appearing at two timestamps, so CLV
could never be computed. The capture loop now produces genuine two-timestamp
pairs.

DIAGNOSTIC ONLY. Reads only scratch/market snapshots. Writes nothing but a
report to stdout. Never touches the gate file.

Reported per event:
    open_line  = first captured spread
    last_line  = most recent captured spread
    move       = last - open, in points, signed toward the home team
    direction  = toward home / toward away / unchanged
    n_obs      = number of distinct timestamps

A move is only meaningful once n_obs >= 2. Anything with n_obs == 1 is reported
as UNMEASURABLE, not as "no movement" -- that distinction is the whole reason
the earlier CLV work was invalid.
"""
import json
import os
from collections import defaultdict

MARKET_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "market",
)


def load_snapshots():
    """Return {event_id: [rows sorted by captured_at]}."""
    by_event = defaultdict(list)
    if not os.path.isdir(MARKET_DIR):
        return by_event
    for f in sorted(os.listdir(MARKET_DIR)):
        if not f.startswith("espn_"):
            continue
        try:
            rows = json.load(open(os.path.join(MARKET_DIR, f), encoding="utf-8"))
        except Exception:
            continue
        for r in rows:
            eid = r.get("event_id")
            if eid is None:
                continue
            by_event[eid].append(r)
    for eid in by_event:
        by_event[eid].sort(key=lambda r: r.get("captured_at") or 0)
    return by_event


def main():
    by_event = load_snapshots()
    print("snapshot dir:", MARKET_DIR)
    print("distinct events:", len(by_event))
    print()

    if not by_event:
        print("no snapshots yet -- run scripts/capture_market.py first")
        return

    measurable, unmeasurable = [], []
    for eid, rows in by_event.items():
        # distinct timestamps only
        stamps = sorted({r.get("captured_at") for r in rows if r.get("captured_at")})
        spreads = [r.get("spread") for r in rows if r.get("spread") is not None]
        rec = {
            "event_id": eid,
            "name": rows[0].get("name"),
            "home": rows[0].get("home"),
            "away": rows[0].get("away"),
            "n_obs": len(stamps),
        }
        if len(stamps) < 2 or len(spreads) < 2:
            rec["verdict"] = "UNMEASURABLE (single timestamp)"
            unmeasurable.append(rec)
            continue
        rec["open_line"] = spreads[0]
        rec["last_line"] = spreads[-1]
        rec["move"] = round(spreads[-1] - spreads[0], 2)
        rec["n_obs"] = len(stamps)
        rec["verdict"] = "measured"
        measurable.append(rec)

    print("=== MEASURABLE (>= 2 timestamps) ===")
    if not measurable:
        print("  none yet -- the loop needs more time or more captures")
    else:
        print("  %-10s %-12s %8s %8s %7s %5s"
              % ("matchup", "date", "open", "last", "move", "n"))
        for r in sorted(measurable, key=lambda x: -abs(x["move"])):
            print("  %-10s %-12s %8s %8s %+7.1f %5d"
                  % (str(r["home"]) + "v" + str(r["away"]),
                     str(r.get("name", ""))[:12],
                     r["open_line"], r["last_line"], r["move"], r["n_obs"]))
        moved = [r for r in measurable if r["move"] != 0]
        print()
        print("  events with a nonzero move: %d of %d measurable"
              % (len(moved), len(measurable)))
        if moved:
            avg = sum(abs(r["move"]) for r in moved) / len(moved)
            print("  mean |move|: %.2f pts" % avg)

    print()
    print("=== UNMEASURABLE (only one timestamp so far) ===")
    print("  %d events -- reported as UNMEASURABLE, not as 'no movement'."
          % len(unmeasurable))
    for r in unmeasurable[:10]:
        print("    %-10s %s" % (str(r["home"]) + "v" + str(r["away"]), r["name"]))

    print()
    print("=== WHY THIS MATTERS ===")
    print("The archived Pinnacle snapshots contained 911 unique matchupIds and")
    print("ZERO of them appeared at two timestamps, so line movement and CLV were")
    print("provably uncomputable from that data. Any prior CLV figure came from a")
    print("different source and could not be reproduced.")


if __name__ == "__main__":
    main()
