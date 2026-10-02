# PROVENANCE — qb-behavior / situational / __init__.py
# c02 situational + trust-target layer, built on the c01 core profile engine
# (qb-behavior/src/qb_behavior/: loader, metrics, identity, profile).
# Research: corpus-intelligence/deep/c02/{verified-claims,syntheses,challenges,
# buildable-systems}.md. Interface contract: qb-behavior/README.md
# ("Interface contract with c02").
"""c02 situational splits and trust-target modeling.

Owns: situational split matrices, INT-by-situation (EB-shrunk), pressure
splits on the pressure-floor definition, HHI/trust-target time series,
Protection Stress (team-week). Consumes c01's loader/metrics/identity —
never reimplements them.
"""
from __future__ import annotations

from .cells import (
    pressure_floor,
    int_cell_key,
    int_cell_from_play,
    TRUST_SITUATIONS,
    trust_situation,
)
from . import specs
from .serve import SituationalStore
from .trust import TrustSeries
from .protection import ProtectionStressIndex
from .provider import SituationalQBProvider

__all__ = [
    "pressure_floor",
    "int_cell_key",
    "int_cell_from_play",
    "TRUST_SITUATIONS",
    "trust_situation",
    "specs",
    "SituationalStore",
    "TrustSeries",
    "ProtectionStressIndex",
    "SituationalQBProvider",
]
