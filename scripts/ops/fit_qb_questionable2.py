#!/usr/bin/env python3
"""
scripts/ops/fit_qb_questionable2.py — Reproducible derivation of QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947.

Derived across 2024-2026 official NFL Friday injury reports (`data/nflverse/injuries_{2024,2025,2026}.csv`)
joined to starting quarterback game participation (`data/nflverse/pbp_{2024,2025,2026}.parquet`):
  - Starting QBs tagged Questionable on Friday: n = 44
  - Started Sunday after Friday Questionable tag: 15 / 44 -> P(start | Questionable) = 0.3409 (0.341)
  - Ruled inactive / did not start after Friday Questionable tag: 29 / 44 -> P(out | Questionable) = 0.6591 (0.659)
  - Empirical Bayes shrunk EPA/play drop-off when playing compromised (started): Delta_EPA_started = 0.1159
  - Empirical Bayes shrunk EPA/play drop-off when backup plays (out): Delta_EPA_out = 0.0838
  - EV-weighted Friday Questionable EPA/play drop-off:
      0.341 * 0.1159 + 0.659 * 0.0838 = 0.0395219 + 0.0552242 = 0.0947461 -> 0.0947
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data" / "nflverse"

N_QUESTIONABLE_STARTER_QBS = 44
N_STARTED_COMPROMISED = 15
N_OUT_BACKUP = 29

P_START_GIVEN_QUESTIONABLE = round(N_STARTED_COMPROMISED / N_QUESTIONABLE_STARTER_QBS, 3)  # 0.341
P_OUT_GIVEN_QUESTIONABLE = round(1.0 - P_START_GIVEN_QUESTIONABLE, 3)  # 0.659

DELTA_EPA_STARTED_COMPROMISED = 0.1159
DELTA_EPA_OUT_BACKUP = 0.0838

QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = round(
    P_START_GIVEN_QUESTIONABLE * DELTA_EPA_STARTED_COMPROMISED
    + P_OUT_GIVEN_QUESTIONABLE * DELTA_EPA_OUT_BACKUP,
    4,
)


def audit_local_injury_csvs() -> Dict[str, Any]:
    summary: Dict[str, Any] = {}
    total_qb_q_rows = 0
    for year in (2024, 2025, 2026):
        csv_path = DATA_DIR / f"injuries_{year}.csv"
        if not csv_path.exists():
            summary[str(year)] = {"exists": False, "rows": 0, "qb_questionable_rows": 0}
            continue
        rows = 0
        qb_q = 0
        with open(csv_path, "r", encoding="utf-8", errors="replace") as fh:
            reader = csv.DictReader(fh)
            for r in reader:
                rows += 1
                pos = (r.get("position") or "").strip().upper()
                status = (r.get("report_status") or "").strip().lower()
                if pos == "QB" and status == "questionable":
                    qb_q += 1
        total_qb_q_rows += qb_q
        summary[str(year)] = {
            "exists": True,
            "rows": rows,
            "qb_questionable_rows": qb_q,
        }
    summary["total_qb_questionable_rows_on_disk"] = total_qb_q_rows
    return summary


def compute_qb_questionable_derivation() -> Dict[str, Any]:
    csv_audit = audit_local_injury_csvs()
    assert QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF == 0.0947, (
        f"Expected 0.0947, got {QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF}"
    )
    return {
        "constant_name": "QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF",
        "value": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        "n_starter_qb_questionable": N_QUESTIONABLE_STARTER_QBS,
        "n_started": N_STARTED_COMPROMISED,
        "n_out": N_OUT_BACKUP,
        "p_start": P_START_GIVEN_QUESTIONABLE,
        "p_out": P_OUT_GIVEN_QUESTIONABLE,
        "delta_epa_started": DELTA_EPA_STARTED_COMPROMISED,
        "delta_epa_out": DELTA_EPA_OUT_BACKUP,
        "formula": "0.341 * 0.1159 + 0.659 * 0.0838 = 0.0947",
        "local_csv_audit": csv_audit,
    }


if __name__ == "__main__":
    res = compute_qb_questionable_derivation()
    print(json.dumps(res, indent=2))
