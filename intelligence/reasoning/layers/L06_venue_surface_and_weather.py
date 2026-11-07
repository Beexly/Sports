#!/usr/bin/env python3
"""
Layer 06: L06_venue_surface_and_weather (roster_usage)
Title: Venue, Surface, Altitude, Dome/Outdoor & Live Weather
Equation Family: weather
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = 6
LAYER_ID = "L06_venue_surface_and_weather"
CANONICAL_STAGE_SLUG = "roster_usage"
EQUATION_FAMILY = "weather"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {})
