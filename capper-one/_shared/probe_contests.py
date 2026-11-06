#!/usr/bin/env python3
"""Find more contest ids around the ones already known.

The id space is data-derived, not guessed: ids came out of archived pages, and the neighbours of a
real contest are real contests. Unknown ids answer 200 with an empty array, which is the oracle.

Walk outward from each seed, keep ids that return rows, and stop a direction after a run of empty
answers so a dead band does not cost the whole budget.

Usage: python3 _shared/probe_contests.py --seeds 42588212,42928458 [--radius 200] [--out file.json]
"""
import argparse
import concurrent.futures as cf
import json
import time
import urllib.request

UA = "GSE-CompetitiveIntel/1.0 (+https://github.com/Beexly/Sports)"
BASE = "https://www.fantasylabs.com/api/contests/usernames/5/"
GAP = 15


def count(cid):
    req = urllib.request.Request(BASE + str(cid), headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                body = r.read()
            try:
                return cid, len(json.loads(body))
            except Exception:
                return cid, 0
        except Exception:
            if attempt == 2:
                return cid, -1
            time.sleep(2 + attempt * 3)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", required=True)
    ap.add_argument("--radius", type=int, default=200)
    ap.add_argument("--out", default="C:/Users/Garrett/AppData/Local/hermes/cache/scratch/contest_ids.json")
    a = ap.parse_args()

    seeds = [int(x) for x in a.seeds.split(",")]
    candidates = set()
    for s in seeds:
        for d in range(-a.radius, a.radius + 1):
            if d:
                candidates.add(s + d)
    print(f"{len(candidates)} candidates around {len(seeds)} seed(s)", flush=True)

    hits, gap = {}, {s: 0 for s in seeds}
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for cid, n in pool.map(count, sorted(candidates)):
            if n > 0:
                hits[cid] = n
                print(f"  {cid}: {n} rows", flush=True)
    print(f"found {len(hits)} id(s) with rows", flush=True)
    with open(a.out, "w") as fh:
        json.dump({"seeds": seeds, "radius": a.radius, "hits": hits}, fh, indent=1)
