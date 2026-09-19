#!/usr/bin/env python3
"""Adaptive / selective-publish δ SHADOW instrument (stats-lane V2).

Settled board-export rows with marketFairProb + result WIN/LOSS.
ONE publish definition (documented, not two):
  publish(δ)  iff  |marketFairProb − 0.5| >= δ
  (rankingP-disagreement variant is NOT used — export mixes bases and
   collinearity with MODEL_VERSION is already documented in AGENTS.md)

For each δ in [0.00, 0.02, 0.05, 0.08, 0.10, 0.12, 0.15, 0.20]:
  n_published, hit_rate, brier on published, coverage = n_pub / n_eligible
Baseline fixed δ = 0.10 (selective-publish prior).

Realized bits (log score vs 0.5 coin) on published set:
  mean( y*log2(p) + (1-y)*log2(1-p) )  higher (less negative) is better.

Kill / honesty:
  Do NOT claim out-of-sample skill without a split. Best in-sample δ is
  reported as SHADOW only. Chronological 70/30 split is descriptive, labeled
  OOS-shadow, never a promotion claim.

Positive path: report which δ maximizes realized bits / hit rate on decided
pre-game rows as SHADOW. No gate flip, no SELECTIVE_PUBLISH_DELTA write.

GSE2 adaptive-delta-hedge.ts / adaptive-delta-analysis.ts ported at the
DELTAS + sit-out idea level only (export has no multi-expert stream).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402  (helpers on path)

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
DEFAULT_OUT = Path("docs/ops/stats-lane/out/adaptive_delta_shadow.json")

DELTAS = [0.00, 0.02, 0.05, 0.08, 0.10, 0.12, 0.15, 0.20]
BASELINE_DELTA = 0.10
PUBLISH_DEF = "publish iff |marketFairProb - 0.5| >= delta  (ONE definition; rankingP variant unused)"
KILL_LINE = (
    "best in-sample δ is SHADOW only; no OOS skill claim without a pre-registered split; "
    "never write SELECTIVE_PUBLISH_DELTA from this instrument"
)


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def is_pre_game(row: dict) -> bool:
    ga = row.get("generatedAt")
    ct = row.get("commenceTime")
    if not ga or not ct:
        return True
    try:
        g = datetime.fromisoformat(ga.replace("Z", "+00:00"))
        c = datetime.fromisoformat(ct.replace("Z", "+00:00"))
        return g < c
    except Exception:
        return True


def load_eligible(path: Path) -> list[dict]:
    rows = []
    for line in path.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        o = json.loads(line)
        if o.get("isBootstrap"):
            continue
        if o.get("result") not in ("WIN", "LOSS"):
            continue
        if not is_pre_game(o):
            continue
        mfp = fnum(o.get("marketFairProb"))
        if mfp is None:
            continue
        y = 1.0 if o.get("result") == "WIN" else 0.0
        ga = o.get("generatedAt") or ""
        rows.append(
            {
                "generatedAt": ga,
                "sport": o.get("sport"),
                "pickType": o.get("pickType"),
                "modelVersion": o.get("modelVersion"),
                "mfp": mfp,
                "y": y,
            }
        )
    rows.sort(key=lambda r: r["generatedAt"])
    return rows


def eval_delta(rows: list[dict], delta: float) -> dict:
    n_elig = len(rows)
    pub = [r for r in rows if abs(r["mfp"] - 0.5) >= delta]
    n_pub = len(pub)
    if n_pub == 0:
        return {
            "delta": delta,
            "n_published": 0,
            "n_eligible": n_elig,
            "coverage": 0.0,
            "hit_rate": None,
            "brier": None,
            "realized_bits_vs_0.5": None,
        }
    hits = sum(r["y"] for r in pub)
    hit_rate = hits / n_pub
    brier = sum((r["mfp"] - r["y"]) ** 2 for r in pub) / n_pub
    bits = 0.0
    for r in pub:
        p = min(max(r["mfp"], 1e-6), 1 - 1e-6)
        bits += math.log2(p) if r["y"] >= 0.5 else math.log2(1 - p)
    bits /= n_pub
    return {
        "delta": delta,
        "n_published": n_pub,
        "n_eligible": n_elig,
        "coverage": n_pub / n_elig if n_elig else 0.0,
        "hit_rate": hit_rate,
        "brier": brier,
        "realized_bits_vs_0.5": bits,
    }


def pick_best(candidates: list[dict], key: str) -> dict | None:
    usable = [c for c in candidates if c.get(key) is not None and c.get("n_published", 0) >= 30]
    if not usable:
        return None
    return max(usable, key=lambda c: c[key])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--export", type=Path, default=EXPORT)
    args = ap.parse_args()

    if not args.export.exists():
        payload = {
            "instrument": "adaptive_delta_shadow",
            "status": "DATA_BLOCKED",
            "need": str(args.export),
            "kill_line": KILL_LINE,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_report(args.out, payload)
        print(json.dumps({"status": "DATA_BLOCKED", "out": str(args.out)}))
        return 1

    rows = load_eligible(args.export)
    n = len(rows)
    full = [eval_delta(rows, d) for d in DELTAS]
    baseline = next((r for r in full if r["delta"] == BASELINE_DELTA), None)

    # Chronological 70/30 descriptive split — SHADOW only
    split = int(n * 0.7) if n else 0
    insample, oos = rows[:split], rows[split:]
    insample_eval = [eval_delta(insample, d) for d in DELTAS]
    oos_eval = [eval_delta(oos, d) for d in DELTAS]

    best_bits_full = pick_best(full, "realized_bits_vs_0.5")
    best_hit_full = pick_best(full, "hit_rate")
    best_bits_ins = pick_best(insample_eval, "realized_bits_vs_0.5")
    # OOS read at the in-sample best δ (the only honest OOS pairing)
    oos_at_ins_best = None
    if best_bits_ins is not None:
        oos_at_ins_best = next(
            (r for r in oos_eval if r["delta"] == best_bits_ins["delta"]), None
        )

    payload = {
        "instrument": "adaptive_delta_shadow",
        "status": "ok",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "export": str(args.export),
        "publish_definition": PUBLISH_DEF,
        "deltas": DELTAS,
        "baseline_delta": BASELINE_DELTA,
        "kill_line": KILL_LINE,
        "n_eligible_pregame_settled_mfp": n,
        "population": (
            "board-export rows: result WIN/LOSS, isBootstrap=false, marketFairProb finite, "
            "generatedAt < commenceTime (or timestamps missing → kept)"
        ),
        "full_sample": full,
        "baseline_delta_0.10": baseline,
        "positive_path_shadow": {
            "best_delta_by_realized_bits_IN_SAMPLE": best_bits_full,
            "best_delta_by_hit_rate_IN_SAMPLE": best_hit_full,
            "label": "SHADOW ONLY — in-sample maximizer is not OOS skill",
            "oos_split": {
                "split_at_generatedAt_70_30": True,
                "n_insample": len(insample),
                "n_oos": len(oos),
                "insample_best_delta_by_bits": best_bits_ins,
                "oos_eval_at_insbest_delta": oos_at_ins_best,
                "label": "descriptive OOS-shadow; NOT a pre-registered promotion",
            },
        },
        "replacement_path": (
            "If a selective-publish threshold is ever re-tuned, re-run this shadow on a "
            "frozen holdout AFTER a pre-registration lands in docs/ops/stats-lane/. "
            "Rank public boards on marketFairProb; δ only WITHHOLDS (asymmetric, no "
            "MODEL_VERSION bump), same asymmetry doctrine as the conviction gate."
        ),
        "hedge_note": (
            "GSE2 adaptive-delta-hedge.ts uses Hedge over expert δs with sit-out loss 0.25. "
            "This export has no expert stream; instrument reports fixed-δ curves + bits only."
        ),
    }
    write_report(args.out, payload)
    print(
        json.dumps(
            {
                "instrument": "adaptive_delta_shadow",
                "status": "ok",
                "n": n,
                "best_bits_delta": None if not best_bits_full else best_bits_full["delta"],
                "best_bits": None if not best_bits_full else best_bits_full["realized_bits_vs_0.5"],
                "baseline_brier": None if not baseline else baseline["brier"],
                "out": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
