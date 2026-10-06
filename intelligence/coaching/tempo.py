# PROVENANCE — gse-intelligence-build / coaching / tempo.py
# Implements: buildable-systems.md M09 (tempo: pace percentiles 4-120s filter
#   matching compute_tendencies.py; hurry-up rate when trailing late).
# Research basis: A6 — hurryup_rate gates on the OL lane (line health) when live;
#   until then it is descriptive.
"""M09 — Tempo."""
from __future__ import annotations

from typing import Any, Optional

from . import load as L


def get_tempo(season: int, team: str) -> Optional[dict[str, Any]]:
    """Pace percentiles (seconds between consecutive offensive plays, same drive,
    4-120s filter — identical definition to the base pipeline) + hurry-up rate."""
    return L.index_by("tempo.csv", "season", "team").get((season, team))
