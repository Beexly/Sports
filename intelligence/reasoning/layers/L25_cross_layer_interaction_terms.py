#!/usr/bin/env python3
"""
Layer 25: L25_cross_layer_interaction_terms (missingness_contradiction)
Title: Cross-Layer Non-Linear Interaction Terms (Trench x Wind x QB Mobility)
Equation Family: conformal
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 25
LAYER_ID = "L25_cross_layer_interaction_terms"
CANONICAL_STAGE_SLUG = "missingness_contradiction"
EQUATION_FAMILY = "conformal"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
