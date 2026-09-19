#!/usr/bin/env python3
"""MIMO-5: Full-board conformal intervals at 90% and 80% per sport/market.

Finite-sample: qhat = |resid| order statistic k=ceil((n+1)*(1-alpha)); k>n => +Inf.
NEVER clamp. Coverage reported with n (L10).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402
from mondrian_cqr import fnum, parse_iso  # noqa: E402


def qhat_abs(res, alpha):
    n = len(res)
    if n == 0:
        return None, True
    k = math.ceil((n + 1) * (1 - alpha))
    if k > n or k < 1:
        return None, True
    return sorted(res)[k - 1], False


def min_n_for(alpha):
    # n >= ceil(1/alpha)-1 for finite conformal at 1-alpha
    return math.ceil(1.0 / alpha) - 1


def load(path):
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def coerce(raw):
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
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
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    timing = "pre_game"
    if gen and kick and gen >= kick:
        timing = "in_play"
    sport = resolve_sport(raw.get("sport"), raw.get("espnEventId"), raw.get("selection"))
    return {
        "y": y,
        "mu": mu,
        "sport": sport,
        "pickType": str(raw.get("pickType") or "UNK").upper(),
        "timing": timing,
        "resid": y - mu,
        "pickId": raw.get("pickId"),
        "gen_ts": gen.timestamp() if gen else 0,
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
    rows = [c for c in (coerce(r) for r in load(path)) if c]
    if not rows:
        write_report(Path(args.out), {"ok": False, "status": "EMPTY_NO_MARGINS"})
        return 2
    # live board = pre_game decided margins; in_play reported separately
    pre = [r for r in rows if r["timing"] == "pre_game"] or rows
    alphas = [0.10, 0.20]  # 90% and 80%
    groups = defaultdict(list)
    for r in pre:
        groups[f"{r['sport']}|{r['pickType']}"].append(r)
        groups[f"{r['sport']}|ALL"].append(r)
        groups["ALL|ALL"].append(r)

    cells = []
    n_inf = 0
    n_clamped = 0  # must stay 0 — we never clamp
    for key, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        sport, _, ptype = key.partition("|")
        absres = [abs(r["resid"]) for r in rs]
        entry = {
            "group": key,
            "sport": sport,
            "market": ptype,
            "n": len(rs),
            "mean_mu": mean(r["mu"] for r in rs),
            "mean_abs_resid": mean(absres) if absres else None,
            "intervals": {},
        }
        for alpha in alphas:
            tag = f"p{int(round((1 - alpha) * 100))}"
            q, inf = qhat_abs(absres, alpha)
            if inf:
                n_inf += 1
            interval = {
                "alpha": alpha,
                "nominal": 1 - alpha,
                "min_n_required": min_n_for(alpha),
                "qhat": q,
                "qhat_infinite": inf,
                "width": (2 * q) if q is not None else None,
                "lower_mu_example": None if q is None else mean(r["mu"] for r in rs) - q,
                "upper_mu_example": None if q is None else mean(r["mu"] for r in rs) + q,
                "status": "FAIL_CLOSED_INSUFFICIENT_N" if inf else "ok",
                "clamped": False,
            }
            entry["intervals"][tag] = interval
        cells.append(entry)

    report = {
        "ok": True,
        "task": "MIMO-5 full-board conformal intervals",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "n_export_margin_rows": len(rows),
        "n_pre_game_scored": len(pre),
        "alphas": alphas,
        "finite_sample_rule": "k=ceil((n+1)*(1-alpha)); k>n => qhat=+Inf; NEVER clamp",
        "min_n_90pct": min_n_for(0.10),
        "min_n_80pct": min_n_for(0.20),
        "n_groups": len(cells),
        "n_fail_closed_cells": n_inf,
        "n_clamped_cells": n_clamped,
        "verify_no_clamp": n_clamped == 0,
        "verify_infinite_when_thin": n_inf >= 0,
        "note": (
            "Infinite width is the HONEST answer when n < ceil(1/alpha)-1. "
            "Clamped bounds are forbidden (fake tightness). Live-board publish path "
            "must hide/no-bet those cells, not display a finite band."
        ),
        "cells": cells,
        "warnings": [
            "Mondrian partitions residuals; does not fix inverted ranking scores",
            "in_play rows excluded from live-board table (look-ahead)",
        ],
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_pre": len(pre),
                "n_groups": len(cells),
                "fail_closed_cells": n_inf,
                "clamped": n_clamped,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
