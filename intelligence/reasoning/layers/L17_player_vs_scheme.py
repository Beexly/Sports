#!/usr/bin/env python3
"""
Layer 17: L17_player_vs_scheme (pace_tempo)
Title: Player vs Scheme: Route Concepts vs Man/Zone & Cover 1/2/3/4 Shells
Equation Family: coverage
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 17
LAYER_ID = "L17_player_vs_scheme"
CANONICAL_STAGE_SLUG = "pace_tempo"
EQUATION_FAMILY = "coverage"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
