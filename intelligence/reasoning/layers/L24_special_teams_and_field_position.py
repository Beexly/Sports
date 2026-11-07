#!/usr/bin/env python3
"""
Layer 24: L24_special_teams_and_field_position (gsi_cross_domain_methods)
Title: Special Teams: Kicker Range/Weather, Punt Net & Kickoff Landing Zone
Equation Family: special_teams
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 24
LAYER_ID = "L24_special_teams_and_field_position"
CANONICAL_STAGE_SLUG = "gsi_cross_domain_methods"
EQUATION_FAMILY = "special_teams"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
