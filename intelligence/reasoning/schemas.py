# Provenance:
#   - reasoning-depth-spec.md §6.1 (reasoning trace data structure), §6.2 (verification
#     statuses), §6.3 (checklist verdicts), §7 (API shape: analyze/adversaryReview/
#     validateChecklist/correlatedTheses).
#   - tnf-intelligence-program-2026-10-01.md §2 (Garrett's football hierarchy OL →
#     coaching/scheme → QB, honored by scheme_matchup track semantics).
#   - c08 corpus: NO_BET_GOVERNOR_METHODOLOGY.md (no-bet reason codes feed gap
#     assumptions), AIRWAVE_OPERATOR_RUNBOOK.md (claim taxonomy → verification
#     statuses), RESCUE-2026-09-26-2-verifier-port.md (pre-registration gate →
#     breaking conditions must be declared BEFORE the game).
#   - c08 Phase-2 lanes: laneC (OR/n_eff overconfidence scoring; REJECT register
#     R1–R9), laneD (stub-mode honesty → stub_tracks; no-bet code mapping;
#     near-refusal shadow metrics → near_misses), laneB (DATA-GAP worst-plausible).
#
# This module is the SHARED CONTRACT between the reasoning builders:
#   - c07 replacement: builds L1–L5 levels, trace construction, escalation state
#     machine. Consume these dataclasses; do not redefine them.
#   - c08 (this lane): owns adversary.py (adversarial layer) + checklist.py
#     (no-blind-spots validator), which operate on these types.
#
# Design note on breaking conditions: spec §6.1 attaches a breaking condition to
# the INFERENCE link of a causal chain ("the observable facts that would falsify
# each link"). The adversary (§4 L4 step 1) evaluates breaking conditions against
# observed pre-kickoff data: a thesis whose breaking conditions are ALREADY MET
# is killed before exposure. Conditions are machine-checkable (metric, op,
# threshold); free-text-only conditions are marked unverifiable, never silently
# treated as met or unmet.

