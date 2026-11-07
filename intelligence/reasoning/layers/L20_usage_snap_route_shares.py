#!/usr/bin/env python3
"""
Layer 20: L20_usage_snap_route_shares (outside_game_human_signals)
Title: Usage: Snap Share, Route Participation, Target/Air-Yard/Carry Share
Equation Family: usage
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 20
LAYER_ID = "L20_usage_snap_route_shares"
CANONICAL_STAGE_SLUG = "outside_game_human_signals"
EQUATION_FAMILY = "usage"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
