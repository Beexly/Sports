# PROVENANCE: c09 integration module — the unified NFL intelligence API.
# Converged 2026-10-02: this package is a THIN FAÇADE over reasoning/ (the
# canonical contract). analyze/adversary_review/correlated_theses/
# validate_checklist delegate to reasoning's engine and adversarial layer;
# the ProviderRegistry vocabulary (providers.py, stubs.py) stays as the
# provider-wiring input. See contracts/integration-contracts.md.
"""Unified intelligence API: provider-wired façade over the canonical engine."""
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
