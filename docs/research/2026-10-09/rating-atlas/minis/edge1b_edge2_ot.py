#!/usr/bin/env python3
"""
edge1_refit_edge2_ot.py — favorite-adjusted margin distribution (EDGE#1 redo)
+ the OT equation (EDGE#2). One pass over 2023-25 pbp.

EDGE#1b: margins from the FAVORITE's perspective, conditioned on total bin AND
         favorite-spread bin. Laplace vs Normal CRPS on fav-adjusted margins.
EDGE#2 : OT empirics -> equation. Both-possess era. Deliverables:
         - P(favorite covers in OT), P(team receiving first OT possession wins)
         - OT point contribution to totals (mean/sd) for totals pricing
         - P(OT | close spread) -> tail equity, tie probability
Output: /var/minis/shared/gse/nfl_pbp/edge1b_edge2_params.json + printed report.
"""
import gzip, csv, json, math, statistics, collections, sys

YEARS = [2023, 2024, 2025]
PB = "/var/minis/shared/gse/nfl_pbp/pbp_{}.csv.gz"

def f(x, d=None):
    try: return float(x)
    except (TypeError, ValueError): return d

def one_pass():
    games = {}
    for y in YEARS:
        t0 = __import__("time").time()
        with gzip.open(PB.format(y), "rt") as fh:
            rd = csv.DictReader(fh)
            for r in rd:
                gid = r.get("game_id")
                if not gid: continue
                g = games.setdefault(gid, {
                    "year": y, "hs": 0, "as": 0, "spread": None, "total": None,
                    "ot_pts_h": 0, "ot_pts_a": 0, "ot_first_posteam": None,
                    "ot_first_side": None, "q4_end_hs": 0, "q4_end_as": 0})
                hs, as_ = int(f(r.get("total_home_score"), 0) or 0), int(f(r.get("total_away_score"), 0) or 0)
                if hs > g["hs"]: g["hs"] = hs
                if as_ > g["as"]: g["as"] = as_
                if r.get("spread_line"): g["spread"] = f(r["spread_line"])
                if r.get("total_line"): g["total"] = f(r["total_line"])
                q = f(r.get("qtr"), 0)
                # OT rows (qtr >= 5): track points scored within OT via running scores
                if q and q >= 5:
                    # points in OT = running score minus score at OT start; track deltas
                    if g["ot_first_posteam"] is None:
                        g["ot_first_posteam"] = r.get("posteam") or ""
                        g["ot_first_side"] = "home" if r.get("posteam") == r.get("home_team") else "away"
                    g["ot_pts_h"] = max(g["ot_pts_h"], hs - g["q4_end_hs"])
                    g["ot_pts_a"] = max(g["ot_pts_a"], as_ - g["q4_end_as"])
                elif q and q <= 4:
                    g["q4_end_hs"], g["q4_end_as"] = hs, as_
                    g["ot_pts_h"] = 0; g["ot_pts_a"] = 0
        print(f"  {y}: {sum(1 for g in games.values() if g['year']==y)} games ({__import__('time').time()-t0:.0f}s)", flush=True)
    return games

def moments(xs):
    n = len(xs); m = sum(xs)/n
    v = sum((x-m)**2 for x in xs)/max(n-1, 1); sd = math.sqrt(v)
    sk = sum((x-m)**3 for x in xs)/n/sd**3 if sd else 0
    return m, sd, sk

def pdf(z): return math.exp(-z*z/2)/math.sqrt(2*math.pi)
def phi(z): return 0.5*(1+math.erf(z/math.sqrt(2)))
def crps_norm(x, m, s):
    z = (x-m)/s
    return s*(z*(2*phi(z)-1) + 2*pdf(z) - 1/math.sqrt(math.pi))
def crps_laplace(x, m, b):
    a = abs(x-m); return a + b*math.exp(-a/b) - b

