#!/usr/bin/env python3
"""ladder_inverse.py — reconstruct the books' INTERNAL probability engines
from their own published alt-line ladders (public prices only).

Method (per market ladder):
  1. american -> decimal -> raw implied p; pair-normalize over/under -> no-vig P(over).
  2. Each (line, P_over) is a CDF point.  P_over(line) = P(X > line).
     probit: z = Phi^{-1}(P_under) = Phi^{-1}(1 - P_over).
  3. Fit z = (line - mu) / sigma by least squares -> mu_hat, sigma_hat + R^2.
  => The book's implicit mean and sd for that stat, recovered from prices.

Outputs:
  - dk_stat_distributions.csv  (per player-stat: mu, sigma, hold, ladder n, R2)
  - pinnacle_dist.csv          (spread/total sigma implied by Pinnacle alt ladders)
  - hold_xray.csv              (hold by book x market type)
  - stdout: the headline findings
"""
import csv, json, math, os, sys, glob
from collections import defaultdict
from freshness_gate import load_stamped

SNAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")

def amer_to_praw(a):
    a = float(a)
    if a > 0:
        return 100.0 / (a + 100.0)
    return (-a) / ((-a) + 100.0)

def norm_inv(p):
    """Acklam's inverse normal CDF (stdlib-only)."""
    if p <= 0: return -10.0
    if p >= 1: return 10.0
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p > phigh:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    q = p - 0.5
    r = q * q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)

def fit_normal_cdf(points):
    """points: [(line, P_over)] -> (mu, sigma, r2, n). Least squares on probit scale."""
    pts = []
    for line, po in points:
        pu = 1.0 - po
        if not (0.005 < pu < 0.995):
            continue
        pts.append((float(line), norm_inv(pu)))
    if len(pts) < 4:
        return None
    n = len(pts)
    mx = sum(x for x, _ in pts) / n
    mz = sum(z for _, z in pts) / n
    sxx = sum((x - mx) ** 2 for x, _ in pts)
    sxz = sum((x - mx) * (z - mz) for x, z in pts)
    szz = sum((z - mz) ** 2 for _, z in pts)
    if sxx <= 0 or sxz == 0:
        return None
    slope = sxz / sxx            # dz/dx = 1/sigma
    inter = mz - slope * mx      # z = slope*x + inter  -> mu = -inter/slope
    sigma = 1.0 / slope
    mu = -inter / slope
    ssr = sum((z - (slope * x + inter)) ** 2 for x, z in pts)
    r2 = 1 - ssr / szz if szz > 0 else 0.0
    return mu, abs(sigma), r2, n

def pair_norm(ladder):
    """ladder: {line: (praw_over, praw_under)} -> {line: P_over_novig} + hold at each line."""
    out = {}
    holds = {}
    for line, (po, pu) in ladder.items():
        s = po + pu
        if s <= 0:
            continue
        out[line] = po / s
        holds[line] = (po + pu) - 1.0
    return out, holds

# ---------------- DK ----------------
def load_dk():
    path = os.path.join(SNAP, "dk_week6_props_2026-10-09.tsv")
    rows = []
    with open(path) as f:
        rd = csv.DictReader(f, delimiter="\t")
        for r in rd:
            rows.append(r)
    return rows

SUBNAME = {
    "9524": "pass_yards", "9517": "pass_attempts", "9522": "completions", "9525": "pass_tds",
    "9514": "rush_yards", "9518": "rush_attempts", "9533": "longest_rush",
    "14114": "rec_yards", "14115": "receptions", "16924": "longest_rec",
    "18876": "pass_yards_1h", "18883": "rush_yards_1h", "18884": "rec_yards_1h",
    "9523": "rush_rec_yards", "9532": "pass_rush_yards",
    "13195": "alt_spread", "13196": "alt_total", "16719": "team_total",
    "12424": "anytime_td", "12438": "td_scorer", "11818": "last_td",
    "4518": "game_lines", "12479": "h2h_rec", "19060": "h2h_pass", "18746": "h2h_rush",
    "16888": "pass_attempts2", "16889": "completions2", "16820": "rush_attempts2",
}

