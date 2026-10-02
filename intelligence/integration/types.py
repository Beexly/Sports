# PROVENANCE: reasoning-depth-spec.md §6 (data structures), §6.2 (verification
# enum), §6.3 (checklist verdicts), §7 (API shape). Converged 2026-10-02: the
# closed enums (ReasoningDepth, Verification, ChecklistVerdict, Exposure),
# TRACKS, and VERIFICATION_PRECEDENCE are the CANONICAL contract from
# reasoning/enums.py — this module re-exports them so the whole build shares
# one vocabulary. (LIVE_VERIFIED was added to the canonical enum during this
# convergence; it was previously an integration-only SPEC extension.)
#
# The dataclasses below are the integration façade's input/output vocabulary
# (provider-wired analyze()). The engine itself operates on reasoning's
# canonical types; the façade (api.py) converts at the boundary.
"""Core types for the unified NFL intelligence API (façade vocabulary).

Canonical enums live in reasoning/enums.py and are re-exported here.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

# Canonical contract — one vocabulary for the whole build.
from reasoning.enums import (
    TRACKS,
    VERIFICATION_PRECEDENCE,
    ChecklistVerdict,
    Exposure,
    ReasoningDepth,
    Verification,
)

__all__ = [
    "TRACKS", "VERIFICATION_PRECEDENCE",
    "ChecklistVerdict", "Exposure", "ReasoningDepth", "Verification",
    "Claim", "CausalLink", "CausalChain", "Correlation", "BreakingCondition",
    "BetLeg", "ThesisBundle", "AdversaryReport", "SpecialistOutput",
    "ChecklistResult", "AnalysisRequest", "EscalationEntry", "ReasoningTrace",
    "ContractViolation",
]


@dataclass(frozen=True)
class Claim:
    """A single factual claim with verification status (spec §2.3, §6.1)."""
    text: str
    source: str                      # file/row, tool name, or outlet
    verification: Verification
    value: Optional[float] = None
    breaking_condition: Optional[str] = None  # required if verification is INFERENCE at L3+


@dataclass(frozen=True)
class CausalLink:
    """One cause -> mechanism -> outcome link. Every link is sourced (spec §4 L3)."""
    cause: str
    mechanism: str
    outcome: str
    verification: Verification
    breaking_condition: Optional[str] = None  # observable fact that falsifies this link
    id: str = ""                     # canonical link id, e.g. "pit_pressure_lands"


@dataclass(frozen=True)
class CausalChain:
    links: tuple[CausalLink, ...]
    conclusion: str


@dataclass(frozen=True)
class Correlation:
    signals: tuple[str, ...]
    method: Verification               # COMPUTED vs asserted
    note: str


@dataclass(frozen=True)
class BreakingCondition:
    """A machine-checkable falsifier for a bet thesis (spec §4 L3/L4)."""
    description: str
    metric: str                        # e.g. "quickgame_rate"
    operator: str                      # one of: >=, <=, >, <, ==
    threshold: float
    observed: Optional[float]          # None => unevaluable (DATA-GAP)
    verification: Verification

    def is_met(self) -> Optional[bool]:
        """True if the breaking condition holds (thesis is broken).
        None if unobservable."""
        if self.observed is None:
            return None
        ops = {">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b,
               ">": lambda a, b: a > b, "<": lambda a, b: a < b,
               "==": lambda a, b: a == b}
        return ops[self.operator](self.observed, self.threshold)


@dataclass(frozen=True)
class BetLeg:
    leg_id: str
    description: str
    causal_links: tuple[str, ...] = ()          # causal-link ids this leg depends on
    thesis_breaking_conditions: tuple[BreakingCondition, ...] = ()


@dataclass(frozen=True)
class ThesisBundle:
    """Legs sharing a causal link = ONE thesis (spec §4 L4, §8 T4)."""
    legs: tuple[BetLeg, ...]
    shared_link: str
    thesis_broken: bool                          # adversary verdict on the shared thesis
    note: str = ""


@dataclass(frozen=True)
class AdversaryReport:
    breaking_conditions_met: bool
    evaluated_conditions: tuple[BreakingCondition, ...]
    correlated_theses: tuple[ThesisBundle, ...]
    counter_argument: str
    counter_evidence: tuple[Claim, ...]
    pre_mortem: str
    weak_link: bool


@dataclass(frozen=True)
class SpecialistOutput:
    agent: str                                     # stat | scheme | behavior | signal | adversary
    claims: tuple[Claim, ...] = ()
    conflicts_with: tuple[str, ...] = ()
    track_status: dict[str, str] = field(default_factory=dict)  # track -> CLEAR | DATA-GAP | UNCHECKED


@dataclass(frozen=True)
class ChecklistResult:
    valid: bool
    verdicts: dict[str, ChecklistVerdict]
    invalid_reason: str = ""
    escalated_to_l5: bool = False                  # 2+ CONFLICT forces L5


@dataclass(frozen=True)
class AnalysisRequest:
    game: dict[str, Any]                           # {away, home, week, season}
    question: str
    exposure: Exposure = Exposure.ANALYSIS
    requested_depth: ReasoningDepth = ReasoningDepth.L1
    legs: tuple[BetLeg, ...] = ()                  # proposed bet legs, if any
    resume_trace_id: Optional[str] = None


@dataclass(frozen=True)
class EscalationEntry:
    from_depth: ReasoningDepth
    to_depth: ReasoningDepth
    trigger: str
    at: str


@dataclass
class ReasoningTrace:
    """Façade trace DTO (storage/test vocabulary). The engine returns
    reasoning's canonical ReasoningTrace; the façade may convert to this
    shape for persistence. Mutable during construction."""
    trace_id: str
    game: dict[str, Any]
    depth: ReasoningDepth
    escalation_log: list[EscalationEntry] = field(default_factory=list)
    levels: dict[str, Any] = field(default_factory=dict)
    checklist: dict[str, ChecklistVerdict] = field(default_factory=dict)
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    label: str = "DRAFT"

    def to_dict(self) -> dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "game": self.game,
            "depth": self.depth.value,
            "escalation_log": [
                {"from": e.from_depth.value, "to": e.to_depth.value,
                 "trigger": e.trigger, "at": e.at} for e in self.escalation_log
            ],
            "levels": self.levels,
            "checklist": {k: v.value for k, v in self.checklist.items()},
            "tool_calls": self.tool_calls,
            "label": self.label,
        }


# Canonical ContractViolation: the engine raises reasoning's; the façade's
# public surface re-exports it so `except ContractViolation` catches it.
from reasoning import ContractViolation  # noqa: E402  (re-exported)
