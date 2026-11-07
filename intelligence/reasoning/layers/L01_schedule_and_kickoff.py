#!/usr/bin/env python3
"""
Layer 01: L01_schedule_and_kickoff (freshness_reality)
Title: Schedule, Kickoff Window, Broadcast Slot & Week Context
Equation Family: schedule
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 1
LAYER_ID = "L01_schedule_and_kickoff"
CANONICAL_STAGE_SLUG = "freshness_reality"
EQUATION_FAMILY = "schedule"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
