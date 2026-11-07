"""Autonomous Deduction Engine: Live Optimal Transport, Multi-Marginal Relaxation, and Analytic Number-Theoretic Gates."""
from pathlib import Path

_INTEL_ENGINE = str(Path(__file__).resolve().parents[1] / "intelligence" / "engine")
if _INTEL_ENGINE not in __path__:
    __path__.append(_INTEL_ENGINE)
