# PROVENANCE — gse-intelligence-build / coaching / __init__.py
# Coaching tendency engine: team tendency computation + coordinator fingerprints
# (corpus slice c03). See coaching/CONTRACT.md for the c04 interface contract.
"""Coaching tendency engine (c03)."""
from . import common, load, proe, fingerprint, tenures, regime, sequencing
from . import script_elasticity, redzone, tempo, adjustments, dc_pressure, ingame
from . import core_nfl_schemes_and_systems, footballxos_16_category_playbook_engine
from . import (
    whitefield_and_nflverse_metrics_engine,
    ftn_and_snap_deep_intelligence_engine,
    pfr_learned_trench_scheme_contact_engine,
    causal_positional_vulnerability_engine,
    ftn_role_zone_pressure_hazard_engine,
)
from .provider import CoachingEngineProvider

__all__ = ["common", "load", "proe", "fingerprint", "tenures", "regime",
           "sequencing", "script_elasticity", "redzone", "tempo",
           "adjustments", "dc_pressure", "ingame",
           "core_nfl_schemes_and_systems", "footballxos_16_category_playbook_engine",
           "whitefield_and_nflverse_metrics_engine", "ftn_and_snap_deep_intelligence_engine",
           "pfr_learned_trench_scheme_contact_engine",
           "causal_positional_vulnerability_engine",
           "ftn_role_zone_pressure_hazard_engine",
           "CoachingEngineProvider"]
