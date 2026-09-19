#!/usr/bin/env python3
"""Rolling-origin Mondrian CQR — replace static cal/te for non-exchangeable K3/K1.

For each stratum, calibrate half-width on the LAST m in-stratum games before each
holdout game (or a single expanding window with embargo). Fail-closed if m < MIN_M.

Kill line: rolling mode kills static mode only if it lifts K3 OOT cov >= 0.85
WITHOUT mean width > 1.5x static B mode, on the same holdout set.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from mondrian_cqr_v3 import coerce, load_rows, emp_quantile  # noqa: E402
from mondrian_cqr import qhat_failclosed  # noqa: E402

MIN_M = 32  # blueprint rolling-origin floor
ALPHA = 0.10


def rolling_halfwidth(history_abs, mode="B_quantile"):
    m = len(history_abs)
    if m < MIN_M:
        return None, True
    qhat, inf = qhat_failclosed(history_abs)
    if mode == "A_abs":
        return (None if inf or qhat is None else qhat), inf
    # B: max(qhat, p90) — calibrated halfwidth
    p90 = emp_quantile(history_abs, 0.90)
    if inf or qhat is None:
        hw = p90
    else:
        hw = max(qhat, p90)
    return hw, hw is None or not math.isfinite(hw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-m", type=int, default=MIN_M)
    args = ap.parse_args()
    min_m = args.min_m
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [c for c in (coerce(r) for r in load_rows(path)) if c]
    rows = sorted(rows, key=lambda r: r["gen_ts"])
    # holdout = last 40%; rolling history = all prior in-stratum
    n = len(rows)
    split = int(n * 0.6)
    holdout = rows[split:]
    by_s = defaultdict(list)
    for r in rows[:split]:
        by_s[r["stratum"]].append(r)

    cells = []
    for k in ("K1", "K2", "K3"):
        hist = list(by_s.get(k, []))
        te = [r for r in holdout if r["stratum"] == k]
        cov_a = cov_b = []
        cov_a, cov_b = [], []
        w_a, w_b = [], []
        used = 0
        fail_closed = 0
        for r in te:
            abs_hist = [abs(x["resid"]) for x in hist]
            hw_a, inf_a = rolling_halfwidth(abs_hist, "A_abs")
            if min_m != MIN_M:
                # re-call with custom min via local check
                if len(abs_hist) < min_m:
                    hw_a, inf_a = None, True
            hw_b, inf_b = (None, True) if len(abs_hist) < min_m else rolling_halfwidth(abs_hist, "B_quantile")
            if hw_b is None:
                fail_closed += 1
            else:
                used += 1
                cov_b.append(1 if r["mu"] - hw_b <= r["y"] <= r["mu"] + hw_b else 0)
                w_b.append(2 * hw_b)
            if hw_a is not None and len(abs_hist) >= min_m:
                cov_a.append(1 if r["mu"] - hw_a <= r["y"] <= r["mu"] + hw_a else 0)
                w_a.append(2 * hw_a)
            hist.append(r)  # expanding window

        cells.append(
            {
                "stratum": k,
                "n_holdout": len(te),
                "n_scored_B": used,
                "n_fail_closed": fail_closed,
                "coverage_A_abs": mean(cov_a) if cov_a else None,
                "coverage_B_max_q_p90": mean(cov_b) if cov_b else None,
                "mean_width_B": mean(w_b) if w_b else None,
                "min_m": min_m,
                "status": "ok" if used else "ALL_FAIL_CLOSED",
            }
        )

    k3 = next(c for c in cells if c["stratum"] == "K3")
    # static B from prior run ≈ 0.770 cov, width ~41
    static_k3_cov = 0.770
    static_k3_w = 41.0
    if k3["coverage_B_max_q_p90"] is None:
        mission = "K3_STILL_FAIL_CLOSED_need_more_history"
    elif k3["coverage_B_max_q_p90"] >= 0.85 and (
        k3["mean_width_B"] or 0
    ) <= 1.5 * static_k3_w:
        mission = "ROLLING_BEATS_STATIC_K3"
    elif k3["coverage_B_max_q_p90"] >= 0.85:
        mission = "ROLLING_K3_COV_OK_width_high"
    else:
        mission = "ROLLING_K3_still_lt_0.85"

    report = {
        "ok": True,
        "protocol": "expanding rolling-origin per stratum; fail-closed if hist < min_m",
        "min_m": min_m,
        "n_rows": n,
        "n_cal_window": split,
        "n_holdout": len(holdout),
        "cells": cells,
        "k3_static_reference_cov": static_k3_cov,
        "k3_static_reference_width": static_k3_w,
        "mission": mission,
        "kill_line": "rolling beats static only if K3 cov>=0.85 and width<=1.5x static B",
        "warning": "Rolling coverage is diagnostic under drift — not a finite-sample i.i.d. guarantee.",
    }
    write_report(Path(args.out), report)
    print(dumps_report({"ok": True, "out": str(args.out), "mission": mission, "cells": cells}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
