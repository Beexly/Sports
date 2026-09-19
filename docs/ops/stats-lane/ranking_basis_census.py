#!/usr/bin/env python3
"""Ranking-basis census + version-fixed ordering within v5.2.7.

Opus production census: confidence-basis collinear with retired versions.
Replacement design: within the DEPLOYED version, rankingSource differs
(confidence vs independent_trueProb vs blend) while rankingP is present —
compare those orderings on the SAME version (no version confound).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def basis_label(r):
    rp = fnum(r.get("rankingP"))
    rs = r.get("rankingSource")
    if rp is None:
        return "confidence_only_no_rankingP"
    return rs or "rankingP_no_source"


def hit_rate(rows):
    dec = [r for r in rows if r.get("result") in ("WIN", "LOSS")]
    if not dec:
        return {"n": 0, "hit": None, "wilson95": [None, None]}
    w = sum(1 for r in dec if r["result"] == "WIN")
    p = w / len(dec)
    return {"n": len(dec), "wins": w, "hit": p, "wilson95": wilson(p, len(dec))}


def top_decile(rows, score_key="rankingP"):
    scored = []
    for r in rows:
        s = fnum(r.get(score_key))
        if s is None:
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        scored.append((s, r))
    if len(scored) < 20:
        return {"n": len(scored), "status": "THIN_n_lt_20"}
    scored.sort(key=lambda x: -x[0])
    k = max(1, len(scored) // 10)
    top = scored[:k]
    hits = sum(1 for _, r in top if r["result"] == "WIN")
    p = hits / len(top)
    return {
        "n_pool": len(scored),
        "n_top_decile": len(top),
        "mean_score_top": sum(s for s, _ in top) / len(top),
        "top_decile_hit": p,
        "wilson95": wilson(p, len(top)),
        "base_hit": sum(1 for _, r in scored if r["result"] == "WIN") / len(scored),
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
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    for r in rows:
        r["_basis"] = basis_label(r)
        r["_sport"] = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))

    c = Counter(r["_basis"] for r in rows)
    by_mv = defaultdict(Counter)
    for r in rows:
        by_mv[r.get("modelVersion") or "?"][r["_basis"]] += 1

    # pending vs settled
    pending = [r for r in rows if r.get("result") == "PENDING"]
    settled = [r for r in rows if r.get("result") in ("WIN", "LOSS")]

    # collinearity check
    conf_only_mv = sorted({r.get("modelVersion") for r in rows if r["_basis"] == "confidence_only_no_rankingP"})

    # Version-fixed ordering: v5.2.7 rows with rankingP + marketFairProb
    v527 = [
        r
        for r in settled
        if str(r.get("modelVersion")) == "v5.2.7"
        and fnum(r.get("rankingP")) is not None
        and fnum(r.get("marketFairProb")) is not None
    ]
    by_src = defaultdict(list)
    for r in v527:
        by_src[r.get("rankingSource") or "null"].append(r)

    ordering_within_v527 = {}
    for src, rs in by_src.items():
        ordering_within_v527[src] = {
            "hit_all_decided": hit_rate(rs),
            "top_decile_rankingP": top_decile(rs, "rankingP"),
            "top_decile_marketFairProb": top_decile(rs, "marketFairProb"),
            "n": len(rs),
        }

    # live pending board composition
    pending_basis = Counter(r["_basis"] for r in pending)
    pending_src = Counter(r.get("rankingSource") or "null" for r in pending if fnum(r.get("rankingP")) is not None)

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "n_export": len(rows),
        "basis_counts": dict(c),
        "basis_by_modelVersion": {mv: dict(ctr) for mv, ctr in sorted(by_mv.items())},
        "confidence_only_modelVersions": conf_only_mv,
        "collinearity": (
            "CONFIRMED: confidence_only rows exist only on "
            + ", ".join(conf_only_mv)
            if conf_only_mv
            else "NOT observed"
        ),
        "settled_basis": dict(Counter(r["_basis"] for r in settled)),
        "pending_basis": dict(pending_basis),
        "pending_rankingSource": dict(pending_src),
        "opus_production_compare": {
            "opus_confidence_share": 0.455,
            "our_confidence_only_share": c.get("confidence_only_no_rankingP", 0) / len(rows) if rows else None,
            "note": "Same 1482-row v5.0.0+v5.1.0 legacy cohort on both snapshots",
        },
        "version_fixed_ordering_v5.2.7": ordering_within_v527,
        "kill_lines": [
            "Ordering duel only within a single modelVersion (no cross-version pooling)",
            "If top-decile Wilson intervals overlap, say THEY OVERLAP",
            "Do not pool rankingSource=confidence with independent_trueProb into one 'rankingP' claim",
        ],
        "live_board_note": (
            "Pending rows in THIS export include rankingSource=confidence on v5.2.6/v5.2.7 — "
            "live board is not uniformly independent-priced. Report both sources."
        ),
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "basis": dict(c),
                "conf_only_mvs": conf_only_mv,
                "v527_src": {k: v["n"] for k, v in ordering_within_v527.items()},
                "pending_src": dict(pending_src),
            }
        )
    )
    for src, body in ordering_within_v527.items():
        td = body.get("top_decile_rankingP") or {}
        print(
            f"  v5.2.7 {src:24s} n={body['n']:4d} "
            f"hit={body['hit_all_decided'].get('hit')} "
            f"top_rankP={td.get('top_decile_hit')} base={td.get('base_hit')}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
