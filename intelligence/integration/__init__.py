# PROVENANCE: c09 integration module — the unified NFL intelligence API.
# Implements reasoning-depth-spec.md §7 (API shape); research basis c09-map.md,
# tnf-intelligence-program-2026-10-01.md, x-intake-registry.md.
"""Unified intelligence API: qb-behavior + coaching + trust-signals + reasoning,
one callable interface. See contracts/integration-contracts.md."""
from .api import (
    adversary_review,
    analyze,
    correlated_theses,
    validate_checklist,
    ContractViolation,
)
from .types import (
    AnalysisRequest,
    BetLeg,
    BreakingCondition,
    ChecklistResult,
    ChecklistVerdict,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    Verification,
)

__all__ = [
    "analyze", "adversary_review", "validate_checklist", "correlated_theses",
    "ContractViolation", "AnalysisRequest", "BetLeg", "BreakingCondition",
    "ChecklistResult", "ChecklistVerdict", "Exposure", "ReasoningDepth",
    "ReasoningTrace", "Verification",
]
