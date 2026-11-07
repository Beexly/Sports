#!/usr/bin/env python3
"""
Layer 07: L07_officials_and_referee_crew (player_traits_form)
Title: Officials & Referee Crew Assignment (Penalty Rates, Pace Impact)
Equation Family: referee
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 7
LAYER_ID = "L07_officials_and_referee_crew"
CANONICAL_STAGE_SLUG = "player_traits_form"
EQUATION_FAMILY = "referee"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
