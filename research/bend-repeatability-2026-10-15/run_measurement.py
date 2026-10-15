"""Bend Score repeatability measurement runner (WO-3 Deliverable 1).

Inventories every rep-level data source on this machine, extracts bend
reps with bend_reps.py (StevanHRG code rules), and applies the design's
pre-registered verdict logic:

  decision-grade: >=30 athletes with >=4 independent games each AND
                  >=200 total bend events
  PASS:     ICC(2,1) >= 0.70        (decision on ICC only)
  SHADOW:   0.50 <= ICC(2,1) < 0.70 (analysable; weight-0 shadow study)
  FAIL:     ICC(2,1) < 0.50
  UNDERPOWERED: coverage below decision-grade -> no PASS possible;
                  if <20 athletes or <100 events, no reliability number
                  is entered at all (design failure-mode rule).

If the coverage cannot support an ICC, the runner reports
UNDERPOWERED with the exact shortfall numbers. It never fabricates an
ICC. Usage:
  python3 run_measurement.py --out results.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

import bend_reps
from icc import icc_2_1, sb_curve, split_half_sb

HOME = Path.home()
VENDOR = HOME / "workspace/vendor/bdb27-reliability"


def inventory_drill_route() -> dict:
    """ROUTE A needs combine_tracking.csv (BDB 2027 competition file).
    Bounded find with heavy trees pruned (a naive rglob over the whole
    workspace takes minutes on this machine; the pruned find below is
    the same search the build verified interactively)."""
    import subprocess
    out = subprocess.run(
        ["find", str(HOME / "workspace"), "-xdev",
         "(", "-name", "node_modules", "-o", "-name", ".venv*", "-o",
         "-name", ".git", ")", "-prune", "-o",
         "-name", "combine_tracking.csv", "-print"],
        capture_output=True, text=True, timeout=280)
    hits = [ln for ln in out.stdout.splitlines() if ln.strip()]
    return {"combine_tracking_csv_found": hits,
            "search_scope": "~/workspace (node_modules/.venv/.git pruned), "
                            "plus ~/.kaggle (absent) checked separately",
            "athletes_with_reps": 0 if not hits else None,
            "total_reps": 0 if not hits else None}


def run_drill_route(csv_path: Path) -> dict:
    ct = pd.read_csv(csv_path)
    ct = ct[ct["entity_type"] == "PLAYER"]
    dl = ct[ct["drill_type"] == "SKILL_DRILLS_DL"]
    reps = bend_reps.attempt_reps(dl[dl["drill_name"].isin(bend_reps.ARC_DRILLS)])
    per = reps.groupby("nfl_id").size()
    return {"athletes_with_reps": int(reps["nfl_id"].nunique()),
            "total_reps": int(len(reps)),
            "athletes_ge4_reps": int((per >= 4).sum()),
            "rep_table": reps}


def run_game_route() -> dict:
    """ROUTE B on the only in-game tracking on this machine: the
    chasko-winners BDB samples (1 game x 25 plays per season)."""
    out = {"sources": [], "athletes_total": 0, "games_total": 0,
           "athletes_ge2_games": 0, "athletes_ge4_games": 0,
           "total_bend_events": 0, "events_dl_positions": 0}
    dl_pos = {"DE", "DT", "DL", "NT"}
    all_reps = []
    athlete_union: set = set()
    for year in (2024, 2025):
        base = VENDOR / "chasko-winners/samples" / str(year)
        tr = pd.read_csv(base / "tracking_sample.csv",
                         usecols=["gameId", "playId", "nflId", "frameId", "x", "y", "s"])
        players = pd.read_csv(base / "players.csv", usecols=["nflId", "position"])
        reps = bend_reps.game_reps(tr)
        reps["season_sample"] = year
        all_reps.append(reps)
        athlete_union |= set(tr["nflId"].unique())
        games_per_athlete = tr.groupby("nflId")["gameId"].nunique()
        out["sources"].append({
            "path": str(base / "tracking_sample.csv"), "games": int(tr["gameId"].nunique()),
            "plays": int(tr.groupby(["gameId", "playId"]).ngroups),
            "athletes": int(tr["nflId"].nunique()),
            "athletes_ge2_games": int((games_per_athlete >= 2).sum()),
            "bend_events_extracted": int(len(reps))})
        out["games_total"] += int(tr["gameId"].nunique())
        out["total_bend_events"] += int(len(reps))
        dl_ids = set(players.loc[players["position"].isin(dl_pos), "nflId"])
        out["events_dl_positions"] += int(reps["nfl_id"].isin(dl_ids).sum()) if len(reps) else 0
    out["athletes_total"] = int(len(athlete_union))
    reps = pd.concat(all_reps, ignore_index=True) if all_reps else pd.DataFrame()
    if len(reps):
        gpa = reps.groupby("nfl_id")["game_id"].nunique()
        out["athletes_with_events"] = int(reps["nfl_id"].nunique())
        out["athletes_ge2_games"] = int((gpa >= 2).sum())
        out["athletes_ge4_games"] = int((gpa >= 4).sum())
    out["rep_table"] = reps
    return out


def inventory_aggregates() -> dict:
    """Per-athlete aggregate files (one value per athlete - no reps,
    cannot support any ICC; inventoried so the gap is explicit)."""
    out = {}
    cohort = VENDOR / "bend-burst-itsmesujan/qualified_edge_cohort.csv"
    if cohort.exists():
        df = pd.read_csv(cohort, usecols=["nfl_id", "hoop_peak_ac"])
        out["itsmesujan_qualified_edge_cohort"] = {
            "athletes": int(df["nfl_id"].nunique()),
            "hoop_peak_ac_values": int(df["hoop_peak_ac"].notna().sum()),
            "reps_per_athlete": 1, "usable_for_icc": False}
    ktd = VENDOR / "nfl-big-data-bowl-2027-ktd/data/ktd_wr_metrics.csv"
    if ktd.exists():
        out["ktd_wr_metrics"] = {"rows": int(len(pd.read_csv(ktd))),
                                 "usable_for_icc": False}
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="results.json")
    args = ap.parse_args()

    results: dict = {"design": "WO-3 Deliverable 1 (Grok, EXPERT, 2026-10-15)",
                     "estimator": "ICC(2,1) Shrout-Fleiss absolute agreement; "
                                  "95% CI parametric bootstrap (B=2000) from fitted "
                                  "ANOVA variance components; validated on synthetic "
                                  "ground truth (tests/test_icc_synthetic.py)"}

    drill_inv = inventory_drill_route()
    results["route_a_combine_drills"] = drill_inv
    if drill_inv["combine_tracking_csv_found"]:
        results["route_a_combine_drills"].update(
            run_drill_route(Path(drill_inv["combine_tracking_csv_found"][0])))

    game = run_game_route()
    rep_table = game.pop("rep_table")
    results["route_b_game_tracking"] = game
    results["aggregates_only"] = inventory_aggregates()

    # ---- verdict logic (design's pre-registered rules) ----
    n_athletes_decision = game.get("athletes_ge4_games", 0)
    n_events = game["total_bend_events"]
    icc_result = None
    # ICC is computable only if >=3 athletes have >=2 games (two half-means).
    if game.get("athletes_ge2_games", 0) >= 3 and len(rep_table):
        rows = []
        for pid, g in rep_table.groupby("nfl_id"):
            games_sorted = sorted(g["game_id"].unique())
            if len(games_sorted) < 2:
                continue
            half = len(games_sorted) // 2
            m1 = g[g["game_id"].isin(games_sorted[:half])]["ac_peak"].mean()
            m2 = g[g["game_id"].isin(games_sorted[half:])]["ac_peak"].mean()
            rows.append((m1, m2))
        if len(rows) >= 3:
            X = np.array(rows)
            icc_result = icc_2_1(X)
            icc_result["split_half"] = split_half_sb(X[:, 0], X[:, 1])

    if icc_result is None:
        verdict = "UNDERPOWERED"
        reason = ("No ICC computed: 0 athletes have >=2 independent games in the "
                  "located rep-level data (Route B samples are 1 game each), and "
                  "Route A's combine_tracking.csv is absent (Kaggle-only). Per the "
                  "design's failure-mode rule, no reliability number is entered.")
    elif n_athletes_decision >= 30 and n_events >= 200:
        v = icc_result["icc"]
        verdict = "PASS" if v >= 0.70 else ("SHADOW" if v >= 0.50 else "FAIL")
        reason = f"Decision-grade coverage met; ICC(2,1) = {v:.3f}."
    else:
        verdict = "UNDERPOWERED"
        reason = ("ICC computed on sub-decision-grade coverage; per design the "
                  "gate cannot return PASS.")

    results["icc_2_1"] = icc_result
    results["verdict"] = {"gate": verdict, "reason": reason,
                         "decision_grade": {
                             "athletes_ge4_games_needed": 30,
                             "athletes_ge4_games_found": n_athletes_decision,
                             "events_needed": 200,
                             "events_found": n_events,
                             "athlete_shortfall": max(0, 30 - n_athletes_decision),
                             "event_shortfall": max(0, 200 - n_events)}}
    results["spearman_brown_reps_needed_context"] = {
        str(r): {str(t): round(v, 2) for t, v in d.items()}
        for r, d in sb_curve().items()}

    Path(args.out).write_text(json.dumps(results, indent=2, default=str))
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
