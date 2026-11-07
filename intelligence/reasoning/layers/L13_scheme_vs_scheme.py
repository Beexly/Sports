#!/usr/bin/env python3
"""
Layer 13: L13_scheme_vs_scheme (coach_vs_player)
Title: Scheme vs Scheme: Offensive System vs Defensive Front/Shell
Equation Family: scheme
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 13
LAYER_ID = "L13_scheme_vs_scheme"
CANONICAL_STAGE_SLUG = "coach_vs_player"
EQUATION_FAMILY = "scheme"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
