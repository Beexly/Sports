#!/usr/bin/env python3
"""novig_mu.py -- the no-vig continuous mean observable, scored once.

USER-AUTHORIZED OBSERVABLE CLASS (standing directive 2026-10-15): the location
lock (mu = spread_line) is the rule for residual/scale/tail constructions; the
devigged pre-kickoff MARKET EXPECTATION is the one construction permitted to
propose moving mu. This file MEASURES only. It never writes walk_forward.json,
never sets passed, and the emission harness still enforces mu == spread_line,
so nothing scored here can promote regardless of the number.

CONSTRUCTION
  p_h   = (1/O_home) / (1/O_home + 1/O_away)     (American closing MLs, de-vigged)
  z_h   = Phi^{-1}(p_h)
  mu_novig = SIGMA0 * z_h                        (the market's margin, continuous)
  mu_g  = (1-beta) * spread_line + beta * mu_novig
  sigma = SIGMA0 (13.45) fixed -- this is a MEAN observable, not a scale one.

PIT: beta fitted on strictly prior rows by exact Gaussian-CRPS running sums,
expanding window, min_prior=25, beta=0.0 when thin, scored ONCE, no retune.
Rows with a missing/unusable moneyline pair fall back to beta=0 for that row
(no imputed market probability) and are counted.

REPORTS delta vs the fixed baseline 7.154021 and PAIRED delta vs the joint
hetero-Gaussian 7.142622 recomputed row-by-row under the same PIT pattern.
Full-filter delta >= 0 vs baseline = terminal refusal.
"""
import json
import math
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
SIGMA0 = 13.45
GATE = 7.099
JOINT = 7.142622
GAMES = H.GAMES
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)),
                   "research", "novig-mu-2026-10-15.json")


def norm_ppf(p, lo=-8.0, hi=8.0, iters=70):
    target = 2.0 * p - 1.0
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        if math.erf(mid / math.sqrt(2.0)) < target:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def devig_p_correct(home_ml, away_ml):
    """American odds -> implied prob -> de-vigged home prob.
    i>0: p = i/(i+100);  i<0: p = -i/(-i+100)."""
    try:
        hm = float(home_ml); am = float(away_ml)
    except (TypeError, ValueError):
        return None
    if hm == 0 or am == 0 or hm != hm or am != am:
        return None
    ih = hm / (hm + 100.0) if hm > 0 else (-hm) / (-hm + 100.0)
    ia = am / (am + 100.0) if am > 0 else (-am) / (-am + 100.0)
    if ih <= 0 or ia <= 0:
        return None
    return ih / (ih + ia)


