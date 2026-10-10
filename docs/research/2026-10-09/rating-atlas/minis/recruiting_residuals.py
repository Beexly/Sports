#!/usr/bin/env python3
"""
recruiting_residuals.py — recruiting capital, measured the RIGHT way:
residual vs the cross-book closing median (does the CLOSE price talent?).
Raw margin-by-bucket is meaningless (talent gap obviously predicts margin);
the question is whether the close already prices it. Flat residuals across
talent buckets = priced. Slope/trend in residuals = mispricing.
"""
import json, math, statistics, sys
from collections import defaultdict
sys.path.insert(0, "/var/minis/workspace")
from cfb_ppa_model import load_games, load_closes

HERE = "/var/minis/workspace/cfb/data"

def load_talent():
    tal = {}
    for y, f in [(2023, "talent_2023.json"), (2024, "talent_2024.json"),
                 (2025, "talent_2025.json"), (2026, "cfbadv_talent.json")]:
        try:
            for r in json.load(open(f"{HERE}/{f}")):
                tal[(r["team"], r["year"])] = r["talent"]
        except FileNotFoundError:
            pass
    return tal

def bluechip_by_year():
    """team -> class_year -> blue-chip count (stars>=4)."""
    bc = defaultdict(lambda: defaultdict(int))
    for y in (2022, 2023, 2024, 2025, 2026):
        try:
            rows = json.load(open(f"{HERE}/cfbadv_recruiting_players_{y}.json"))
        except FileNotFoundError:
            rows = json.load(open(f"{HERE}/cfbadv_recruiting_players.json")) if y == 2026 else []
        for r in rows:
            if (r.get("stars") or 0) >= 4 and r.get("committedTo"):
                bc[r["committedTo"]][y] += 1
    return bc

def main():
    games = load_games(); spine = load_closes(games)
    tal = load_talent(); bc = bluechip_by_year()
    print(f"[DATA] talent pairs: {len(tal)} | blue-chip teams: {len(bc)}")

    # --- H1: talent gap residual vs close, bucketed
    buck = defaultdict(list)
    resid_gap = []
    for gid, g in games.items():
        if gid not in spine: continue
        th = tal.get((g["homeTeam"], g["season"])); ta = tal.get((g["awayTeam"], g["season"]))
        if th is None or ta is None: continue
        gap = th - ta
        resid = (g["homePoints"] - g["awayPoints"]) - spine[gid]
        resid_gap.append((gap, resid))
        b = "<-200" if gap < -200 else "-200..-50" if gap < -50 else "-50..50" if gap < 50 else "50..200" if gap < 200 else ">200"
        buck[b].append(resid)
    print("\n[H1] TALENT GAP vs CLOSE RESIDUAL (flat = priced by close)")
    print(f"{'bucket':>10} | {'n':>5} | {'resid mean':>10} | {'SE':>5} | {'t':>6}")
    for b in ("<-200", "-200..-50", "-50..50", "50..200", ">200"):
        xs = buck.get(b, [])
        if len(xs) < 15:
            print(f"{b:>10} | {len(xs):>5} | (small)")
            continue
        m = statistics.mean(xs); se = statistics.stdev(xs)/math.sqrt(len(xs))
        print(f"{b:>10} | {len(xs):>5} | {m:>10.2f} | {se:>5.2f} | {m/se:>+6.2f}")
    # regression slope of residual on gap (per 100 talent pts)
    n = len(resid_gap)
    gb = statistics.mean(x for x, _ in resid_gap); rb = statistics.mean(r for _, r in resid_gap)
    sxx = sum((x-gb)**2 for x, _ in resid_gap) or 1e-9
    slope = sum((x-gb)*(r-rb) for x, r in resid_gap) / sxx
    t_slope = slope * math.sqrt(n) / (statistics.stdev([r for _, r in resid_gap]) / math.sqrt(sxx) * math.sqrt(n)) if n else 0
    print(f"  slope: {slope:+.4f} resid-pts per talent-pt  => {slope*100:+.2f} pts per 100 talent gap")
    print(f"  => close {'UNDER-prices' if abs(slope*100) > 0.5 else 'prices'} big talent gaps"
          f" (slope t~{t_slope:+.1f}, n={n})")

    # --- H2: blue-chip ratio residual
    buck2 = defaultdict(list)
    for gid, g in games.items():
        if gid not in spine: continue
        h5 = sum(bc[g["homeTeam"]].get(y, 0) for y in range(g["season"]-4, g["season"]+1))
        a5 = sum(bc[g["awayTeam"]].get(y, 0) for y in range(g["season"]-4, g["season"]+1))
        if h5 + a5 < 20: continue
        ratio = h5 / (h5 + a5)   # home share of blue-chip capital
        resid = (g["homePoints"] - g["awayPoints"]) - spine[gid]
        b = "h<30%" if ratio < .3 else "30-45%" if ratio < .45 else "45-55%" if ratio <= .55 else "55-70%" if ratio < .7 else "h>70%"
        buck2[b].append(resid)
    print("\n[H2] BLUE-CHIP CAPITAL SHARE (home's 5yr share) vs CLOSE RESIDUAL")
    for b in ("h<30%", "30-45%", "45-55%", "55-70%", "h>70%"):
        xs = buck2.get(b, [])
        if len(xs) < 15: continue
        m = statistics.mean(xs); se = statistics.stdev(xs)/math.sqrt(len(xs))
        print(f"{b:>10} | {len(xs):>5} | {m:>8.2f} | {se:>5.2f} | {m/se:>+6.2f}")

    # --- H3: momentum — 2yr blue-chip delta vs residual
    buck3 = defaultdict(list)
    for gid, g in games.items():
        if gid not in spine or g["season"] < 2024: continue
        d_home = bc[g["homeTeam"]].get(g["season"]-1, 0) + bc[g["homeTeam"]].get(g["season"], 0) \
                 - bc[g["homeTeam"]].get(g["season"]-3, 0) - bc[g["homeTeam"]].get(g["season"]-2, 0)
        d_away = bc[g["awayTeam"]].get(g["season"]-1, 0) + bc[g["awayTeam"]].get(g["season"], 0) \
                 - bc[g["awayTeam"]].get(g["season"]-3, 0) - bc[g["awayTeam"]].get(g["season"]-2, 0)
        dd = d_home - d_away
        resid = (g["homePoints"] - g["awayPoints"]) - spine[gid]
        b = "rising (>=+6)" if dd >= 6 else "flat" if dd > -6 else "falling (<=-6)"
        buck3[b].append(resid)
    print("\n[H3] RECRUITING MOMENTUM (2yr blue-chip delta) vs CLOSE RESIDUAL")
    for b in ("rising (>=+6)", "flat", "falling (<=-6)"):
        xs = buck3.get(b, [])
        if len(xs) < 15: continue
        m = statistics.mean(xs); se = statistics.stdev(xs)/math.sqrt(len(xs))
        print(f"{b:>16} | {len(xs):>5} | {m:>8.2f} | {se:>5.2f} | {m/se:>+6.2f}")
    print("\n[VERDICT SCALE] |t|<1.5 PRICED · 1.5-2.0 NEAR-SIGNAL · >2.0 SIGNAL")

if __name__ == "__main__":
    main()