"""Shared data contracts for the GSE reasoning engine (adversarial layer)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from .enums import ChecklistVerdict, Exposure, ReasoningDepth, Verification


# ---------------------------------------------------------------------------
# Breaking conditions — the falsifiability backbone of every causal claim.
# ---------------------------------------------------------------------------

VALID_OPS = ("<", "<=", ">", ">=", "==", "!=")


@dataclass
class BreakingCondition:
    """One machine-checkable falsifier for a causal link.

    Semantics: the condition is MET when `observed[metric] <op> threshold`.
    A met condition means the link (and any thesis depending on it) is broken.

    Example (spec §3 step 4, Steelers–Browns): the pressure-funnel thesis
    "PIT pressure will overwhelm CLE's OL" breaks when TTT < 2.3s AND
    quick-game rate > 0.60 — both true in Weeks 1–3 data, so the funnel dies.
    """

    id: str
    text: str  # human-readable, e.g. "TTT < 2.3s breaks the pressure thesis"
    metric: str  # key into the trace's observed_values, e.g. "ttt_seconds"
    op: str  # one of <, <=, >, >=, ==, !=
    threshold: float

    def __post_init__(self) -> None:
        if self.op not in VALID_OPS:
            raise ValueError(f"BreakingCondition {self.id}: op must be one of {VALID_OPS}, got {self.op!r}")


@dataclass
class ConditionResult:
    """Evaluation of one breaking condition against observed values."""

    condition_id: str
    text: str
    metric: str
    threshold: float
    op: str
    observed_value: Optional[float]  # None → unverifiable (metric missing)
    verifiable: bool
    met: Optional[bool]  # None when unverifiable


def evaluate_condition(cond: BreakingCondition, observed: dict[str, float]) -> ConditionResult:
    """Evaluate a breaking condition. Missing metrics → unverifiable, never assumed."""
    value = observed.get(cond.metric)
    if value is None:
        return ConditionResult(
            condition_id=cond.id, text=cond.text, metric=cond.metric,
            threshold=cond.threshold, op=cond.op,
            observed_value=None, verifiable=False, met=None,
        )
    met = {
        "<": value < cond.threshold,
        "<=": value <= cond.threshold,
        ">": value > cond.threshold,
        ">=": value >= cond.threshold,
        "==": value == cond.threshold,
        "!=": value != cond.threshold,
    }[cond.op]
    return ConditionResult(
        condition_id=cond.id, text=cond.text, metric=cond.metric,
        threshold=cond.threshold, op=cond.op,
        observed_value=value, verifiable=True, met=met,
    )


# ---------------------------------------------------------------------------
# Causal structure — L3 chains, the unit the adversary attacks.
# ---------------------------------------------------------------------------

@dataclass
class CausalLink:
    """One cause → mechanism → outcome link with verification status.

    Per spec §4 L3: every link carries verification status; INFERENCE links are
    flagged; each link lists its breaking conditions. A link whose verification
    is INFERENCE or SINGLE_SOURCE and which is load-bearing makes the dependent
    thesis weak (spec §8 T5).
    """

    id: str
    cause: str
    mechanism: str
    outcome: str
    verification: Verification
    breaking_conditions: list[BreakingCondition] = field(default_factory=list)
    load_bearing: bool = True  # False → auxiliary context, not thesis-critical
    tags: list[str] = field(default_factory=list)  # feature/mechanism tags, e.g.
    # "xfp_fpoe_rank" — matched against the REJECT register (challenges.md R1–R9).
    # A link tagged with a REJECT-status mechanism is flagged, never silently used.


@dataclass
class CausalChain:
    """An ordered L3 chain of causal links supporting a thesis."""

    id: str
    links: list[CausalLink] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Bets, theses, and the correlation the adversary must detect.
# ---------------------------------------------------------------------------

@dataclass
class BetLeg:
    """One leg of a card. causal_link_ids name the L3 links it depends on —
    this is what lets correlatedTheses() detect shared causal structure."""

    id: str
    description: str
    causal_link_ids: list[str] = field(default_factory=list)
    exposure: float = 0.0  # stake in units


@dataclass
class ThesisBundle:
    """Legs that share ≥1 causal link, per spec §4 L4 step 2.

    N legs on one link are ONE thesis with combined exposure — never N
    independent edges (spec §8 T4).
    """

    id: str
    shared_link_ids: list[str] = field(default_factory=list)
    leg_ids: list[str] = field(default_factory=list)
    combined_exposure: float = 0.0


# ---------------------------------------------------------------------------
# Adversary output — spec §4 L4 mandatory outputs 1–4.
# ---------------------------------------------------------------------------

@dataclass
class GapAssumption:
    """Worst-plausible assumption the adversary must make for a DATA-GAP track
    (spec §5 gate: IF any track is DATA-GAP and load-bearing → L4 adversary
    assumes worst-plausible, flags exposure). Recorded, never silent."""

    track: str
    assumed_value: str
    rationale: str


@dataclass
class WeakLink:
    """A load-bearing link with weak verification (spec §8 T5)."""

    link_id: str
    verification: Verification
    breaking_condition_present: bool
    breaking_condition_machine_checkable: bool


@dataclass
class OverconfidenceScore:
    """Naive-averaging overconfidence for one thesis bundle (lane C, §3.2).

    OR = V_true / V_naive ≥ 1 — how much the independent-legs presentation
    understates the bundle's variance. n_eff = n / (1 + (n−1)ρ̄) — the
    effective number of independent bets. The TNF funnel: n=4, ρ̄≈0.7–0.9 →
    n_eff ≈ 1.1–1.5, "one bet with four receipts."
    """

    bundle_id: str
    n_legs: int
    rho_bar: float  # mean pairwise link-correlation; INFERENCE if estimated from chain overlap
    rho_source: str  # "measured" | "chain_overlap_estimate" | "assumed"
    n_eff: float
    or_ratio: float
    note: str = ""


@dataclass
class AdversaryReport:
    """The L4 adversary's full report on a trace (spec §4, §7 adversaryReview)."""

    trace_id: str
    # 1. Breaking-condition check
    breaking_conditions_met: bool  # True if ANY evaluated condition was met
    condition_results: list[ConditionResult] = field(default_factory=list)
    # 1b. Near misses — conditions NOT met but within NEAR_MISS_FRACTION of the
    # threshold on the unbroken side. Shadow metrics on near-refusals (lane D):
    # calibration reviews see what was nearly suppressed, not just what died.
    near_misses: list[ConditionResult] = field(default_factory=list)
    # 2. Correlated-thesis detection
    correlated_theses: list[ThesisBundle] = field(default_factory=list)
    thesis_verdicts: dict[str, str] = field(default_factory=dict)  # bundle id → KILL | WEAKEN | SURVIVE
    killed_thesis_ids: list[str] = field(default_factory=list)
    overconfidence: dict[str, OverconfidenceScore] = field(default_factory=dict)
    # 2b. REJECT-register hits — links tagged with guarded negative results
    # (challenges.md R1–R9). Cited, never silently worked around.
    reject_hits: list[str] = field(default_factory=list)
    # 3. Steelman: the strongest counter-argument, with numbers
    counter_argument: str = ""
    # 4. Pre-mortem, written before the games
    pre_mortem: str = ""
    # 4b. would_not_claim entries inherited by published output (lane D, FABLE pattern)
    would_not_claim: list[str] = field(default_factory=list)
    # Supporting machinery
    weak_links: list[WeakLink] = field(default_factory=list)
    weak_link: bool = False
    gap_assumptions: list[GapAssumption] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Checklist — the no-blind-spots gate, spec §5.
