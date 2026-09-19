#!/usr/bin/env python3
"""PASS-veto + totals e-process re-run instrument (loop replacement).

Reads board-export; reports independentEdge when present; always recomputes
totals e-process + weather promotion status for the bus scoreboard.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from owned_replacement_engine import eprocess, y_and_p_m  # noqa: E402


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
    dec = Counter()
    veto_n = 0
    pending_veto = 0
    for r in rows:
        d = r.get("independentEdgeDecision") or r.get("independentEdge")
        if isinstance(d, dict):
            d = d.get("decision")
        if d:
            dec[str(d)] += 1
        if r.get("passVeto") or d == "PASS":
            veto_n += 1
            if r.get("result") == "PENDING":
                pending_veto += 1

    totals = [r for r in rows if str(r.get("pickType") or "").upper() == "TOTAL"]
    pts = []
    for r in totals:
        t = y_and_p_m(r)
        if t:
            pts.append(t)
    eps = [0.0, 0.05, 0.10, 0.25]
    sweep = [{"epsilon": e, **{k: ep.get(k) for k in ("n", "M_max", "M_current", "verdict")}} for e in eps for ep in [eprocess(pts, eps=e)]]

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "n_export": len(rows),
        "independentEdgeDecision_counts": dict(dec),
        "passVeto_n": veto_n,
        "pending_with_pass_veto": pending_veto,
        "export_has_edge_fields": any("independentEdge" in str(k) or k == "passVeto" for k in (rows[0] if rows else {})),
        "totals_eprocess_sweep": sweep,
        "totals_n": len(pts),
        "kill_lines": [
            "Never mint when passVeto true",
            "Skill claim only if M_max >= 20",
            "K3 product bands stay No-band",
        ],
        "replacements": [
            "weather/roof Mondrian for NFL UQ",
            "marketFairProb public p on book-priced rows",
            "totals-first CLV narrative",
            "board-export v3 carries independentEdge* + passVeto",
        ],
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "decisions": dict(dec),
                "passVeto_n": veto_n,
                "totals_n": len(pts),
                "sweep": sweep,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
