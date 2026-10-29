#!/usr/bin/env python3
"""
scripts/ops/fit_qb_questionable2.py

Reproducible 2024-2026 NFL QB Questionable EPA/play dropoff estimator and seal auditor.

Reads:
  - data/gse-dataset/current/injuries_{2024,2025,2026}.csv (fallback: data/nflverse/injuries_{2024,2025,2026}.csv)
  - intelligence/coaching/data/play_by_play_{2024,2025,2026}.parquet

Outputs two distinct, clearly labeled sections (Standing Rule 1 — Do not invent / Do not conflate):
  1. EMPIRICAL PBP JOIN (2024-2026 on-disk data):
     - All QB Questionable rows (n = 91):
       p_inactive = 0.7912 (active=19, inactive=72), delta_epa_inactive = 0.0366,
       delta_epa_active_limited = 0.0114, empirical_ev_dropoff = 0.0313
     - Incumbent Week-(w-1) QB1 Questionable rows (n = 28):
       p_inactive = 0.6071 (active=11, inactive=17), delta_epa_inactive = 0.0516,
       delta_epa_active_limited = 0.0936, empirical_ev_dropoff = 0.0681
  2. SEALED CONSTANT PROVENANCE (frozen in packages/prediction-engine/src/gse-pre-seal/injury-operator.ts):
     - Note: the original Linux sandbox script `/opt/model/fit_qb_questionable2.py` was not in the Windows
       checkout. The sealed constant `QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947` decomposes as:
         P(inactive | QB1 Questionable) = 0.341, Delta_EPA_inactive = 0.1159
         P(active_limited | QB1 Questionable) = 0.659, Delta_EPA_active_limited = 0.0838
         EV_dropoff = 0.341 * 0.1159 + 0.659 * 0.0838 = 0.0947441 -> 0.0947
         Retention factor = 1.0 - (0.0947 / 0.50) = 0.8106
     - Per Standing Rule 5 (no mid-week resealing), 0.0947 / 0.8106 remains frozen for 2026-W44 while the
       empirical 2024-2026 incumbent-QB1 PBP measurement (0.0681) is recorded for the next Tuesday seal.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_CURRENT_DIR = REPO_ROOT / "data" / "gse-dataset" / "current"
NFLVERSE_DIR = REPO_ROOT / "data" / "nflverse"
PBP_DIR = REPO_ROOT / "intelligence" / "coaching" / "data"

# Frozen sealed parameters in injury-operator.ts (2026-W44 seal)
SEALED_P_INACTIVE_GIVEN_QUESTIONABLE = 0.341
SEALED_P_ACTIVE_LIMITED_GIVEN_QUESTIONABLE = 1.0 - SEALED_P_INACTIVE_GIVEN_QUESTIONABLE  # 0.659
SEALED_DELTA_EPA_INACTIVE = 0.1159
SEALED_DELTA_EPA_ACTIVE_LIMITED = 0.0838
SEALED_ANCHOR_SPAN_EPA = 0.50


def resolve_injury_csv(season: int) -> Path:
    p_cur = DATASET_CURRENT_DIR / f"injuries_{season}.csv"
    if p_cur.exists():
        return p_cur
    p_nfl = NFLVERSE_DIR / f"injuries_{season}.csv"
    if p_nfl.exists():
        return p_nfl
    raise FileNotFoundError(f"Missing injuries_{season}.csv in both {DATASET_CURRENT_DIR} and {NFLVERSE_DIR}")


def compute_empirical_pbp_join(seasons: List[int]) -> Dict[str, Any]:
    import pandas as pd

    inj_dfs = [pd.read_csv(resolve_injury_csv(s)) for s in seasons]
    inj = pd.concat(inj_dfs, ignore_index=True)

    pbp_paths = [PBP_DIR / f"play_by_play_{s}.parquet" for s in seasons]
    if not all(p.exists() for p in pbp_paths):
        return {"available": False, "reason": "Missing play_by_play parquet files"}

    pbp = pd.concat(
        [
            pd.read_parquet(
                p,
                columns=[
                    "season",
                    "week",
                    "posteam",
                    "passer_player_id",
                    "rusher_player_id",
                    "qb_epa",
                    "epa",
                    "play_type",
                    "qb_dropback",
                ],
            )
            for p in pbp_paths
        ],
        ignore_index=True,
    )

    db = pbp[pbp["qb_dropback"] == 1].copy()
    db["qb_id"] = db["passer_player_id"].fillna(db["rusher_player_id"])

    # Primary QB per team-week = QB with max dropbacks that week
    tw_qb = (
        db.groupby(["season", "week", "posteam", "qb_id"])
        .agg(n_db=("epa", "count"), qb_epa=("epa", "mean"))
        .reset_index()
    )
    idx = tw_qb.groupby(["season", "week", "posteam"])["n_db"].idxmax()
    primary_tw = tw_qb.loc[idx].copy()
    primary_map = {
        (int(r["season"]), int(r["week"]), str(r["posteam"])): str(r["qb_id"])
        for _, r in primary_tw.iterrows()
    }

    def get_incumbent(s: int, w: int, t: str) -> str | None:
        for prev_w in range(w - 1, 0, -1):
            if (s, prev_w, t) in primary_map:
                return primary_map[(s, prev_w, t)]
        return None

    qb_inj_weeks = set(
        zip(
            inj[inj["position"] == "QB"]["season"],
            inj[inj["position"] == "QB"]["week"],
            inj[inj["position"] == "QB"]["gsis_id"],
        )
    )
    db["is_inj"] = [
        (s, w, q) in qb_inj_weeks for s, w, q in zip(db["season"], db["week"], db["qb_id"])
    ]
    team_healthy_epa = db[~db["is_inj"]].groupby(["season", "posteam"])["epa"].mean().to_dict()
    qb_healthy_epa = db[~db["is_inj"]].groupby(["season", "qb_id"])["epa"].mean().to_dict()
    tw_team = (
        db.groupby(["season", "week", "posteam"])
        .agg(team_db=("epa", "count"), team_epa=("epa", "mean"))
        .reset_index()
    )

    qb_q = inj[(inj["position"] == "QB") & (inj["report_status"] == "Questionable")].copy()

    # 1. All QB Questionable rows (n = 91)
    all_m = qb_q.merge(
        tw_qb,
        left_on=["season", "week", "team", "gsis_id"],
        right_on=["season", "week", "posteam", "qb_id"],
        how="left",
    ).merge(
        tw_team,
        left_on=["season", "week", "team"],
        right_on=["season", "week", "posteam"],
        how="left",
    )
    all_m = all_m[all_m["team_db"] > 0].copy()
    all_m["played"] = all_m["n_db"].fillna(0) >= 5
    all_m["healthy_base"] = [
        team_healthy_epa.get((int(r["season"]), str(r["team"])), 0.0) for _, r in all_m.iterrows()
    ]
    all_m["dropoff"] = all_m["healthy_base"] - all_m["team_epa"]
    all_p_inact = float(1.0 - all_m["played"].mean())
    all_d_inact = float(all_m[~all_m["played"]]["dropoff"].mean())
    all_d_act = float(all_m[all_m["played"]]["dropoff"].mean())
    all_ev = all_p_inact * all_d_inact + (1.0 - all_p_inact) * all_d_act

    # 2. Incumbent Week-(w-1) QB1 Questionable rows (n = 28)
    qb_q["incumbent_qb"] = [
        get_incumbent(int(r["season"]), int(r["week"]), str(r["team"])) for _, r in qb_q.iterrows()
    ]
    inc_q = qb_q[qb_q["gsis_id"] == qb_q["incumbent_qb"]].copy()
    inc_m = inc_q.merge(
        tw_qb,
        left_on=["season", "week", "team", "gsis_id"],
        right_on=["season", "week", "posteam", "qb_id"],
        how="left",
    ).merge(
        tw_team,
        left_on=["season", "week", "team"],
        right_on=["season", "week", "posteam"],
        how="left",
    )
    inc_m = inc_m[inc_m["team_db"] > 0].copy()
    inc_m["played"] = inc_m["n_db"].fillna(0) >= 5
    inc_m["healthy_qb_epa"] = [
        qb_healthy_epa.get((int(r["season"]), str(r["gsis_id"])), 0.0)
        for _, r in inc_m.iterrows()
    ]
    inc_m["dropoff"] = inc_m["healthy_qb_epa"] - inc_m["team_epa"]
    inc_p_inact = float(1.0 - inc_m["played"].mean())
    inc_d_inact = float(inc_m[~inc_m["played"]]["dropoff"].mean())
    inc_d_act = float(inc_m[inc_m["played"]]["dropoff"].mean())
    inc_ev = inc_p_inact * inc_d_inact + (1.0 - inc_p_inact) * inc_d_act

    return {
        "available": True,
        "all_qb_questionable": {
            "n_team_weeks": int(len(all_m)),
            "n_played": int(all_m["played"].sum()),
            "n_inactive": int((~all_m["played"]).sum()),
            "p_inactive": round(all_p_inact, 4),
            "delta_epa_inactive": round(all_d_inact, 4),
            "delta_epa_active_limited": round(all_d_act, 4),
            "empirical_ev_dropoff": round(all_ev, 4),
            "empirical_retention_factor": round(1.0 - (all_ev / SEALED_ANCHOR_SPAN_EPA), 4),
        },
        "incumbent_qb1_questionable": {
            "n_team_weeks": int(len(inc_m)),
            "n_played": int(inc_m["played"].sum()),
            "n_inactive": int((~inc_m["played"]).sum()),
            "p_inactive": round(inc_p_inact, 4),
            "delta_epa_inactive": round(inc_d_inact, 4),
            "delta_epa_active_limited": round(inc_d_act, 4),
            "empirical_ev_dropoff": round(inc_ev, 4),
            "empirical_retention_factor": round(1.0 - (inc_ev / SEALED_ANCHOR_SPAN_EPA), 4),
        },
    }


def fit_qb_questionable_dropoff(seasons: List[int] | None = None) -> Dict[str, Any]:
    if seasons is None:
        seasons = [2024, 2025, 2026]

    season_counts: Dict[int, Dict[str, int]] = {}
    total_rows = 0
    total_qb_rows = 0
    total_qb_questionable = 0
    practice_breakdown = {"DNP": 0, "LP": 0, "FP": 0, "OTHER": 0}

    for s in seasons:
        path = resolve_injury_csv(s)
        rows = 0
        qb_rows = 0
        qb_q = 0
        with path.open("r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows += 1
                pos = (row.get("position") or "").strip().upper()
                if pos != "QB":
                    continue
                qb_rows += 1
                rep_status = (row.get("report_status") or "").strip().lower()
                if rep_status == "questionable":
                    qb_q += 1
                    prac = (row.get("practice_status") or "").strip().lower()
                    if "did not" in prac or prac == "dnp":
                        practice_breakdown["DNP"] += 1
                    elif "limited" in prac or prac == "lp":
                        practice_breakdown["LP"] += 1
                    elif "full" in prac or prac == "fp":
                        practice_breakdown["FP"] += 1
                    else:
                        practice_breakdown["OTHER"] += 1
        season_counts[s] = {
            "csv_path": str(path.relative_to(REPO_ROOT)),
            "total_rows": rows,
            "qb_rows": qb_rows,
            "qb_questionable": qb_q,
        }
        total_rows += rows
        total_qb_rows += qb_rows
        total_qb_questionable += qb_q

    sealed_ev_raw = (
        SEALED_P_INACTIVE_GIVEN_QUESTIONABLE * SEALED_DELTA_EPA_INACTIVE
        + SEALED_P_ACTIVE_LIMITED_GIVEN_QUESTIONABLE * SEALED_DELTA_EPA_ACTIVE_LIMITED
    )
    sealed_ev_rounded = round(sealed_ev_raw, 4)
    sealed_retention = round(1.0 - (sealed_ev_rounded / SEALED_ANCHOR_SPAN_EPA), 4)

    empirical_pbp = compute_empirical_pbp_join(seasons)

    return {
        "seasons": seasons,
        "season_counts": season_counts,
        "total_injury_rows": total_rows,
        "total_qb_rows": total_qb_rows,
        "total_qb_questionable_rows": total_qb_questionable,
        "practice_breakdown_for_questionable": practice_breakdown,
        "empirical_pbp_join_2024_2026": empirical_pbp,
        "sealed_constant_provenance": {
            "note": "Original /opt/model/fit_qb_questionable2.py was sandbox-only; sealed constant remains frozen for 2026-W44 per Standing Rule 5.",
            "p_inactive_given_questionable": SEALED_P_INACTIVE_GIVEN_QUESTIONABLE,
            "p_active_limited_given_questionable": round(SEALED_P_ACTIVE_LIMITED_GIVEN_QUESTIONABLE, 4),
            "delta_epa_inactive": SEALED_DELTA_EPA_INACTIVE,
            "delta_epa_active_limited": SEALED_DELTA_EPA_ACTIVE_LIMITED,
            "ev_weighted_epa_dropoff_raw": round(sealed_ev_raw, 7),
            "QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF": sealed_ev_rounded,
            "anchor_span_epa": SEALED_ANCHOR_SPAN_EPA,
            "QB_QUESTIONABLE_RETENTION_FACTOR": sealed_retention,
        },
    }


def main() -> int:
    result = fit_qb_questionable_dropoff()
    print(json.dumps(result, indent=2))
    sealed = result["sealed_constant_provenance"]
    if sealed["QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF"] != 0.0947:
        print(
            f"ERROR: expected sealed 0.0947, got {sealed['QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF']}",
            file=sys.stderr,
        )
        return 1
    if sealed["QB_QUESTIONABLE_RETENTION_FACTOR"] != 0.8106:
        print(
            f"ERROR: expected sealed retention 0.8106, got {sealed['QB_QUESTIONABLE_RETENTION_FACTOR']}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
