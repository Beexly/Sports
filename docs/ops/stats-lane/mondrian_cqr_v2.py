#!/usr/bin/env python3
"""Mondrian CQR v2 — per-stratum residual sigma (K1/K2/K3), fail-closed qhat.

Replacement for v1 pooled-sigma bands that left K1/K3 under 0.85.
Kill line unchanged: any stratum n_te>=30 with cov<0.85 → kill product path
for this residual model; min_cov must also beat pooled by >=0.02 or stay
honest that Mondrian did not help.
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
from mondrian_cqr import stratum, fnum, parse_iso, qhat_failclosed, ALPHA, TARGET_COV, KEY_NUMBERS  # noqa: E402


def load_rows(path: Path):
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


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
        if str(raw.get("pickType") or "").upper() == "SPREAD" and line is not None:
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
        "stratum": stratum(mu),
        "resid": y - mu,
        "pickId": raw.get("pickId"),
    }


def time_split(rows):
    rows = sorted(rows, key=lambda r: r["gen_ts"])
    mid = len(rows) // 2
    return rows[:mid], rows[mid:]


def evaluate_v2(cal, te, label, per_stratum_sigma: bool, sport_sigma: bool = False):
    # residual sigma
    if sport_sigma:
        sig_by_sport = defaultdict(list)
        for r in cal:
            sig_by_sport[r["sport"]].append(r["resid"])
        sigma_sport = {k: max(pstdev(v), 0.25) if len(v) > 1 else 5.0 for k, v in sig_by_sport.items()}
        sigma_pool = max(pstdev([r["resid"] for r in cal]), 0.25) if len(cal) > 1 else 5.0
    else:
        sigma_sport = {}
        sigma_pool = max(pstdev([r["resid"] for r in cal]), 0.25) if len(cal) > 1 else 5.0

    res_by = defaultdict(list)
    n_cal_by = defaultdict(int)
    for r in cal:
        sig = sigma_sport.get(r["sport"], sigma_pool) if sport_sigma else (
            pstdev([x["resid"] for x in cal if x["stratum"] == r["stratum"]]) if per_stratum_sigma else sigma_pool
        )
        if per_stratum_sigma and not sport_sigma:
            # recompute per stratum once below
            pass
        lo, hi = r["mu"] - (sig if not per_stratum_sigma else 0), r["mu"] + (sig if not per_stratum_sigma else 0)
        # placeholder — real nonconf computed after sigma tables built
        res_by[r["stratum"]].append(r)
        n_cal_by[r["stratum"]] += 1

    # build sigma tables
    if per_stratum_sigma and not sport_sigma:
        sig_stratum = {}
        for k in ("K1", "K2", "K3"):
            v = [r["resid"] for r in cal if r["stratum"] == k]
            sig_stratum[k] = max(pstdev(v), 0.25) if len(v) > 1 else sigma_pool
    else:
        sig_stratum = {k: sigma_pool for k in ("K1", "K2", "K3")}

    def sigma_for(r):
        if sport_sigma:
            return sigma_sport.get(r["sport"], sigma_pool)
        return sig_stratum.get(r["stratum"], sigma_pool)

    def nonconf(r):
        s = sigma_for(r)
        return max((r["mu"] - s) - r["y"], r["y"] - (r["mu"] + s))

    q_by, inf_by = {}, {}
    for k in ("K1", "K2", "K3"):
        res = [nonconf(r) for r in cal if r["stratum"] == k]
        q, inf = qhat_failclosed(res)
        q_by[k] = q
        inf_by[k] = inf

    cells = []
    covs, widths = [], []
    for k in ("K1", "K2", "K3"):
        sub = [r for r in te if r["stratum"] == k]
        n_te = len(sub)
        q = q_by[k]
        inf = inf_by[k]
        sigs = [sigma_for(r) for r in sub]
        sig_mean = mean(sigs) if sigs else sigma_pool
        if n_te == 0 or inf or q is None:
            cells.append(
                {
                    "stratum": k,
                    "label": label,
                    "n_cal": n_cal_by.get(k, 0),
                    "n_holdout": n_te,
                    "qhat": None,
                    "sigma_mean_holdout": sig_mean,
                    "coverage": None,
                    "mean_width": None,
                    "qhat_infinite": True,
                    "status": "INSUFFICIENT_OR_FAIL_CLOSED",
                }
            )
            continue
        covered = 0
        wsum = 0.0
        for r in sub:
            s = sigma_for(r)
            lo, hi = r["mu"] - s - q, r["mu"] + s + q
            if lo <= r["y"] <= hi:
                covered += 1
            wsum += hi - lo
        cov = covered / n_te
        covs.append(cov)
        widths.append(wsum / n_te)
        cells.append(
            {
                "stratum": k,
                "label": label,
                "n_cal": n_cal_by.get(k, 0),
                "n_holdout": n_te,
                "qhat": q,
                "sigma_mean_holdout": sig_mean,
                "coverage": cov,
                "mean_width": wsum / n_te,
                "meets_target_0.895": cov >= TARGET_COV,
                "meets_floor_0.85": cov >= 0.85,
                "qhat_infinite": False,
                "status": "ok",
            }
        )
    return {
        "method": label,
        "sigma_mode": "sport" if sport_sigma else ("stratum" if per_stratum_sigma else "pooled"),
        "sigma_stratum": sig_stratum if per_stratum_sigma and not sport_sigma else None,
        "sigma_pool": sigma_pool,
        "cells": cells,
        "min_holdout_coverage": min(covs) if covs else None,
        "mean_holdout_coverage": mean(covs) if covs else None,
        "mean_interval_width": mean(widths) if widths else None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [c for c in (coerce(r) for r in load_rows(path)) if c]
    if not rows:
        write_report(Path(args.out), {"ok": False, "status": "EMPTY"})
        return 2
    cal, te = time_split(rows)

    v2_stratum = evaluate_v2(cal, te, "Mondrian_CQR_v2_stratum_sigma", per_stratum_sigma=True)
    v2_sport = evaluate_v2(cal, te, "Mondrian_CQR_v2_sport_sigma", per_stratum_sigma=False, sport_sigma=True)
    v1_pool = evaluate_v2(cal, te, "Mondrian_CQR_v1_pooled_sigma", per_stratum_sigma=False)

    def mission(body):
        cells = body.get("cells") or []
        bad = [c for c in cells if (c.get("n_holdout") or 0) >= 30 and (c.get("coverage") or 1) < 0.85]
        min_c = body.get("min_holdout_coverage")
        if bad:
            return "KILL_cov_lt_0.85_on_" + ",".join(c["stratum"] for c in bad)
        if min_c is None:
            return "NOT_RUN"
        if min_c >= TARGET_COV:
            return "PASS_all_strata_ge_0.895"
        if min_c >= 0.85:
            return "PASS_floor_0.85_below_target"
        return "REVIEW_min_cov_below_0.85"

    report = {
        "ok": True,
        "version": "v2",
        "n_rows": len(rows),
        "n_cal": len(cal),
        "n_holdout": len(te),
        "key_numbers": list(KEY_NUMBERS),
        "v1_pooled_sigma": {**v1_pool, "mission": mission(v1_pool)},
        "v2_stratum_sigma": {**v2_stratum, "mission": mission(v2_stratum)},
        "v2_sport_sigma": {**v2_sport, "mission": mission(v2_sport)},
        "kill_line": "n_te>=30 and cov<0.85 kills that residual model for product; report 1-alpha vs actual with n",
        "warning": "Per-stratum/sport sigma is a band-width replacement, not a ranking fix.",
        "borrowing": "none across K1/K2/K3",
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "v1": report["v1_pooled_sigma"]["mission"],
                "v2_stratum": report["v2_stratum_sigma"]["mission"],
                "v2_sport": report["v2_sport_sigma"]["mission"],
                "min_cov": {
                    "v1": v1_pool.get("min_holdout_coverage"),
                    "v2s": v2_stratum.get("min_holdout_coverage"),
                    "v2sp": v2_sport.get("min_holdout_coverage"),
                },
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
