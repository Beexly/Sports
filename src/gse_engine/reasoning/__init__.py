"""Wave 51 autonomous regime reasoning and counterfactual fail-closed supervisors."""

from gse_engine.reasoning.wave51_autonomous_regime_reasoning_supervisor import (
    BARBER_C_HAT_ABSTAIN_THRESHOLD,
    CLINICAL_TO_SPORTS_WEIGHT,
    DEFAULT_CONTRADICTION_JSD_THRESHOLD,
    DEFAULT_MIN_DEVIG_EDGE,
    LIVE_STAKE_FRACTION,
    MAX_ABS_DELTA_LOG_ODDS,
    REAL_MONEY_STAKE_CLEARED,
    AutonomousReasoningDecision,
    BitemporalAuditResult,
    BitemporalLeakageError,
    CounterfactualStressResult,
    PhaseTransitionRegimeResult,
    SignalObservation,
    audit_bitemporal_signal_bundle,
    classify_phase_transition_regime,
    evaluate_autonomous_reasoning_decision,
)

__all__ = [
    "BARBER_C_HAT_ABSTAIN_THRESHOLD",
    "CLINICAL_TO_SPORTS_WEIGHT",
    "DEFAULT_CONTRADICTION_JSD_THRESHOLD",
    "DEFAULT_MIN_DEVIG_EDGE",
    "LIVE_STAKE_FRACTION",
    "MAX_ABS_DELTA_LOG_ODDS",
    "REAL_MONEY_STAKE_CLEARED",
    "AutonomousReasoningDecision",
    "BitemporalAuditResult",
    "BitemporalLeakageError",
    "CounterfactualStressResult",
    "PhaseTransitionRegimeResult",
    "SignalObservation",
    "audit_bitemporal_signal_bundle",
    "classify_phase_transition_regime",
    "evaluate_autonomous_reasoning_decision",
]
