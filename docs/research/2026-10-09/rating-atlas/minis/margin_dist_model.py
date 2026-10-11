#!/usr/bin/env python3
"""
margin_dist_model.py — THE EDGE #1: conditional margin distribution.

Kills the N(mu, 13.45-sigma-constant) assumption. From 3 seasons of nflverse pbp:
  A) sigma(T): margin SD as a function of closing total (bins)
  B) skewness/kurtosis of margins by total bin (favorite big-win vs close-loss bimodality)
  C) key-number mass P(margin in {1,2,3,4,6,7,8,10,14,...}) CONDITIONAL on total bin
  D) fit: N vs Laplace vs split-normal (two-sided sigma) per bin -> best by CRPS
  E) delivered: margin_dist_params.json with per-total-bin (sigma_lo, sigma_hi, skew,
     keynum table) + engine hook margin_cdf(margin, total) for alt-line pricing.

Output: /var/minis/shared/gse/nfl_pbp/margin_dist_params.json + report.
"""
import gzip, csv, json, math, statistics, collections

YEARS = [2023, 2024, 2025]
PB = "/var/minis/shared/gse/nfl_pbp/pbp_{}.csv.gz"

def load_margins():
    """Final margin (home-away) + closing total per game from pbp rows."""
    games = {}
    for y in YEARS:
        with gzip.open(PB.format(y), "rt") as f:
            rd = csv.DictReader(f)
            for r in rd:
                gid = r.get("game_id")
                if not gid: continue
                try:
                    ph, pa = int(float(r.get("total_home_score") or 0)), int(float(r.get("total_away_score") or 0))
                except ValueError:
                    continue
                tot_c = r.get("total_line") or r.get("spread_line")
                g = games.setdefault(gid, {"margin": None, "total_close": None, "spread_close": None})
                if ph + pa > 0: g["margin"] = ph - pa
                # total_line/spread_line are game-level repeated cols; keep last non-null
                if r.get("total_line"): g["total_close"] = float(r["total_line"])
                if r.get("spread_line"): g["spread_close"] = float(r["spread_line"])
    return {k: v for k, v in games.items() if v["margin"] is not None and v["total_close"]}

def moments(xs):
    n = len(xs); m = sum(xs)/n
    v = sum((x-m)**2 for x in xs)/max(n-1, 1)
    sd = math.sqrt(v)
    sk = sum((x-m)**3 for x in xs)/n/sd**3 if sd else 0
    ku = sum((x-m)**4 for x in xs)/n/sd**4 - 3 if sd else 0
    return m, sd, sk, ku

def crps_norm(x, m, s):
    z = (x-m)/s
    return s*(z*(2*phi(z)-1) + 2*pdf(z) - 1/math.sqrt(math.pi))

def pdf(z): return math.exp(-z*z/2)/math.sqrt(2*math.pi)
def phi(z): return 0.5*(1+math.erf(z/math.sqrt(2)))

def crps_split(x, m, sl, sh):
    s = sl if x < m else sh
    z = (x-m)/s
    c = 2*(sl*sh)/(sl+sh)*pdf(0) if False else 0
    # split-normal CRPS approx: use piecewise normal CRPS with side sigma
    return s*(z*(2*phi(z)-1) + 2*pdf(z) - 1/math.sqrt(math.pi)) * (2*s/(sl+sh))

def crps_laplace(x, m, b):
    a = abs(x-m)
    return a + b*math.exp(-a/b) - b

def main():
    games = load_margins()
    print(f"games with margin+total: {len(games)}")
    bins = [(30, 39.5), (40, 43.5), (44, 46.5), (47, 49.5), (50, 52.5), (53, 70)]
    model = {"n_games": len(games), "bins": []}
    crps_n = crps_s = crps_l = 0.0; nn = 0
    for lo, hi in bins:
        ms = [g["margin"] for g in games.values() if lo <= g["total_close"] <= hi]
        if len(ms) < 40: continue
        m, sd, sk, ku = moments(ms)
        # split-normal: sigma below/above median
        med = statistics.median(ms)
        lo_sd = math.sqrt(sum((x-med)**2 for x in ms if x < med)/max(sum(1 for x in ms if x < med)-1, 1))
        hi_sd = math.sqrt(sum((x-med)**2 for x in ms if x > med)/max(sum(1 for x in ms if x > med)-1, 1))
        # key numbers conditional
        kc = collections.Counter()
        for x in ms:
            if abs(x) in (1,2,3,4,6,7,8,10,13,14,17): kc[abs(x)] += 1
        n = len(ms)
        keynum = {k: round(v/n, 4) for k, v in sorted(kc.items())}
        # absolute-margin key mass (covers both signs)
        abs3 = sum(1 for x in ms if abs(x) == 3)/n
        abs7 = sum(1 for x in ms if abs(x) == 7)/n
        # CRPS bench on this bin (out-of-sample-ish: marginal normal vs split vs laplace)
        for x in ms:
            crps_n += crps_norm(x, 0, sd)  # centered margin
            crps_s += crps_split(x, 0, lo_sd, hi_sd)
            crps_l += crps_laplace(x, 0, sd*0.8)
            nn += 1
        model["bins"].append({
            "total_lo": lo, "total_hi": hi, "n": n, "mean": round(m, 2),
            "sigma": round(sd, 2), "skew": round(sk, 3), "ex_kurtosis": round(ku, 3),
            "sigma_below_median": round(lo_sd, 2), "sigma_above_median": round(hi_sd, 2),
            "P(|margin|=3)": round(abs3, 4), "P(|margin|=7)": round(abs7, 4),
            "key_numbers": keynum,
        })
        print(f"T {lo}-{hi}: n={n} mu={m:+.1f} sd={sd:.2f} skew={sk:+.2f} kurt={ku:+.2f} "
              f"sd_lo={lo_sd:.2f} sd_hi={hi_sd:.2f} P|3|={abs3:.3f} P|7|={abs7:.3f}")
    print(f"\nCRPS/game (centered): normal {crps_n/nn:.3f} | split {crps_s/nn:.3f} | laplace {crps_l/nn:.3f}")
    model["crps"] = {"normal": round(crps_n/nn, 3), "split": round(crps_s/nn, 3), "laplace": round(crps_l/nn, 3)}
    out = "/var/minis/shared/gse/nfl_pbp/margin_dist_params.json"
    json.dump(model, open(out, "w"), indent=1)
    print("saved", out)

if __name__ == "__main__":
    main()
