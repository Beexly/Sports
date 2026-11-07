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
        kickoff_default = (
            "2024-11-08T01:15:00Z"
            if str(game_id).startswith("2024_")
            else "2026-11-06T01:15:00Z"
        )
        game_ctx = {
            "game_id": str(game_id),
            "away_team": away_team,
            "home_team": home_team,
            "as_of": as_of_utc,
            "kickoff_utc": kickoff_default,
        }
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
