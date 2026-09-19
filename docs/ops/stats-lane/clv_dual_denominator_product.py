#!/usr/bin/env python3
"""CLV dual-denominator PRODUCT-FACING summary (stats-lane V2, Law 10).

Input: board-export.jsonl (clvVerdict + clvCloseLine + sport/pickType/result).

Combines:
  - population ladder rates (ALL / decided / excl VOID_PENDING / nonpush)
  - sport×pickType cells with n
  - totals-first recommendation (cells ordered by n among CLV-graded)
  - explicit Law-10 surface strings: rate + n + population + exclusions

Do NOT claim 52.4 unless a cell actually reaches it. ESTABLISHED break-even
is 0.524 at -110; this instrument reports observed rates with denominators.

Dual denominators (both surfaces, both strings):
  R1 graded: BEAT / (BEAT+MATCHED+LOST)     — MATCHED in denom (push-analogue)
  R4 beat-vs-lost: BEAT / (BEAT+LOST)       — MATCHED excluded (decided-vs-close)

Laws: no DB, no gate flips, no fabricated rates. Engine verdict column is the
grade of record (never clvValue>0 — AGENTS.md correction 2026-09-19).
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
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402  (helpers on path)

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
DEFAULT_OUT = Path("docs/ops/stats-lane/out/clv_dual_denominator_product.json")

BREAK_EVEN = 0.524
MIN_N_FOR_524_CLAIM = 30  # Law 4/10: no break-even claim on a thin cell


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float | None, float | None]:
    if n <= 0:
        return None, None
    p = k / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = (z / denom) * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, center - half), min(1.0, center + half)


def rates_from_verdicts(verdicts: list[str]) -> dict:
    c = Counter(verdicts)
    beat = c.get("BEAT_CLOSE", 0)
    matched = c.get("MATCHED_CLOSE", 0)
    lost = c.get("LOST_TO_CLOSE", 0)
    null = c.get("NULL", 0) + c.get(None, 0)  # type: ignore[arg-type]
    # also count missing/unknown strings
    for k, v in c.items():
        if k not in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"):
            null += 0  # already handled None; other strings counted below
    other = sum(v for k, v in c.items() if k not in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE", None))
    graded = beat + matched + lost
    beat_or_lost = beat + lost
    r1 = (beat / graded) if graded else None
    r4 = (beat / beat_or_lost) if beat_or_lost else None
    lo1, hi1 = wilson(beat, graded)
    lo4, hi4 = wilson(beat, beat_or_lost)
    return {
        "verdict_counts": dict(c),
        "n_beat": beat,
        "n_matched": matched,
        "n_lost": lost,
        "n_null_or_ungraded": null + other,
        "n_graded_R1_denom": graded,
        "n_beat_or_lost_R4_denom": beat_or_lost,
        "rate_R1_graded_MATCHED_in_denom": r1,
        "rate_R1_wilson95": [lo1, hi1],
        "rate_R4_beat_vs_lost": r4,
        "rate_R4_wilson95": [lo4, hi4],
        "beats_break_even_R1": (
            r1 is not None and graded >= MIN_N_FOR_524_CLAIM and r1 >= BREAK_EVEN
        ),
        "beats_break_even_R4": (
            r4 is not None and beat_or_lost >= MIN_N_FOR_524_CLAIM and r4 >= BREAK_EVEN
        ),
        "thin_cell_suppressed_524": (
            (r1 is not None and r1 >= BREAK_EVEN and graded < MIN_N_FOR_524_CLAIM)
            or (r4 is not None and r4 >= BREAK_EVEN and beat_or_lost < MIN_N_FOR_524_CLAIM)
        ),
        "law10_surface_R1": (
            f"CLV beat-close {r1:.1%} (n={graded} graded; MATCHED in denominator) "
            f"on board-export settled+pending CLV-graded picks; exclusions: "
            f"{null + other} ungraded/no close line. Population = clvVerdict in "
            f"{{BEAT,MATCHED,LOST}}. Break-even {BREAK_EVEN:.1%} — NOT claimed unless "
            f"observed rate >= {BREAK_EVEN:.1%}."
            if r1 is not None
            else "CLV R1: no graded rows"
        ),
        "law10_surface_R4": (
            f"CLV beat-close {r4:.1%} (n={beat_or_lost} BEAT+LOST; MATCHED excluded) "
            f"on board-export. Exclusions: {matched} MATCHED_CLOSE + {null + other} "
            f"ungraded. Population = decided-vs-close only. Break-even {BREAK_EVEN:.1%} "
            f"— NOT claimed unless observed rate >= {BREAK_EVEN:.1%}."
            if r4 is not None
            else "CLV R4: no BEAT/LOST rows"
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--export", type=Path, default=EXPORT)
    args = ap.parse_args()

    if not args.export.exists():
        payload = {
            "instrument": "clv_dual_denominator_product",
            "status": "DATA_BLOCKED",
            "need": str(args.export),
            "break_even": BREAK_EVEN,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_report(args.out, payload)
        print(json.dumps({"status": "DATA_BLOCKED", "out": str(args.out)}))
        return 1

    rows = []
    for line in args.export.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        o = json.loads(line)
        rows.append(
            {
                "result": o.get("result"),
                "sport": o.get("sport") or "UNKNOWN",
                "pickType": o.get("pickType") or "UNKNOWN",
                "clvVerdict": o.get("clvVerdict") or "NULL",
                "clvCloseLine": fnum(o.get("clvCloseLine")),
                "clvLockLine": fnum(o.get("clvLockLine")),
                "isPublished": o.get("isPublished"),
                "isBootstrap": o.get("isBootstrap"),
                "modelVersion": o.get("modelVersion"),
            }
        )

    n_all = len(rows)
    decided = [r for r in rows if r["result"] in ("WIN", "LOSS")]
    excl_vp = [r for r in rows if r["result"] not in ("VOID", "PENDING")]
    published = [r for r in rows if r.get("isPublished")]
    nonboot = [r for r in decided if not r.get("isBootstrap")]

    populations = [
        ("ALL_rows", rows),
        ("decided_WIN_LOSS", decided),
        ("excl_VOID_PENDING", excl_vp),
        ("published", published),
        ("decided_nonbootstrap", nonboot),
    ]
    ladder = []
    for label, pop in populations:
        block = rates_from_verdicts([r["clvVerdict"] for r in pop])
        block["label"] = label
        block["n_population"] = len(pop)
        ladder.append(block)

    # sport × pickType cells on decided nonbootstrap with a CLV verdict
    cell_rows: dict[tuple, list[dict]] = defaultdict(list)
    for r in nonboot:
        if r["clvVerdict"] in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"):
            cell_rows[(r["sport"], r["pickType"])].append(r)

    cells = []
    for (sport, ptype), cell in sorted(cell_rows.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        block = rates_from_verdicts([r["clvVerdict"] for r in cell])
        block["sport"] = sport
        block["pickType"] = ptype
        block["n_cell"] = len(cell)
        cells.append(block)

    # totals-first recommendation: rank CLV-graded cells by n descending
    graded_cells = [c for c in cells if c["n_graded_R1_denom"] >= 30]
    graded_cells.sort(key=lambda c: c["n_graded_R1_denom"], reverse=True)
    totals_first = [c for c in graded_cells if c["pickType"] == "TOTAL"]
    primary = next(b for b in ladder if b["label"] == "decided_nonbootstrap")
    recommendation = {
        "strategy": "totals-first",
        "rationale": (
            "Among CLV-graded decided non-bootstrap cells with n_graded>=30, publish the "
            "largest-denominator cells first. TOTAL cells listed ahead when present "
            "(H2/H6: SPREAD carries the info-slope association; TOTAL has larger graded n "
            "on this export historically — re-order after this run if numbers differ)."
        ),
        "totals_cells_n_ge_30": [
            {
                "sport": c["sport"],
                "pickType": c["pickType"],
                "n_graded": c["n_graded_R1_denom"],
                "rate_R1": c["rate_R1_graded_MATCHED_in_denom"],
                "rate_R4": c["rate_R4_beat_vs_lost"],
                "beats_52_4_R1": c["beats_break_even_R1"],
                "beats_52_4_R4": c["beats_break_even_R4"],
            }
            for c in totals_first
        ],
        "largest_graded_cells": [
            {
                "sport": c["sport"],
                "pickType": c["pickType"],
                "n_graded": c["n_graded_R1_denom"],
                "rate_R1": c["rate_R1_graded_MATCHED_in_denom"],
                "rate_R4": c["rate_R4_beat_vs_lost"],
                "beats_52_4_R1": c["beats_break_even_R1"],
                "beats_52_4_R4": c["beats_break_even_R4"],
            }
            for c in graded_cells[:12]
        ],
        "any_cell_beats_break_even_R1": any(c["beats_break_even_R1"] for c in cells),
        "any_cell_beats_break_even_R4": any(c["beats_break_even_R4"] for c in cells),
        "min_n_for_524_claim": MIN_N_FOR_524_CLAIM,
        "cells_reaching_524": [
            {
                "sport": c["sport"],
                "pickType": c["pickType"],
                "n_graded": c["n_graded_R1_denom"],
                "n_beat_or_lost": c["n_beat_or_lost_R4_denom"],
                "rate_R1": c["rate_R1_graded_MATCHED_in_denom"],
                "rate_R4": c["rate_R4_beat_vs_lost"],
                "beats_R1": c["beats_break_even_R1"],
                "beats_R4": c["beats_break_even_R4"],
            }
            for c in cells
            if c["beats_break_even_R1"] or c["beats_break_even_R4"]
        ],
        "thin_cells_with_rate_ge_524_NOT_CLAIMABLE": [
            {
                "sport": c["sport"],
                "pickType": c["pickType"],
                "n_graded": c["n_graded_R1_denom"],
                "n_beat_or_lost": c["n_beat_or_lost_R4_denom"],
                "rate_R1": c["rate_R1_graded_MATCHED_in_denom"],
                "rate_R4": c["rate_R4_beat_vs_lost"],
            }
            for c in cells
            if c.get("thin_cell_suppressed_524")
        ],
        # Claim is cell-scoped AND n-scoped. Pooled primary population does NOT
        # reach 0.524 — a thin-cell rate above the bar is listed but not claimable.
        "claim_52_4_allowed": any(
            c["beats_break_even_R1"] or c["beats_break_even_R4"] for c in cells
        ),
        "pooled_primary_beats_52_4": (
            primary.get("beats_break_even_R1") or primary.get("beats_break_even_R4")
        ),
        "claim_52_4_scope": (
            "Cell-scoped only, and only when that cell's denominator n >= "
            f"{MIN_N_FOR_524_CLAIM}. Pooled decided non-bootstrap R1/R4 do NOT reach "
            f"{BREAK_EVEN}. Thin cells above the bar are listed, not claimable. "
            "A cell that clears R4 (MATCHED excluded) does NOT license a pooled "
            "or R1 claim."
        ),
    }

    # Law-10 product strings: one per population, explicit
    law10_strings = [b["law10_surface_R1"] for b in ladder if b["label"] == "decided_nonbootstrap"]
    law10_strings += [b["law10_surface_R4"] for b in ladder if b["label"] == "decided_nonbootstrap"]
    for c in recommendation["largest_graded_cells"][:4]:
        r1 = c["rate_R1"]
        law10_strings.append(
            f"{c['sport']} {c['pickType']}: CLV R1 {r1:.1%} (n_graded={c['n_graded']}, "
            f"MATCHED in denom) on decided non-bootstrap board-export; "
            f"beats {BREAK_EVEN:.1%}={c['beats_52_4_R1']}"
            if r1 is not None
            else f"{c['sport']} {c['pickType']}: no graded CLV"
        )

    primary_rates = {
        "R1_graded_MATCHED_in_denom": primary["rate_R1_graded_MATCHED_in_denom"],
        "R4_beat_vs_lost": primary["rate_R4_beat_vs_lost"],
        "n_graded": primary["n_graded_R1_denom"],
        "n_beat_or_lost": primary["n_beat_or_lost_R4_denom"],
        "beats_52_4_R1": primary.get("beats_break_even_R1"),
        "beats_52_4_R4": primary.get("beats_break_even_R4"),
    }

    payload = {
        "instrument": "clv_dual_denominator_product",
        "status": "ok",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "export": str(args.export),
        "break_even_established": BREAK_EVEN,
        "grade_of_record": "clvVerdict (BEAT_CLOSE / MATCHED_CLOSE / LOST_TO_CLOSE)",
        "n_export": n_all,
        "n_decided": len(decided),
        "n_decided_nonbootstrap": len(nonboot),
        "population_ladder": ladder,
        "primary_population": "decided_WIN_LOSS non-bootstrap",
        "primary_rates": primary_rates,
        "sport_x_pickType_cells": cells,
        "totals_first_recommendation": recommendation,
        "law10_surface_strings": law10_strings,
        "dual_denominator_doctrine": (
            "Report BOTH R1 (MATCHED in denominator) and R4 (MATCHED excluded) on every "
            "public CLV surface, each with n + population + exclusion counts. MATCHED is "
            "the CLV analogue of a push. 0.524 is a decided-only break-even; the gate's "
            "target population must be named (AGENTS.md open question — do not pick the "
            "flattering denominator)."
        ),
        "replacement_path": (
            "Replace any single CLV headline with this dual-denominator product card. "
            "Do not claim break-even skill unless a named cell's rate actually reaches "
            f"{BREAK_EVEN} with n shown. CLV never gates a signal admission (doctrine)."
        ),
        "h1_h2_crossref": (
            "H2 solutions_battery_v2 ladder on this same export: R1 graded ~0.229-0.231, "
            "R4 ~0.406-0.407, none reach 0.524 — consistent with AGENTS.md 23.2% engine "
            "BEAT_CLOSE / 40.8% beat-vs-lost correction."
        ),
        "helpers_on_path": [
            "stats_json.write_report",
            "opponent_adjusted_epa.opponent_adjusted",
            "opponent_adjusted_epa.sigmoid",
        ],
    }
    write_report(args.out, payload)
    print(
        json.dumps(
            {
                "instrument": "clv_dual_denominator_product",
                "status": "ok",
                "n_export": n_all,
                "R1": primary["rate_R1_graded_MATCHED_in_denom"],
                "R4": primary["rate_R4_beat_vs_lost"],
                "n_graded": primary["n_graded_R1_denom"],
                "claim_52_4_allowed": recommendation["claim_52_4_allowed"],
                "out": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
