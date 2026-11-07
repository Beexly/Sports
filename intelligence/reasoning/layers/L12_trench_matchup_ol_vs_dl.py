#!/usr/bin/env python3
"""
Layer 12: L12_trench_matchup_ol_vs_dl (coach_vs_coach)
Title: Trench Matchup: OL Pass Protection (2-Jet/3-Jet) vs DL Pass-Rush Win Rates
Equation Family: trench
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 12
LAYER_ID = "L12_trench_matchup_ol_vs_dl"
CANONICAL_STAGE_SLUG = "coach_vs_coach"
EQUATION_FAMILY = "trench"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
