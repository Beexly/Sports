"""Props, teaser gap, team totals, half margin, OT blend, Kelly sketch, greedy DFS.

Stdlib only. No FLEX. Not an exact ILP. The SGP gap is joint minus independent,
not a tax. No network.
"""

import math
import random

import engine_math


# Published NFL overtime frequency. A normal margin never ties. Not a fit.
PUBLISHED_OT_RATE = 0.058

# No FLEX slot. Classic roster only.
ROSTER = {"QB": 1, "RB": 2, "WR": 3, "TE": 1, "DST": 1}


def team_totals(total, listed_spread):
    return engine_math.team_total_split(total, listed_spread)


def half_margin(mu_margin, sd, tau=0.5):
    """First-half margin ~ N(mu * tau, (sd * sqrt(tau))^2)."""
    if tau < 0.0:
        raise ValueError("tau")
    return mu_margin * tau, sd * math.sqrt(tau)


def blend_ot(p_home_normal, ot_rate=PUBLISHED_OT_RATE):
    """Insert a published OT rate. The normal itself contributes no tie mass."""
    p_home = (1.0 - ot_rate) * p_home_normal
    p_away = (1.0 - ot_rate) * (1.0 - p_home_normal)
    return {
        "p_home": p_home,
        "p_away": p_away,
        "p_ot": ot_rate,
        "label": "published magnitude, not a fit",
        "normal_tie": 0.0,
    }


def sgp_joint(mu_m, sd_m, thresh_m, mu_t, sd_t, thresh_t, rho, n=20000, seed=3):
    """P(margin > thresh_m, total > thresh_t) versus the independent product.

    Gap is joint minus independent. Not a tax.
    """
    rng = random.Random(seed)
    both = 0
    m_only = 0
    t_only = 0
    a = math.sqrt(max(rho, 0.0))
    b = math.sqrt(max(1.0 - rho, 0.0))
    sign = 1.0 if rho >= 0.0 else -1.0
    for _ in range(n):
        z = rng.gauss(0.0, 1.0)
        e1 = rng.gauss(0.0, 1.0)
        e2 = rng.gauss(0.0, 1.0)
        margin = mu_m + sd_m * (sign * a * z + b * e1)
        total = mu_t + sd_t * (a * z + b * e2)
        win_m = margin > thresh_m
        win_t = total > thresh_t
        if win_m:
            m_only += 1
        if win_t:
            t_only += 1
        if win_m and win_t:
            both += 1
    p_m = m_only / n
    p_t = t_only / n
    joint = both / n
    independent = p_m * p_t
    return {
        "joint": joint,
        "independent": independent,
        "gap": joint - independent,
        "p_margin": p_m,
        "p_total": p_t,
        "rho": rho,
        "note": "gap is joint minus independent, not a tax",
    }


def _wealth_growth(p1, b1, p2, b2, rho, f1, f2, n=4000, seed=1):
    """Expected log growth under a Gaussian copula. b is net decimal odds (dec - 1)."""
    rng = random.Random(seed)
    t1 = engine_math.normal_ppf(min(max(p1, 1e-6), 1.0 - 1e-6))
    t2 = engine_math.normal_ppf(min(max(p2, 1e-6), 1.0 - 1e-6))
    a = math.sqrt(max(rho, 0.0))
    c = math.sqrt(max(1.0 - rho, 0.0))
    total = 0.0
    used = 0
    for _ in range(n):
        z = rng.gauss(0.0, 1.0)
        u = a * z + c * rng.gauss(0.0, 1.0)
        v = a * z + c * rng.gauss(0.0, 1.0)
        win1 = u < t1
        win2 = v < t2
        wealth = 1.0 + f1 * (b1 if win1 else -1.0) + f2 * (b2 if win2 else -1.0)
        if wealth <= 1e-12:
            return float("-inf")
        total += math.log(wealth)
        used += 1
    return total / used


def correlated_kelly(p1, dec1, p2, dec2, rho, steps=21):
    """Small grid sketch. Prints its own growth. Not the dossier 0.0167 / 0.0115 pair."""
    b1 = dec1 - 1.0
    b2 = dec2 - 1.0
    best = None
    for i in range(steps):
        for j in range(steps):
            f1 = 0.25 * i / (steps - 1)
            f2 = 0.25 * j / (steps - 1)
            growth = _wealth_growth(p1, b1, p2, b2, rho, f1, f2)
            if best is None or growth > best[0]:
                best = (growth, f1, f2)
    return {
        "growth": best[0],
        "f1": best[1],
        "f2": best[2],
        "rho": rho,
        "note": "sketch, not a dossier Kelly pair and not a tax",
    }


def lineup_salary(lineup):
    return sum(p["salary"] for p in lineup)


