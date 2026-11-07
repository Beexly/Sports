#!/usr/bin/env python3
"""
CANONICAL 26-LAYER CONTEXT PACKET BUILDER (`intelligence/context/context_packet_builder.py`)
Assembles point-in-time ContextPackets across all 26 football reasoning layers (L01..L26)
with strict L21 dependency order (`L12 -> L18 -> L21`) and L26 market closing entry LAST.
"""
from __future__ import annotations

from typing import Any, Dict, Optional


def build_context_packet(
    game_id: str | Dict[str, Any] = "2024_10_CIN_BAL",
    as_of_utc: str = "2024-11-07T00:00:00Z",
    feature_overrides: Optional[Dict[str, float]] = None,
    persist: bool = True,
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

