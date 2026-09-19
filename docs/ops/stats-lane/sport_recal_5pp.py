#!/usr/bin/env python3
"""Sport-conditional market recalibration replacement (5pp gate unblock path).

For each sport with 5pp violations: replace market-fixed-offset p with
sport+bin empirical p_hat (mean y in mfp bin, Laplace-smoothed), then
re-run the 5pp gate on p_hat vs y. If p_hat clears, that is the replacement
instrument — not a free pass on market logit.
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
from mimo6_situational_conformal import fnum2, market_5pp_sport, load_board  # noqa: E402


def fit_sport_bin_recal(rows):
    """Split by time: first 60% fit p_hat bins, last 40% evaluate 5pp on p_hat vs y."""
    scored = []
    for r in rows:
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        m = fnum2(r.get("marketFairProb"))
        if m is None or not (0 < m < 1):
            continue
        sp = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))
        y = 1 if r.get("result") == "WIN" else 0
        scored.append((sp, m, y, r))
    by_sp = defaultdict(list)
    for item in scored:
        by_sp[item[0]].append(item)
    out = {}
    for sp, arr in by_sp.items():
        if len(arr) < 60:
            out[sp] = {"n": len(arr), "status": "UNDERPOWERED_fit"}
            continue
        # time order via generatedAt if present
        def ts(item):
            try:
                from datetime import datetime as dt

                return dt.fromisoformat(
                    str(item[3].get("generatedAt") or "1970-01-01").replace("Z", "+00:00")
                ).timestamp()
            except Exception:
                return 0

        arr_s = sorted(arr, key=ts)
        cut = int(len(arr_s) * 0.6)
        fit, ev = arr_s[:cut], arr_s[cut:]
        # fit bin means with Laplace (1,1)
        bins = defaultdict(lambda: [0, 0])  # success, n
        for _, m, y, _ in fit:
            b = min(9, int(m * 10))
            bins[b][0] += y
            bins[b][1] += 1
        def p_hat(m):
            b = min(9, int(m * 10))
            s, n = bins[b]
            return (s + 1) / (n + 2)

        # 5pp gate on HOLDOUT using p_hat as the "claimed" probability vs y
        hb = defaultdict(list)
        for _, m, y, _ in ev:
            hb[min(9, int(p_hat(m) * 10))].append((p_hat(m), y))
        evaluable, violating = [], []
        for b in range(10):
            cell = hb.get(b) or []
            if len(cell) < 30:
                continue
            mm = sum(a[0] for a in cell) / len(cell)
            my = sum(a[1] for a in cell) / len(cell)
            gap = abs(mm - my)
            rec = {"bin": b, "n": len(cell), "mean_phat": mm, "mean_y": my, "abs_gap": gap}
            evaluable.append(rec)
            if gap > 0.05:
                violating.append(rec)
        # also 5pp on raw market holdout for comparison
        mb = defaultdict(list)
        for _, m, y, _ in ev:
            mb[min(9, int(m * 10))].append((m, y))
        m_viol = 0
        m_ev = 0
        for b in range(10):
            cell = mb.get(b) or []
            if len(cell) < 30:
                continue
            m_ev += 1
            mm = sum(a[0] for a in cell) / len(cell)
            my = sum(a[1] for a in cell) / len(cell)
            if abs(mm - my) > 0.05:
                m_viol += 1
        out[sp] = {
            "n": len(arr),
            "n_fit": len(fit),
            "n_holdout": len(ev),
            "bin_phat_fit": {str(b): {"success": v[0], "n": v[1], "p_hat": (v[0] + 1) / (v[2] + 2) if False else (v[0] + 1) / (v[1] + 2)} for b, v in bins.items()},
            "holdout_phat_evaluable_bins": len(evaluable),
            "holdout_phat_violating_bins": len(violating),
            "holdout_phat_5pp": evaluable,
            "holdout_market_evaluable_bins": m_ev,
            "holdout_market_violating_bins": m_viol,
            "gate_after_recal": (
                "RECAL_CLEARS_5pp"
                if evaluable and not violating
                else "RECAL_STILL_VIOLATES"
                if violating
                else "UNDERPOWERED_holdout_bins"
            ),
            "kill_line": "Replacment instrument valid only if holdout p_hat has 0 violating bins among evaluable n>=30",
            "note": "p_hat is sport+mfp-bin empirical rate (Laplace) — NOT market logit",
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.board)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = load_board(path)
    market_gate = market_5pp_sport(rows)
    recal = fit_sport_bin_recal(rows)
    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "market_5pp_before": {k: v.get("gate") for k, v in market_gate.items()},
        "sport_bin_recalibration": recal,
        "replacement_rule": (
            "MLB/NCAAF market-fixed-offset BLOCKED until sport-conditional p_hat "
            "clears 5pp on holdout; then product may use p_hat not raw marketFairProb"
        ),
        "mimo7_blocked_on": [
            "rest/trench/backup-QB join from 26 signals @ 0826ea2f1",
            "underdog American odds / entry prices on export",
        ],
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "before": report["market_5pp_before"],
                "recal": {k: v.get("gate_after_recal") for k, v in recal.items()},
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
