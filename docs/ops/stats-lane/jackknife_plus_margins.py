#!/usr/bin/env python3
"""Jackknife+ conformal intervals for game margins (MIMO-3).

DATA BLOCKED until export carries realized margins + a point prediction.
Does not invent numbers. When rows are absent, exits DATA_BLOCKED.

Method (Barber, Candes, Ramdas, Tibshirani — Jackknife+):
  LOO residual R_i = y_i - mu_{-i}
  For a new point with prediction mu_hat (engine or market line),
  candidate intervals: [mu_{-i} - R_i, mu_{-i} + R_i] for each i
  Actually standard J+ for mean-model with LOO:
    lower_i = mu_{-i}(x*) - R_i, upper_i = mu_{-i}(x*) + R_i
    report quantiles of {lower_i} at alpha/2 and {upper_i} at 1-alpha/2
  For location model with constant mu_{-i} ≈ leave-one-out mean of y,
  and x* prediction supplied separately as pred*:
  We use the common sports form: center each LOO residual interval at pred*:
    [pred* + R_i_signed_quantile...] — wait, Barber centers at mu_{-i}(x*).
  Implementation choice (pre-registered):
    CENTER = leave-one-out mean of calibration targets when no per-row model;
    when pred* is supplied for the test row, center candidate i at:
      pred* + (mu_{-i} - mu_all)   # LOO bias correction
    then expand by signed residual R_i = y_i - mu_{-i}.
  Dumb baseline: split conformal on |y - pred| residuals (same fold).
  Mondrian: one J+ set per sportKey; no borrowing; n < min_n => +Inf width.

Kill line (same line as prediction):
  Prediction: Jackknife+ mean width <= split-conformal width at equal
  marginal coverage within 2pp — kill if J+ coverage falls >3pp below
  split-conformal OOT coverage without a >=10% width reduction.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402

ALPHA = 0.10
MIN_N = 64  # matches packages/prediction-engine/src/conformal-margin-set.ts
# OOT time-split needs ~2x MIN_N total per sport (half cal / half test)
MIN_N_OOT_TOTAL = 2 * MIN_N


def parse_iso(s: Any):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def fnum(x: Any) -> float | None:
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def load_rows(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".csv":
        return list(csv.DictReader(path.read_text(encoding="utf-8").splitlines()))
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def coerce(raw: dict[str, Any]) -> dict[str, Any] | None:
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    if str(raw.get("isFounder", "false")).lower() in {"true", "1"}:
        return None
    if raw.get("result") not in {"WIN", "LOSS", "PUSH"}:
        # margins need scores even on PUSH sometimes; keep PUSH if margin present
        if raw.get("result") not in {"WIN", "LOSS", "PUSH"}:
            return None
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    if gen and kick and gen >= kick:
        return None  # pre-game only
    actual = fnum(raw.get("actualMargin"))
    if actual is None:
        hs, as_ = fnum(raw.get("homeScore")), fnum(raw.get("awayScore"))
        if hs is not None and as_ is not None:
            actual = hs - as_
    pred = fnum(raw.get("predictedMeanMargin"))
    if pred is None:
        # market-implied margin proxy: home line is typically negative for home fav
        line = fnum(raw.get("line"))
        if line is not None and str(raw.get("pickType") or "").upper() == "SPREAD":
            pred = -line  # convention: predicted home margin ≈ -spread home
        elif line is not None and str(raw.get("pickType") or "").upper() == "TOTAL":
            pred = line  # predicted total points — only valid if actual is total
            if raw.get("marginKind") != "TOTAL_POINTS":
                pred = None
    if actual is None:
        return None
    sport = raw.get("sport") or "UNK"
    return {
        "pickId": raw.get("pickId") or raw.get("id"),
        "sport": str(sport).upper(),
        "pickType": str(raw.get("pickType") or "").upper(),
        "actual": actual,
        "pred": pred,
        "line": fnum(raw.get("line")),
        "bookmakerCount": fnum(raw.get("bookmakerCount")),
        "gen_ts": gen.timestamp() if gen else 0,
        "result": raw.get("result"),
    }


def loo_means(y: list[float]) -> list[float]:
    n = len(y)
    total = sum(y)
    return [(total - y[i]) / (n - 1) if n > 1 else y[i] for i in range(n)]


def jackknife_plus_interval(
    y_cal: list[float],
    pred_star: float | None,
    alpha: float = ALPHA,
) -> dict[str, Any]:
    n = len(y_cal)
    if n < MIN_N:
        return {
            "status": "insufficient_sample",
            "n": n,
            "min_n": MIN_N,
            "lower": float("-inf"),
            "upper": float("inf"),
            "width": float("inf"),
        }
    mu_all = mean(y_cal)
    mu_loo = loo_means(y_cal)
    center_star = pred_star if pred_star is not None else mu_all
    lowers: list[float] = []
    uppers: list[float] = []
    for i in range(n):
        r_i = y_cal[i] - mu_loo[i]
        bias = mu_loo[i] - mu_all
        c_i = center_star + bias
        lowers.append(c_i - r_i)
        uppers.append(c_i + r_i)
    lowers.sort()
    uppers.sort()
    # empirical quantiles (type-1 style)
    def qsorted(arr: list[float], p: float) -> float:
        idx = max(0, min(len(arr) - 1, math.ceil(p * len(arr)) - 1))
        return arr[idx]

    lo = qsorted(lowers, alpha / 2)
    hi = qsorted(uppers, 1 - alpha / 2)
    return {
        "status": "ok",
        "n": n,
        "min_n": MIN_N,
        "lower": lo,
        "upper": hi,
        "width": hi - lo,
        "center_star": center_star,
        "method": "jackknife_plus_loo_mean_bias_corrected",
        "alpha": alpha,
    }


def split_conformal_halfwidth(y_cal: list[float], preds_cal: list[float], alpha: float = ALPHA) -> float:
    res = sorted(abs(y_cal[i] - preds_cal[i]) for i in range(len(y_cal)))
    n = len(res)
    if n == 0:
        return float("inf")
    rank = math.ceil((n + 1) * (1 - alpha))
    if rank > n:
        return float("inf")
    return res[rank - 1]


def strat_time_split(rows: list[dict[str, Any]], keyfn):
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        buckets[keyfn(r)].append(r)
    cal, te = [], []
    for _, v in buckets.items():
        v = sorted(v, key=lambda r: r["gen_ts"])
        mid = len(v) // 2
        if len(v) < 2:
            te.extend(v)
            continue
        cal.extend(v[:mid])
        te.extend(v[mid:])
    return cal, te


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--alpha", type=float, default=ALPHA)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        payload = {
            "ok": False,
            "status": "DATA_BLOCKED",
            "task": "MIMO-3 Jackknife+ margin calibration",
            "need": [
                "actualMargin OR homeScore+awayScore",
                "predictedMeanMargin OR SPREAD line with documented home-margin convention",
                "pre-game generatedAt < commenceTime",
                "sport for Mondrian",
            ],
            "path": str(path),
            "min_n_per_sport": MIN_N,
            "kill_line": (
                "J+ OOT coverage may not fall >3pp below split-conformal OOT "
                "unless width improves >=10%"
            ),
        }
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(dumps_report(payload), encoding="utf-8")
        print(dumps_report(payload))
        return 2

    rows = [c for c in (coerce(r) for r in load_rows(path)) if c]
    if not rows:
        payload = {"ok": False, "status": "EMPTY_NO_MARGINS", "path": str(path)}
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(dumps_report(payload), encoding="utf-8")
        print(dumps_report(payload))
        return 2

    report: dict[str, Any] = {
        "ok": True,
        "n_rows_with_margin": len(rows),
        "alpha": args.alpha,
        "min_n": MIN_N,
        "min_n_oot_total_per_sport": MIN_N_OOT_TOTAL,
        "method": "Jackknife+ LOO mean, sport Mondrian, no borrowing",
        "warning": "Mondrian/J+ partition residuals; they do not fix inverted ranking scores.",
        "by_sport": {},
        "kill_line": (
            "Kill J+ preference if OOT coverage_J+ < coverage_split - 0.03 "
            "and width_J+ > 0.90 * width_split"
        ),
    }

    for sport in sorted({r["sport"] for r in rows}):
        sub = [r for r in rows if r["sport"] == sport]
        cal, te = strat_time_split(sub, lambda r: r["sport"])
        y_cal = [r["actual"] for r in cal]
        pred_cal = [r["pred"] if r["pred"] is not None else mean(y_cal) for r in cal]
        n_cal, n_te = len(cal), len(te)
        entry: dict[str, Any] = {"n_cal": n_cal, "n_te": n_te}
        if n_cal < MIN_N:
            entry["jackknife_plus"] = {
                "status": "insufficient_sample",
                "width": None,
                "width_infinite": True,
                "coverage": None,
            }
            entry["split_conformal"] = {
                "halfwidth": None,
                "halfwidth_infinite": True,
                "coverage": None,
            }
            entry["verdict"] = (
                "INSUFFICIENT_CAL_n_need_oot_total_ge_128"
                if len(sub) < MIN_N_OOT_TOTAL
                else "INSUFFICIENT_CAL_n_after_time_split"
            )
        else:
            # OOT evaluate on te using each row's pred when present
            half = split_conformal_halfwidth(y_cal, pred_cal, args.alpha)
            jplus_widths = []
            jplus_cover = []
            split_cover = []
            for r in te:
                pred_star = r["pred"] if r["pred"] is not None else mean(y_cal)
                jp = jackknife_plus_interval(y_cal, pred_star, args.alpha)
                if jp["status"] != "ok":
                    continue
                jplus_widths.append(jp["width"])
                jplus_cover.append(jp["lower"] <= r["actual"] <= jp["upper"])
                split_cover.append(abs(r["actual"] - pred_star) <= half)
            cov_j = mean(jplus_cover) if jplus_cover else None
            cov_s = mean(split_cover) if split_cover else None
            wid_j = mean(jplus_widths) if jplus_widths else None
            wid_s = 2 * half if math.isfinite(half) else None
            entry["jackknife_plus"] = {
                "status": "ok",
                "n_cal": n_cal,
                "mean_width": wid_j,
                "coverage_oot": cov_j,
            }
            entry["split_conformal"] = {
                "halfwidth": half if math.isfinite(half) else None,
                "mean_width": wid_s,
                "coverage_oot": cov_s,
            }
            if cov_j is None or cov_s is None or wid_j is None or wid_s is None:
                entry["verdict"] = "NOT_RUN_thin_test"
            elif cov_j < cov_s - 0.03 and wid_j > 0.90 * wid_s:
                entry["verdict"] = "KILLED_J+_undercovers_without_width_gain"
            elif cov_j >= cov_s - 0.03:
                entry["verdict"] = "J+_acceptable_vs_split_baseline"
            else:
                entry["verdict"] = "J+_undercovers_but_width_ok_review"
        report["by_sport"][sport] = entry

    report["margin_fields_note"] = (
        "Gemini plan board-export.ts snippet omits actualMargin/homeScore/awayScore/"
        "predictedMeanMargin — MIMO-3 stays blocked until those columns ship."
    )
    out = Path(args.out)
    write_report(out, report)
    print(dumps_report({"ok": True, "out": str(out), "n": len(rows), "sports": list(report["by_sport"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
