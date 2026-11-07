#!/usr/bin/env python3
"""
Layer 26: L26_market_price_check_last (adversary_and_synthesis)
Title: Market Price Check (Entered LAST, Weighted SMALLEST <= 0.08)
Equation Family: market
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 26
LAYER_ID = "L26_market_price_check_last"
CANONICAL_STAGE_SLUG = "adversary_and_synthesis"
EQUATION_FAMILY = "market"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
