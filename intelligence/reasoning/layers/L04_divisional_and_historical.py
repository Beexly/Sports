#!/usr/bin/env python3
"""
Layer 04: L04_divisional_and_historical (schedule_situations)
Title: Divisional & Historical Matchup Priors
Equation Family: historical
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 4
LAYER_ID = "L04_divisional_and_historical"
CANONICAL_STAGE_SLUG = "schedule_situations"
EQUATION_FAMILY = "historical"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
