#!/usr/bin/env python3
"""
cfb_prop_engine.py — OUR CFB prop pricer: the DK engine CLONED and fed with
EMPIRICAL distributions instead of smooth Gaussians.

  DK's engine (reconstructed): ladder of "X+" bands priced from (mu_hat, sigma_hat),
  sigma = position-level constant, mu = their projection.
  OURS: same ladder math, but (mean, std) from CFBD player-game reality, PLUS the
  empirical fat-tail correction at the position level.

  Output: divergence-ranked edge sheet — where DK's price and our empirical price
  disagree by more than the hold, per player/market/line.
"""
import json, math, statistics, csv
from collections import defaultdict

HERE = "/var/minis/workspace/cfb"

def invnorm(p):
    # Acklam
    a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00]
    b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01]
    c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00]
    d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00]
    pl, ph = 0.02425, 0.97575
    if p < pl:
        q = math.sqrt(-2*math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p > ph:
        q = math.sqrt(-2*math.log(1-p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    q = p-0.5; r = q*q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)

def p_over(mu, sig, t):
    return 1 - 0.5 * (1 + math.erf((t - mu) / (sig * math.sqrt(2))))

def main():
    dk = json.load(open(f"{HERE}/dk_cfb_prop_fits.json"))["fits"]
    emp = json.load(open(f"{HERE}/cfb_prop_sigmas.json"))["top_150_player_sigma_table"]
    pos = json.load(open(f"{HERE}/cfb_prop_sigmas.json"))["position_sigma_table"]

    def norm(s): return s.lower().replace(".", "").replace("'", "").split(" (")[0].strip()
    metric = {"pass": "passing_yards", "rush": "rushing_yards", "rec": "receiving_yards"}
    lookup = {}
    for row in emp:
        lookup.setdefault((norm(row["name"]), row["metric"]), row)

    # empirical position-level tail correction: P(over) at common lines vs Gaussian
    tail_adj = {}
    for p, m in pos.items():
        for met, vals in m.items():
            if not isinstance(vals, list) or len(vals) < 500: continue
            mu, sd = statistics.mean(vals), statistics.stdev(vals)
            for line in (49.5, 99.5):
                t = line + 0.5
                emp_p = sum(1 for x in vals if x > line) / len(vals)
                g_p = p_over(mu, sd, t)
                if abs(emp_p - g_p) > 0.02:
                    tail_adj[(p, met, line)] = emp_p - g_p
    print("[TAIL CORRECTIONS measured (empirical minus Gaussian, position level)]")
    for k, v in sorted(tail_adj.items(), key=lambda x: -abs(x[1]))[:8]:
        print(f"   {k}: {v:+.3f}")

    # edge sheet: matched players — DK price vs empirical price on DK's own ladder midpoints
    edges = []
    matched = 0
    for market, rows in dk.items():
        met = metric[market]
        for f in rows:
            key = (norm(f["player"]), met)
            e = lookup.get(key)
            if not e or e["n_games"] < 5: continue
            matched += 1
            # price a standard ladder with BOTH engines
            for line in (e["mean"] - e["std"]*0.5, e["mean"], e["mean"] + e["std"]*0.5):
                t = round(line) + 0.5
                ours = p_over(e["mean"], e["std"], t)
                dks = p_over(f["mu_fit"], f["sigma"], t)
                # apply empirical tail correction if measured for this position/line
                p0 = f["player"].split(" (")[0]
                posname = e.get("position")
                adj = 0.0
                for (pp, mm, ln), v in tail_adj.items():
                    if mm == met and abs(t - 0.5 - ln) < 1:
                        adj = v
                edges.append({"player": f["player"], "market": market, "line": t,
                              "emp_mean": e["mean"], "emp_std": e["std"],
                              "dk_mu": f["mu_fit"], "dk_sigma": f["sigma"],
                              "p_ours": round(ours + adj, 3), "p_dk": round(dks, 3),
                              "delta": round(ours + adj - dks, 3)})
    edges.sort(key=lambda x: -abs(x["delta"]))
    with open(f"{HERE}/cfb_prop_edge_sheet.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(edges[0].keys()))
        w.writeheader(); w.writerows(edges)
    print(f"\n[EDGE SHEET] {len(edges)} priced rows from {matched} matched players -> cfb_prop_edge_sheet.csv")
    print("   top divergences (DK price vs empirical price):")
    for e in edges[:10]:
        print(f"     {e['player']:<28} {e['market']:<5} line {e['line']:>6.1f} "
              f"ours {e['p_ours']:.3f} vs dk {e['p_dk']:.3f} (delta {e['delta']:+.3f})")
    print("\n[USAGE] delta > hold (~4%) on the DK-priced side = candidate EV. Verify with")
    print("        BOTH-sides DK odds before sizing (over-only ladder here). Kill-gated per doctrine.")

if __name__ == "__main__":
    main()
