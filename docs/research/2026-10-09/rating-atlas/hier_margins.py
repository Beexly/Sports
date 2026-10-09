"""Hierarchical margin model and a check of a pasted Gibbs print.

Stdlib only. Not a pick. The ladder sd in engine_math stays 13.45.
Published weather addends stay published magnitudes, not this fit.

Team model: home margin = hfa + a_home - a_away + noise.
a_i ~ N(0, tau^2), noise ~ N(0, sigma^2), sum(a) = 0.
"""

import json
import math
import os
import random


GAMES_JSONL = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "..",
    "..",
    "..",
    "data",
    "gse-dataset",
    "games.jsonl",
)

# Pasted print. Not this file's posterior.
PASTED = {
    "n": 2025,
    "tau": 3.82,
    "tau_ci": (3.77, 3.86),
    "sigma": 13.36,
    "sigma_ci": (13.34, 13.37),
    "hfa": 1.56,
    "hfa_ci": (1.54, 1.59),
    "wind_per_mph": -0.197,
    "wind_se": 0.027,
    "temp_per_f": -0.0247,
    "temp_se": 0.0129,
    "dome": 0.0,
    "intercept": 1.735,
    "weather_n": 2472,
    "weather_r2": 0.0070,
}


def invgamma(rng, shape, scale):
    """IG(shape, scale) with mean scale/(shape-1). scale is the exp(-scale/x) parameter."""
    return 1.0 / rng.gammavariate(shape, 1.0 / scale)


def quantile(xs, p):
    ys = sorted(xs)
    if not ys:
        raise ValueError("empty")
    x = p * (len(ys) - 1)
    lo = int(math.floor(x))
    hi = min(lo + 1, len(ys) - 1)
    w = x - lo
    return ys[lo] * (1.0 - w) + ys[hi] * w


def gibbs(games, n_teams, iters=800, burn=200, seed=7, a0=1.0, b0=1.0):
    rng = random.Random(seed)
    strength = [0.0] * n_teams
    hfa = 0.0
    sigma = 13.5
    tau = 4.0
    home_ix = [[] for _ in range(n_teams)]
    away_ix = [[] for _ in range(n_teams)]
    margins = []
    homes = []
    aways = []
    for i, (home, away, margin) in enumerate(games):
        home_ix[home].append(i)
        away_ix[away].append(i)
        margins.append(margin)
        homes.append(home)
        aways.append(away)
    n = len(games)
    keep_h = []
    keep_s = []
    keep_t = []
    team_sum = [0.0] * n_teams
    kept = 0
    for _ in range(iters):
        inv_s2 = 1.0 / (sigma * sigma)
        for i in range(n_teams):
            prec = 1.0 / (tau * tau)
            numer = 0.0
            for g in home_ix[i]:
                numer += margins[g] - hfa + strength[aways[g]]
                prec += inv_s2
            for g in away_ix[i]:
                numer += hfa + strength[homes[g]] - margins[g]
                prec += inv_s2
            mean = (numer * inv_s2) / prec
            strength[i] = mean + math.sqrt(1.0 / prec) * rng.gauss(0.0, 1.0)
        center = sum(strength) / n_teams
        for i in range(n_teams):
            strength[i] -= center
        total = 0.0
        for g in range(n):
            total += margins[g] - strength[homes[g]] + strength[aways[g]]
        hfa = total / n + (sigma / math.sqrt(n)) * rng.gauss(0.0, 1.0)
        rss = 0.0
        for g in range(n):
            err = margins[g] - hfa - strength[homes[g]] + strength[aways[g]]
            rss += err * err
        sigma = math.sqrt(invgamma(rng, a0 + n / 2.0, b0 + rss / 2.0))
        sst = sum(v * v for v in strength)
        tau = math.sqrt(invgamma(rng, a0 + (n_teams - 1) / 2.0, b0 + sst / 2.0))
        if _ >= burn:
            kept += 1
            keep_h.append(hfa)
            keep_s.append(sigma)
            keep_t.append(tau)
            for i in range(n_teams):
                team_sum[i] += strength[i]
    return {
        "hfa": sum(keep_h) / kept,
        "sigma": sum(keep_s) / kept,
        "tau": sum(keep_t) / kept,
        "hfa_ci": (quantile(keep_h, 0.025), quantile(keep_h, 0.975)),
        "sigma_ci": (quantile(keep_s, 0.025), quantile(keep_s, 0.975)),
        "tau_ci": (quantile(keep_t, 0.025), quantile(keep_t, 0.975)),
        "teams": [v / kept for v in team_sum],
        "n": n,
        "kept": kept,
    }


