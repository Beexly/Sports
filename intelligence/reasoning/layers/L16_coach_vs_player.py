#!/usr/bin/env python3
"""
Layer 16: L16_coach_vs_player (scheme_vs_team)
Title: Coach vs Player: Coordinator Bracket/Isolation Rules on Focal Players
Equation Family: coverage
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 16
LAYER_ID = "L16_coach_vs_player"
CANONICAL_STAGE_SLUG = "scheme_vs_team"
EQUATION_FAMILY = "coverage"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
