#!/usr/bin/env python3
"""Standing OOT coverage monitor — rolling calibration by bookmakerCount x marketType.

Ingests board-export.jsonl (or any compatible JSONL). Emits standing-coverage.json.
Never claims a public rate without n + filter labels (L10).
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

ALPHA = 0.10
MIN_N = 9


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


def books_bucket(n):
    if n is None:
        return "UNKNOWN"
    n = int(n)
    if n <= 0:
        return "0"
    if n <= 2:
        return "1-2"
    if n <= 9:
        return "3-9"
    return "10+"


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = (z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denom
    return [max(0.0, center - half), min(1.0, center + half)]


def qhat(res, alpha=ALPHA):
    n = len(res)
    if n == 0:
        return None, True
    rank = math.ceil((n + 1) * (1 - alpha))
    if rank > n:
        return None, True
    return sorted(res)[rank - 1], False


def load_jsonl(path: Path):
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def coerce(raw):
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    res = raw.get("result")
    if res not in {"WIN", "LOSS"}:
        return None
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    if gen and kick and gen >= kick:
        timing = "in_play"
    elif gen and kick:
        timing = "pre_game"
    else:
        timing = "unknown"
    mfp = fnum(raw.get("marketFairProb"))
    conf = fnum(raw.get("confidence"))
    p_conf = conf / 100.0 if conf is not None and 0 < conf < 100 else None
    y = 1 if res == "WIN" else 0
    bc = raw.get("bookmakerCount")
    try:
        bci = int(bc) if bc is not None and bc != "" else None
    except Exception:
        bci = None
    sport = resolve_sport(raw.get("sport"), raw.get("espnEventId"), raw.get("selection"))
    pt = str(raw.get("pickType") or "UNK").upper()
    return {
        "y": y,
        "mfp": mfp,
        "p_conf": p_conf,
        "books": books_bucket(bci),
        "pickType": pt,
        "sport": sport,
        "timing": timing,
        "res_mfp": abs(y - mfp) if mfp is not None else None,
        "gen_ts": gen.timestamp() if gen else 0,
        "pickId": raw.get("pickId") or raw.get("id"),
    }


def strat_time_split(rows, keyfn):
    buckets = defaultdict(list)
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


def cell_report(cal, te, keyfn, label):
    q_pool, pool_inf = qhat([r["res_mfp"] for r in cal if r["res_mfp"] is not None])
    cells = []
    buckets = defaultdict(list)
    for r in te:
        buckets[keyfn(r)].append(r)
    for k, v in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
        res_cal = [r["res_mfp"] for r in cal if keyfn(r) == k and r["res_mfp"] is not None]
        res_te = [r["res_mfp"] for r in v if r["res_mfp"] is not None]
        y_te = [r["y"] for r in v]
        q_own, own_inf = qhat(res_cal) if len(res_cal) >= MIN_N else (None, True)
        cov_own = (
            sum(1 for x in res_te if q_own is not None and x <= q_own) / len(res_te)
            if res_te and q_own is not None
            else None
        )
        cov_pool = (
            sum(1 for x in res_te if q_pool is not None and x <= q_pool) / len(res_te)
            if res_te and q_pool is not None
            else None
        )
        hit = sum(y_te) / len(y_te) if y_te else None
        cells.append(
            {
                "cell": k,
                "n_cal_residual": len(res_cal),
                "n_te": len(v),
                "n_te_residual": len(res_te),
                "hit_rate": hit,
                "hit_wilson95": wilson(hit, len(v)) if hit is not None else [None, None],
                "qhat_own": q_own,
                "qhat_own_infinite": own_inf,
                "coverage_own_oot": cov_own,
                "coverage_pooled_oot": cov_pool,
                "under_pool_pp": (100 * (cov_own - cov_pool)) if cov_own is not None and cov_pool is not None else None,
                "alert": (
                    "UNDER_POOL"
                    if cov_own is not None and cov_pool is not None and cov_own - cov_pool >= 0.05
                    else "OOT_OWN_UNDER_0.85"
                    if cov_own is not None and cov_own < 0.85
                    else "OK_OR_THIN"
                ),
            }
        )
    return {
        "axis": label,
        "pooled_qhat_cal": q_pool,
        "pooled_qhat_infinite": pool_inf,
        "cells": cells,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        payload = {
            "ok": False,
            "status": "DATA_BLOCKED",
            "path": str(path),
            "note": "standing OOT monitor needs board-export.jsonl",
        }
        write_report(Path(args.out), payload)
        print(dumps_report(payload))
        return 2

    raw = load_jsonl(path)
    rows = [c for c in (coerce(r) for r in raw) if c]
    pre = [r for r in rows if r["timing"] == "pre_game"]
    timing_filter = "pre_game_only"
    if not pre:
        pre = rows
        timing_filter = "FALLBACK_all_rows"

    cal_books, te_books = strat_time_split(pre, lambda r: r["books"])
    cal_mk, te_mk = strat_time_split(pre, lambda r: f"{r['books']}|{r['pickType']}")

    alerts = []
    by_books = cell_report(cal_books, te_books, lambda r: r["books"], "bookmakerCount_bucket")
    by_books_mk = cell_report(cal_mk, te_mk, lambda r: f"{r['books']}|{r['pickType']}", "books_x_pickType")
    for axis in (by_books, by_books_mk):
        for cell in axis["cells"]:
            if cell["alert"] in {"UNDER_POOL", "OOT_OWN_UNDER_0.85"}:
                alerts.append({"axis": axis["axis"], **cell})

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "input": str(path),
        "n_loaded": len(rows),
        "n_pre_game": len(pre),
        "timing_filter": timing_filter,
        "alpha": ALPHA,
        "min_n": MIN_N,
        "residual": "|y - marketFairProb| (primary); hit_rate is separate",
        "warning": "Coverage bands partition residuals; they do not fix inverted ranking scores.",
        "population": "published decided pre-game (PUSH/VOID excluded in coerce)",
        "axes": [by_books, by_books_mk],
        "alerts": alerts,
        "l10": "Any published rate must show n + population + exclusion counts on the same surface.",
        "standing_loop": {
            "rerun": "python standing_oot_monitor.py --input <new export> --out standing-coverage.json",
            "action_on_alert": "widen or mark bin infinite; do not silently keep stale qhat",
        },
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_pre": len(pre),
                "alerts": len(alerts),
                "books_cells": len(by_books["cells"]),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
