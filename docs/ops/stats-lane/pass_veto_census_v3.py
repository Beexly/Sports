#!/usr/bin/env python3
"""PASS-veto census v3 — Mimo Task 1 (directive 2026-09-19).

Rule (locked): never mint/display when independentEdge.decision === "PASS"
OR expectedClv < 0.

Honest when export lacks edge fields: report export_has_*, counts of
pending published, proxy checks (trueProb vs marketFairProb), and the
exact ops action required (board-export v3 re-export).
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
OUT = Path("docs/ops/stats-lane/out/pass_veto_census_v3.json")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if v == v and abs(v) != float("inf") else None
    except Exception:
        return None


def main() -> int:
    if not EXPORT.exists():
        write_report(OUT, {"ok": False, "status": "DATA_BLOCKED", "need": str(EXPORT)})
        print("DATA_BLOCKED", EXPORT)
        return 2

    n = 0
    pending = []
    has = Counter()
    decision_counts = Counter()
    pass_pending = 0
    neg_clv_pending = 0
    pending_trueprob_lt_mfp = 0
    pending_rows = 0
    published_all = 0

    for line in EXPORT.open(encoding="utf-8"):
        r = json.loads(line)
        n += 1
        for k in (
            "independentEdgeDecision",
            "independentEdgeExpectedClv",
            "independentEdgeTrueProb",
            "passVeto",
            "expectedClv",
        ):
            if r.get(k) is not None or k in r:
                has[k] += 1
        dec = r.get("independentEdgeDecision")
        if dec is not None:
            decision_counts[str(dec)] += 1
        if r.get("isPublished"):
            published_all += 1
            if r.get("result") == "PENDING":
                pending_rows += 1
                pending.append(r)
                if dec == "PASS":
                    pass_pending += 1
                eclv = fnum(r.get("independentEdgeExpectedClv"))
                if eclv is None:
                    eclv = fnum(r.get("expectedClv"))
                if eclv is not None and eclv < 0:
                    neg_clv_pending += 1
                tp = fnum(r.get("independentTrueProb"))
                mfp = fnum(r.get("marketFairProb"))
                if tp is not None and mfp is not None and tp < mfp:
                    pending_trueprob_lt_mfp += 1

    export_has_edge = any(has.get(k, 0) > 0 for k in ("independentEdgeDecision", "passVeto", "independentEdgeExpectedClv"))
    # If fields exist on the key set of first row
    sample_keys = []
    if EXPORT.exists():
        first = json.loads(EXPORT.open(encoding="utf-8").readline())
        sample_keys = sorted(first.keys())

    verdict = (
        "EXPORT_STALE_CENSUS_INCOMPLETE"
        if not export_has_edge
        else (
            "VIOLATIONS_PRESENT"
            if (pass_pending + neg_clv_pending) > 0
            else "CLEAR_ON_EXPORT_V3"
        )
    )

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "export": str(EXPORT),
        "n_export": n,
        "n_published": published_all,
        "n_published_pending": pending_rows,
        "export_has_edge_fields": export_has_edge,
        "field_presence_counts": dict(has),
        "sample_export_keys": sample_keys,
        "independentEdgeDecision_counts": dict(decision_counts),
        "pending_decision_PASS": pass_pending,
        "pending_expectedClv_lt_0": neg_clv_pending,
        "pending_trueProb_lt_mfp_PROXY_adverse": pending_trueprob_lt_mfp,
        "veto_rule": "independentEdge.decision PASS OR expectedClv<0 => never mint/display",
        "claim_100pct_clear": export_has_edge and (pass_pending + neg_clv_pending) == 0 and pending_rows > 0,
        "verdict": verdict,
        "honest_note": (
            "Disk export does not carry independentEdge*/passVeto (script board-export.mjs:161-167 emits them). "
            "Census CANNOT verify 100% clear until ops re-exports. Proxy: pending trueProb < marketFairProb "
            f"n={pending_trueprob_lt_mfp} (adverse-looking, not a substitute for expectedClv/decision)."
        ),
        "ops_action": (
            "node scripts/ops/board-export.mjs --out docs/ops/stats-lane/incoming/board-export.jsonl  "
            "then re-run this census + loop_pass_veto_totals.py"
        ),
        "product_rule_still_enforced": (
            "Read-path adverse-edge-suppression + pricesWorseThanMarket (types) never mint PASS/neg CLV forward; "
            "historical published rows remain on the record (suppression writes nothing)."
        ),
        "law4": "Mimo did not invent DB rows; no Neon query.",
    }
    write_report(OUT, report)
    print(json.dumps({k: report[k] for k in report if k not in ("sample_export_keys", "field_presence_counts")}, indent=2)[:2000])
    print("verdict", verdict)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
