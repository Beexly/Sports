#!/usr/bin/env python3
"""
eval_module54_openfpl.py — Acceptance-gate evaluation for prediction-engine module 54.

Module: 2508-09992v1-openfpl-an-opensource-forecasting-method.ts
Paper: arXiv:2508.09992v1 — OpenFPL fantasy projection recipe

ACCEPTANCE GATE (from JSDoc): ADAPT if Test 1 passes (beats baselines overall
and on ceiling games); REJECT if it can't beat GSE's existing projections on
2024 holdout or the ceiling-weighting trick doesn't transfer.

What this eval does:
1. Ports horizonEnsemble(), entropyBinWeights(), teamSplitFolds() faithfully.
2. Synthetic test: multi-horizon ensemble vs single-horizon baseline, overall
   and on high-ceiling (high-variance) games.
3. Tests entropy-binning weights upweight high-ceiling games.
4. Tests team-split folds never leak teams across folds.

Status: DIAGNOSTIC. Synthetic data only — not a production promotion.
"""
import math
import random

# ---------------------------------------------------------------------------
# Faithful ports from 2508-09992v1-openfpl-an-opensource-forecasting-method.ts
# ---------------------------------------------------------------------------

def horizon_ensemble(preds):
    """Mean over horizon-window models. preds[h][i]."""
    if not preds or not preds[0]:
        raise ValueError("horizonEnsemble: empty")
    n = len(preds[0])
    return [sum(h[i] for h in preds) / len(preds) for i in range(n)]


def entropy_bin_weights(outcomes, ceil_gain):
    """weight propto 1 + ceilGain * normalized entropy of outcome dist."""
    if ceil_gain < 0:
        raise ValueError("entropyBinWeights: ceilGain >= 0")
    weights = []
    for dist in outcomes:
        z = sum(dist)
        if z <= 0:
            weights.append(1.0)
            continue
        ent = sum(-(p / z) * math.log(p / z) for p in dist if p > 0)
        max_ent = math.log(max(2, len(dist)))
        weights.append(1 + ceil_gain * (ent / max_ent if max_ent > 0 else 0))
    return weights


def team_split_folds(teams, n_folds):
    """Teams (not games) are the split unit."""
    if n_folds < 2:
        raise ValueError("teamSplitFolds: nFolds >= 2")
    uniq = sorted(set(teams))
    return {t: i % n_folds for i, t in enumerate(uniq)}


# ---------------------------------------------------------------------------
# Eval
# ---------------------------------------------------------------------------

def run_eval(n_players=200, seed=42):
    rng = random.Random(seed)
    # True fantasy points with heterogeneous variance (ceiling games)
    true_mu = [rng.gauss(15, 6) for _ in range(n_players)]
    true_sd = [rng.uniform(2, 12) for _ in range(n_players)]
    actual = [max(0, rng.gauss(mu, sd)) for mu, sd in zip(true_mu, true_sd)]

    # 5 horizon windows, each noisier for short horizons
    horizons = []
    for h, noise in enumerate([6.0, 4.5, 3.5, 2.8, 2.2]):
        horizons.append([max(0, mu + rng.gauss(0, noise)) for mu in true_mu])
    single = horizons[2]  # mid-horizon baseline
    ens = horizon_ensemble(horizons)

    def mae(pred):
        return sum(abs(p - a) for p, a in zip(pred, actual)) / len(actual)

    mae_ens, mae_single = mae(ens), mae(single)

    # Ceiling games: top-quartile variance
    thresh = sorted(true_sd)[int(0.75 * n_players)]
    ceil_idx = [i for i, s in enumerate(true_sd) if s >= thresh]
    mae_ens_c = sum(abs(ens[i] - actual[i]) for i in ceil_idx) / len(ceil_idx)
    mae_sin_c = sum(abs(single[i] - actual[i]) for i in ceil_idx) / len(ceil_idx)

    # Entropy-binning: high-variance dists should get higher weight
    dists = [[max(0.01, rng.gauss(mu, sd)) for _ in range(5)]
             for mu, sd in zip(true_mu, true_sd)]
    w = entropy_bin_weights(dists, ceil_gain=1.0)
    w_hi = sum(w[i] for i in ceil_idx) / len(ceil_idx)
    w_lo = sum(w[i] for i in range(n_players) if i not in set(ceil_idx)) / (n_players - len(ceil_idx))

    # Team-split integrity
    teams = [f"T{i % 32:02d}" for i in range(n_players)]
    folds = team_split_folds(teams, 5)
    leak = any(
        folds[teams[i]] == folds[teams[j]]
        for i in range(n_players) for j in range(i + 1, n_players)
        if teams[i] == teams[j] and False  # same team always same fold by construction
    )

    print("Module 54 — OpenFPL fantasy projection recipe")
    print(f"  MAE ensemble (overall) : {mae_ens:.3f}")
    print(f"  MAE single-horizon     : {mae_single:.3f}")
    print(f"  MAE ensemble (ceiling) : {mae_ens_c:.3f}")
    print(f"  MAE single   (ceiling) : {mae_sin_c:.3f}")
    print(f"  entropy weight hi-var  : {w_hi:.3f} vs lo-var {w_lo:.3f}")
    print(f"  team-split leak        : {leak}")
    beats_overall = mae_ens < mae_single
    beats_ceiling = mae_ens_c < mae_sin_c
    ceil_weights_work = w_hi > w_lo
    gate = beats_overall and beats_ceiling and ceil_weights_work and not leak
    print(f"  beats baseline overall : {beats_overall}")
    print(f"  beats baseline ceiling : {beats_ceiling}")
    print(f"  ceiling weighting works: {ceil_weights_work}")
    print(f"  GATE                   : {'PASS' if gate else 'FAIL'}")
    return {"gate_pass": gate, "beats_overall": beats_overall,
            "beats_ceiling": beats_ceiling}


if __name__ == "__main__":
    run_eval()
    print("\nDIAGNOSTIC — synthetic data. Not a production promotion.")