def main():
    games = one_pass()
    done = {k: g for k, g in games.items() if g["spread"] is not None and g["hs"] + g["as"] > 0}
    print(f"complete games w/ spread: {len(done)}")

    # ---- EDGE#1b: favorite-adjusted margins ----
    fav = {}  # fav_margin = margin from favorite's perspective
    for k, g in done.items():
        m = g["hs"] - g["as"]
        fm = m if g["spread"] > 0 else -m   # MEASURED: positive spread_line = home favored
        fav[k] = {"fav_margin": fm, "total": g["total"], "abs_spread": abs(g["spread"])}
    xs_all = [v["fav_margin"] for v in fav.values()]
    m0, sd0, sk0 = moments(xs_all)
    # global CRPS: centered normal vs laplace (fav-adjusted)
    cn = cl = 0.0
    for x in xs_all:
        cn += crps_norm(x, 0, sd0); cl += crps_laplace(x, 0, sd0*0.8)
    n0 = len(xs_all)
    print(f"\n== EDGE#1b favorite-adjusted (n={n0}): mu={m0:+.2f} sd={sd0:.2f} skew={sk0:+.3f}")
    print(f"   CRPS/game: normal {cn/n0:.3f}  laplace(b=0.8sd) {cl/n0:.3f}  -> laplace gain {100*(1-cl/cn):.1f}%")

    tbins = [(30, 42), (42.5, 45.5), (46, 48.5), (49, 52.5), (53, 70)]
    sbins = [(0, 3), (3.5, 6.5), (7, 20)]
    model1 = {"n": n0, "global": {"mu": round(m0, 2), "sd": round(sd0, 2), "skew": round(sk0, 3),
              "crps_normal": round(cn/n0, 3), "crps_laplace": round(cl/n0, 3)}, "cells": []}
    for tlo, thi in tbins:
        for slo, shi in sbins:
            xs = [v["fav_margin"] for v in fav.values() if tlo <= v["total"] <= thi and slo <= v["abs_spread"] <= shi]
            if len(xs) < 30: continue
            m, sd, sk = moments(xs)
            med = statistics.median(xs)
            lo_s = math.sqrt(sum((x-med)**2 for x in xs if x < med)/max(sum(1 for x in xs if x < med)-1, 1))
            hi_s = math.sqrt(sum((x-med)**2 for x in xs if x > med)/max(sum(1 for x in xs if x > med)-1, 1))
            ab3 = sum(1 for x in xs if abs(x) == 3)/len(xs)
            ab7 = sum(1 for x in xs if abs(x) == 7)/len(xs)
            # favored-team cover rates at key lines
            cov3 = sum(1 for x in xs if x > 3)/len(xs)   # fav by >3
            push3 = sum(1 for x in xs if x == 3)/len(xs)
            model1["cells"].append({"T": f"{tlo}-{thi}", "S": f"{slo}-{shi}", "n": len(xs),
                "mu": round(m, 2), "sd": round(sd, 2), "skew": round(sk, 3),
                "sd_lo": round(lo_s, 2), "sd_hi": round(hi_s, 2),
                "P|3|": round(ab3, 4), "P|7|": round(ab7, 4),
                "P(fav>3)": round(cov3, 4), "P(fav=3)": round(push3, 4)})
            print(f"   T{tlo}-{thi} S{slo}-{shi}: n={len(xs)} sd={sd:.2f} sk={sk:+.2f} P|3|={ab3:.3f} P|7|={ab7:.3f} P(fav>3)={cov3:.3f}")

    # ---- EDGE#2: OT equation ----
    ot = {k: g for k, g in games.items() if g["q4_end_hs"] == g["q4_end_as"] and (g["hs"] != g["as"] or g["ot_pts_h"] or g["ot_pts_a"]) and g["hs"]+g["as"] > 0 and g["ot_first_posteam"] is not None}
    # stricter: OT games = q4 end tied AND game ended (post scores equal too would be tie)
    ot_games = []
    for k, g in games.items():
        if g["spread"] is None or g["hs"]+g["as"] == 0: continue
        if g["q4_end_hs"] != g["q4_end_as"]: continue
        ot_pts = g["hs"] - g["q4_end_hs"] + g["as"] - g["q4_end_as"]
        if g["ot_first_posteam"] is None and g["hs"] == g["as"]:
            continue  # tie (rare) or data gap
        ot_games.append({**g, "ot_pts_total": g["ot_pts_h"] + g["ot_pts_a"],
                         "winner": "home" if g["hs"] > g["as"] else "away" if g["as"] > g["hs"] else "tie",
                         "fav_side": "home" if g["spread"] > 0 else "away",
                         "first_side": g["ot_first_side"]})
    not_ = len(ot_games)
    print(f"\n== EDGE#2 OT: {not_} OT games / {len(done)} games = P(OT)={not_/max(len(done),1):.4f}")
    if ot_games:
        ot_pts = [o["ot_pts_total"] for o in ot_games]
        m_ot, sd_ot, sk_ot = moments(ot_pts)
        first_won = sum(1 for o in ot_games if o["winner"] != "tie" and o["first_side"] == o["winner"])
        decided = sum(1 for o in ot_games if o["winner"] != "tie")
        ties = sum(1 for o in ot_games if o["winner"] == "tie")
        fav_won = sum(1 for o in ot_games if o["winner"] == o["fav_side"])
        # first-possession team = often the road/team that lost coin toss logic; report raw
        print(f"   OT points: mean {m_ot:.2f} sd {sd_ot:.2f} (totals add-on)")
        print(f"   first-possession team win rate: {first_won}/{decided} = {first_won/max(decided,1):.3f}")
        print(f"   favorite win rate in OT: {fav_won}/{decided} = {fav_won/max(decided,1):.3f} (coin-flip=0.5)")
        print(f"   ties: {ties}")
        # P(OT | spread band)
        for slo, shi in [(0, 2.5), (3, 4.5), (5, 20)]:
            gg = [g for g in done.values() if slo <= abs(g["spread"]) <= shi]
            oo = [o for o in ot_games if slo <= abs(o["spread"]) <= shi]
            print(f"   P(OT | spread {slo}-{shi}) = {len(oo)}/{len(gg)} = {len(oo)/max(len(gg),1):.4f}")
        ot_model = {"n_ot": not_, "ot_pts_mean": round(m_ot, 2), "ot_pts_sd": round(sd_ot, 2),
                    "first_possession_win_rate": round(first_won/max(decided,1), 3),
                    "fav_win_rate_ot": round(fav_won/max(decided,1), 3), "ties": ties,
                    "p_ot_overall": round(not_/max(len(done),1), 4)}
    else:
        ot_model = {"n_ot": 0}
    out = {"edge1b": model1, "edge2_ot": ot_model}
    p = "/var/minis/shared/gse/nfl_pbp/edge1b_edge2_params.json"
    json.dump(out, open(p, "w"), indent=1)
    print("\nsaved", p)

if __name__ == "__main__":
    main()
