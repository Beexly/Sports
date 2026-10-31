"""Wire signal-pack consumption into the intelligence layer.

Dynamically computes the 7 signals from the research pack modules
and emits each as a NAMED OBSERVATION with provenance.
"""
from __future__ import annotations

import sys
import os
from typing import Any
import pandas as pd

SIGNAL_PACK_SRC = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "docs", "research", "2026-10-30", "signal-pack"
)

def load_signal_pack(base_path: str = None) -> dict[str, Any]:
    """Compute the 7 signal outputs and return a flat dictionary of observations."""
    if base_path is None:
        base_path = SIGNAL_PACK_SRC

    from integration.providers import DataGapError

    # We clear it out from sys.modules to force an import error if path is wrong
    for mod in ["gse_signal_pack", "gse_signal_pack.data", "gse_signal_pack.signals", "gse_signal_pack.leverage"]:
        if mod in sys.modules:
            del sys.modules[mod]

    if base_path not in sys.path:
        sys.path.insert(0, base_path)

    try:
        from gse_signal_pack import data, signals, leverage
    except ImportError as e:
        raise DataGapError("signal_pack", f"Failed to import signal pack modules: {str(e)}")

    obs: dict[str, Any] = {}

    try:
        # Load raw data
        pbp_all = data.load_pbp()
        weeks = data.complete_weeks(pbp_all)
        pbp = pbp_all[pbp_all.week.isin(weeks)]

        roster = data.load_roster()
        posmap = data.position_map()

        # Signal 1: Red Zone expected TD share
        s1 = signals.red_zone_share_wide(signals.red_zone_expected_td_share(pbp, posmap))
        for _, row in s1.iterrows():
            team = row["defense"]
            for pos in ("QB", "RB", "WR", "TE", "OTHER"):
                key = f"matchups.{team}.rz_xtd_share_{pos}"
                obs[key] = float(row[f"{pos}_xtd_share"])
        obs["matchups.rz_xtd_share.provenance"] = "01_red_zone_xtd_share, computed as of 2026-10-30"

        # Signal 2: Missed tackles
        pfr_defense_html = open(data.pfr_defense_adv_path(), encoding="utf-8", errors="ignore").read()
        s2 = signals.missed_tackles_by_defense(pfr_defense_html)
        for _, row in s2.iterrows():
            team = row["team"]
            obs[f"matchups.{team}.missed_tackles"] = float(row["mtkl"])
        obs["matchups.missed_tackles.provenance"] = "02_missed_tackles_by_defense, computed as of 2026-10-30"

        # Signal 3: QB throwaway rate
        pfr_passing_html = open(data.pfr_passing_adv_path(), encoding="utf-8", errors="ignore").read()
        acc = data.parse_pfr_passing_accuracy(pfr_passing_html)
        s3 = signals.qb_throwaway_rate(acc, pbp, roster)
        for _, row in s3.iterrows():
            qb = row["qb"]
            obs[f"matchups.{qb}.throwaway_rate"] = float(row["thawy_per_dropback"])
        obs["matchups.throwaway_rate.provenance"] = "03_qb_throwaway_rate, computed as of 2026-10-30"

        # Signal 4: RB rushing EPA/attempt
        s4 = signals.rb_rushing_epa(pbp, posmap)
        for _, row in s4.iterrows():
            rb = row["rb"]
            obs[f"matchups.{rb}.epa_per_att"] = float(row["epa_per_att"])
        obs["matchups.rb_epa.provenance"] = "04_rb_rushing_epa, computed as of 2026-10-30"

        # Signal 5: Big plays vs success rate quadrant
        s5 = signals.big_plays_vs_success(pbp)
        for _, row in s5.iterrows():
            team = row["team"]
            obs[f"matchups.{team}.big_play_quadrant"] = row["quadrant"]
        obs["matchups.big_play_quadrant.provenance"] = "05_big_plays_vs_success, computed as of 2026-10-30"

        # Signal 6: Defensive EPA/play by quarter
        s6 = signals.defensive_epa_by_quarter(pbp)
        for _, row in s6.iterrows():
            team = row["defense"]
            obs[f"situations.{team}.q4_epa_allowed"] = float(row["q4_epa_allowed"])
        obs["situations.q4_epa_allowed.provenance"] = "06_defensive_epa_by_quarter, computed as of 2026-10-30"

        # Signal 7: Paired-flip playoff leverage
        rows = []
        for name, cfg in leverage.demo_configs().items():
            r = leverage.leverage_estimates(**cfg, n_sims=8000, seed=7)
            rows.append({"config": name, **r})
        s7 = pd.DataFrame(rows)
        for _, row in s7.iterrows():
            config = row["config"]
            obs[f"season_context.{config}.paired_flip_leverage"] = float(row["paired_flip"])
        obs["season_context.paired_flip_leverage.provenance"] = "07_paired_flip_leverage, computed as of 2026-10-30"

    except Exception as e:
        raise DataGapError("signal_pack", f"Failed to compute signal pack: {str(e)}")

    return obs

def apply_signal_pack(ctx: Any) -> None:
    """Additive merge helper for DataContext.

    Loads signal pack observations and appends numeric values to ctx.observations
    and string values/provenance to ctx.profiles.
    """
    from integration.providers import DataGapError

    try:
        sig_obs = load_signal_pack()
        for k, v in sig_obs.items():
            if isinstance(v, float):
                ctx.observations[k] = v
            elif isinstance(v, str):
                ctx.profiles[k] = v
        # Assuming the caller has a mechanism for checklist hints/evidence,
        # they can manage success explicitly if needed.
    except DataGapError as e:
        # Note: the caller handles recording the DATA-GAP evidence.
        raise
