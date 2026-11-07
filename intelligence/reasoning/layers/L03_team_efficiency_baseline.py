#!/usr/bin/env python3
"""
Layer 03: L03_team_efficiency_baseline (venue_physical_environment)
Title: Team Offensive/Defensive Efficiency Baselines (EPA/Play, Success Rate)
Equation Family: epa
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 3
LAYER_ID = "L03_team_efficiency_baseline"
CANONICAL_STAGE_SLUG = "venue_physical_environment"
EQUATION_FAMILY = "epa"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
