#!/usr/bin/env python3
"""Totals e-process eps sweep + weather-band promotion artifact (loop implement)."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from owned_replacement_engine import eprocess, y_and_p_m, fnum  # noqa: E402
from datetime import datetime, timezone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--weather", default="")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]

    def ts(r):
        try:
            return datetime.fromisoformat(
                str(r.get("settledAt") or r.get("commenceTime") or r.get("generatedAt") or "1970-01-01").replace("Z", "+00:00")
            ).timestamp()
        except Exception:
            return 0

    rows.sort(key=ts)
    totals = [r for r in rows if str(r.get("pickType") or "").upper() == "TOTAL"]
    pts = []
    for r in totals:
        t = y_and_p_m(r)
        if t:
            pts.append(t)

    sweep = []
    for eps in (0.0, 0.05, 0.10, 0.15, 0.25, 0.40):
        ep = eprocess(pts, eps=eps)
        sweep.append(
            {
                "epsilon": eps,
                "n": ep.get("n"),
                "M_max": ep.get("M_max"),
                "M_current": ep.get("M_current"),
                "verdict": ep.get("verdict"),
            }
        )
    best = max(sweep, key=lambda x: x.get("M_max") or 0)

    # formal skill claim only if some eps crosses 20 on this ledger
    any_reject = any((s.get("M_max") or 0) >= 20 for s in sweep)

    weather = None
    if args.weather and Path(args.weather).exists():
        w = json.loads(Path(args.weather).read_text(encoding="utf-8"))
        cells = w.get("weather_mondrian_oot") or []
        weather = {
            "n_games": w.get("n_games"),
            "bins": [
                {
                    "wbin": c.get("wbin"),
                    "n_te": c.get("n_te"),
                    "halfwidth": c.get("halfwidth"),
                    "coverage_oot": c.get("coverage_oot"),
                }
                for c in cells
            ],
            "promotion": (
                "PROMOTE_weather_roof_NFL_margin_UQ"
                if cells and all((c.get("coverage_oot") or 0) >= 0.85 for c in cells if c.get("coverage_oot") is not None)
                else "REVIEW"
            ),
            "product_label": (
                "NFL margin uncertainty: weather/roof-stratified residual bands (owned nflverse). "
                "K3 product-market conformal bands remain KILLED (0.77<0.85) — do not publish fake 90% there."
            ),
        }

    report = {
        "ok": True,
        "n_totals_with_p_m_y": len(pts),
        "eps_sweep": sweep,
        "best_eps": best,
        "ville_threshold": 20,
        "any_eps_rejects": any_reject,
        "skill_claim": "REJECTED_not_yet" if not any_reject else "CANDIDATE_needs_preregistered_ledger",
        "weather_promotion": weather,
        "kill_lines": [
            "Do not claim forecast skill unless some pre-registered eps has M_max>=1/alpha on this ledger",
            "Logit-pool TOTALS already MODEL_ADDS_INFORMATION — keep as spine; e-process is anytime-valid add-on",
        ],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_report(Path(args.out), report)
    print(dumps_report({"ok": True, "out": str(args.out), "n": len(pts), "best": best, "any_reject": any_reject}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
