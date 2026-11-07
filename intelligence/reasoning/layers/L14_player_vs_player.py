#!/usr/bin/env python3
"""
Layer 14: L14_player_vs_player (player_vs_scheme)
Title: Player vs Player: WR/CB Shadow, OL/DL 1-on-1 & TE/S Matchups
Equation Family: route
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 14
LAYER_ID = "L14_player_vs_player"
CANONICAL_STAGE_SLUG = "player_vs_scheme"
EQUATION_FAMILY = "route"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
