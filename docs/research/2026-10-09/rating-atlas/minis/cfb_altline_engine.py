#!/usr/bin/env python3
"""
cfb_altline_engine.py — THE EMPIRICAL ALT-LINE PRICING ENGINE (nobody prices CFB
alt ladders from empirical CFB distributions; books use smooth Gaussians).

Method:
  1. Build the EMPIRICAL margin distribution conditional on closing-spread class
     (favorite size), pooled 2023-2025, point-in-time safe (uses close, not future).
  2. Blowout-tax mu-shift: 31+ favorites run +2.84 over the close -> shift mu.
  3. Price the alt-line ladder BOTH ways:
       (a) Gaussian ladder at the close (what books effectively do)
       (b) empirical class distribution with the mu-shift
     The EV deltas at key numbers (3,7,10,14,17,20,21) ARE the edge surface.
  4. Also price TOTALS alt ladders the same way.
stdlib only.
"""
import json, math, statistics, sys
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
from cfb_ppa_model import load_games, load_closes

def norm_cdf(z): return 0.5 * (1 + math.erf(z / math.sqrt(2)))

def main():
    games = load_games(); spine = load_closes(games)
    # also spine totals
    BOOKS = ["DraftKings", "ESPN Bet", "Bovada", "William Hill (New Jersey)", "Caesars Sportsbook (Colorado)"]
    totals = {}
    BL = defaultdict(dict)
    for y in (2023, 2024, 2025, 2026):
        for lr in json.load(open(f"/var/minis/workspace/cfb/data/lines_{y}.json")):
            gid = lr["id"]
            if gid not in games: continue
            for ln in lr.get("lines", []):
                p = ln.get("provider")
                if p in BOOKS and ln.get("overUnder") is not None:
                    cur = BL[p].get(gid)
                    if cur is None or (ln.get("lastUpdate") or "") >= cur.get("ts", ""):
                        BL[p][gid] = ln["overUnder"]
    for gid in games:
        ous = [BL[b][gid] for b in BOOKS if gid in BL[b]]
        if len(ous) >= 2: totals[gid] = statistics.median(ous)

    # ---- 1. empirical margin distributions per spread class (2023-2025 train)
    train = []
    for gid, g in games.items():
        if g["season"] == 2026 or gid not in spine: continue
        resid = (g["homePoints"] - g["awayPoints"]) - spine[gid]
        train.append((spine[gid], float(g["homePoints"] - g["awayPoints"]),
                      float(g["homePoints"] + g["awayPoints"]), resid, totals.get(gid)))
    classes = {"1-6": (1, 7), "7-13": (7, 14), "14-20": (14, 21), "21-30": (21, 31), "31+": (31, 99)}
    emp = {}
    for cname, (lo, hi) in classes.items():
        rows = [(sp, m, r) for sp, m, _, r, _ in train if lo <= abs(sp) < hi]
        emp[cname] = {"n": len(rows),
                      "mu_shift": statistics.mean([r for _, _, r in rows]) if rows else 0.0,
                      "margins": [m for _, m, _ in rows],
                      "resids": [r for _, _, r in rows]}
    print("[EMPIRICAL MARGIN DISTRIBUTIONS by closing-spread class (2023-2025)]")
    for c, d in emp.items():
        print(f"   {c:>6}: n={d['n']:>4}  resid mean {d['mu_shift']:>+.2f}")

    # ---- 2+3. RESIDUAL ladder: empirical P(resid > t) vs N(0,15.15) — the honest
    # key-cluster test (per-game close held fixed; within-class close variation removed)
    print("\n[RESIDUAL LADDER — empirical vs N(0,15.15): where the smooth ladder is WRONG]")
    all_res = [r for d in emp.values() for r in d["resids"]]
    for t, label in ((-0.5, "fav −0.5 (bare cover)"), (2.5, "fav +2.5 past close"),
                     (3.5, "fav +3.5"), (6.5, "fav +6.5"), (10.5, "fav +10.5"),
                     (-3.5, "fav −3.5 (dog side)"), (-7.5, "fav −7.5")):
        p_g = 1 - norm_cdf(t / 15.15)
        p_e = sum(1 for r in all_res if r > t) / len(all_res)
        print(f"   {label:<26}: gauss {p_g:.3f} | empirical {p_e:.3f} ({p_e-p_g:+.3f})  n={len(all_res)}")

    print("\n[BY CLASS — residual mean and sd (the blowout tax + fat tails)]")
    for cname in ("1-6", "7-13", "14-20", "21-30", "31+"):
        d = emp[cname]
        if d["n"] < 30: continue
        rs = d["resids"]
        print(f"   {cname:>6}: mean {d['mu_shift']:>+.2f}  sd {statistics.stdev(rs):>5.2f}  n={d['n']}")

    # ---- 4. totals alt ladder (fixed unpacking)
    print("\n[TOTALS ALT LADDER: Gaussian vs empirical]")
    tr = [(tt, ot) for sp, m, tt, r, ot in train if ot is not None]
    res_t = [t - o for t, o in tr]
    mu_t, sd_t = statistics.mean(res_t), statistics.stdev(res_t)
    print(f"   total resid: mean {mu_t:+.2f} sigma {sd_t:.2f} (n={len(tr)})")
    base = statistics.median([o for _, o in tr])
    tot_vals = [t for t, _ in tr]
    for off in (-7, -3.5, 3.5, 7):
        alt = base + off
        p_g = 1 - norm_cdf((alt - (base + mu_t)) / sd_t)
        p_e = sum(1 for t in tot_vals if t > alt) / len(tot_vals)
        print(f"   alt {alt:>6.1f} ({off:+.1f}): gauss-over {p_g:.3f} | emp {p_e:.3f} ({p_e-p_g:+.3f})")

    print("\n[USAGE] These deltas are the edge SURFACE map. Converting to prices needs the")
    print("        book's alt-line odds (DK 13195/13196 subcategories) -> next lane w/ browser.")
    print("[DOCTRINE] diagnostic until the walk-forward gate clears; nothing here touches mu.")

if __name__ == "__main__":
    main()
