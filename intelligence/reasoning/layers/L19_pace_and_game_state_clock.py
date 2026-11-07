#!/usr/bin/env python3
"""
Layer 19: L19_pace_and_game_state_clock (micro_in_game)
Title: Pace, Play-Clock Behavior, No-Huddle & Game-State Script Transitions
Equation Family: tempo
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 19
LAYER_ID = "L19_pace_and_game_state_clock"
CANONICAL_STAGE_SLUG = "micro_in_game"
EQUATION_FAMILY = "tempo"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
