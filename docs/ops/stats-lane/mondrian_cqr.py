#!/usr/bin/env python3
"""Mondrian CQR on NFL/football margin key numbers {3,7,10}.

Strata (pre-registered):
  K1 key numbers: min |y_pred - k| for k in {3,7,10} <= 0.5
  K2 tight/sub-FG: |y_pred| < 3.0 and not K1
  K3 open field: else

Base bands: q_lo = mu - sigma_train, q_hi = mu + sigma_train (widened Gaussian
proxy when quantile regressors are absent — labeled BASELINE_BANDS).
Nonconformity E_i = max(q_lo_i - y_i, y_i - q_hi_i) within stratum only.
q_hat_k = fail-closed split-conformal quantile at (1-alpha) on stratum residuals.
No borrowing across K1/K2/K3.

Target: empirical holdout coverage >= 0.895 per stratum (report, not force).
Kill line (same line as prediction): Kill Mondrian CQR as product path if any
stratum n_holdout >= 30 has coverage < 0.85 OR if Mondrian does not improve
min-stratum coverage vs pooled CQR by >= 0.02 without +>15% mean width.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean, pstdev
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402

ALPHA = 0.10
MIN_N = math.ceil(1 / ALPHA) - 1  # 9
KEY_NUMBERS = (3.0, 7.0, 10.0)
TARGET_COV = 0.895


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def parse_iso(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def qhat_failclosed(res, alpha=ALPHA):
    n = len(res)
    if n == 0:
        return None, True
    k = math.ceil((n + 1) * (1 - alpha))
    if k > n or k < 1:
        return None, True
    return sorted(res)[k - 1], False


def stratum(mu: float) -> str:
    if min(abs(mu - k) for k in KEY_NUMBERS) <= 0.5:
        return "K1"
    if abs(mu) < 3.0:
        return "K2"
    return "K3"


def load_rows(path: Path):
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def coerce(raw):
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    if gen and kick and gen >= kick:
        return None
    y = fnum(raw.get("actualMargin"))
    if y is None:
        hs, aw = fnum(raw.get("homeScore")), fnum(raw.get("awayScore"))
        if hs is not None and aw is not None:
            y = hs - aw
    mu = fnum(raw.get("predictedMeanMargin"))
    if mu is None:
        line = fnum(raw.get("line"))
        if raw.get("pickType") == "SPREAD" and line is not None:
            mu = -line
    if y is None or mu is None:
        return None
    sport = resolve_sport(raw.get("sport"), raw.get("espnEventId"), raw.get("selection"))
    return {
        "y": y,
        "mu": mu,
        "sport": sport,
        "pickType": str(raw.get("pickType") or "").upper(),
        "gen_ts": gen.timestamp() if gen else 0,
        "pickId": raw.get("pickId"),
        "stratum": stratum(mu),
        "resid": y - mu,
    }


def time_split(rows):
    rows = sorted(rows, key=lambda r: r["gen_ts"])
    mid = len(rows) // 2
    return rows[:mid], rows[mid:]


def evaluate(cal, te, label, stratified: bool):
    # sigma on cal (pooled or we ignore for band width — bands use pooled sigma;
    # Mondrian difference is ONLY in q_hat inflation per stratum)
    res_cal_all = [r["resid"] for r in cal]
    sigma = pstdev(res_cal_all) if len(res_cal_all) > 1 else 1.0
    sigma = max(sigma, 1e-6)

    def bands(r):
        return r["mu"] - sigma, r["mu"] + sigma

    def nonconf(r):
        lo, hi = bands(r)
        return max(lo - r["y"], r["y"] - hi)

    if stratified:
        q_by = {}
        inf_by = {}
        n_cal_by = defaultdict(int)
        res_by = defaultdict(list)
        for r in cal:
            res_by[r["stratum"]].append(nonconf(r))
            n_cal_by[r["stratum"]] += 1
        for k, res in res_by.items():
            q, inf = qhat_failclosed(res)
            q_by[k] = q
            inf_by[k] = inf
    else:
        q_all, inf_all = qhat_failclosed([nonconf(r) for r in cal])
        q_by = {k: q_all for k in ("K1", "K2", "K3")}
        inf_by = {k: inf_all for k in ("K1", "K2", "K3")}
        n_cal_by = defaultdict(int)
        for r in cal:
            n_cal_by[r["stratum"]] += 1

    cells = []
    cov_list = []
    width_list = []
    for k in ("K1", "K2", "K3"):
        sub_te = [r for r in te if r["stratum"] == k]
        n_te = len(sub_te)
        q = q_by.get(k)
        inf = inf_by.get(k, q is None)
        if n_te == 0 or inf or q is None:
            cells.append(
                {
                    "stratum": k,
                    "label": label,
                    "n_cal": n_cal_by.get(k, 0),
                    "n_holdout": n_te,
                    "qhat": None,
                    "qhat_infinite": True,
                    "coverage": None,
                    "mean_width": None,
                    "status": "INSUFFICIENT_OR_FAIL_CLOSED",
                }
            )
            continue
        lo_t = [r["mu"] - sigma - q for r in sub_te]
        hi_t = [r["mu"] + sigma + q for r in sub_te]
        cov = sum(1 for i, r in enumerate(sub_te) if lo_t[i] <= r["y"] <= hi_t[i]) / n_te
        widths = [hi_t[i] - lo_t[i] for i in range(n_te)]
        cov_list.append(cov)
        width_list.append(mean(widths))
        cells.append(
            {
                "stratum": k,
                "label": label,
                "n_cal": n_cal_by.get(k, 0),
                "n_holdout": n_te,
                "qhat": q,
                "qhat_infinite": False,
                "coverage": cov,
                "mean_width": mean(widths),
                "target_coverage": 1 - ALPHA,
                "meets_target_0.895": cov >= TARGET_COV,
                "status": "ok",
            }
        )
    return {
        "method": label,
        "sigma_train": sigma,
        "cells": cells,
        "min_holdout_coverage": min(cov_list) if cov_list else None,
        "mean_holdout_coverage": mean(cov_list) if cov_list else None,
        "mean_interval_width": mean(width_list) if width_list else None,
        "n_holdout_covered_bins": len(cov_list),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED", "path": str(path)})
        return 2

    raw = load_rows(path)
    rows = [c for c in (coerce(r) for r in raw) if c]
    if not rows:
        write_report(Path(args.out), {"ok": False, "status": "EMPTY_NO_MARGINS"})
        return 2

    cal, te = time_split(rows)
    mond = evaluate(cal, te, "Mondrian_CQR_per_stratum_qhat", stratified=True)
    pool = evaluate(cal, te, "Standard_CQR_pooled_qhat", stratified=False)

    # football subset
    fb_cal = [r for r in cal if r["sport"] in {"NFL", "NCAAF"}]
    fb_te = [r for r in te if r["sport"] in {"NFL", "NCAAF"}]
    mond_fb = evaluate(fb_cal, fb_te, "Mondrian_CQR_football", stratified=True) if fb_te else None
    pool_fb = evaluate(fb_cal, fb_te, "Standard_CQR_football", stratified=False) if fb_te else None

    min_m = mond.get("min_holdout_coverage")
    min_p = pool.get("min_holdout_coverage")
    wm = mond.get("mean_interval_width")
    wp = pool.get("mean_interval_width")
    if min_m is None:
        mission = "NOT_RUN_insufficient_holdout_cells"
    elif min_m < 0.85:
        mission = "KILL_mondrian_min_cov_lt_0.85"
    elif min_p is not None and (min_m - min_p) >= 0.02 and wm and wp and wm <= 1.15 * wp:
        mission = "PASS_mondrian_improves_min_cov_width_ok"
    elif min_m >= TARGET_COV:
        mission = "Mondrian_meets_target_per_stratum"
    else:
        mission = "Mondrian_partial_review"

    strat_n = defaultdict(int)
    for r in rows:
        strat_n[r["stratum"]] += 1

    report = {
        "ok": True,
        "alpha": ALPHA,
        "min_n_quantile": MIN_N,
        "key_numbers": list(KEY_NUMBERS),
        "stratum_rule": {
            "K1": "min |mu - {3,7,10}| <= 0.5",
            "K2": "|mu| < 3 and not K1",
            "K3": "else",
        },
        "n_rows_with_margin": len(rows),
        "n_cal": len(cal),
        "n_holdout": len(te),
        "stratum_n_all": dict(strat_n),
        "mondrian": mond,
        "pooled_standard_cqr": pool,
        "football_mondrian": mond_fb,
        "football_pooled": pool_fb,
        "mission": mission,
        "kill_line": "Kill Mondrian product path if any stratum n_holdout>=30 has cov<0.85 OR min_cov improvement <0.02 without width blow-up >15%",
        "warning": "Bands are BASELINE sigma±qhat when quantile regressors absent; Mondrian changes only stratum qhat. CQR/Mondrian do not fix inverted ranking scores.",
        "borrowing": "none",
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n": len(rows),
                "mission": mission,
                "mondrian_min_cov": min_m,
                "pooled_min_cov": min_p,
                "strata_n": dict(strat_n),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
