#!/usr/bin/env python3
"""
compute_missing_metrics.py — corrected per Minis review (2026-10-10).

Implements ALL 4 fixes from REVIEW_HERMES_compute_missing_metrics.md:
  BUG 1: merge on [game_id, play_id] composite key (play_id collides across games)
  BUG 2: recomputed column named `success_recomputed` (never overwrite nflfastR's native `success`)
  FLAG 1: filter season_type == "REG" (postseason pollutes every groupby)
  FLAG 2: team_efficiency on play_type in (run, pass) only; keep cpoe_proxy AND native cpoe

Also: documents air_yards coverage (proxy exclusion rate).
Emits DIAGNOSTIC.json with success_agree_rate, cpoe_proxy_vs_native_r, air_yards_coverage.

Doctrine: stamped outputs, diagnostic only, no promotion claims.
"""
import json
import sys
from datetime import datetime, timezone

import pandas as pd
import numpy as np

UTC = timezone.utc
RUN_TS = datetime.now(UTC).isoformat()


def load_pbp(path):
    """Load pbp parquet/csv. Returns DataFrame."""
    if path.endswith(".parquet"):
        df = pd.read_parquet(path)
    elif path.endswith(".gz"):
        df = pd.read_csv(path, compression="gzip", low_memory=False)
    else:
        df = pd.read_csv(path, low_memory=False)
    return df


def compute_cpoe_proxy(df):
    """
    CPOE proxy via expected-completion bins on air_yards.
    Bins calibrated loosely from league-wide completion-by-depth curves.
    Returns series aligned to df index (NaN where air_yards missing).
    """
    # exp_cp by air_yards bucket (proxy — documented, not a fitted model)
    bins = [-np.inf, 0, 5, 10, 15, 20, 25, 30, np.inf]
    exp_cp = [0.95, 0.72, 0.65, 0.58, 0.50, 0.42, 0.35, 0.28]
    ay = pd.to_numeric(df["air_yards"], errors="coerce")
    bucket = pd.cut(ay, bins=bins, labels=False)
    exp = bucket.map(lambda i: exp_cp[int(i)] if pd.notna(i) else np.nan)
    comp = pd.to_numeric(df["complete_pass"], errors="coerce")
    return comp - exp  # CPOE proxy = actual - expected


def main(pbp_path, out_prefix="metrics_2025"):
    pbp = load_pbp(pbp_path)
    n_raw = len(pbp)

    # FLAG 1: REG only
    if "season_type" in pbp.columns:
        pbp = pbp[pbp["season_type"] == "REG"].copy()
    n_reg = len(pbp)

    # --- cpoe_proxy on pass plays ---
    # BUG 1 FIX: dedupe on composite key, merge on composite key
    pass_plays = pbp[pbp["play_type"] == "pass"].copy()
    pass_plays = pass_plays.drop_duplicates(subset=["game_id", "play_id"])
    pass_plays["cpoe_proxy"] = compute_cpoe_proxy(pass_plays)

    out = pbp.merge(
        pass_plays[["game_id", "play_id", "cpoe_proxy"]],
        on=["game_id", "play_id"],
        how="left",
    )

    # BUG 2 FIX: never overwrite native `success`
    out["success_recomputed"] = (pd.to_numeric(out["epa"], errors="coerce") > 0).astype(int)

    # agree-rate: native success vs recomputed
    valid_s = out.dropna(subset=["success"])
    agree = (valid_s["success"].astype(int) == valid_s["success_recomputed"]).mean()
    n_agree = len(valid_s)

    # air_yards coverage (proxy exclusion rate)
    ay = pd.to_numeric(pass_plays["air_yards"], errors="coerce")
    air_yards_coverage = float(ay.notna().mean())
    n_pass = len(pass_plays)

    # FLAG 2 FIX: team efficiency on run/pass only
    # Keep both cpoe_proxy AND native cpoe; compute correlation
    rp = out[out["play_type"].isin(["run", "pass"])].copy()
    team_eff = (
        rp.groupby(["season", "posteam"])
        .agg(
            n_plays=("epa", "size"),
            epa_per_play=("epa", "mean"),
            success_rate=("success", "mean"),
        )
        .reset_index()
    )

    # cpoe correlation: proxy vs native (item-2 validation seed)
    valid_c = out.dropna(subset=["cpoe_proxy", "cpoe"])
    cpoe_r = float(valid_c["cpoe_proxy"].corr(valid_c["cpoe"])) if len(valid_c) > 1 else None
    n_cpoe = len(valid_c)

    # --- DIAGNOSTIC.json ---
    diag = {
        "script": "compute_missing_metrics.py",
        "run_at": RUN_TS,
        "season": 2025,
        "fixes_applied": [
            "BUG1: composite merge key [game_id, play_id]",
            "BUG2: success_recomputed (native success untouched)",
            "FLAG1: season_type == REG filter",
            "FLAG2: team_efficiency on run/pass only; cpoe_proxy + native kept",
        ],
        "n_raw": int(n_raw),
        "n_reg": int(n_reg),
        "n_pass_plays": int(n_pass),
        "success_agree_rate": round(float(agree), 4),
        "n_success_compare": int(n_agree),
        "cpoe_proxy_vs_native_r": round(cpoe_r, 4) if cpoe_r is not None else None,
        "n_cpoe_compare": int(n_cpoe),
        "air_yards_coverage": round(air_yards_coverage, 4),
        "team_efficiency_rows": int(len(team_eff)),
        "role": "diagnostic",
        "promotion": "none — diagnostic only, no frozen gate passed",
    }

    diag_path = f"{out_prefix}_DIAGNOSTIC.json"
    with open(diag_path, "w") as f:
        json.dump(diag, f, indent=2)

    eff_path = f"{out_prefix}_team_efficiency.csv"
    team_eff.to_csv(eff_path, index=False)

    print(json.dumps(diag, indent=2))
    print(f"\nWrote {diag_path} and {eff_path}", file=sys.stderr)
    return diag


if __name__ == "__main__":
    pbp_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pbp/pbp_2025.parquet"
    prefix = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pbp/metrics_2025"
    main(pbp_path, prefix)
