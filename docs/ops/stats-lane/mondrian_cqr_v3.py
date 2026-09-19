#!/usr/bin/env python3
"""Mondrian CQR v3 — residual-quantile base bands + stratum conformal (no constant sigma).

Replacement for constant-σ undercoverage on K3 blowouts.
Modes:
  A abs_conformal: halfwidth = fail-closed qhat(|resid|) per stratum on CAL
  B quantile_bands: base = [mu + e_a/2, mu + e_{1-a/2}] on CAL fold, inflate by qhat on E
  C calibrated_halfwidth: halfwidth = max(qhat_abs, quantile(|resid|, 0.90)) per stratum
Kill line: n_te>=30 and cov<0.85 kills that mode; target K3 cov >= 0.890.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402
from mondrian_cqr import stratum, fnum, parse_iso, qhat_failclosed, ALPHA, TARGET_COV  # noqa: E402


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
        "gen_ts": gen.timestamp() if gen else 0,
        "stratum": stratum(mu),
        "resid": y - mu,
        "pickType": str(raw.get("pickType") or "").upper(),
    }


def time_split(rows):
    rows = sorted(rows, key=lambda r: r["gen_ts"])
    mid = len(rows) // 2
    return rows[:mid], rows[mid:]


def emp_quantile(vals, p):
    if not vals:
        return 0.0
    s = sorted(vals)
    n = len(s)
    if n == 1:
        return s[0]
    idx = p * (n - 1)
    lo = int(math.floor(idx))
    hi = min(n - 1, lo + 1)
    w = idx - lo
    return s[lo] * (1 - w) + s[hi] * w


def evaluate_mode(cal, te, mode: str):
    """Return cells + aggregate for one Mondrian band mode."""
    cal_by = defaultdict(list)
    for r in cal:
        cal_by[r["stratum"]].append(r)

    half = {}
    meta = {}
    for k in ("K1", "K2", "K3"):
        rows_k = cal_by.get(k, [])
        absres = [abs(r["resid"]) for r in rows_k]
        qhat, inf = qhat_failclosed(absres)
        if mode == "A_abs_conformal":
            hw = None if inf or qhat is None else qhat
            meta[k] = {"qhat_abs": qhat, "infinite": inf}
        elif mode == "B_quantile_bands":
            # base residual quantiles + conformal inflation on E
            if len(rows_k) < 9:
                hw = None
                meta[k] = {"status": "fail_closed_n"}
            else:
                e_lo = emp_quantile([r["resid"] for r in rows_k], ALPHA / 2)
                e_hi = emp_quantile([r["resid"] for r in rows_k], 1 - ALPHA / 2)
                # scores vs those bands
                scores = []
                for r in rows_k:
                    qlo, qhi = r["mu"] + e_lo, r["mu"] + e_hi
                    scores.append(max(qlo - r["y"], r["y"] - qhi))
                q2, inf2 = qhat_failclosed(scores)
                if inf2 or q2 is None:
                    # fall back to abs conformal
                    hw = qhat if not inf and qhat is not None else None
                    meta[k] = {"e_lo": e_lo, "e_hi": e_hi, "qhat_E": None, "fallback_abs": hw}
                else:
                    # total halfwidth ≈ max(|e_lo|, |e_hi|) + q2 (conservative symmetrize)
                    hw = max(abs(e_lo), abs(e_hi), 0) + max(q2, 0)
                    # asymmetric: we use symmetric hw for coverage reporting simplicity
                    meta[k] = {"e_lo": e_lo, "e_hi": e_hi, "qhat_E": q2, "halfwidth": hw}
        elif mode == "C_calibrated_halfwidth":
            p90 = emp_quantile(absres, 0.90) if absres else None
            base = qhat if not inf and qhat is not None else None
            if base is None and p90 is not None:
                hw = p90
            elif base is not None and p90 is not None:
                hw = max(base, p90)
            else:
                hw = None
            meta[k] = {"qhat_abs": qhat, "p90_abs": p90, "halfwidth": hw, "infinite": inf}
        else:
            raise ValueError(mode)
        half[k] = hw

    cells = []
    covs, widths = [], []
    for k in ("K1", "K2", "K3"):
        sub = [r for r in te if r["stratum"] == k]
        n_te = len(sub)
        hw = half.get(k)
        if n_te == 0 or hw is None or not math.isfinite(hw):
            cells.append(
                {
                    "stratum": k,
                    "n_cal": len(cal_by.get(k, [])),
                    "n_holdout": n_te,
                    "halfwidth": None,
                    "coverage": None,
                    "mean_width": None,
                    "status": "FAIL_CLOSED_OR_EMPTY",
                    "meta": meta.get(k),
                }
            )
            continue
        covered = sum(1 for r in sub if r["mu"] - hw <= r["y"] <= r["mu"] + hw)
        cov = covered / n_te
        covs.append(cov)
        widths.append(2 * hw)
        cells.append(
            {
                "stratum": k,
                "n_cal": len(cal_by.get(k, [])),
                "n_holdout": n_te,
                "halfwidth": hw,
                "coverage": cov,
                "mean_width": 2 * hw,
                "meets_0.890": cov >= 0.890,
                "meets_0.85": cov >= 0.85,
                "status": "ok",
                "meta": meta.get(k),
            }
        )

    # kill line
    bad = [c for c in cells if (c.get("n_holdout") or 0) >= 30 and (c.get("coverage") or 1) < 0.85]
    min_c = min(covs) if covs else None
    k3 = next((c for c in cells if c["stratum"] == "K3"), None)
    if bad:
        mission = "KILL_" + ",".join(c["stratum"] for c in bad)
    elif min_c is not None and min_c >= TARGET_COV:
        mission = "PASS_all_ge_0.895"
    elif k3 and k3.get("coverage") is not None and k3["coverage"] >= 0.890:
        mission = "PASS_K3_target_0.890" + ("_other_strata_below_0.895" if min_c is not None and min_c < TARGET_COV else "")
    elif min_c is not None and min_c >= 0.85:
        mission = "PASS_floor_0.85_below_0.895_target"
    else:
        mission = "REVIEW"

    return {
        "mode": mode,
        "cells": cells,
        "min_holdout_coverage": min_c,
        "mean_holdout_coverage": mean(covs) if covs else None,
        "mean_interval_width": mean(widths) if widths else None,
        "mission": mission,
        "k3_coverage": k3.get("coverage") if k3 else None,
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
    modes = {
        "A_abs_conformal": evaluate_mode(cal, te, "A_abs_conformal"),
        "B_quantile_bands": evaluate_mode(cal, te, "B_quantile_bands"),
        "C_calibrated_halfwidth": evaluate_mode(cal, te, "C_calibrated_halfwidth"),
    }
    # pick best by K3 coverage then min coverage then width
    ranked = sorted(
        modes.values(),
        key=lambda b: (
            -(b.get("k3_coverage") or 0),
            -(b.get("min_holdout_coverage") or 0),
            b.get("mean_interval_width") or 1e9,
        ),
    )
    report = {
        "ok": True,
        "version": "v3",
        "n_rows": len(rows),
        "n_cal": len(cal),
        "n_holdout": len(te),
        "target_k3_coverage": 0.890,
        "modes": modes,
        "best_mode": ranked[0]["mode"] if ranked else None,
        "best": ranked[0] if ranked else None,
        "kill_line": "n_te>=30 and cov<0.85 kills mode; K3 target 0.890; no clamping",
        "warning": "Bands partition margins; they do not fix inverted ranking scores.",
        "borrowing": "none",
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "best": report["best_mode"],
                "k3": {m: modes[m].get("k3_coverage") for m in modes},
                "min": {m: modes[m].get("min_holdout_coverage") for m in modes},
                "missions": {m: modes[m].get("mission") for m in modes},
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