def pasted_interval_audit(n, sigma, ci):
    """Half-width of a pasted interval versus the iid sampling half-width of a mean."""
    se = sigma / math.sqrt(n)
    pasted_half = 0.5 * (ci[1] - ci[0])
    iid_half = 1.96 * se
    return {
        "se": se,
        "pasted_half": pasted_half,
        "iid_half": iid_half,
        "ratio": iid_half / pasted_half,
    }


def sigma_interval_audit(n, sigma, ci):
    """SE of a Gaussian sd is about sigma/sqrt(2n), not sigma/sqrt(n)."""
    se = sigma / math.sqrt(2.0 * n)
    pasted_half = 0.5 * (ci[1] - ci[0])
    rough_half = 1.96 * se
    return {"se": se, "pasted_half": pasted_half, "rough_half": rough_half, "ratio": rough_half / pasted_half}


def zero_wind_baseline(intercept, per_mph, mph):
    """Uncentered OLS intercept is the prediction at 0 mph, not the sample mean."""
    return intercept + per_mph * mph


def tau_interval_audit(k, tau, ci):
    """Rough SE of a standard deviation from k team effects: tau/sqrt(2(k-1))."""
    se = tau / math.sqrt(2.0 * (k - 1))
    pasted_half = 0.5 * (ci[1] - ci[0])
    rough_half = 1.96 * se
    return {"se": se, "pasted_half": pasted_half, "rough_half": rough_half, "ratio": rough_half / pasted_half}


def load_margins(path, season_min=2019):
    alias = {"OAK": "LV"}
    games = []
    with open(path) as handle:
        for line in handle:
            row = json.loads(line)
            if not row.get("settled") or row.get("margin") is None:
                continue
            if row.get("neutral_site"):
                continue
            if row["season"] < season_min:
                continue
            home = alias.get(row["home_team"], row["home_team"])
            away = alias.get(row["away_team"], row["away_team"])
            games.append((home, away, float(row["margin"]), int(row["season"])))
    return games


def fit_named(games, iters=2000, burn=500, seed=7):
    names = sorted({h for h, a, _y, _s in games} | {a for h, a, _y, _s in games})
    index = {name: i for i, name in enumerate(names)}
    coded = [(index[h], index[a], y) for h, a, y, _s in games]
    fit = gibbs(coded, len(names), iters=iters, burn=burn, seed=seed)
    order = sorted(range(len(names)), key=lambda i: fit["teams"][i], reverse=True)
    fit["names"] = names
    fit["order"] = [(names[i], fit["teams"][i]) for i in order]
    return fit


def totals_residual(path, season_lo=2006, season_hi=2018):
    """actual total minus closing total. No wind or temperature in this file."""
    rows = []
    with open(path) as handle:
        for line in handle:
            row = json.loads(line)
            if not row.get("settled"):
                continue
            if row["season"] < season_lo or row["season"] > season_hi:
                continue
            if row.get("total_line") is None or row.get("total_points") is None:
                continue
            rows.append(row)
    residual = [r["total_points"] - r["total_line"] for r in rows]
    dome = [r["total_points"] - r["total_line"] for r in rows if r.get("roof") == "dome"]
    outdoor = [r["total_points"] - r["total_line"] for r in rows if r.get("roof") == "outdoors"]
    def mean(xs):
        return sum(xs) / len(xs) if xs else float("nan")
    return {
        "n": len(rows),
        "mean": mean(residual),
        "dome_n": len(dome),
        "dome_mean": mean(dome),
        "outdoor_n": len(outdoor),
        "outdoor_mean": mean(outdoor),
    }


def _synthetic_games(n_teams, n_games, hfa, tau, sigma, seed):
    rng = random.Random(seed)
    strength = [rng.gauss(0.0, tau) for _ in range(n_teams)]
    center = sum(strength) / n_teams
    strength = [v - center for v in strength]
    games = []
    for i in range(n_games):
        home = i % n_teams
        away = (i * 3 + 1) % n_teams
        if away == home:
            away = (away + 1) % n_teams
        margin = hfa + strength[home] - strength[away] + rng.gauss(0.0, sigma)
        games.append((home, away, margin))
    return games


