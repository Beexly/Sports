#!/usr/bin/env python3
"""
Layer 23: L23_red_zone_and_goal_line (market)
Title: Red-Zone & Goal-Line Conversion Mechanics
Equation Family: red_zone
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 23
LAYER_ID = "L23_red_zone_and_goal_line"
CANONICAL_STAGE_SLUG = "market"
EQUATION_FAMILY = "red_zone"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