def main():
    import csv
    rows, skipped = H.load_frozen()
    base = H.score_baseline(rows)
    assert base["n"] == 2462 and abs(base["crps"] - 7.154021) <= 5e-5, \
        "baseline not reproduced -- refusing to score"

    # moneylines by game_id straight from the pinned games.csv (same file the
    # harness reads; harness rows drop ML columns)
    ml = {}
    with open(GAMES, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            ml[x["game_id"]] = (x.get("home_moneyline"), x.get("away_moneyline"))

    n = len(rows)
    mus = [r["spread_line"] for r in rows]
    ys = [r["margin"] for r in rows]

    p_h = []
    usable = []
    for r in rows:
        pair = ml.get(r["game_id"])
        ph = devig_p_correct(*pair) if pair else None
        if ph is None or not (0.0 < ph < 1.0):
            p_h.append(None)
            usable.append(False)
        else:
            p_h.append(ph)
            usable.append(True)
    mu_novig = [SIGMA0 * norm_ppf(ph) if ph is not None else None
               for ph in p_h]

    # joint hetero per-row reference (identical PIT pattern to pit_joint.py)
    grid_j = [-0.28 + i * (0.28 / 40.0) for i in range(41)]
    pairs_j = [(bs, bt) for bs in grid_j for bt in grid_j]
    run_j = [0.0] * len(pairs_j)
    xS = [abs(mus[i]) / 10.0 for i in range(n)]
    with open(GAMES, newline="", encoding="utf-8") as f:
        tl_map = {x["game_id"]: (float(x["total_line"]) if x.get("total_line") else 44.0)
                  for x in csv.DictReader(f)}
    xT = [tl_map.get(r["game_id"], 44.0) / 44.0 for r in rows]
    joint_crps = []
    for i in range(n):
        if i >= MIN_PRIOR:
            best_v, bS, bT = None, 0.0, 0.0
            for pi, (bs, bt) in enumerate(pairs_j):
                v = run_j[pi] / i
                if best_v is None or v < best_v:
                    best_v, bS, bT = v, bs, bt
        else:
            bS, bT = 0.0, 0.0
        sd = SIGMA0 * math.exp(max(-0.45, min(0.45, bS * xS[i] + bT * xT[i])))
        joint_crps.append(H.crps_gaussian(mus[i], sd, ys[i]))
        for pi, (bs, bt) in enumerate(pairs_j):
            sdp = SIGMA0 * math.exp(max(-0.45, min(0.45, bs * xS[i] + bt * xT[i])))
            run_j[pi] += H.crps_gaussian(mus[i], sdp, ys[i])

    # no-vig mu: beta grid [0, 1], running sums, prior only
    grid_b = [round(i * 0.05, 4) for i in range(21)]
    running_b = [0.0] * len(grid_b)
    cnt = 0
    crps_with, crps_base = [], []
    deltas = []
    paired = []
    betas = []
    unusable_rows = 0
    max_abs_mean = 0.0
    for i in range(n):
        if usable[i]:
            if cnt >= MIN_PRIOR:
                best_v, bb = None, 0.0
                for bi, b in enumerate(grid_b):
                    v = running_b[bi] / cnt
                    if best_v is None or v < best_v:
                        best_v, bb = v, b
            else:
                bb = 0.0
            mu_i = (1.0 - bb) * mus[i] + bb * mu_novig[i]
            shift = abs(mu_i - mus[i])
            max_abs_mean = max(max_abs_mean, shift)
        else:
            bb = 0.0
            mu_i = mus[i]
            unusable_rows += 1
        betas.append(bb)
        c_w = H.crps_gaussian(mu_i, SIGMA0, ys[i])
        c_b = H.crps_gaussian(mus[i], SIGMA0, ys[i])
        crps_with.append(c_w); crps_base.append(c_b)
        deltas.append(c_w - c_b)
        paired.append(c_w - joint_crps[i])
        if usable[i]:
            for bi, b in enumerate(grid_b):
                mu_p = (1.0 - b) * mus[i] + b * mu_novig[i]
                running_b[bi] += H.crps_gaussian(mu_p, SIGMA0, ys[i])
            cnt += 1

    mean_d = sum(deltas) / n
    se_d = math.sqrt(sum((d - mean_d) ** 2 for d in deltas) / (n * (n - 1)))
    mean_p = sum(paired) / n
    se_p = math.sqrt(sum((d - mean_p) ** 2 for d in paired) / (n * (n - 1)))
    implied = base["crps"] + mean_d

    res = {
        "construction": "mu = (1-beta)*spread_line + beta*SIGMA0*Phi^-1(devigged home ML prob); sigma fixed 13.45; beta expanding-window prior-only, min_prior=25",
        "date": "2026-10-15",
        "authorization": "user standing directive 2026-10-15 -- devigged market expectation is the one mean class permitted to propose moving mu; residual classes remain locked",
        "n": n,
        "usable_ml_rows": n - unusable_rows,
        "unusable_rows_fail_closed_to_beta0": unusable_rows,
        "baseline_crps": base["crps"],
        "implied_crps_novig_mu": round(implied, 6),
        "mean_delta_vs_baseline": round(mean_d, 6),
        "se_vs_baseline": round(se_d, 6),
        "t_vs_baseline": round(mean_d / se_d, 3) if se_d else None,
        "paired_delta_vs_joint_hetero": round(mean_p, 6),
        "se_paired": round(se_p, 6),
        "t_paired": round(mean_p / se_p, 3) if se_p else None,
        "joint_hetero_recomputed": round(sum(joint_crps) / n, 6),
        "beta_final": betas[-1],
        "beta_histogram": {str(k): v for k, v in sorted(Counter(betas).items())},
        "max_abs_mean_shift_rows": round(max_abs_mean, 4),
        "mean_abs_mean_shift_rows": round(
            sum(abs(((1 - betas[i]) * mus[i] + betas[i] * mu_novig[i]) - mus[i])
                for i in range(n) if mu_novig[i] is not None) / n, 4),
        "gate": GATE,
        "gate_cleared": implied <= GATE and mean_d < 0,
        "terminal_refusal_vs_baseline": mean_d >= 0,
        "promotable": False,
        "promotion_note": "the emission harness and walk_forward.json still enforce mu == spread_line; a measured mean-shift result informs the gate-decision record only.",
        "passed": False,
        "emission": "ZERO_OBJECT",
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
    print(json.dumps({k: res[k] for k in (
        "implied_crps_novig_mu", "mean_delta_vs_baseline", "se_vs_baseline", "t_vs_baseline",
        "paired_delta_vs_joint_hetero", "se_paired", "t_paired", "beta_final",
        "gate_cleared", "terminal_refusal_vs_baseline")}, indent=1))
    print("written", OUT)


if __name__ == "__main__":
    main()
