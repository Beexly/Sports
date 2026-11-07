#!/usr/bin/env python3
"""
Layer 21: L21_qb_processing_and_pressure (history)
Title: QB Processing: Time-to-Throw, Pressure-to-Sack & Clean vs Pressured Grade
Equation Family: qb
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 21
LAYER_ID = "L21_qb_processing_and_pressure"
CANONICAL_STAGE_SLUG = "history"
EQUATION_FAMILY = "qb"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
