# Provenance: reasoning-depth-spec.md §7 (module API). One package, one contract:
# shared dataclasses from schemas.py (canonical — c08 adversarial layer + c07
# levels/trace/escalation lane both consume, neither redefines).
#
# c08 owns: adversary.py, checklist.py (adversaryReview, checklist validator,
# correlated-thesis detection, killed-legs contract).
# c07 owns: engine.py, levels.py, escalation.py, trace.py, specialists.py,
# interfaces.py, enums.py, exceptions.py (L1–L5 levels, escalation state machine,
# trace data structures + persistence, escalation triggers, provenance).

"""reasoning — the L1–L5 reasoning engine with a mandatory adversarial layer."""

from .adversary import (
    NEAR_MISS_FRACTION,
    REJECT_REGISTER,
    adversary_review,
    correlated_theses,
    killed_legs,
    overconfidence_score,
    recommend_fusion,
)
from .checklist import depth_contract_ok, describe_gate, validate_checklist
from .engine import AnalysisEngine, analyze
from .enums import (
    TRACKS,
    VERIFICATION_PRECEDENCE,
    ChecklistVerdict,
    Exposure,
    ReasoningDepth,
    Verification,
)
from .escalation import (
    EscalationSignal,
    checklist_conflict_count,
    count_weak_links,
    escalate_to,
    next_depth,
)
from .exceptions import (
    AdversaryNotWired,
    ChecklistInvalid,
    ContractViolation,
    InvalidDepth,
    TraceNotFound,
)
from .interfaces import AnalysisRequest, DataContext, GameRequest, SpecialistOutput
from .levels import (
    HIERARCHY_ORDER,
    build_checklist,
    check_hierarchy,
    run_l1,
    run_l2,
    run_l3,
    run_l5_synthesis,
    run_specialists_parallel,
)
from .schemas import (
    AdversaryReport,
    BetLeg,
    BreakingCondition,
    CausalChain,
    CausalLink,
    ChecklistResult,
    Claim,
    ConditionResult,
    EscalationEntry,
    GapAssumption,
    OverconfidenceScore,
    ReasoningTrace,
    ThesisBundle,
    ToolCall,
    WeakLink,
    evaluate_condition,
)
from .specialists import (
    AdversarySpecialist,
    BaseSpecialist,
    BehaviorSpecialist,
    SchemeSpecialist,
    SignalSpecialist,
    SpecialistRegistry,
    StatSpecialist,
    ToolBackend,
)
from .trace import (
    TraceStore,
    content_hash,
    log_escalation,
    record_tool_call,
    trace_from_dict,
    trace_to_dict,
    utcnow,
)

__all__ = [
    # shared contract (schemas.py)
    "AdversaryReport", "BetLeg", "BreakingCondition", "CausalChain", "CausalLink",
    "ChecklistResult", "Claim", "ConditionResult", "EscalationEntry",
    "GapAssumption", "ReasoningTrace", "ThesisBundle", "ToolCall", "WeakLink",
    "evaluate_condition",
    # enums / exceptions
    "TRACKS", "VERIFICATION_PRECEDENCE", "ChecklistVerdict", "Exposure",
    "ReasoningDepth", "Verification",
    "AdversaryNotWired", "ChecklistInvalid", "ContractViolation",
    "InvalidDepth", "TraceNotFound",
    # engine / levels / escalation / trace / specialists
    "AnalysisEngine", "analyze",
    "EscalationSignal", "checklist_conflict_count", "count_weak_links",
    "escalate_to", "next_depth",
    "AnalysisRequest", "DataContext", "GameRequest", "SpecialistOutput",
    "HIERARCHY_ORDER", "build_checklist", "check_hierarchy",
    "run_l1", "run_l2", "run_l3", "run_l5_synthesis", "run_specialists_parallel",
    "AdversarySpecialist", "BaseSpecialist", "BehaviorSpecialist",
    "SchemeSpecialist", "SignalSpecialist", "SpecialistRegistry",
    "StatSpecialist", "ToolBackend",
    "TraceStore", "content_hash", "log_escalation", "record_tool_call",
    "trace_from_dict", "trace_to_dict", "utcnow",
    # c08 adversarial layer
    "correlated_theses", "killed_legs", "adversary_review", "validate_checklist",
    "depth_contract_ok", "describe_gate", "overconfidence_score",
    "recommend_fusion", "REJECT_REGISTER", "NEAR_MISS_FRACTION",
    "OverconfidenceScore",
]
