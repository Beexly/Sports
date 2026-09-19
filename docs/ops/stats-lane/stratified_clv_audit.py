#!/usr/bin/env python3
"""Stratified CLV disaggregation — SIGNAL vs BOOK path, books buckets, market type.

Opus cited: pooled BEAT_CLOSE 23.2% [21.2,25.3] all graded; 40.8% [37.7,44.1] non-push (n=901).
Hypothesis: deficit concentrated in BOOK_PATH (inverted top band) vs SIGNAL_PATH lagging closes.
Kill line (same line): Kill 'CLV deficit is book-path only' if SIGNAL_PATH non-push BEAT_CLOSE
Wilson lower bound >= 0.524 OR if SIGNAL and BOOK CIs heavily overlap and both << 0.524.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402

REQUIRED = 0.524


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def books_bucket(n):
    try:
        n = int(n)
    except Exception:
        return "UNKNOWN"
    if n <= 0:
        return "0"
    if n <= 2:
        return "1-2"
    if n <= 9:
        return "3-9"
    return "10+"


def generation_path(r):
    bc = r.get("bookmakerCount")
    sel = str(r.get("selection") or "")
    try:
        bci = int(bc) if bc is not None and bc != "" else None
    except Exception:
        bci = None
    if bci == 0 or "model signal" in sel.lower():
        return "SIGNAL_PATH"
    if bci is not None and bci >= 1:
        return "BOOK_PATH"
    if r.get("marketFairProb") is not None:
        return "BOOK_PATH"
    return "UNKNOWN_PATH"


def edge_bucket(r):
    # proxy — export has rankingSource + independentTrueProb, not PASS/LEAN/VALUE
    rs = str(r.get("rankingSource") or "")
    itp = r.get("independentTrueProb")
    if rs in ("independent_trueProb", "blend_indep_conf") and itp not in (None, ""):
        return "INDEPENDENT_PRICED"
    if rs == "confidence":
        return "CONFIDENCE_ECHO"
    if itp not in (None, ""):
        return "INDEPENDENT_ONLY"
    return "EDGE_UNKNOWN"


def market_key(r):
    pt = str(r.get("pickType") or "UNK").upper()
    return pt


def cell_stats(rows, predicate, label):
    sub = [r for r in rows if predicate(r)]
    # all graded with verdict
    all_v = [r for r in sub if r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")]
    nonpush = [r for r in sub if r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]

    def rate(subset):
        if not subset:
            return {"n": 0, "beat": 0, "rate": None, "wilson95": [None, None], "vs_52_4": None}
        beat = sum(1 for r in subset if r.get("clvVerdict") == "BEAT_CLOSE")
        p = beat / len(subset)
        w = wilson(p, len(subset))
        return {
            "n": len(subset),
            "beat": beat,
            "matched_close": sum(1 for r in subset if r.get("clvVerdict") == "MATCHED_CLOSE"),
            "lost_close": sum(1 for r in subset if r.get("clvVerdict") == "LOST_TO_CLOSE"),
            "rate": p,
            "wilson95": w,
            "vs_52_4": "above" if w[0] is not None and w[0] > REQUIRED else "below_or_overlap" if w[1] is not None and w[1] < REQUIRED else "interval_overlaps_required",
        }

    return {"label": label, "all_graded": rate(all_v), "non_push": rate(nonpush)}


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
    # only rows that carry CLV verdict
    graded = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")]
    for r in graded:
        r["_path"] = generation_path(r)
        r["_books"] = books_bucket(r.get("bookmakerCount"))
        r["_edge"] = edge_bucket(r)
        r["_market"] = market_key(r)
        r["_sport"] = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))

    overall = cell_stats(graded, lambda r: True, "OVERALL")
    by_path = {
        p: cell_stats(graded, lambda r, p=p: r["_path"] == p, p)
        for p in ("SIGNAL_PATH", "BOOK_PATH", "UNKNOWN_PATH")
    }
    by_books = {
        b: cell_stats(graded, lambda r, b=b: r["_books"] == b, f"books_{b}")
        for b in ("0", "1-2", "3-9", "10+", "UNKNOWN")
    }
    by_market = {
        m: cell_stats(graded, lambda r, m=m: r["_market"] == m, m)
        for m in sorted({r["_market"] for r in graded})
    }
    by_edge = {
        e: cell_stats(graded, lambda r, e=e: r["_edge"] == e, e)
        for e in sorted({r["_edge"] for r in graded})
    }
    by_sport = {
        s: cell_stats(graded, lambda r, s=s: r["_sport"] == s, s)
        for s in sorted({r["_sport"] for r in graded})
    }
    # path x market
    path_market = []
    for p in ("SIGNAL_PATH", "BOOK_PATH"):
        for m in sorted({r["_market"] for r in graded}):
            c = cell_stats(graded, lambda r, p=p, m=m: r["_path"] == p and r["_market"] == m, f"{p}|{m}")
            path_market.append(c)

    sig_np = by_path.get("SIGNAL_PATH", {}).get("non_push", {})
    book_np = by_path.get("BOOK_PATH", {}).get("non_push", {})
    hypothesis = "NOT_RUN"
    if sig_np.get("n", 0) >= 30 and book_np.get("n", 0) >= 30:
        sig_lo = sig_np["wilson95"][0]
        book_lo = book_np["wilson95"][0]
        book_hi = book_np["wilson95"][1]
        sig_hi = sig_np["wilson95"][1]
        if sig_lo is not None and sig_lo >= REQUIRED:
            hypothesis = "REFUTED_signal_path_clears_52_4"
        elif book_hi is not None and book_hi < REQUIRED and sig_lo is not None and sig_lo > book_hi:
            hypothesis = "SUPPORTED_deficit_concentrated_in_book_path"
        elif sig_hi is not None and book_hi is not None and sig_hi < REQUIRED and book_hi < REQUIRED:
            hypothesis = "BOTH_PATHS_LAG_closes"
        else:
            hypothesis = "OVERLAP_insufficient_separation"
    else:
        hypothesis = "THIN_CELLS_need_more_graded_clv"

    report = {
        "ok": True,
        "input": str(path),
        "n_export": len(rows),
        "n_graded_with_clv_verdict": len(graded),
        "required_beat_close_rate": REQUIRED,
        "opus_quoted": {
            "pooled_all": 0.232,
            "pooled_all_ci": [0.212, 0.253],
            "non_push": 0.408,
            "non_push_ci": [0.377, 0.441],
        },
        "recomputed_overall": overall,
        "by_generation_path": by_path,
        "by_books_bucket": by_books,
        "by_market_type": by_market,
        "by_edge_proxy": by_edge,
        "by_sport": by_sport,
        "path_x_market": path_market,
        "hypothesis_book_path_deficit": hypothesis,
        "kill_line": "Kill 'deficit is book-path only' if SIGNAL non-push Wilson LB >= 0.524 OR both paths' upper bounds < 0.524 (both lag)",
        "notes": [
            "edge_bucket is a PROXY (rankingSource/independentTrueProb) — export lacks PASS/LEAN/VALUE",
            "Independent edge decision column needed for true PASS/LEAN/VALUE stratification",
            "MATCHED_CLOSE excluded from non_push denominator (L10)",
            "Denominators always printed (law 10)",
        ],
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_graded": len(graded),
                "overall_nonpush": overall["non_push"],
                "signal_nonpush": sig_np,
                "book_nonpush": book_np,
                "hypothesis": hypothesis,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