# ---------------------------------------------------------------------------

@dataclass
class ChecklistResult:
    """Output of validateChecklist (spec §5 gate)."""

    valid: bool
    verdicts: dict[str, ChecklistVerdict] = field(default_factory=dict)
    invalid_reason: Optional[str] = None  # names the offending track when invalid
    requires_l5: bool = False  # 2+ CONFLICT tracks → L5 required regardless of leg count
    data_gaps: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    # No-bet governor codes fired by this validation (lane D mapping):
    #   INVALID (unchecked tracks) → "missing_required_data" (HARD_PASS)
    #   any CONFLICT → "model_disagreement" (WATCH — explain before action)
    no_bet_codes: list[str] = field(default_factory=list)
    # Tracks whose "data present" signal came from a stub/fixture/mock and were
    # forced to DATA-GAP (JARVIS isStubMode() port — lane D §3.2.6).
    stub_downgraded: list[str] = field(default_factory=list)

    @property
    def escalated_to_l5(self) -> bool:
        """Alias for requires_l5 (integration façade vocabulary)."""
        return self.requires_l5


# ---------------------------------------------------------------------------
# Trace — the unit of coherence (spec §2.5, §6.1). c07's builder constructs
# these; the adversarial layer consumes them read-only.
# ---------------------------------------------------------------------------

@dataclass
class ReasoningTrace:
    """Minimal trace contract the adversarial layer needs.

    c07's L1–L5 builder owns trace construction and the escalation log; it must
    populate at least these fields. Extra fields are fine — the adversary reads
    only what it needs and never mutates the trace.
    """

    trace_id: str
    depth: ReasoningDepth
    game: dict[str, Any] = field(default_factory=dict)
    exposure: Exposure = Exposure.NONE
    legs: list[BetLeg] = field(default_factory=list)
    chains: list[CausalChain] = field(default_factory=list)
    checklist: dict[str, ChecklistVerdict] = field(default_factory=dict)
    # Pre-kickoff observed values the breaking conditions evaluate against,
    # e.g. {"ttt_seconds": 2.1, "quick_game_rate": 0.639, "air_yards": 6.12}
    observed_values: dict[str, float] = field(default_factory=dict)
    # Track evidence for steelman construction: track → list of evidence strings
    # with their verification, e.g. {"coaching_scheme": [("Monken quick-game 0.639", Verification.COMPUTED)]}
    track_evidence: dict[str, list[tuple[str, Verification]]] = field(default_factory=dict)
    # Tracks whose data-present signal came from a stub/fixture/mock. The
    # checklist validator forces these to DATA-GAP (stub-mode honesty, lane D).
    stub_tracks: list[str] = field(default_factory=list)
    label: str = "ANALYSIS-DRAFT"
    # --- c07 builder extensions (levels + trace + escalation lane) ---
    # Builder-owned trace machinery. All defaulted: the adversarial layer's
    # minimal contract above is unchanged.
    question: str = ""                          # the analysis question asked
    levels: dict[str, Any] = field(default_factory=dict)   # "L1".."L5" → level payloads
    escalation_log: list["EscalationEntry"] = field(default_factory=list)
    tool_calls: list["ToolCall"] = field(default_factory=list)
    hierarchy_order: list[str] = field(default_factory=list)  # T6 evaluation order
    created_at: str = ""


__all__ = [
    "VALID_OPS",
    "BreakingCondition",
    "ConditionResult",
    "evaluate_condition",
    "CausalLink",
    "CausalChain",
    "BetLeg",
    "ThesisBundle",
    "OverconfidenceScore",
    "GapAssumption",
    "WeakLink",
    "AdversaryReport",
    "ChecklistResult",
    "ReasoningTrace",
    # c07 builder extensions (levels + trace + escalation lane)
    "Claim",
    "EscalationEntry",
    "ToolCall",
]


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# c07 builder extensions — owned by the L1–L5 levels / trace / escalation lane.
# Atomic trace records: single claims (L1), escalation-log rows (spec §4:
# skipping levels is a logged exception, never silent), and the tool-call audit
# trail (spec §2.4: any number auditable to its source).
# ---------------------------------------------------------------------------


@dataclass
class Claim:
    """A single factual claim with verification status and source pointer (spec §4 L1)."""

    text: str
    verification: Verification
    source: str = ""
    value: Any = None
    note: str = ""


@dataclass
class EscalationEntry:
    """One row of the escalation log."""

    from_depth: ReasoningDepth
    to_depth: ReasoningDepth
    trigger: str
    at: str = ""
    skipped: bool = False


@dataclass
class ToolCall:
    """One data-tool invocation, recorded for auditability."""

    tool: str
    args: dict = field(default_factory=dict)
    returned: str = ""
    at: str = ""
