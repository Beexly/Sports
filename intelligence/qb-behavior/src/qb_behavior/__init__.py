# Provenance: public API of the qb-behavior core profile engine.
# Owner: c01. Consumer contract for c02 in README.md.
"""qb_behavior — QB behavioral profile engine (core)."""
from .profile import Verification, MetricValue, SeasonProfile, QBProfile
from .engine import ProfileEngine
from .splits import SplitSpec, apply_split
from . import metrics, identity, loader, audit

__all__ = [
    "Verification", "MetricValue", "SeasonProfile", "QBProfile",
    "ProfileEngine", "SplitSpec", "apply_split",
    "metrics", "identity", "loader", "audit",
]

__version__ = "0.1.0"