def greedy_dfs(players, cap, roster=None):
    """Greedy points-per-dollar fill. over_cap is a flag, not a silent accept.

    Not an exact ILP. No FLEX.
    """
    if roster is None:
        roster = ROSTER
    if "FLEX" in roster:
        raise ValueError("FLEX is out of this sketch")
    chosen = []
    spent = 0
    for pos, need in roster.items():
        pool = [p for p in players if p["pos"] == pos]
        pool.sort(key=lambda p: p["proj"] / p["salary"], reverse=True)
        taken = 0
        for player in pool:
            if taken >= need:
                break
            if spent + player["salary"] <= cap:
                chosen.append(player)
                spent += player["salary"]
                taken += 1
    return {
        "lineup": chosen,
        "salary": spent,
        "over_cap": spent > cap,
        "filled": len(chosen),
        "exact_ilp": False,
    }


def flag_over_cap(lineup, cap):
    spent = lineup_salary(lineup)
    return {"salary": spent, "over_cap": spent > cap, "exact_ilp": False}


def self_check():
    home, away = team_totals(48.5, -3.0)
    wrong = (48.5 + (-3.0)) / 2.0
    print("team totals -3 on 48.5 -> %.2f / %.2f (wrong home %.2f)" % (home, away, wrong))
    assert abs(home - 25.75) < 1e-12 and abs(away - 22.75) < 1e-12
    assert abs(wrong - home) > 1.0

    mu_h, sd_h = half_margin(3.0, engine_math.LADDER_SD, 0.5)
    print("half margin mu %.2f sd %.4f (sqrt tau)" % (mu_h, sd_h))
    assert abs(mu_h - 1.5) < 1e-12
    assert abs(sd_h - engine_math.LADDER_SD / math.sqrt(2.0)) < 1e-12

    p_reg = engine_math.home_win_prob(3.5)
    blend = blend_ot(p_reg)
    print(
        "OT blend published %.1f%% label=%s  home %.4f away %.4f (normal tie %.1f)"
        % (100 * blend["p_ot"], blend["label"], blend["p_home"], blend["p_away"], blend["normal_tie"])
    )
    assert abs(blend["p_ot"] - 0.058) < 1e-15
    assert "not a fit" in blend["label"]
    assert abs(blend["p_home"] + blend["p_away"] + blend["p_ot"] - 1.0) < 1e-12
    assert blend["normal_tie"] == 0.0

    indep = sgp_joint(3.0, 13.45, 0.0, 45.0, 10.0, 45.0, 0.0)
    corr = sgp_joint(3.0, 13.45, 0.0, 45.0, 10.0, 45.0, 0.35)
    print(
        "sgp rho 0 joint %.4f product %.4f gap %+.4f"
        % (indep["joint"], indep["independent"], indep["gap"])
    )
    print(
        "sgp rho 0.35 joint %.4f product %.4f gap %+.4f (not a tax)"
        % (corr["joint"], corr["independent"], corr["gap"])
    )
    assert abs(indep["gap"]) < 0.015
    assert abs(corr["gap"]) > abs(indep["gap"])
    assert "not a tax" in corr["note"]

    k0 = correlated_kelly(0.55, 2.0, 0.55, 2.0, 0.0)
    k1 = correlated_kelly(0.55, 2.0, 0.55, 2.0, 0.5)
    print(
        "kelly sketch rho 0 growth %.4f f=(%.3f, %.3f); rho 0.5 growth %.4f f=(%.3f, %.3f)"
        % (k0["growth"], k0["f1"], k0["f2"], k1["growth"], k1["f1"], k1["f2"])
    )
    print("kelly numbers are this sketch, not dossier 0.0167 vs 0.0115")
    assert k0["growth"] > 0.0
    assert k0["f1"] > 0.0 and k1["f1"] >= 0.0

    players = [
        {"name": "QB1", "pos": "QB", "salary": 7000, "proj": 22.0},
        {"name": "QB2", "pos": "QB", "salary": 5000, "proj": 14.0},
        {"name": "RB1", "pos": "RB", "salary": 8000, "proj": 20.0},
        {"name": "RB2", "pos": "RB", "salary": 6000, "proj": 16.0},
        {"name": "RB3", "pos": "RB", "salary": 4000, "proj": 9.0},
        {"name": "WR1", "pos": "WR", "salary": 7500, "proj": 18.0},
        {"name": "WR2", "pos": "WR", "salary": 5500, "proj": 14.0},
        {"name": "WR3", "pos": "WR", "salary": 4500, "proj": 11.0},
        {"name": "WR4", "pos": "WR", "salary": 3500, "proj": 7.0},
        {"name": "TE1", "pos": "TE", "salary": 4000, "proj": 10.0},
        {"name": "DST1", "pos": "DST", "salary": 3000, "proj": 8.0},
    ]
    assert "FLEX" not in ROSTER
    built = greedy_dfs(players, cap=50000)
    print(
        "greedy dfs salary %d over_cap %s exact_ilp %s filled %d"
        % (built["salary"], built["over_cap"], built["exact_ilp"], built["filled"])
    )
    assert built["over_cap"] is False
    assert built["salary"] <= 50000
    assert built["exact_ilp"] is False
    assert built["filled"] == sum(ROSTER.values())
    bloated = flag_over_cap(players, cap=10000)
    assert bloated["over_cap"] is True
    print("props_optimizer self_check ok")


if __name__ == "__main__":
    self_check()
