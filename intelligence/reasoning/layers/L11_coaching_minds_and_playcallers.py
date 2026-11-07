#!/usr/bin/env python3
"""
Layer 11: L11_coaching_minds_and_playcallers (coach_mind)
Title: Coaching Minds: HC/OC/DC Tendencies, 4th-Down, Motion & Play-Action
Equation Family: coaching
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 11
LAYER_ID = "L11_coaching_minds_and_playcallers"
CANONICAL_STAGE_SLUG = "coach_mind"
EQUATION_FAMILY = "coaching"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