def self_check():
    hfa_audit = pasted_interval_audit(PASTED["n"], PASTED["sigma"], PASTED["hfa_ci"])
    sig_audit = sigma_interval_audit(PASTED["n"], PASTED["sigma"], PASTED["sigma_ci"])
    tau_audit = tau_interval_audit(32, PASTED["tau"], PASTED["tau_ci"])
    print(
        "pasted hfa CI half-width %.3f vs iid sampling half-width %.3f (ratio %.1f)"
        % (hfa_audit["pasted_half"], hfa_audit["iid_half"], hfa_audit["ratio"])
    )
    print(
        "pasted sigma CI half-width %.4f vs Gaussian-sd half-width %.3f (ratio %.0f)"
        % (sig_audit["pasted_half"], sig_audit["rough_half"], sig_audit["ratio"])
    )
    print(
        "pasted tau CI half-width %.3f vs rough team-sd half-width %.3f (ratio %.1f)"
        % (tau_audit["pasted_half"], tau_audit["rough_half"], tau_audit["ratio"])
    )
    assert hfa_audit["ratio"] > 10.0
    assert sig_audit["ratio"] > 10.0
    assert tau_audit["ratio"] > 8.0
    wind10 = PASTED["wind_per_mph"] * 10.0
    at_8 = zero_wind_baseline(PASTED["intercept"], PASTED["wind_per_mph"], 8.0)
    print(
        "pasted wind %.3f pts/mph = %.2f per 10 mph, R2=%.4f. Not re-fit. Not a -0.25 engine constant. Published addend stays -1.0 per 10 mph."
        % (PASTED["wind_per_mph"], wind10, PASTED["weather_r2"])
    )
    print(
        "pasted intercept %+.3f is the 0 mph outdoor baseline. At 8 mph it is %+.3f, not a +1.74 average miss."
        % (PASTED["intercept"], at_8)
    )
    assert abs(wind10 - (-1.97)) < 0.02
    assert abs(at_8 - 0.159) < 0.01

    synth = _synthetic_games(8, 480, 2.0, 3.0, 10.0, seed=3)
    fit = gibbs(synth, 8, iters=600, burn=200, seed=11)
    print(
        "synthetic recovery hfa %.2f (2) sigma %.2f (10) tau %.2f (3)"
        % (fit["hfa"], fit["sigma"], fit["tau"])
    )
    assert abs(fit["hfa"] - 2.0) < 1.0
    assert abs(fit["sigma"] - 10.0) < 1.5
    assert abs(fit["tau"] - 3.0) < 1.5

    path = os.path.normpath(GAMES_JSONL)
    if not os.path.isfile(path):
        print("games.jsonl not in this checkout. NFL Gibbs and the totals residual were not re-run.")
        print("hier_margins self_check ok")
        return

    games = load_margins(path)
    nfl = fit_named(games, iters=2000, burn=500, seed=7)
    print(
        "refit n=%d franchises=%d (OAK->LV, 2019+, settled, non-neutral). Not the pasted n=2025."
        % (nfl["n"], len(nfl["names"]))
    )
    print(
        "hfa %.2f CI %.2f..%.2f   sigma %.2f CI %.2f..%.2f   tau %.2f CI %.2f..%.2f"
        % (
            nfl["hfa"],
            nfl["hfa_ci"][0],
            nfl["hfa_ci"][1],
            nfl["sigma"],
            nfl["sigma_ci"][0],
            nfl["sigma_ci"][1],
            nfl["tau"],
            nfl["tau_ci"][0],
            nfl["tau_ci"][1],
        )
    )
    print("top", [(n, round(v, 2)) for n, v in nfl["order"][:6]], "NOT A PICK")
    print("bottom", [(n, round(v, 2)) for n, v in nfl["order"][-3:]], "NOT A PICK")
    assert nfl["n"] != PASTED["n"]
    assert nfl["hfa_ci"][1] - nfl["hfa_ci"][0] > 0.5
    assert abs(nfl["hfa"] - PASTED["hfa"]) < 0.4
    assert abs(nfl["sigma"] - PASTED["sigma"]) < 0.4
    assert nfl["order"][0][0] == "BUF"

    wx = totals_residual(path)
    print(
        "totals residual 2006-2018 n=%d mean %+.3f dome %+.3f outdoor %+.3f. No wind or temp column. Not the pasted n=2472 intercept +1.735 dome +0.000."
        % (wx["n"], wx["mean"], wx["dome_mean"], wx["outdoor_mean"])
    )
    assert wx["n"] != PASTED["weather_n"]
    assert abs(wx["dome_mean"] - wx["outdoor_mean"]) > 0.5
    print("hier_margins self_check ok")


if __name__ == "__main__":
    self_check()
