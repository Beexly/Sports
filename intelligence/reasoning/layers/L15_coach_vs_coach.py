#!/usr/bin/env python3
"""
Layer 15: L15_coach_vs_coach (scheme_vs_scheme)
Title: Coach vs Coach: Playcaller vs Defensive Coordinator Chess Match
Equation Family: coaching
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 15
LAYER_ID = "L15_coach_vs_coach"
CANONICAL_STAGE_SLUG = "scheme_vs_scheme"
EQUATION_FAMILY = "coaching"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
