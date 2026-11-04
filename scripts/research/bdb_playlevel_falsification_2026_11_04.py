"""Run the BH-FDR falsification gate on real BDB 2025 play-level data.

The repo has no per-frame tracking, but it does have 16,124 real NFL plays
with pre-snap features. This script builds a play-level feature matrix and
asks a falsifiable question: which pre-snap features actually separate
completed from incomplete passes, after BH-FDR correction at q=0.10?

This is not the video-replay feature pipeline (that needs tracking). It is
the same gate applied to the real data that does exist, so the gate is
exercised on something other than synthetic noise.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.vision.research_mindset_features import falsify_feature_matrix

BDB = Path(r"C:\c\wt-week8-forensic\data\nflverse\hf_bdb2025_plays_presnap_zone1.parquet")


def build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, list[str]]:
    d = df.copy()

    # Binary outcome: completed pass vs not. Drop plays with no pass result.
    d = d[d["passResult"].notna()].copy()
    y = (d["passResult"].astype(str).str.upper() == "C").astype(int).to_numpy()

    # Pre-snap features that are actually present and numeric.
    feats = {}
    feats["down"] = pd.to_numeric(d["down"], errors="coerce")
    feats["yards_to_go"] = pd.to_numeric(d["yardsToGo"], errors="coerce")
    feats["yardline_number"] = pd.to_numeric(d["yardlineNumber"], errors="coerce")
    feats["play_clock_at_snap"] = pd.to_numeric(d["playClockAtSnap"], errors="coerce")
    feats["expected_points"] = pd.to_numeric(d["expectedPoints"], errors="coerce")
    feats["win_prob"] = pd.to_numeric(d["preSnapHomeTeamWinProbability"], errors="coerce")

    # Categorical pre-snap picture -> one numeric proxy: formation cardinality.
    feats["formation_cardinality"] = (
        d["offenseFormation"].astype(str).map(
            {v: i for i, v in enumerate(sorted(d["offenseFormation"].dropna().astype(str).unique()))}
        )
    )
    feats["alignment_cardinality"] = (
        d["receiverAlignment"].astype(str).map(
            {v: i for i, v in enumerate(sorted(d["receiverAlignment"].dropna().astype(str).unique()))}
        )
    )

    names = list(feats)
    X = np.column_stack([feats[n].to_numpy(dtype=float) for n in names])
    # Drop rows with any NaN so the t-test is clean.
    mask = np.isfinite(X).all(axis=1)
    return X[mask], y[mask], names


def main() -> int:
    if not BDB.exists():
        print(f"FATAL: {BDB} not found")
        return 2
    df = pd.read_parquet(BDB)
    X, y, names = build_features(df)
    print(f"plays with a pass result and complete features: {len(y)}")
    print(f"completed: {int(y.sum())}  incomplete: {int((1 - y).sum())}")
    print()

    gate = falsify_feature_matrix(X, y, names, q=0.10)
    print(f"{'feature':<24} {'t':>8} {'p':>10} {'adj_p':>10} {'survives':>9}")
    for i, n in enumerate(names):
        print(f"{n:<24} {gate['t_stat'][i]:>8.3f} {gate['p_value'][i]:>10.4f} "
              f"{gate['adjusted_p'][i]:>10.4f} {str(gate['reject'][i]):>9}")
    print()
    print(f"features surviving BH-FDR q={gate['q']}: {gate['n_reject']}/{len(names)}")

    out = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\bdb_playlevel_gate_2026_11_04.json")
    out.write_text(json.dumps({"gate": gate, "n_plays": int(len(y)),
                               "n_completed": int(y.sum())}, indent=1),
                   encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
