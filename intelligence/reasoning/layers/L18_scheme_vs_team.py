#!/usr/bin/env python3
"""
Layer 18: L18_scheme_vs_team (game_script_state)
Title: Scheme vs Team: Personnel & Discipline vs RPO, Play-Action & Screens
Equation Family: scheme
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 18
LAYER_ID = "L18_scheme_vs_team"
CANONICAL_STAGE_SLUG = "game_script_state"
EQUATION_FAMILY = "scheme"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
