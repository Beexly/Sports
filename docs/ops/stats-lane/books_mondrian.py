#!/usr/bin/env python3
"""Strict books-bucket Mondrian (STATISTICS / compose-next).

Buckets: bookmakerCount in {0}, {1-2}, {3-9}, {10+}.
No cross-bin borrowing. n < ceil(1/alpha)-1 => qhat=+Inf, coverage null.

Input JSONL/CSV columns (see ORDERING_AND_BOOKS_COLUMNS.md):
  result, pickType, sport, bookmakerCount, marketFairProb, confidence,
  generatedAt, commenceTime, modelVersion, pickId (optional), isBootstrap (optional)

Usage:
  python books_mondrian.py --input <file.jsonl|csv> --out <report.json>
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
MIN_N = math.ceil(1.0 / ALPHA) - 1  # 9
BOOK_BUCKETS = ("0", "1-2", "3-9", "10+")


def books_bucket(n: int | None) -> str:
    if n is None:
        return "UNKNOWN"
    if n <= 0:
        return "0"
    if n <= 2:
        return "1-2"
    if n <= 9:
        return "3-9"
    return "10+"


def parse_iso(s: Any) -> datetime | None:
    if s is None or s == "":
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def y_from(result: Any) -> int | None:
    if result == "WIN":
        return 1
    if result == "LOSS":
        return 0
    return None


def qhat(res: list[float]) -> float:
    n = len(res)
    if n == 0:
        return float("inf")
    rank = math.ceil((n + 1) * (1 - ALPHA))
    if rank > n:
        return float("inf")
    return float(sorted(res)[rank - 1])


def load_rows(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    rows: list[dict[str, Any]] = []
    if path.suffix.lower() == ".csv":
        rows = list(csv.DictReader(text.splitlines()))
    else:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def coerce_row(raw: dict[str, Any]) -> dict[str, Any] | None:
    if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
        return None
    if str(raw.get("isPublished", "true")).lower() in {"false", "0"}:
        return None
    if str(raw.get("isFounder", "false")).lower() in {"true", "1"}:
        return None
    y = y_from(raw.get("result"))
    if y is None:
        return None
    gen = parse_iso(raw.get("generatedAt"))
    kick = parse_iso(raw.get("commenceTime"))
    if gen and kick and gen >= kick:
        timing = "in_play"
    elif gen and kick:
        timing = "pre_game"
    else:
        timing = "unknown"
    mfp = raw.get("marketFairProb")
    try:
        mfp_f = float(mfp) if mfp is not None and mfp != "" else None
    except Exception:
        mfp_f = None
    if mfp_f is not None and not (0.0 < mfp_f < 1.0):
        mfp_f = None
    conf = raw.get("confidence")
    try:
        conf_f = float(conf) if conf is not None and conf != "" else None
    except Exception:
        conf_f = None
    p_conf = conf_f / 100.0 if conf_f is not None and 0 < conf_f < 100 else None
    bc = raw.get("bookmakerCount")
    try:
        bc_i = int(bc) if bc is not None and bc != "" else None
    except Exception:
        bc_i = None
    sport = (raw.get("sport") or (raw.get("game") or {}).get("sport") if isinstance(raw.get("game"), dict) else raw.get("sport") or "UNK")
    if isinstance(raw.get("game"), dict) and not raw.get("sport"):
        sport = raw["game"].get("sport") or "UNK"
    pt = raw.get("pickType") or "UNK"
    return {
        "pickId": raw.get("pickId") or raw.get("id"),
        "y": y,
        "mfp": mfp_f,
        "p_conf": p_conf,
        "bookmakerCount": bc_i,
        "books": books_bucket(bc_i),
        "sport": str(sport).upper(),
        "pickType": str(pt).upper(),
        "modelVersion": raw.get("modelVersion"),
        "timing": timing,
        "res_mfp": abs(y - mfp_f) if mfp_f is not None else None,
        "res_conf": abs(y - p_conf) if p_conf is not None else None,
        "hit": y,
    }


def bin_stats(rows: list[dict[str, Any]], res_key: str) -> dict[str, Any]:
    res = [r[res_key] for r in rows if r.get(res_key) is not None]
    n = len(res)
    n_hit = len(rows)
    hit = sum(r["y"] for r in rows) / n_hit if n_hit else None
    q = qhat(res) if n >= MIN_N else float("inf")
    finite = math.isfinite(q)
    cov = (sum(1 for x in res if x <= q) / n) if n and finite else None
    return {
        "n_residual": n,
        "n_rows": n_hit,
        "hit_rate": hit,
        "qhat": None if not finite else q,
        "qhat_infinite": not finite,
        "coverage_own": cov,
        "mean_residual": mean(res) if res else None,
        "min_n_required": MIN_N,
    }


def coverage_under_pooled(cal: list[dict[str, Any]], te: list[dict[str, Any]], res_key: str, axis_fn) -> list[dict[str, Any]]:
    q_pool = qhat([r[res_key] for r in cal if r.get(res_key) is not None])
    out = []
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in te:
        buckets[axis_fn(r)].append(r)
    for k, v in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
        res_cal = [r[res_key] for r in cal if axis_fn(r) == k and r.get(res_key) is not None]
        res_te = [r[res_key] for r in v if r.get(res_key) is not None]
        q_own = qhat(res_cal) if len(res_cal) >= MIN_N else float("inf")
        cov_own = sum(1 for x in res_te if x <= q_own) / len(res_te) if res_te and math.isfinite(q_own) else None
        cov_pool = sum(1 for x in res_te if x <= q_pool) / len(res_te) if res_te and math.isfinite(q_pool) else None
        out.append(
            {
                "group": k,
                "n_cal": len(res_cal),
                "n_te": len(res_te),
                "qhat_own": None if not math.isfinite(q_own) else q_own,
                "coverage_own": cov_own,
                "coverage_pooled": cov_pool,
                "own_minus_pool": (cov_own - cov_pool) if cov_own is not None and cov_pool is not None else None,
                "hit_rate_te": sum(r["y"] for r in v) / len(v) if v else None,
                "mean_residual_te": mean(res_te) if res_te else None,
            }
        )
    return out


def strat_time_split(rows: list[dict[str, Any]], keyfn):
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        buckets[keyfn(r)].append(r)
    cal, te = [], []
    for _, v in buckets.items():
        v = sorted(v, key=lambda r: r.get("gen_ts") or 0)
        mid = len(v) // 2
        if len(v) < 2:
            te.extend(v)
            continue
        cal.extend(v[:mid])
        te.extend(v[mid:])
    return cal, te


def coupling_verdict(by_books: list[dict[str, Any]]) -> dict[str, Any]:
    """Answer: does residual scale track hit-rate inversion or run independently?"""
    scored = [b for b in by_books if b.get("hit_rate") is not None and b.get("mean_residual") is not None and b["group"] in BOOK_BUCKETS]
    if len(scored) < 2:
        return {
            "verdict": "INSUFFICIENT_BINS",
            "note": "Need >=2 finite books buckets with residuals to compare scale vs hit rate.",
        }
    # rank by hit rate (asc) and by mean residual / qhat (desc = fatter)
    by_hit = sorted(scored, key=lambda b: b["hit_rate"])
    fat = [b for b in scored if b.get("qhat") is not None]
    by_q = sorted(fat, key=lambda b: b["qhat"], reverse=True)
    hit_order = [b["group"] for b in by_hit]
    q_order = [b["group"] for b in by_q]
    # coupling if the lowest-hit buckets are among the widest residual qhat
    lowest_hit = set(hit_order[: max(1, len(hit_order) // 2)])
    widest = set(q_order[: max(1, len(q_order) // 2)])
    overlap = lowest_hit & widest
    if not fat:
        return {"verdict": "NO_FINITE_QHAT", "hit_order": hit_order}
    if overlap and len(overlap) >= max(1, len(lowest_hit) // 2):
        verdict = "PARTIAL_OR_FULL_COUPLING"
        claim = "Residual scale and hit-rate failure share books buckets (not independent)."
    else:
        # check opposite: high hit + wide residual => independent / selection
        high_hit = set(hit_order[len(hit_order) // 2 :])
        if high_hit & widest:
            verdict = "INDEPENDENT_OR_INVERTED_COUPLING"
            claim = "Wider residuals sit in higher-hit buckets — residual scale does not track hit-rate inversion."
        else:
            verdict = "NO_CLEAR_COUPLING"
            claim = "Orderings do not align; treat books residual scale and hit rate as separate claims."
    qhats = {b["group"]: b.get("qhat") for b in fat}
    finite_q = [q for q in qhats.values() if q is not None]
    ratio = (max(finite_q) / min(finite_q)) if finite_q and min(finite_q) > 0 else None
    return {
        "verdict": verdict,
        "claim": claim,
        "hit_rate_order_low_to_high": hit_order,
        "qhat_order_wide_to_narrow": q_order,
        "books_bucket_qhat": qhats,
        "qhat_max_min_ratio": ratio,
        "kill_line_books_alone": (
            "Kill books-alone residual driver if pickType-stratified qhat fat/lean ratio < 1.15"
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        payload = {"ok": False, "error": f"input missing: {path}", "status": "DATA_BLOCKED"}
        write_report(Path(args.out), payload)
        print(dumps_report(payload))
        return 2
    raw_rows = load_rows(path)
    rows = []
    for raw in raw_rows:
        c = coerce_row(raw)
        if not c:
            continue
        gen = parse_iso(raw.get("generatedAt"))
        c["gen_ts"] = gen.timestamp() if gen else 0
        rows.append(c)

    pre = [r for r in rows if r["timing"] == "pre_game"]
    timing_filter = "pre_game_only"
    if not pre:
        # Strength: never silently expand the denominator. Record the fallback.
        pre = rows
        timing_filter = "FALLBACK_all_rows_no_pre_game_clocks"
    report_n_pre = len(pre)

    def axis_books(r):
        return r["books"]

    def axis_books_ml(r):
        return f'{r["books"]}|{r["pickType"]}' if r["pickType"] == "MONEYLINE" else f'{r["books"]}|other'

    report: dict[str, Any] = {
        "ok": True,
        "alpha": ALPHA,
        "min_n": MIN_N,
        "buckets": list(BOOK_BUCKETS),
        "input": str(path),
        "n_loaded": len(rows),
        "n_pre_game": report_n_pre,
        "timing_filter": timing_filter,
        "method": {
            "residual_primary": "|y - marketFairProb|",
            "residual_diagnostic": "|y - confidence/100|",
            "borrowing": "none",
            "warning": "Mondrian partitions a score; it does not fix an inverted one.",
        },
        "hit_rate_by_books_pre_game": {},
        "mondrian_mfp_by_books": {},
        "mondrian_conf_by_books": {},
        "time_split_pooled_vs_own_books_mfp": [],
        "coupling": {},
    }

    for b in BOOK_BUCKETS + ("UNKNOWN",):
        subset = [r for r in pre if r["books"] == b]
        if not subset:
            continue
        report["hit_rate_by_books_pre_game"][b] = {
            "n": len(subset),
            "hit_rate": sum(r["y"] for r in subset) / len(subset),
            "n_mfp": sum(1 for r in subset if r["mfp"] is not None),
        }
        report["mondrian_mfp_by_books"][b] = bin_stats(subset, "res_mfp")
        report["mondrian_conf_by_books"][b] = bin_stats(subset, "res_conf")

    cal, te = strat_time_split(pre, lambda r: r["books"])
    report["time_split_pooled_vs_own_books_mfp"] = coverage_under_pooled(cal, te, "res_mfp", axis_books)
    report["coupling"] = coupling_verdict(
        [
            {
                "group": b,
                **report["mondrian_mfp_by_books"][b],
            }
            for b in report["mondrian_mfp_by_books"]
        ]
    )
    # pickType stratified hit by books — kill-line input
    by_pt = []
    for pt in sorted({r["pickType"] for r in pre}):
        for b in BOOK_BUCKETS:
            sub = [r for r in pre if r["pickType"] == pt and r["books"] == b]
            if len(sub) < 9:
                continue
            st = bin_stats(sub, "res_mfp")
            by_pt.append({"pickType": pt, "books": b, **st, "hit_rate": sum(r["y"] for r in sub) / len(sub)})
    report["by_pickType_books_mfp"] = by_pt
    ratios = []
    for pt in {x["pickType"] for x in by_pt}:
        qs = [x["qhat"] for x in by_pt if x["pickType"] == pt and x.get("qhat") is not None]
        if len(qs) >= 2 and min(qs) > 0:
            ratios.append({"pickType": pt, "qhat_ratio": max(qs) / min(qs)})
    report["pickType_stratified_qhat_ratios"] = ratios
    report["kill_line_books_alone_result"] = (
        "SURVIVES_books_alone_driver"
        if any(r["qhat_ratio"] >= 1.15 for r in ratios)
        else "KILLED_books_alone_driver_ratio_lt_1.15"
        if ratios
        else "NOT_RUN_insufficient_pickType_bins"
    )

    # sport × books crosses (S2.1)
    by_sport_books = []
    for sp in sorted({r["sport"] for r in pre}):
        for b in BOOK_BUCKETS:
            sub = [r for r in pre if r["sport"] == sp and r["books"] == b]
            if not sub:
                continue
            by_sport_books.append(
                {
                    "sport": sp,
                    "books": b,
                    **bin_stats(sub, "res_mfp"),
                    "hit_rate": sum(r["y"] for r in sub) / len(sub),
                }
            )
    report["by_sport_books_mfp"] = by_sport_books
    sport_ratios = []
    for sp in {x["sport"] for x in by_sport_books}:
        qs = [x["qhat"] for x in by_sport_books if x["sport"] == sp and x.get("qhat") is not None]
        if len(qs) >= 2 and min(qs) > 0:
            sport_ratios.append({"sport": sp, "qhat_ratio": max(qs) / min(qs)})
    report["sport_stratified_qhat_ratios"] = sport_ratios

    # K2-style composition flag on MONEYLINE 0-book vs 10+ (inputs; not an edge claim)
    ml0 = [r for r in pre if r["pickType"] == "MONEYLINE" and r["books"] == "0"]
    ml10 = [r for r in pre if r["pickType"] == "MONEYLINE" and r["books"] == "10+"]
    hit0 = sum(r["y"] for r in ml0) / len(ml0) if ml0 else None
    hit10 = sum(r["y"] for r in ml10) / len(ml10) if ml10 else None
    null_mfp_share0 = (
        sum(1 for r in ml0 if r["mfp"] is None) / len(ml0) if ml0 else None
    )
    mean_conf0 = (
        mean([r["p_conf"] for r in ml0 if r["p_conf"] is not None]) if ml0 else None
    )
    q0 = bin_stats(ml0, "res_mfp").get("qhat") if ml0 else None
    q10 = bin_stats(ml10, "res_mfp").get("qhat") if ml10 else None
    wider_0 = None
    if q0 is not None and q10 is not None:
        wider_0 = q0 > q10
    k2 = "NOT_RUN"
    if hit0 is not None and hit10 is not None:
        gap_pp = 100 * (hit0 - hit10)
        sel = (
            (null_mfp_share0 or 0) >= 0.80
            and (mean_conf0 or 0) >= 0.75
            and gap_pp <= 5.0
        )
        edgeish = gap_pp > 10.0 and wider_0 is False
        if edgeish:
            k2 = "INPUTS_SUGGEST_edge_language_may_still_need_K1_public_price"
        elif sel or (gap_pp > 10.0 and wider_0 is False):
            k2 = "K2_selection_or_not_wider_residual"
        elif gap_pp > 10.0 and wider_0 is True:
            k2 = "0book_high_hit_AND_wider_residuals_needs_K1"
        else:
            k2 = "NO_extreme_gap_or_insufficient_ml_bins"
    report["ml_zero_book_composition"] = {
        "n_0book": len(ml0),
        "n_10plus": len(ml10),
        "hit_0book": hit0,
        "hit_10plus": hit10,
        "gap_pp": (100 * (hit0 - hit10)) if hit0 is not None and hit10 is not None else None,
        "null_mfp_share_0book": null_mfp_share0,
        "mean_conf_100_0book": mean_conf0,
        "qhat_0book_mfp": q0,
        "qhat_10plus_mfp": q10,
        "residual_wider_on_0book": wider_0,
        "k2_flag": k2,
        "note": "Composition inputs only — H_edge still requires public implied p (K1) in NCAAF_ML_ZERO_BOOK_TEST.",
    }

    out = Path(args.out)
    write_report(out, report)
    print(dumps_report({"ok": True, "out": str(out), "coupling": report["coupling"].get("verdict"), "n_pre": report_n_pre, "timing_filter": timing_filter}))
    return 0


def coupling_placeholder():
    return {}


if __name__ == "__main__":
    raise SystemExit(main())
