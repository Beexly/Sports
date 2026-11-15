#!/usr/bin/env python3
"""
CANONICAL 26-LAYER CONTEXT PACKET BUILDER (`intelligence/context/context_packet_builder.py`)
Assembles point-in-time ContextPackets across all 26 football reasoning layers (L01..L26)
with strict L21 dependency order (`L12 -> L18 -> L21`) and L26 market closing entry LAST.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
_DYNAMIC_TEAM_PBP_CACHE: Optional[Dict[str, Dict[str, float]]] = None
_NFL_DIVISIONS: Dict[str, str] = {
    "BUF": "AFCE", "MIA": "AFCE", "NE": "AFCE", "NYJ": "AFCE",
    "BAL": "AFCN", "CIN": "AFCN", "CLE": "AFCN", "PIT": "AFCN",
    "HOU": "AFCS", "IND": "AFCS", "JAX": "AFCS", "TEN": "AFCS",
    "DEN": "AFCW", "KC": "AFCW", "LAC": "AFCW", "LV": "AFCW",
    "DAL": "NFCE", "NYG": "NFCE", "PHI": "NFCE", "WAS": "NFCE",
    "CHI": "NFCN", "DET": "NFCN", "GB": "NFCN", "MIN": "NFCN",
    "ATL": "NFCS", "CAR": "NFCS", "NO": "NFCS", "TB": "NFCS",
    "ARI": "NFCW", "LA": "NFCW", "LAR": "NFCW", "SEA": "NFCW", "SF": "NFCW",
}
_DOME_TEAMS = {"ATL", "ARI", "DAL", "DET", "HOU", "IND", "LAC", "LAR", "LA", "LV", "MIN", "NO"}


def _get_dynamic_team_pbp_priors() -> Dict[str, Dict[str, float]]:
    global _DYNAMIC_TEAM_PBP_CACHE
    if _DYNAMIC_TEAM_PBP_CACHE is not None:
        return _DYNAMIC_TEAM_PBP_CACHE

    priors: Dict[str, Dict[str, float]] = {}
    pbp_path = REPO_ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"
    slim_csv_path = REPO_ROOT / "data" / "nflverse" / "pbp_2026_slim_clean_checkout.csv.gz"
    if pbp_path.is_file() or slim_csv_path.is_file():
        try:
            import pandas as pd

            cols = ["game_id", "posteam", "defteam", "play_type", "epa", "sack", "qb_hit", "xpass"]
            pbp = None
            if pbp_path.is_file():
                try:
                    pbp = pd.read_parquet(pbp_path, columns=cols)
                except Exception:
                    pbp = None
            if pbp is None and slim_csv_path.is_file():
                try:
                    pbp = pd.read_csv(slim_csv_path, compression="gzip", usecols=cols, low_memory=False)
                except Exception:
                    pbp = None
            wh_pbp_path = REPO_ROOT / "data" / "warehouse" / "v1" / "pbp_normalized.parquet"
            if pbp is None and wh_pbp_path.is_file():
                try:
                    pbp = pd.read_parquet(wh_pbp_path)
                except Exception:
                    pbp = None
            if pbp is None:
                raise RuntimeError("No PBP source available")
            pbp["posteam"] = pbp["posteam"].replace({"LA": "LAR"})
            pbp["defteam"] = pbp["defteam"].replace({"LA": "LAR"})
            plays = pbp[pbp["play_type"].isin(["pass", "run"]) & pbp["posteam"].notna()]
            for tm in sorted(plays["posteam"].dropna().unique()):
                off = plays[plays["posteam"] == tm]
                dfn = plays[plays["defteam"] == tm]
                off_pass = off[off["play_type"] == "pass"]
                dfn_pass = dfn[dfn["play_type"] == "pass"]
                n_games = max(1, int(off["game_id"].nunique()))
                plays_per_gm = float(len(off)) / n_games
                off_epa = float(off["epa"].mean()) if len(off) else 0.0
                def_epa = float(dfn["epa"].mean()) if len(dfn) else 0.0
                net_epa = off_epa - def_epa * 0.5
                sacks_allowed = float(off_pass["sack"].sum()) / max(1.0, float(len(off_pass)))
                def_sacks = float(dfn_pass["sack"].sum()) / max(1.0, float(len(dfn_pass)))
                def_hits = float(dfn_pass["qb_hit"].sum()) / max(1.0, float(len(dfn_pass)))
                pressure_rate = min(0.48, max(0.22, def_sacks * 2.2 + def_hits * 1.35 + 0.14))
                if "xpass" in off.columns and off["xpass"].notna().any():
                    valid_xp = off[off["xpass"].notna()]
                    proe_val = float((valid_xp["play_type"].eq("pass").astype(float) - valid_xp["xpass"]).mean())
                else:
                    proe_val = (float(len(off_pass)) / max(1.0, float(len(off)))) - 0.555
                pace_sec = max(24.4, min(30.6, 27.4 - (plays_per_gm - 62.5) * 0.24))
                pbwr = max(0.50, min(0.75, 0.68 - sacks_allowed * 1.15))
                priors[str(tm)] = {
                    "epa_prior": round(net_epa, 4),
                    "proe": round(proe_val, 4),
                    "sack_rate_allowed": round(sacks_allowed, 4),
                    "pressure_rate": round(pressure_rate, 4),
                    "neutral_pace_sec": round(pace_sec, 2),
                    "pass_block_win_rate": round(pbwr, 4),
                }
        except Exception:
            pass

    _DYNAMIC_TEAM_PBP_CACHE = priors
    return priors


def _resolve_dynamic_matchup_context(away_team: str, home_team: str, week: int = 9) -> Dict[str, Any]:
    away_u = "LAR" if away_team.upper() == "LA" else away_team.upper()
    home_u = "LAR" if home_team.upper() == "LA" else home_team.upper()
    team_map = _get_dynamic_team_pbp_priors()
    hm = team_map.get(home_u, {
        "epa_prior": 0.04,
        "proe": 0.01,
        "sack_rate_allowed": 0.068,
        "pressure_rate": 0.33,
        "neutral_pace_sec": 26.8,
        "pass_block_win_rate": 0.61,
    })
    aw = team_map.get(away_u, {
        "epa_prior": 0.01,
        "proe": -0.005,
        "sack_rate_allowed": 0.072,
        "pressure_rate": 0.31,
        "neutral_pace_sec": 27.0,
        "pass_block_win_rate": 0.59,
    })
    is_dome = home_u in _DOME_TEAMS
    is_div = 1.0 if (_NFL_DIVISIONS.get(home_u) and _NFL_DIVISIONS.get(home_u) == _NFL_DIVISIONS.get(away_u)) else 0.0
    implied_spread = round(-2.2 - (hm["epa_prior"] - aw["epa_prior"]) * 22.0, 1)
    implied_total = round(44.5 + (hm["epa_prior"] + aw["epa_prior"]) * 18.0 + (1.5 if is_dome else 0.0), 1)
    return {
        "home_epa_prior": hm["epa_prior"],
        "away_epa_prior": aw["epa_prior"],
        "home_proe": hm["proe"],
        "away_proe": aw["proe"],
        "wind_mph": 0.0 if is_dome else 9.5,
        "temp_f": 70.0 if is_dome else 55.0,
        "home_pressure_rate": hm["pressure_rate"],
        "away_sack_rate_allowed": aw["sack_rate_allowed"],
        "pass_block_win_rate": hm["pass_block_win_rate"],
        "neutral_pace_sec_per_snap": round((hm["neutral_pace_sec"] + aw["neutral_pace_sec"]) / 2.0, 2),
        "market_spread": implied_spread,
        "total_line": implied_total,
        "is_divisional": is_div,
        "window_slot": "SUNDAY_EARLY",
        "week": week,
    }


def build_context_packet(
    game_id: str | Dict[str, Any] = "2024_10_CIN_BAL",
    as_of_utc: str = "2024-11-07T00:00:00Z",
    feature_overrides: Optional[Dict[str, float]] = None,
    persist: bool = True,
    kickoff_utc: Optional[str] = None,
) -> Dict[str, Any]:
    from intelligence.reasoning.layers.layer_registry import (
        build_context_packet as _build_context_packet,
    )

    if isinstance(game_id, dict):
        game_ctx: Dict[str, Any] = dict(game_id)
    else:
        parts = str(game_id).split("_")
        away_team = parts[2] if len(parts) >= 4 else "CIN"
        home_team = parts[3] if len(parts) >= 4 else "BAL"
        if str(game_id).startswith("2024_"):
            kickoff_default = "2024-11-08T01:15:00Z"
        elif str(game_id) == "2026_09_JAX_BAL":
            kickoff_default = "2026-11-06T01:15:00Z"
        else:
            kickoff_default = "2026-11-08T18:00:00Z"
        # Real kickoff from the live slate overrides the historical default
        # (Week 10+ games must not inherit the Week 9 pin -> temporal leakage).
        if kickoff_utc:
            kickoff_default = str(kickoff_utc)
        matchup_priors = {
            "2026_09_DET_GB": {
                "home_epa_prior": 0.088,
                "away_epa_prior": 0.162,
                "home_proe": 0.019,
                "away_proe": 0.011,
                "wind_mph": 13.5,
                "temp_f": 49.0,
                "home_pressure_rate": 0.335,
                "away_sack_rate_allowed": 0.058,
                "market_spread": 2.5,
                "total_line": 48.5,
                "is_divisional": 1.0,
                "window_slot": "SUNDAY_LATE",
            },
            "2026_09_IND_MIN": {
                "home_epa_prior": 0.074,
                "away_epa_prior": -0.021,
                "home_proe": 0.034,
                "away_proe": -0.018,
                "wind_mph": 0.0,
                "temp_f": 70.0,
                "home_pressure_rate": 0.412,
                "away_sack_rate_allowed": 0.081,
                "market_spread": -5.5,
                "total_line": 46.5,
                "is_divisional": 0.0,
                "window_slot": "SNF",
            },
            "2026_09_TB_KC": {
                "home_epa_prior": 0.118,
                "away_epa_prior": 0.052,
                "home_proe": 0.041,
                "away_proe": 0.022,
                "wind_mph": 11.0,
                "temp_f": 56.0,
                "home_pressure_rate": 0.368,
                "away_sack_rate_allowed": 0.066,
                "market_spread": -8.5,
                "total_line": 45.5,
                "is_divisional": 0.0,
                "window_slot": "MNF",
            },
            "2026_09_LAC_CLE": {
                "home_epa_prior": -0.064,
                "away_epa_prior": 0.045,
                "home_proe": -0.015,
                "away_proe": 0.009,
                "wind_mph": 15.0,
                "temp_f": 52.0,
                "home_pressure_rate": 0.385,
                "away_sack_rate_allowed": 0.074,
                "market_spread": 1.5,
                "total_line": 42.5,
                "is_divisional": 0.0,
                "window_slot": "SUNDAY_EARLY",
            },
            "2026_09_DEN_BAL": {
                "home_epa_prior": 0.175,
                "away_epa_prior": -0.012,
                "home_proe": 0.026,
                "away_proe": -0.009,
                "wind_mph": 7.5,
                "temp_f": 58.0,
                "home_pressure_rate": 0.352,
                "away_sack_rate_allowed": 0.069,
                "market_spread": -9.0,
                "total_line": 46.0,
                "is_divisional": 0.0,
                "window_slot": "SUNDAY_EARLY",
            },
        }
        game_ctx = {
            "game_id": str(game_id),
            "away_team": away_team,
            "home_team": home_team,
            "as_of": as_of_utc,
            "kickoff_utc": kickoff_default,
        }
        if str(game_id) in matchup_priors:
            game_ctx.update(matchup_priors[str(game_id)])
        elif str(game_id) not in ("2026_09_JAX_BAL", "2024_10_CIN_BAL"):
            wk = int(parts[1]) if len(parts) >= 2 and parts[1].isdigit() else 9
            game_ctx.update(_resolve_dynamic_matchup_context(away_team, home_team, week=wk))
        if feature_overrides:
            game_ctx.update(feature_overrides)

    return _build_context_packet(
        game_ctx=game_ctx,
        write_to_disk=persist,
    )


def evaluate_single_layer(
    layer_id: int,
    game_id: str,
    as_of_utc: str,
    features: Dict[str, float],
    upstream_outputs: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    from intelligence.reasoning.layers.layer_registry import (
        evaluate_single_layer as _evaluate_single_layer,
    )

    return _evaluate_single_layer(
        layer_id=layer_id,
        game_id=game_id,
        as_of_utc=as_of_utc,
        features=features,
        upstream_outputs=upstream_outputs,
    )


__all__ = [
    "build_context_packet",
    "evaluate_single_layer",
]


if __name__ == "__main__":
    import argparse
    import json
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Build 26-layer ContextPacket")
    parser.add_argument("--game-id", required=True, help="Game ID e.g. 2026_09_JAX_BAL")
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--week", type=int, default=9)
    parser.add_argument("--as-of", default="2026-11-05T18:00:00Z")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    pkt = build_context_packet(game_id=args.game_id, as_of_utc=args.as_of, persist=True)
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(pkt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"packet_id": pkt["packet_id"], "game_id": pkt["game_id"], "layers": len(pkt["layers"])}))

