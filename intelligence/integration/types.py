# PROVENANCE: implements reasoning-depth-spec.md §6 (data structures), §6.2 (verification
# enum), §6.3 (checklist verdicts), §7 (API shape). Research basis: corpus-intelligence/maps/c09-map.md
# (calibration-over-accuracy doctrine, checklist/verification discipline from ops/HERMES_ALL_NIGHT_2026-09-04
# and ops/ISOTONIC_LOGLOSS_DEBUG_2026-08-10: never present uncalibrated numbers as signal).
"""Core types for the unified NFL intelligence API."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class ReasoningDepth(str, Enum):
    """L1-L5 reasoning levels (spec §4). Ordered; escalation only moves up."""
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    L4 = "L4"
    L5 = "L5"

    def __lt__(self, other: "ReasoningDepth") -> bool:  # type: ignore[override]
        order = ["L1", "L2", "L3", "L4", "L5"]
        return order.index(self.value) < order.index(other.value)


class Verification(str, Enum):
    """Closed verification statuses (spec §6.2), plus LIVE_VERIFIED as the §5
    precedence top rank (SPEC extension: §5 names live-verified as outranking
    computed, but §6.2's enum omits it)."""
    CORPUS = "CORPUS"            # ingested from a sourced dataset or document
    COMPUTED = "COMPUTED"        # derived by engine code from CORPUS inputs, reproducible
    SINGLE_SOURCE = "SINGLE_SOURCE"  # one outlet, uncorroborated
    INFERENCE = "INFERENCE"      # model judgment; must carry a breaking condition at L3+
    LIVE_VERIFIED = "LIVE_VERIFIED"  # observed in a live/completed game feed (SPEC)


# Precedence for conflict resolution (spec §5): live-verified > computed > corpus >
# single-source > inference. Higher number wins.
VERIFICATION_PRECEDENCE: dict[Verification, int] = {
    Verification.LIVE_VERIFIED: 5,
    Verification.COMPUTED: 4,
    Verification.CORPUS: 3,
    Verification.SINGLE_SOURCE: 2,
    Verification.INFERENCE: 1,
}


class ChecklistVerdict(str, Enum):
    """Per-track checklist verdicts (spec §5, §6.3)."""
    CLEAR = "CLEAR"
    NOTHING_MATERIAL = "NOTHING-MATERIAL"
    DATA_GAP = "DATA-GAP"
    CONFLICT = "CONFLICT"
    UNCHECKED = "UNCHECKED"


# The five mandatory tracks (spec §5).
TRACKS: tuple[str, ...] = (
    "qb_behavior",
    "coaching_scheme",
    "offensive_line",
    "trust_signals",
    "scheme_matchup",
)


class Exposure(str, Enum):
    """What the analysis will be used for. Drives the depth floor (spec §4, §7)."""
    NONE = "none"
    ANALYSIS = "analysis"
    PUBLISHED_PICK = "published_pick"
    CARD = "card"


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
    """The unit of coherence (spec §2.5, §6.1). Mutable during construction;
    treated as immutable once labeled FINAL."""
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


class ContractViolation(Exception):
    """Raised when the API contract is violated (spec §7 SPEC notes)."""
    pass
