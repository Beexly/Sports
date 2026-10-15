#!/usr/bin/env python3
"""score_hybrid.py -- walk-forward scoring of the energy-form hybrid on the frozen filter.
DIAGNOSTIC ONLY. Writes dfs/walk_forward/hybrid_result.json and nothing else.
It never writes walk_forward.json and never sets passed.

Order of operations (FROZEN -- do not reorder):
  1. fit rest-beta on strictly prior weeks -> modulated sigma
  2. estimate cell-conditional residual-relative excess under that sigma
  3. overlay the atoms on the modulated continuous distribution
  4. score with energy-form CRPS
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hybrid_crps as hc
import rest_beta as rb
import load_filter as lf

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hybrid_result.json")
REPRO_TARGET = 7.129681
GATE = 7.099


def _weeks(games):
    i = 0
    while i < len(games):
        j = i
        while j < len(games) and (games[j]["season"], games[j]["week"]) == (games[i]["season"], games[i]["week"]):
            j += 1
        yield games[i:j]
        i = j


def score(games, leak=False):
    """Walk-forward over `games` (already sorted by season, week, game_id).

    leak=False: beta and excess are fit on STRICTLY PRIOR weeks only. Correct.
    leak=True : fit on every game seen so far INCLUDING the week being scored.
                Used only by the leak test to prove prior-only is not better
                than the leaky version by more than noise.
    """
    games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
    history = []
    all_prior = []
    crps_h, crps_g = [], []
    levels, betas = {}, []

    for block in _weeks(games):
        pool = all_prior if leak else history
        beta = rb.fit_rest_beta(pool)
        betas.append(beta)
        for g in block:
            f = rb.rest_feature(g.get("home_rest"), g.get("away_rest"))
            if beta is None or f is None:
                sd, p3, p7, lvl = rb.SIGMA_BASE, 0.0, 0.0, 4
            else:
                sd = rb.modulated_sigma(rb.SIGMA_BASE, beta, f)
                lvl, p3, p7 = rb.excess_mass(pool, *rb._game_bins(g))
            levels[lvl] = levels.get(lvl, 0) + 1
            crps_h.append(hc.crps_energy(g["spread"], sd, p3, p7, g["margin"]))
            crps_g.append(hc.crps_energy(g["spread"], rb.SIGMA_BASE, 0.0, 0.0, g["margin"]))
        for g in block:
            history.append(g)
            all_prior.append(g)

    n = len(crps_h)
    if n == 0:
        raise ValueError("no games scored")
    mean_h = sum(crps_h) / n
    mean_g = sum(crps_g) / n
    return {
        "n": n,
        "gaussian_crps": round(mean_g, 6),
        "hybrid_crps": round(mean_h, 6),
        "delta": round(mean_h - mean_g, 6),
        "fallback_levels": {str(k): v for k, v in sorted(levels.items())},
        "beta_last": betas[-1] if betas else None,
        "leak": leak,
        "reproduction_target": REPRO_TARGET,
        "reproduced_within_1e-4": abs(mean_h - REPRO_TARGET) <= 1e-4,
        "gate": GATE,
        "gate_cleared": mean_h <= GATE and n >= 150,
        "passed": False,
        "mu": "spread_line",
        "sigma_base": rb.SIGMA_BASE,
        "beta_bound": rb.BETA_BOUND,
        "atoms": "residual-relative +-3, +-7",
    }


if __name__ == "__main__":
    games, skipped = lf.load_filter()
    res = score(games, leak=False)
    res["skipped_rows"] = skipped
    with open(OUT_PATH, "w") as fh:
        json.dump(res, fh, indent=1)
    print(json.dumps(res, indent=1))
    print("written", OUT_PATH)
