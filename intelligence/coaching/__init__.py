# PROVENANCE — gse-intelligence-build / coaching / __init__.py
# Coaching tendency engine: team tendency computation + coordinator fingerprints
# (corpus slice c03). See coaching/CONTRACT.md for the c04 interface contract.
"""Coaching tendency engine (c03)."""
from . import common, load, proe, fingerprint, tenures, regime, sequencing
from . import script_elasticity, redzone, tempo, adjustments, dc_pressure, ingame
from .provider import CoachingEngineProvider

__all__ = ["common", "load", "proe", "fingerprint", "tenures", "regime",
           "sequencing", "script_elasticity", "redzone", "tempo",
           "adjustments", "dc_pressure", "ingame", "CoachingEngineProvider"]
