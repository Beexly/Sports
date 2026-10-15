#!/usr/bin/env python3
"""capture_loop.py -- repeated market captures so line MOVEMENT becomes measurable.

WHY THIS EXISTS
CLV and line movement were previously unmeasurable: the archived Pinnacle
snapshots contain 911 unique matchupIds and ZERO appear at two timestamps, so no
movement could ever be computed. This loop creates those pairs.

DESIGN
- Captures every INTERVAL_MIN minutes for DURATION_MIN minutes.
- Skips a capture if a snapshot for the same event already exists within
  MIN_GAP_MIN minutes, so repeated runs do not pile up redundant files.
- Append-only. Never modifies the gate file or any repo file.
- Exits cleanly on Ctrl-C; partial data is kept.

Run in background:
    python scripts/capture_loop.py --interval 20 --duration 240
"""
import argparse
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
CAPTURE = os.path.join(HERE, "capture_market.py")
MARKET_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "market",
)


def newest_snapshot_age_min():
    if not os.path.isdir(MARKET_DIR):
        return None
    files = [f for f in os.listdir(MARKET_DIR) if f.startswith("espn_")]
    if not files:
        return None
    newest = max(files, key=lambda f: os.path.getmtime(os.path.join(MARKET_DIR, f)))
    age = (time.time() - os.path.getmtime(os.path.join(MARKET_DIR, newest))) / 60.0
    return age


def count_games_tracked():
    """How many distinct event_ids appear in more than one snapshot?"""
    if not os.path.isdir(MARKET_DIR):
        return 0, 0
    seen = {}
    for f in os.listdir(MARKET_DIR):
        if not f.startswith("espn_"):
            continue
        try:
            rows = json.load(open(os.path.join(MARKET_DIR, f), encoding="utf-8"))
        except Exception:
            continue
        for r in rows:
            eid = r.get("event_id")
            if eid:
                seen.setdefault(eid, set()).add(f)
    multi = sum(1 for v in seen.values() if len(v) > 1)
    return len(seen), multi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=int, default=20, help="minutes between captures")
    ap.add_argument("--duration", type=int, default=240, help="total minutes to run")
    ap.add_argument("--min-gap", type=int, default=10,
                    help="skip if newest snapshot is younger than this")
    args = ap.parse_args()

    deadline = time.time() + args.duration * 60
    n = 0
    print("capture_loop: every %d min for %d min (min-gap %d min)"
          % (args.interval, args.duration, args.min_gap))
    while time.time() < deadline:
        age = newest_snapshot_age_min()
        if age is not None and age < args.min_gap:
            print("  skip: newest snapshot is %.1f min old" % age)
        else:
            n += 1
            print("--- capture %d at %s ---"
                  % (n, time.strftime("%Y-%m-%d %H:%M:%S")))
            rc = subprocess.call([sys.executable, CAPTURE])
            if rc != 0:
                print("  capture failed rc=%d" % rc)
            tot, multi = count_games_tracked()
            print("  events seen: %d   with >1 timestamp: %d" % (tot, multi))
        remaining = deadline - time.time()
        if remaining <= 0:
            break
        time.sleep(min(args.interval * 60, remaining))

    tot, multi = count_games_tracked()
    print()
    print("done. %d captures. %d distinct events, %d with more than one timestamp."
          % (n, tot, multi))
    if multi:
        print("=> line movement IS now measurable for %d games." % multi)
    else:
        print("=> still no repeated event; run longer or check the board.")


if __name__ == "__main__":
    main()
