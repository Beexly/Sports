#!/usr/bin/env python3
"""
Layer 22: L22_receiving_separation_and_yac (officials)
Title: Receiving & Route Separation: Cushion, Break Separation & YACOE
Equation Family: route
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 22
LAYER_ID = "L22_receiving_separation_and_yac"
CANONICAL_STAGE_SLUG = "officials"
EQUATION_FAMILY = "route"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
