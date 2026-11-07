#!/usr/bin/env python3
"""
Layer 09: L09_injuries_and_availability (unit_vs_unit)
Title: Injuries, Active Availability (DNP/LP/FP) & Cluster Depletion
Equation Family: injury
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 9
LAYER_ID = "L09_injuries_and_availability"
CANONICAL_STAGE_SLUG = "unit_vs_unit"
EQUATION_FAMILY = "injury"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
