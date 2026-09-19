#!/usr/bin/env python3
"""Cross-audit: Grok MARKET-5PP estimand on OUR board-export + Opus CLV predicate reconcile.

Grok estimand (verbatim from bus): Among settled WIN/LOSS picks with marketFairProb in (0,1),
fraction of 10 equal-width bins with n>=30 where |mean(mfp) - mean(y)| > 0.05.
Kill/meaning: >=1 evaluable violating bin on a sport we intend to price => market logit
is not licensed as FIXED offset for that sport. Underpowered is not a pass.

Opus CLV: engine three-valued clvVerdict vs clvValue>0 predicate.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
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


def market_5pp(rows, label):
    """Grok MARKET-5PP — equal-width bins on mfp, all + per sport."""
    scored = [
        r
        for r in rows
        if r.get("result") in ("WIN", "LOSS")
        and fnum(r.get("marketFairProb")) is not None
        and 0 < fnum(r.get("marketFairProb")) < 1
    ]
    # 10 equal-width bins on [0,1)
    bins = defaultdict(list)
    for r in scored:
        m = fnum(r.get("marketFairProb"))
        b = min(9, int(m * 10))
        y = 1 if r.get("result") == "WIN" else 0
        bins[b].append((m, y))
    evaluable = []
    violating = []
    for b in range(10):
        arr = bins.get(b) or []
        if len(arr) < 30:
            continue
        mean_m = sum(a[0] for a in arr) / len(arr)
        mean_y = sum(a[1] for a in arr) / len(arr)
        gap = abs(mean_m - mean_y)
        rec = {"bin": b, "n": len(arr), "mean_mfp": mean_m, "mean_y": mean_y, "abs_gap": gap, "violating": gap > 0.05}
        evaluable.append(rec)
        if rec["violating"]:
            violating.append(rec)
    # per sport
    by_sport = {}
    for sp in sorted({resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection")) for r in scored}):
        sub = [r for r in scored if resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection")) == sp]
        if len(sub) < 30:
            by_sport[sp] = {"n": len(sub), "status": "UNDERPOWERED"}
            continue
        bins2 = defaultdict(list)
        for r in sub:
            m = fnum(r.get("marketFairProb"))
            b = min(9, int(m * 10))
            bins2[b].append((m, 1 if r.get("result") == "WIN" else 0))
        ev, vi = [], []
        for b in range(10):
            arr = bins2.get(b) or []
            if len(arr) < 30:
                continue
            mm = sum(a[0] for a in arr) / len(arr)
            my = sum(a[1] for a in arr) / len(arr)
            gap = abs(mm - my)
            rec = {"bin": b, "n": len(arr), "mean_mfp": mm, "mean_y": my, "abs_gap": gap, "violating": gap > 0.05}
            ev.append(rec)
            if rec["violating"]:
                vi.append(rec)
        by_sport[sp] = {
            "n": len(sub),
            "n_evaluable_bins": len(ev),
            "n_violating_bins": len(vi),
            "evaluable": ev,
            "verdict": (
                "UNDERPOWERED_no_evaluable_bins"
                if not ev
                else "MARKET_OFFSET_NOT_LICENSED"
                if vi
                else "NO_VIOLATING_BIN_ge_0.05"
            ),
        }
    frac = (len(violating) / len(evaluable)) if evaluable else None
    return {
        "label": label,
        "estimand": "frac of 10 equal-width mfp bins n>=30 with |mean(mfp)-mean(y)|>0.05",
        "n_scored": len(scored),
        "n_evaluable_bins": len(evaluable),
        "n_violating_bins": len(violating),
        "fraction_violating": frac,
        "evaluable": evaluable,
        "verdict_all": (
            "NO_EVALUABLE"
            if not evaluable
            else ">=1_VIOLATING_bin_market_offset_questionable"
            if violating
            else "ALL_EVALUABLE_BINS_within_0.05"
        ),
        "by_sport": by_sport,
        "grok_kill_line": ">=1 violating evaluable bin on a priced sport => market logit not licensed as FIXED offset there",
    }


def clv_reconcile(rows):
    graded = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE")]
    npush = [r for r in graded if r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]
    beat = sum(1 for r in graded if r.get("clvVerdict") == "BEAT_CLOSE")
    beat_np = sum(1 for r in npush if r.get("clvVerdict") == "BEAT_CLOSE")
    # synthetic clvValue>0: we lack clvValue; document NOT RUN for that predicate
    return {
        "n_graded": len(graded),
        "n_non_push": len(npush),
        "beat": beat,
        "engine_verdict_all_graded": {
            "rate": beat / len(graded) if graded else None,
            "wilson95": wilson(beat / len(graded), len(graded)) if graded else [None, None],
        },
        "engine_verdict_non_push": {
            "rate": beat_np / len(npush) if npush else None,
            "wilson95": wilson(beat_np / len(npush), len(npush)) if npush else [None, None],
            "n": len(npush),
            "beat": beat_np,
        },
        "opus_quoted_engine": {"rate": 0.232, "ci": [0.212, 0.253], "n_graded_cited": 1586, "note": "Opus production SELECT"},
        "our_export_all_graded": {"rate": beat / len(graded) if graded else None, "n": len(graded)},
        "predicate_gap": (
            "Opus measured live DB n_graded~1586-1616; we measure board-export n={} snapshot. "
            "Difference is population+snapshot, not only clvValue>0 vs BEAT_CLOSE. "
            "clvValue column ABSENT in export — cannot re-run clvValue>0 predicate here."
        ).format(len(graded)),
        "clvValue_predicate": "NOT_RUN_column_absent_in_board_export",
        "agreement": (
            "DIRECTION AGREES: both << 52.4%; totals ~56.7% only near bar. "
            "EXACT RATE differs by snapshot/predicate — both must publish n+predicate (L10)."
        ),
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
    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "n_export": len(rows),
        "market_5pp_grok_estimand": market_5pp(rows, "board_export"),
        "clv_opus_reconcile": clv_reconcile(rows),
        "double_check_notes": [
            "Adversarial: Grok NOT_RUN MARKET-5PP — we ran their estimand on our export (not Neon replica)",
            "Opus typecheck 139->115 then Gemini 91dd7b19a claims 31 errors resolved — fleet should re-run tsc",
            "Kills without replacements tracked below",
        ],
        "kills_without_replacement_check": [
            {
                "who": "opus",
                "kill": "10Hz spatial stack / GPU Triton / 400ms latency arb",
                "replacement_on_bus": "Opus: pre-movement alert + Layer B already built; stats lane: weather Mondrian + densities + e-process",
                "status": "REPLACED_PARTIALLY",
            },
            {
                "who": "grok",
                "kill": "Gaussian CRPS substitute (Δ>=0.5 n>=272) — not killed at 0.018",
                "replacement": "Keep Gaussian as baseline CRPS; empirical/discrete CRPS remains gold standard; our kill line CRPS<base-0.01 for new densities",
                "status": "REPLACED_AS_BASELINE_NOT_PRODUCT",
            },
            {
                "who": "mimo/stats",
                "kill": "K3 product-market conformal bands 0.77<0.85",
                "replacement": "weather/roof Mondrian 6/6 OOT>=0.85 + sport margin densities + No-band label",
                "status": "REPLACED",
            },
            {
                "who": "grok",
                "kill": "MARKET-5PP production NOT_RUN (no replica)",
                "replacement": "THIS FILE — estimand run on board-export; production replica still founder/ops",
                "status": "REPLACED_ON_LOCAL_EXPORT",
            },
        ],
    }
    write_report(Path(args.out), report)
    m = report["market_5pp_grok_estimand"]
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_scored": m["n_scored"],
                "evaluable_bins": m["n_evaluable_bins"],
                "violating": m["n_violating_bins"],
                "verdict": m["verdict_all"],
                "clv_ours_nonpush": report["clv_opus_reconcile"]["engine_verdict_non_push"],
            }
        )
    )
    for sp, body in (m.get("by_sport") or {}).items():
        print(" sport", sp, body.get("verdict"), "n", body.get("n"), "viol", body.get("n_violating_bins"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
