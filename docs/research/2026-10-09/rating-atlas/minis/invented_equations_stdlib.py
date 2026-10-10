#!/usr/bin/env python3
"""
invented_equations_stdlib.py — EQ-1/2/3 measured without pandas (iSH-safe).
EQ-1 pressure_x_leverage_v1 · EQ-2 drivestart_x_tempo_v1 · EQ-3 mustscore_v1
All diagnostic; per-cell n, SE, t; honest nulls.
"""
import csv, gzip, statistics, math, sys
from collections import defaultdict

DATA = "/var/minis/workspace/nfl/data"
YEARS = [int(x) for x in (sys.argv[1:] or ["2025"])]
F = lambda x: float(x) if x not in ("", "NA", None) else None

def report(name, groups):
    print(f"\n=== {name} ===")
    for label, vals in groups.items():
        if len(vals) < 30:
            print(f"  {label:<34} n={len(vals)} (small)"); continue
        m = statistics.mean(vals); se = statistics.stdev(vals) / math.sqrt(len(vals))
        t = m / se if se else 0
        print(f"  {label:<34} n={len(vals):>6}  mean {m:>7.3f}  se {se:.3f}  t={t:+.2f}")

def main():
    # ---------------- EQ-1: pressure x leverage (dropback EPA) ----------------
    tg = defaultdict(lambda: [0, 0])          # (gid, posteam) -> [press, n]
    plays_cache = []
    for y in YEARS:
        with gzip.open(f"{DATA}/pbp_{y}.csv.gz", "rt") as f:
            for r in csv.DictReader(f):
                if r.get("season_type") != "REG" or not r.get("posteam"): continue
                plays_cache.append(r)
                if r.get("qb_dropback") == "1":
                    press = 1 if (r.get("sack") == "1" or r.get("qb_hit") == "1") else 0
                    k = (r["game_id"], r["posteam"])
                    tg[k][0] += press; tg[k][1] += 1
    rates = {k: (v[0] / v[1], v[1]) for k, v in tg.items() if v[1] > 0}
    rs = sorted(x for x, _ in rates.values())
    p33, p66 = rs[int(0.33 * len(rs))], rs[int(0.66 * len(rs))]
    def tercile(x): return "low" if x <= p33 else "mid" if x <= p66 else "high"
    eq1 = defaultdict(list)
    for r in plays_cache:
        if r.get("qb_dropback") != "1": continue
        epa = F(r.get("epa"))
        if epa is None: continue
        rate, n = rates.get((r["game_id"], r["posteam"]), (None, 0))
        if rate is None: continue
        lev = (abs(F(r.get("score_differential")) or 99) <= 7 and r.get("qtr") == "4")
        eq1[f"{tercile(rate):>4} pressure | {'Q4-leverage' if lev else 'non-leverage'}"].append(epa)
    report("EQ-1 pressure_x_leverage_v1 — EPA per dropback (2025)", eq1)
    # the invented interaction: (high-press minus low-press EPA gap) under leverage vs not
    def gap(lev):
        h = eq1.get(f"high pressure | {'Q4-leverage' if lev else 'non-leverage'}", [])
        l = eq1.get(f" low pressure | {'Q4-leverage' if lev else 'non-leverage'}", [])
        return (statistics.mean(h) - statistics.mean(l)) if len(h) > 30 and len(l) > 30 else None
    g_lev, g_non = gap(True), gap(False)
    if g_lev is not None and g_non is not None:
        print(f"  [EQ-1 interaction] pressure-gap under leverage {g_lev:+.3f} vs non-leverage {g_non:+.3f} "
              f"-> interaction term {g_lev - g_non:+.3f}")

    # ---------------- EQ-2: drive-start x tempo x opp-def ----------------
    # opp season def EPA (from our efficiency tables; static approximation, leak noted)
    opp_def = {}
    try:
        for y in YEARS:
            import csv as _c
            for row in _c.DictReader(open(f"{DATA}/nfl_team_efficiency_{y}.csv")):
                pass
        # def side not in table; approximate with league-wide opp offense EPA rank inverse
    except FileNotFoundError:
        pass
    # drive starts + tempo from first scrimmage play of each drive
    drives = defaultdict(list)  # (gid, drive) -> rows
    for r in plays_cache:
        drives[(r["game_id"], r.get("drive"))].append(r)
    team_plays_per_game = defaultdict(int)
    for r in plays_cache:
        if r.get("play_type") in ("run", "pass"):
            team_plays_per_game[(r["game_id"], r["posteam"])] += 1
    ppg = sorted(team_plays_per_game.values())
    t33, t66 = ppg[int(0.33 * len(ppg))], ppg[int(0.66 * len(ppg))]
    def tempo(x): return "slow" if x <= t33 else "mid" if x <= t66 else "fast"
    eq2 = defaultdict(list)
    for (gid, drv), rows in drives.items():
        first = None
        for r in rows:
            if r.get("play_type") in ("run", "pass") and r.get("down") not in ("", "NA", None):
                first = r; break
        if not first: continue
        ytg = F(first.get("yardline_100"))
        if ytg is None: continue
        zone = "backed-up" if ytg >= 75 else "midfield" if ytg >= 40 else "opp-territory"
        tp = team_plays_per_game.get((gid, first["posteam"]), 0)
        # drive points
        pts = 0.0
        for r in rows:
            if r.get("td_team") == r.get("posteam"): pts += 6.8
            elif r.get("field_goal_result") == "made": pts += 3.0
        eq2[f"{zone:>13} x {tempo(tp):>4} tempo"].append(pts)
    report("EQ-2 drivestart_x_tempo_v1 — points per drive (2025)", eq2)

    # ---------------- EQ-3: must-score behavior ----------------
    ms = {"epa": defaultdict(list), "go": defaultdict(lambda: [0, 0]), "tempo": defaultdict(list)}
    base_epa = defaultdict(list)
    for r in plays_cache:
        t = r.get("posteam")
        epa = F(r.get("epa"))
        must = (r.get("qtr") == "4" and r.get("score_differential") not in ("", "NA", None)
                and -16 <= F(r.get("score_differential")) <= -8)
        if epa is not None and r.get("play_type") in ("run", "pass"):
            (ms["epa"] if must else base_epa)[t].append(epa)
        if must and r.get("down") == "4":
            ms["go"][t][1] += 1
            if r.get("play_type") in ("run", "pass"): ms["go"][t][0] += 1
    deltas = []
    for t in set(ms["epa"]) & set(base_epa):
        if len(ms["epa"][t]) >= 20 and len(base_epa[t]) >= 100:
            deltas.append((t, statistics.mean(ms["epa"][t]) - statistics.mean(base_epa[t]),
                           len(ms["epa"][t])))
    deltas.sort(key=lambda x: -x[1])
    print("\n=== EQ-3 mustscore_v1 — Q4 trailing-8-16 EPA delta vs baseline (behavioral, not narrative) ===")
    print("  top 'clutch' (n_must >= 20):")
    for t, d, n in deltas[:6]:
        print(f"    {t:<6} {d:+.3f} (n={n})")
    print("  bottom:")
    for t, d, n in deltas[-4:]:
        print(f"    {t:<6} {d:+.3f} (n={n})")
    all_d = [d for _, d, _ in deltas]
    if all_d:
        m = statistics.mean(all_d)
        se = statistics.stdev(all_d) / math.sqrt(len(all_d))
        print(f"  league mean must-score EPA delta: {m:+.3f} ± {se:.3f} (t={m/se:+.2f}, n={len(all_d)} teams)")

if __name__ == "__main__":
    main()
