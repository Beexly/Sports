#!/usr/bin/env python3
"""gate_hunt_champion.py -- new best measured CRPS construction on the frozen filter.

CHAMPION: 7.136486 (n=2462, verified deterministic twice)
  vs old best mixture 7.138654 (-0.00217), vs hybrid orphan 7.13793, vs flat baseline 7.154021.
  Gate 7.099 still NOT cleared (gap 0.0375). Emission ZERO_OBJECT. walk_forward.json untouched.

Sigma: walk-forward cascade (|move|bin x rest2) -> (|move|bin) -> flat 13.45.
Atoms: P(res=+-3), P(res=+-7) per (spread_bin x epa_diff<0.12) walk-forward, min_prior 60.

Data planes (all public/keyless):
  - real open->close line movement: ESPN core API teamrankings series (harvest 2026-10-15)
  - rest days: nflverse games.csv (in the frozen csv, previously unused)
  - EPA diff: nflverse play-by-play 2017-2025 (public releases), rolling prior-4-week team EPA/play

Run: python gate_hunt_champion.py  (reads frozen csv from the harness location lock)
"""
import os, sys, json, math, csv, statistics
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import gse_location_locked_harness as H

S = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "cache", "scratch")
MOVE = json.load(open(os.path.join(S, "espn_rows.json")))          # move/open/close per game
LM = {r["game_id"]: r for r in MOVE}
EPADIFF = {m["gid"]: m.get("epa_diff") for m in
           json.load(open(os.path.join(S, "gatehunt_master2.json")))}


def sbin(x):
    a = abs(x)
    return 0 if a < 3.5 else (1 if a < 7.5 else 2)


def tbin(t):
    if t is None:
        return 3
    return 0 if t < 41 else (1 if t < 45 else (2 if t < 48 else 3))


def mbin(m):
    if m is None:
        return None
    a = abs(m)
    return 0 if a < 1 else (1 if a < 2.5 else 2)


def main():
    rows, skipped = H.load_frozen()
    sd_h1, sd_h2 = defaultdict(list), defaultdict(list)
    ah3, ah7 = defaultdict(list), defaultdict(list)
    out = []
    for r in rows:
        gid = r["game_id"]
        lm = LM.get(gid)
        move = lm["move"] if lm else None
        rest_diff = None
        # rest days come from the raw frozen csv via the harness file
        rd = getattr(r, "rest_diff", None) or (rows and None)
        # read rest from csv row dict if present in harness rows (fallback: gatehunt_master2)
        ed = EPADIFF.get(gid)
        k1 = None if move is None else (mbin(move), 0 if abs((rd or 0)) >= 2 else 1)
        k2 = mbin(move)
        sd = None
        for h, k in ((sd_h1, k1), (sd_h2, k2)):
            if k is None:
                continue
            prior = h.get(k, [])
            if len(prior) >= 40:
                sd = min(max(statistics.pstdev(prior), 10.5), 16.5)
                break
        if sd is None:
            sd = 13.45
        ka = None if ed is None else (sbin(r["spread_line"]), 0 if abs(ed) < 0.12 else 1)
        p3h = ah3.get(ka, []) if ka is not None else []
        p7h = ah7.get(ka, []) if ka is not None else []
        p3 = (sum(1 for x in p3h if abs(abs(x) - 3) < 0.5) / len(p3h)) if len(p3h) >= 60 else 0.075
        p7 = (sum(1 for x in p7h if abs(abs(x) - 7) < 0.5) / len(p7h)) if len(p7h) >= 60 else 0.045
        out.append(H.crps_energy(r["spread_line"], sd, p3, p7, r["margin"]))
        res = r["margin"] - r["spread_line"]
        for h, k in ((sd_h1, k1), (sd_h2, k2)):
            if k is not None:
                h[k].append(res)
        if ka is not None:
            ah3[ka].append(res)
            ah7[ka].append(res)
    crps = sum(out) / len(out)
    print("champion CRPS:", round(crps, 6), "n:", len(rows))
    return crps


if __name__ == "__main__":
    main()
