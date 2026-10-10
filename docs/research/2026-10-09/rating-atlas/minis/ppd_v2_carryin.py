#!/usr/bin/env python3
"""
ppd_v2_carryin.py — PPD v2: hierarchical carry-in. The pooled-PPD refusal's
documented fix: weeks 1-3 use PRIOR-SEASON final PPD as the prior with shrinkage
k=20 (same machinery as the leverage coarse-bin retest). Then re-pool.
ep_hat(team, week) = (pts + k*prior) / (drives + k); prior = prior-season final PPD.
"""
import json, statistics, sys, math
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
sys.path.insert(0, "/var/minis/workspace/cfb")
from cfb_ppa_model import load_games, load_closes
from doctrine import KillLedger

SIG = 15.15
K = 20

def crps_g(mu, sig, x):
    z = (x - mu) / sig
    return sig * (z * (2 * 0.5 * (1 + math.erf(z / math.sqrt(2))) - 1)
                  + 2 * math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi) - 1 / math.sqrt(math.pi))

def build(games):
    gid_meta = {g["id"]: (g["season"], g["week"]) for g in games.values()}
    gw = defaultdict(lambda: [0, 0])
    for y in (2023, 2024, 2025, 2026):
        try:
            dr = json.load(open(f"/var/minis/workspace/cfb/data/cfb_drives_{y}.json"))
        except FileNotFoundError:
            continue
        for d in dr:
            meta = gid_meta.get(d["gameId"])
            if not meta or meta[0] != y: continue
            key = (d["offense"], y, d["gameId"])
            gw[key][0] += max(0, (d.get("endOffenseScore") or 0) - (d.get("startOffenseScore") or 0))
            gw[key][1] += 1
    per_ts = defaultdict(list)
    for (t, y, gid), (pts, n) in gw.items():
        per_ts[(t, y)].append((gid_meta[gid][1], pts / max(1, n)))
    for k in per_ts: per_ts[k].sort()
    return per_ts

def main():
    games = load_games(); spine = load_closes(games)
    per_ts = build(games)
    # prior-season final PPD per (team, season)
    final = {}
    for (t, y), lst in per_ts.items():
        if lst: final[(t, y)] = statistics.mean(p for _, p in lst[-3:])  # last-3-games mean
    league_prior = statistics.mean(v for v in final.values()) if final else 2.0

    def prior_ppd(team, season, week):
        """point-in-time PPD with hierarchical carry-in."""
        lst = per_ts.get((team, season), [])
        hist = [(w, p) for w, p in lst if w is not None and w < week]
        if not hist:
            # weeks 1-2: prior season carry-in
            return final.get((team, season - 1), league_prior)
        pts = sum(p for _, p in hist); n = len(hist)
        prior = final.get((team, season - 1), league_prior)
        return (pts + K * prior) / (n + K) if n < 4 else statistics.mean(p for _, p in hist)

    # fit k on 2024-2025 with carry-in
    tr = []
    for gid, g in games.items():
        if g["season"] not in (2024, 2025) or gid not in spine: continue
        hp = prior_ppd(g["homeTeam"], g["season"], g["week"])
        ap = prior_ppd(g["awayTeam"], g["season"], g["week"])
        tr.append((hp - ap, float(g["homePoints"] - g["awayPoints"])))
    db = statistics.mean(x for x, _ in tr); mb = statistics.mean(m for _, m in tr)
    sxx = sum((x - db) ** 2 for x, _ in tr) or 1e-9
    k = sum((x - db) * (m - mb) for x, m in tr) / sxx
    shift = db
    print(f"[FIT v2] k={k:.2f} pts/PPD-diff with carry-in (n={len(tr)})")

    wmap = defaultdict(lambda: ([], [], []))
    for gid, g in games.items():
        if g["season"] != 2026 or g["week"] < 2 or gid not in spine: continue
        hp, ap = prior_ppd(g["homeTeam"], 2026, g["week"]), prior_ppd(g["awayTeam"], 2026, g["week"])
        diff = (hp - ap) - shift
        margin = float(g["homePoints"] - g["awayPoints"])
        c, m_, o = wmap[g["week"]]
        c.append(spine[gid]); m_.append(spine[gid] + k * diff); o.append(margin)
        wmap[g["week"]] = (c, m_, o)
    allc, allm, xs, ys = [], [], [], []
    print(f"\n{'week':>4} | {'n':>4} | {'close CRPS':>10} | {'+PPDv2 CRPS':>11} | {'delta':>8}")
    for w in sorted(wmap):
        cs, ms_, os_ = wmap[w]
        c1 = statistics.mean(crps_g(m, SIG, o) for m, o in zip(cs, os_))
        c2 = statistics.mean(crps_g(m, SIG, o) for m, o in zip(ms_, os_))
        allc += [crps_g(m, SIG, o) for m, o in zip(cs, os_)]
        allm += [crps_g(m, SIG, o) for m, o in zip(ms_, os_)]
        xs += [m - c for m, c in zip(ms_, cs)]
        ys += [o - c for o, c in zip(os_, cs)]
        print(f"{w:>4} | {len(os_):>4} | {c1:>10.4f} | {c2:>11.4f} | {c2-c1:>+8.4f}")
    pc, pm = statistics.mean(allc), statistics.mean(allm)
    xb, yb = statistics.mean(xs), statistics.mean(ys)
    sxx2 = sum((x - xb) ** 2 for x in xs) or 1e-9
    syy2 = sum((y - yb) ** 2 for y in ys) or 1e-9
    r = sum((x - xb) * (y - yb) for x, y in zip(xs, ys)) / math.sqrt(sxx2 * syy2)
    t = r * math.sqrt(len(xs) - 2) / math.sqrt(max(1e-9, 1 - r * r))
    print(f"\nPOOLED v2 n={len(allc)}: close {pc:.4f} vs close+PPDv2 {pm:.4f} "
          f"({'PPDv2 WINS by' if pm < pc else 'close holds by'} {abs(pc-pm):.4f}) | t={t:+.2f} "
          f"-> {'CLEARED' if t >= 1.96 else 'NOT CLEARED'}")
    kl = KillLedger("/var/minis/workspace/cfb/kill_ledger.jsonl")
    kl.record("ppd_v2_carryin", "pooled wks2-6 2026 with hierarchical carry-in k=20",
              f"{pm:.4f} vs close {pc:.4f}, t={t:+.2f}",
              "if CLEARED: promote after CLV n>=10 (rule 9); if NOT: next = blend PPA+PPD or shrinkage k=40")
    print(f"[LEDGER] {len(kl._entries)} entries | chain {kl.verify_chain()}")

if __name__ == "__main__":
    main()