LAD2STAT = {
    "16569": "pass_yards", "16570": "rec_yards", "16571": "rush_yards", "16572": "rush_rec_yards",
    "18493": "pass_yards_1h", "18494": "rush_yards_1h", "18495": "rec_yards_1h",
}
MAIN2STAT = {
    "9524": "pass_yards", "14114": "rec_yards", "9514": "rush_yards", "9523": "rush_rec_yards",
    "18876": "pass_yards_1h", "18883": "rush_yards_1h", "18884": "rec_yards_1h",
}

def dk_analysis():
    """Fusion: band-ladder slope -> sigma (vig-immune); O/U main pair -> devigged anchor -> mu."""
    ladders = defaultdict(lambda: defaultdict(dict))   # (ev, sub, player) -> {threshold: praw}
    mains = {}                                          # (ev, stat, player) -> (line, P_over_devig, hold)
    with open(os.path.join(SNAP, "dk_week6_ladders_2026-10-09.tsv")) as f:
        for r in csv.DictReader(f, delimiter="\t"):
            pts = (r["points"] or "").replace("+", "") or (r["side"] or "").replace("+", "")
            if not pts or not r["american"]:
                continue
            try:
                t = float(pts); praw = amer_to_praw(r["american"])
            except ValueError:
                continue
            ladders[(r["ev"], r["sub"], r["player"])][t] = praw
    with open(os.path.join(SNAP, "dk_week6_props_2026-10-09.tsv")) as f:
        for r in csv.DictReader(f, delimiter="\t"):
            sub = r["sub"]
            if sub not in MAIN2STAT or not r["american"] or not r["points"]:
                continue
            side = (r["side"] or "").lower()
            if side not in ("over", "under"):
                continue
            key = (r["ev"], MAIN2STAT[sub], r["player"])
            m = mains.setdefault(key, {"o": None, "u": None, "line": None, "tags": "", "baseline": ""})
            praw = amer_to_praw(r["american"])
            m["o" if side == "over" else "u"] = praw
            if "MainPointLine" in (r["tags"] or ""):
                m["line"] = float(r["points"])
            m["tags"] = r["tags"] or ""
            m["baseline"] = r["statBaseline"] or ""
    out = []
    for (ev, sub, player), lad in ladders.items():
        stat = LAD2STAT.get(sub, sub)
        pts = sorted(lad.keys())
        # monotone decreasing sanity + probit slope fit
        fitp = [(t, norm_inv(lad[t])) for t in pts if 0.004 < lad[t] < 0.996]
        if len(fitp) < 5:
            continue
        n = len(fitp)
        mx = sum(t for t, _ in fitp) / n
        mz = sum(z for _, z in fitp) / n
        sxx = sum((t - mx) ** 2 for t, _ in fitp)
        stz = sum((t - mx) * (z - mz) for t, z in fitp)
        szz = sum((z - mz) ** 2 for _, z in fitp)
        if sxx <= 0 or stz >= 0:   # P(X>=t) must DECREASE in t
            continue
        b = stz / sxx              # dz/dt = -1/sigma
        a = mz - b * mx
        ssr = sum((z - (a + b * t)) ** 2 for t, z in fitp)
        r2 = 1 - ssr / szz if szz > 0 else 0
        sigma = -1.0 / b
        # anchor from devigged main O/U
        m = mains.get((ev, stat, player))
        mu = hold = line = None
        if m and m["o"] and m["u"] and m["line"] is not None:
            s = m["o"] + m["u"]
            if s > 0:
                p_over = m["o"] / s
                pu = 1 - p_over
                if 0.005 < pu < 0.995:
                    mu = m["line"] - sigma * norm_inv(pu)
                    line = m["line"]
                    hold = 1 - 1.0 / (1.0 / m["o"] + 1.0 / m["u"])
        out.append({"ev": ev, "stat": stat, "player": player, "sigma": round(sigma, 2),
                    "mu_from_main": round(mu, 2) if mu is not None else "",
                    "main_line": line if line is not None else "",
                    "hold_main": round(hold, 4) if hold else "",
                    "ladder_n": n, "r2": round(r2, 4),
                    "balanced_line": next((t for t in pts if abs(lad[t] - 0.5) == min(abs(x - 0.5) for x in lad.values())), ""),
                    "dk_baseline": m["baseline"] if m else ""})
    out.sort(key=lambda r: (r["stat"], r["ev"], r["player"]))
    with open(os.path.join(SNAP, "dk_stat_distributions.csv"), "w", newline="") as f:
        if out:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
            w.writeheader(); w.writerows(out)
    return out

