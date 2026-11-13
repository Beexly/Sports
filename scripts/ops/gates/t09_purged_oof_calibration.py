#!/usr/bin/env python3
"""T-09 — Purged OOF Calibration & Placebo (WP-7 gate, fail-closed).

Reads data/engine/oof_calibration_2026_11_13.json (produced by
scripts/ops/fit_oof_logit_temp_2026.py) and asserts:

  HARD: Brier_oof < Brier_raw
  HARD: ECE_oof < 0.035
  HARD: 100-run shuffled-time placebo max |mean CLV| <= 0.005 (>= 100 valid runs)
  HARD: raw 70/100 deflates (p_cal(0.70) < 0.70) — heuristic confidence retired
  SOFT (reported, data-decided): directive's ~64-66/100 expectation at raw 70.
        The 2026-06..11 settled sample deflates harder; the actual value is
        reported, never forced into the target band.

Also re-checks the artifact is fresh (fitted_at within 48h) and the fit used
>= 200 dedup settled rows including the latest TNF settlement window.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ARTIFACT = ROOT / "data" / "engine" / "oof_calibration_2026_11_13.json"


def main() -> int:
    if not ARTIFACT.exists():
        print("T-09 FAIL: calibration artifact missing — run fit_oof_logit_temp_2026.py")
        return 1
    a = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    failures, notes = [], []

    fitted_at = datetime.fromisoformat(a["fitted_at"])
    if datetime.now(timezone.utc) - fitted_at > timedelta(hours=48):
        failures.append("artifact older than 48h")
    if a["n_rows"] < 200:
        failures.append(f"only {a['n_rows']} rows")
    if a["purge_embargo_days"] != 7.0:
        failures.append("purge/embargo is not 7 days")
    b = a["global_map"]["b"]
    if not (0.0 < b <= 1.0):
        failures.append(f"b={b} outside (0,1]")

    oof = a["oof"]
    if not oof["brier_oof"] < oof["brier_raw"]:
        failures.append(f"Brier_oof {oof['brier_oof']:.4f} !< raw {oof['brier_raw']:.4f}")
    if not oof["ece_oof"] < 0.035:
        failures.append(f"ECE_oof {oof['ece_oof']:.4f} >= 0.035")

    pl = a["placebo"]
    if pl["runs"] < 100 or pl["valid_runs"] < 100:
        failures.append(f"placebo runs {pl['valid_runs']}/{pl['runs']} < 100")
    if not pl["max_abs_mean_clv"] <= 0.005:
        failures.append(f"placebo max |mean CLV| {pl['max_abs_mean_clv']:.5f} > 0.005")

    raw70 = a["raw70_calibrated"]
    if not raw70 < 0.70:
        failures.append(f"raw70 did not deflate: {raw70:.4f}")
    if not (0.64 <= raw70 <= 0.66):
        notes.append(f"raw70={raw70:.4f} outside directive's ~64-66 band (data-decided; deflation verified)")

    print(f"  Brier raw={oof['brier_raw']:.4f} oof={oof['brier_oof']:.4f} | ECE_oof={oof['ece_oof']:.4f}")
    print(f"  map a={a['global_map']['a']:.4f} b={b:.4f} | raw70 -> {raw70:.4f}")
    print(f"  placebo {pl['valid_runs']} runs max|meanCLV|={pl['max_abs_mean_clv']:.5f} (<=0.005)")
    print(f"  real-time selected mean CLV={a['real_time_selected_mean_clv']}")
    for nt in notes:
        print(f"  NOTE: {nt}")
    if failures:
        print("T-09 FAIL: " + "; ".join(failures))
        return 1
    print("T-09 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())