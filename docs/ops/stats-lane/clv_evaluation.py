#!/usr/bin/env python3
"""Dual-denominator CLV evaluation (Mimo Task 2 — Law 10).

Metric 1 CLV_strict = BEAT / (BEAT + LOST)  — MATCHED excluded from denom
Metric 2 CLV_all    = BEAT / ALL_graded     — MATCHED in denom, volume reported

Totals-first ladder on MLB / NFL / TOTAL cells. Break-even 52.4% never claimed
unless observed rate >= 0.524 AND n >= 30 on a named population.
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
OUT = Path("docs/ops/stats-lane/out/clv_evaluation.json")
BREAK_EVEN = 0.524


def wilson(w, n, z=1.96):
    if n <= 0:
        return (None, None)
    p = w / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - h) / d, (c + h) / d)


def cell_metrics(rows, label):
    beat = sum(1 for r in rows if r.get("clvVerdict") == "BEAT_CLOSE")
    lost = sum(1 for r in rows if r.get("clvVerdict") == "LOST_TO_CLOSE")
    matched = sum(1 for r in rows if r.get("clvVerdict") == "MATCHED_CLOSE")
    null = sum(1 for r in rows if not r.get("clvVerdict"))
    strict_den = beat + lost
    all_graded = beat + lost + matched
    r_strict = (beat / strict_den) if strict_den else None
    r_all = (beat / all_graded) if all_graded else None
    # push volume explicit (Law 10)
    push_share = (matched / all_graded) if all_graded else None
    lo_s, hi_s = wilson(beat, strict_den) if strict_den else (None, None)
    lo_a, hi_a = wilson(beat, all_graded) if all_graded else (None, None)
    return {
        "label": label,
        "n_population": len(rows),
        "n_beat": beat,
        "n_lost": lost,
        "n_matched_close": matched,
        "n_null_ungraded": null,
        "clv_strict_BEAT_over_BEAT_plus_LOST": r_strict,
        "clv_strict_n": strict_den,
        "clv_strict_wilson95": [lo_s, hi_s],
        "clv_all_BEAT_over_ALL_graded": r_all,
        "clv_all_n": all_graded,
        "clv_all_wilson95": [lo_a, hi_a],
        "matched_push_volume_share_of_graded": push_share,
        "break_even_52_4": BREAK_EVEN,
        "beats_break_even_strict": r_strict is not None and strict_den >= 30 and r_strict >= BREAK_EVEN,
        "beats_break_even_all": r_all is not None and all_graded >= 30 and r_all >= BREAK_EVEN,
        "law10_surface_strict": (
            f"CLV_strict BEAT/(BEAT+LOST) = {r_strict:.3f} (n={strict_den}) on {label}; "
            f"MATCHED excluded (n={matched}); ungraded excluded (n={null}). Break-even 52.4% NOT claimed."
            if r_strict is not None
            else f"CLV_strict NOT RUN on {label} (n_strict=0)."
        ),
        "law10_surface_all": (
            f"CLV_all BEAT/ALL_graded = {r_all:.3f} (n={all_graded}) on {label}; "
            f"MATCHED in denominator (push volume {push_share:.1%}); ungraded n={null}. Break-even 52.4% NOT claimed."
            if r_all is not None
            else f"CLV_all NOT RUN on {label} (n_graded=0)."
        ),
    }


def main() -> int:
    if not EXPORT.exists():
        write_report(OUT, {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(line) for line in EXPORT.open(encoding="utf-8")]

    populations = [
        ("ALL_export", rows),
        ("decided_WIN_LOSS", [r for r in rows if r.get("result") in ("WIN", "LOSS")]),
        ("TOTALS_first_all", [r for r in rows if r.get("pickType") == "TOTAL"]),
        ("sport:MLB", [r for r in rows if r.get("sport") == "MLB"]),
        ("sport:NFL", [r for r in rows if r.get("sport") == "NFL"]),
        ("sport:NCAAF", [r for r in rows if r.get("sport") == "NCAAF"]),
        ("MLB_TOTAL", [r for r in rows if r.get("sport") == "MLB" and r.get("pickType") == "TOTAL"]),
        ("NFL_TOTAL", [r for r in rows if r.get("sport") == "NFL" and r.get("pickType") == "TOTAL"]),
        ("MLB_SPREAD", [r for r in rows if r.get("sport") == "MLB" and r.get("pickType") == "SPREAD"]),
        ("NFL_ML", [r for r in rows if r.get("sport") == "NFL" and r.get("pickType") == "MONEYLINE"]),
        ("type:TOTAL", [r for r in rows if r.get("pickType") == "TOTAL"]),
        ("type:SPREAD", [r for r in rows if r.get("pickType") == "SPREAD"]),
        ("type:MONEYLINE", [r for r in rows if r.get("pickType") == "MONEYLINE"]),
    ]
    ladder = [cell_metrics(sub, lab) for lab, sub in populations]

    strict_clears = [c for c in ladder if c["beats_break_even_strict"]]
    all_clears = [c for c in ladder if c["beats_break_even_all"]]

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "instrument": "clv_evaluation_dual_denominator",
        "definitions": {
            "clv_strict": "BEAT_CLOSE / (BEAT_CLOSE + LOST_TO_CLOSE)",
            "clv_all": "BEAT_CLOSE / (BEAT_CLOSE + MATCHED_CLOSE + LOST_TO_CLOSE)",
            "break_even": BREAK_EVEN,
            "grade_of_record": "clvVerdict on board-export",
        },
        "totals_first_note": "Prioritize TOTAL cells for product narrative; never engine-wide CLV claim.",
        "ladder": ladder,
        "cells_beating_52_4_strict": [c["label"] for c in strict_clears],
        "cells_beating_52_4_all": [c["label"] for c in all_clears],
        "engine_wide_skill_claim": False,
        "kill_line": "Public CLV rate only with named population + n + exclusions; no engine-wide skill unless pre-registered cell >=0.524 n>=30",
        "replacement": "Totals-first dual-denominator product card; never single pooled CLV headline",
    }
    write_report(OUT, report)
    print("strict clears", report["cells_beating_52_4_strict"])
    print("all clears", report["cells_beating_52_4_all"])
    for c in ladder:
        if c["clv_strict_BEAT_over_BEAT_plus_LOST"] is not None or c["clv_all_BEAT_over_ALL_graded"] is not None:
            print(
                f"{c['label']}: strict={c['clv_strict_BEAT_over_BEAT_plus_LOST']}"
                f" n={c['clv_strict_n']} | all={c['clv_all_BEAT_over_ALL_graded']}"
                f" n={c['clv_all_n']} matched={c['n_matched_close']}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