# ---------------- Pinnacle ----------------
def pinnacle_analysis():
    files = glob.glob(os.path.join(SNAP, "pinnacle_mkt_*.json"))
    out = []
    for fp in files:
        mid = os.path.basename(fp).replace("pinnacle_mkt_", "").replace(".json", "")
        try:
            mkts = load_stamped(fp)
        except Exception:
            continue
        if not isinstance(mkts, list):
            continue
        ladders = defaultdict(dict)
        for m in mkts:
            if not isinstance(m, dict):
                continue
            t = m.get("type")
            if t not in ("spread", "total", "team_total"):
                continue
            per = m.get("period", 0)
            prices = m.get("prices") or []
            if t == "spread":
                # pair home/away at mirrored lines (home pts = -away pts)
                for p in prices:
                    d, pts, pr = p.get("designation"), p.get("points"), p.get("price")
                    if pts is None or pr is None or d not in ("home", "away"):
                        continue
                    ladders[(t, per)].setdefault(round(abs(float(pts)), 1), {})[d] = amer_to_praw(pr)
            else:
                for p in prices:
                    pts, pr = p.get("points"), p.get("price")
                    if pts is None or pr is None:
                        continue
                    ladders[(t, per)].setdefault(round(float(pts), 1), {})[p.get("designation")] = amer_to_praw(pr)
        for (t, per), lines in ladders.items():
            pairs = {}
            for line, d in lines.items():
                if "home" in d and "away" in d:
                    pairs[line] = (d["home"], d["away"])
                elif "over" in d and "under" in d:
                    pairs[line] = (d["over"], d["under"])
            if len(pairs) < 5:
                continue
            novig, holds = pair_norm(pairs)
            # for spread/home-away: P(home cover) CDF over line
            # for spread: P(home cover) rises with |line| for favorite... use P(home) CDF vs line with sign
            pts_sorted = sorted(novig.keys())
            if t == "spread":
                cdf_pts = [(line, novig[line]) for line in pts_sorted]   # P(home cover <= +line)? use raw
                fit = fit_normal_cdf([(line, 1 - novig[line]) for line in pts_sorted])
            else:
                fit = fit_normal_cdf([(line, 1 - pu) for line, pu in novig.items()])
            if not fit:
                continue
            mu, sigma, r2, n = fit
            hold_vals = [h for h in holds.values() if h is not None]
            hold_mean = sum(hold_vals)/len(hold_vals) if hold_vals else 0
            out.append({"matchup": mid, "market": t, "period": per, "mu": round(mu, 2),
                        "sigma": round(sigma, 2), "r2": round(r2, 4), "n_lines": n,
                        "hold_mean": round(hold_mean, 4)})
    with open(os.path.join(SNAP, "pinnacle_dist.csv"), "w", newline="") as f:
        if out:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
            w.writeheader(); w.writerows(out)
    return out

if __name__ == "__main__":
    dk = dk_analysis()
    pin = pinnacle_analysis()
    print(f"DK distributions fitted: {len(dk)} player-stat ladders")
    if dk:
        import statistics
        by_stat = defaultdict(list)
        for r in dk:
            if r["r2"] >= 0.97:
                by_stat[r["stat"]].append(r["sigma"])
        print("\nDK implied sigma by stat (fit R2>=0.97):")
        for s, v in sorted(by_stat.items()):
            print(f"  {s:18s} n={len(v):3d}  sigma median={statistics.median(v):6.2f}  mean={statistics.mean(v):6.2f}")
        print("\nSample reconstructed distributions (player, stat, mu, sigma, R2):")
        for r in dk[:10]:
            print(" ", str(r["player"])[:22], r["stat"], "mu", r["mu_from_main"], "sigma", r["sigma"], "R2", r["r2"])
    print(f"\nPinnacle ladders fitted: {len(pin)}")
    if pin:
        import statistics
        for t in ("spread", "total", "team_total"):
            sig = [p["sigma"] for p in pin if p["market"] == t and p["period"] == 0 and p["r2"] >= 0.97]
            holds = [p["hold_mean"] for p in pin if p["market"] == t and p["period"] == 0]
            if sig:
                print(f"  {t:10s} sigma median={statistics.median(sig):6.2f} (n={len(sig)})  hold mean={statistics.mean(holds)*100 if holds else 0:.2f}%")
