#!/usr/bin/env python3
"""Moneyline CLV turnaround — market-anchored selection filters (no graveyard).

Hypothesis: ML CLV 14.2% is dragged by weak-edge / heavy-favorite / thin-book rows.
Filters (export has marketFairProb, confidence, rankingP, independentTrueProb, bookmakerCount;
NO American odds — heavy favorite proxy = marketFairProb >= 0.714 ≈ -250):
  A edge: p_model - p_devigged >= 0.03
     p_model = independentTrueProb or rankingP or confidence/100
     p_devigged = marketFairProb
  B not heavy fav: marketFairProb < 0.714
  C books >= 10
  Combos: A, B, C, A+B, A+C, B+C, A+B+C
Kill line: Filter "turns ML CLV into winner" only if non-push rate >= 0.50 AND
Wilson lower bound > 0.40 AND n_nonpush >= 30. Else THIN or FAIL.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402

HEAVY_FAV_P = 0.714  # ~ -250
EDGE_MIN = 0.03


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def p_model(r):
    itp = fnum(r.get("independentTrueProb"))
    if itp is not None and 0 < itp < 1:
        return itp, "independentTrueProb"
    rp = fnum(r.get("rankingP"))
    if rp is not None and 0 < rp < 1:
        return rp, "rankingP"
    conf = fnum(r.get("confidence"))
    if conf is not None:
        return conf / 100.0, "confidence/100"
    return None, "none"


def clv_stats(rows, label=""):
    all_v = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")]
    npush = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]

    def pack(subset, lab):
        if not subset:
            return {"label": lab, "n": 0, "beat": 0, "rate": None, "wilson95": [None, None]}
        beat = sum(1 for r in subset if r.get("clvVerdict") == "BEAT_CLOSE")
        p = beat / len(subset)
        return {
            "label": lab,
            "n": len(subset),
            "beat": beat,
            "matched_close": sum(1 for r in subset if r.get("clvVerdict") == "MATCHED_CLOSE"),
            "lost_close": sum(1 for r in subset if r.get("clvVerdict") == "LOST_TO_CLOSE"),
            "rate": p,
            "wilson95": wilson(p, len(subset)),
        }

    return pack(all_v, f"{label}_all_graded"), pack(npush, f"{label}_non_push")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    ml = [
        r
        for r in rows
        if str(r.get("pickType") or "").upper() == "MONEYLINE"
        and r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")
    ]
    for r in ml:
        pm, src = p_model(r)
        mfp = fnum(r.get("marketFairProb"))
        r["_p_model"] = pm
        r["_p_src"] = src
        r["_mfp"] = mfp
        r["_edge"] = (pm - mfp) if (pm is not None and mfp is not None) else None
        try:
            r["_books"] = int(r.get("bookmakerCount")) if r.get("bookmakerCount") not in (None, "") else None
        except Exception:
            r["_books"] = None
        r["_heavy"] = mfp is not None and mfp >= HEAVY_FAV_P
        r["_filter_A"] = r["_edge"] is not None and r["_edge"] >= EDGE_MIN
        r["_filter_B"] = not r["_heavy"]
        r["_filter_C"] = r["_books"] is not None and r["_books"] >= 10

    base_all, base_np = clv_stats(ml, "ALL_ML")
    filters = {
        "ALL_ML": lambda r: True,
        "A_edge_ge_3pp": lambda r: r["_filter_A"],
        "B_not_heavy_fav": lambda r: r["_filter_B"],
        "C_books_ge_10": lambda r: r["_filter_C"],
        "A+B": lambda r: r["_filter_A"] and r["_filter_B"],
        "A+C": lambda r: r["_filter_A"] and r["_filter_C"],
        "B+C": lambda r: r["_filter_B"] and r["_filter_C"],
        "A+B+C": lambda r: r["_filter_A"] and r["_filter_B"] and r["_filter_C"],
    }
    out_filters = {}
    for name, fn in filters.items():
        sub = [r for r in ml if fn(r)]
        a, n = clv_stats(sub, name)
        lo = n["wilson95"][0]
        if n["n"] < 30:
            verdict = "THIN_n_nonpush_lt_30"
        elif n["rate"] is not None and n["rate"] >= 0.50 and lo is not None and lo > 0.40:
            verdict = "TURNS_INTO_WINNER"
        elif n["rate"] is not None and n["rate"] >= 0.50:
            verdict = "POINT_GE_50_but_LB_not_gt_0.40"
        else:
            verdict = "FAIL_still_below_50"
        out_filters[name] = {
            "all_graded": a,
            "non_push": n,
            "verdict": verdict,
            "n_pass_filter": len(sub),
        }

    # diagnostics
    edges = [r["_edge"] for r in ml if r["_edge"] is not None]
    report = {
        "ok": True,
        "n_ml_graded": len(ml),
        "heavy_fav_proxy_p": HEAVY_FAV_P,
        "edge_threshold": EDGE_MIN,
        "p_model_source_counts": {},
        "edge_summary": {
            "n_with_edge": len(edges),
            "mean_edge": sum(edges) / len(edges) if edges else None,
            "share_edge_ge_3pp": (sum(1 for e in edges if e >= EDGE_MIN) / len(edges)) if edges else None,
            "share_heavy_fav": (sum(1 for r in ml if r["_heavy"]) / len(ml)) if ml else None,
        },
        "baseline": {"all_graded": base_all, "non_push": base_np},
        "filters": out_filters,
        "kill_line": "Winner only if non-push rate>=0.50 AND Wilson LB>0.40 AND n_nonpush>=30",
        "notes": [
            "Heavy-favorite proxy uses marketFairProb>=0.714 because export has no American odds",
            "p_model prefers independentTrueProb > rankingP > confidence/100",
            "This is a historical filter simulation — not a live gate flip",
        ],
    }
    for r in ml:
        report["p_model_source_counts"][r["_p_src"]] = report["p_model_source_counts"].get(r["_p_src"], 0) + 1
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_ml": len(ml),
                "baseline_nonpush": base_np,
                "filter_verdicts": {k: v["verdict"] for k, v in out_filters.items()},
                "filter_nonpush": {k: v["non_push"] for k, v in out_filters.items()},
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
