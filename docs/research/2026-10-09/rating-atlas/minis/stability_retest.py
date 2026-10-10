#!/usr/bin/env python3
"""
stability_retest.py — the promotion-path retest for leverage EP.
v1 failed sign consistency (2/6 states). Hypothesis: per-state noise from fine bins.
Retest: 3-LEVEL score bins (behind / close / ahead) + hierarchical pooling
(shrink state EP toward its (down,dist,ytg) marginal with n-weighted prior).
Stamp: 3-season sign consistency on coarse bins.
"""
import gzip, csv, json
from collections import defaultdict

DATA = "/var/minis/workspace/nfl/data"
def F(x): return float(x) if x not in ("", "NA", None) else None
def _num(x):
    try: return int(float(x))
    except (TypeError, ValueError): return None
def dbin(d):
    d = float(d)
    return "1-2" if d <= 2 else "3-6" if d <= 6 else "7-10" if d <= 10 else "11-15" if d <= 15 else "16+"
def ybin(y):
    y = float(y)
    return "goal" if y <= 2 else "1-10" if y <= 10 else "11-20" if y <= 20 else "21-40" if y <= 40 else "41-60" if y <= 60 else "61-80" if y <= 80 else "81-100"
def cbin(sd):
    """3-level coarse bins."""
    if sd <= -3: return "behind"
    if sd < 3: return "close"
    return "ahead"
def skey(r):
    d, q = _num(r.get("down")), _num(r.get("qtr"))
    ytg = r.get("yardline_100")
    if d is None or ytg in ("", "NA", None) or q not in (1, 2, 3, 4): return None
    db, yb, sb = dbin(r.get("ydstogo")), ybin(ytg), cbin(F(r.get("score_differential")))
    if not (db and yb and sb): return None
    return f"{d}|{db}|{yb}|{sb}"

def main():
    # per season: halfstate+coarsebin -> [pts, n]; marginals: halfstate -> [pts,n]
    lev = {s: defaultdict(lambda: [0.0, 0]) for s in (2023, 2024, 2025)}
    marg = {s: defaultdict(lambda: [0.0, 0]) for s in (2023, 2024, 2025)}
    pooled = defaultdict(lambda: [0.0, 0])
    for season in (2023, 2024, 2025):
        drive_pts = defaultdict(float)
        first = {}
        with gzip.open(f"{DATA}/pbp_{season}.csv.gz", "rt") as f:
            for r in csv.DictReader(f):
                if r.get("season_type") != "REG" or not r.get("posteam"): continue
                dk = (r["game_id"], r.get("drive"))
                if r.get("td_team") == r.get("posteam"): drive_pts[dk] += 6.8
                elif r.get("field_goal_result") == "made": drive_pts[dk] += 3.0
                if dk not in first:
                    sk = skey(r)
                    if sk: first[dk] = sk
                if dk in first:
                    sk = first[dk]
                    hs = "|".join(sk.split("|")[:3])
                    pts = drive_pts.get(dk, 0.0)
                    lev[season][f"{hs}|{sk.split('|')[3]}"][0] += pts
                    lev[season][f"{hs}|{sk.split('|')[3]}"][1] += 1
                    marg[season][hs][0] += pts
                    marg[season][hs][1] += 1
                    pooled[f"{hs}|{sk.split('|')[3]}"][0] += pts
                    pooled[f"{hs}|{sk.split('|')[3]}"][1] += 1
    # ---- shrinkage EP: ep_hat = (pts + k*prior) / (n + k), prior = marginal EP, k=20
    K = 20
    def shrunk(hs, sb, season):
        c = lev[season].get(f"{hs}|{sb}")
        m = marg[season].get(hs)
        if not m or m[1] == 0: return None
        prior = m[0] / m[1]
        if not c or c[1] == 0: return prior
        return (c[0] + K * prior) / (c[1] + K)

    # ---- 3-season sign consistency on coarse bins, all halfstates with n>=50/season
    print("[COARSE-BIN STABILITY RETEST — 3-level bins + shrinkage k=20]")
    consistent = inconsistent = 0
    rows = []
    hs_all = set()
    for s in (2023, 2024, 2025): hs_all |= set(marg[s])
    for hs in sorted(hs_all):
        dirs = []
        eps = {}
        for s in (2023, 2024, 2025):
            m = marg[s].get(hs)
            if not m or m[1] < 50: break
            e_b = shrunk(hs, "behind", s); e_a = shrunk(hs, "ahead", s)
            if e_b is None or e_a is None: break
            eps[s] = (e_b, e_a)
            dirs.append(e_b > e_a)
        else:
            total = 0; consistent += 1 if len(set(dirs)) == 1 else 0; inconsistent += 1 - (1 if len(set(dirs)) == 1 else 0)
            avg_b = sum(v[0] for v in eps.values()) / 3
            avg_a = sum(v[1] for v in eps.values()) / 3
            rows.append({"half_state": hs, "ep_behind": round(avg_b, 3), "ep_ahead": round(avg_a, 3),
                         "delta_behind_minus_ahead": round(avg_b - avg_a, 3),
                         "direction_stable": len(set(dirs)) == 1, "n_seasons_checked": 3})
    print(f"    states tested (3 seasons, n>=50 each): {consistent + inconsistent}")
    print(f"    SIGN CONSISTENCY (behind > ahead EP): {consistent}/{consistent + inconsistent} = {consistent/(consistent+inconsistent):.0%}")
    json.dump(rows, open(f"{DATA}/leverage_coarse_stability.json", "w"), indent=1)
    # show the biggest stable deltas
    big = sorted([r for r in rows if r["direction_stable"]], key=lambda r: -abs(r["delta_behind_minus_ahead"]))[:8]
    print("    biggest STABLE behind-ahead deltas (shrunk EP):")
    for r in big:
        print(f"      {r['half_state']:<20} behind {r['ep_behind']:.2f} vs ahead {r['ep_ahead']:.2f} "
              f"(delta {r['delta_behind_minus_ahead']:+.2f})")
    print("[VERDICT] " + ("coarse bins STABILIZE the leverage layer -> pooled table enters registry as diagnostic candidate"
          if consistent / max(1, consistent + inconsistent) >= 0.7 else
          "leverage layer still noisy -> refuse promotion, keep measuring"))

if __name__ == "__main__":
    main()
