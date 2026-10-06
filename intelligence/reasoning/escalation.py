# Provenance: reasoning-depth-spec.md §4 (reasoning levels, escalation triggers,
# escalation summary table, "skipping levels is a logged exception, never silent"),
# §5 (CONFLICT auto-escalates to L4; 2+ CONFLICT → L5 required), §8 T3 (escalation
# triggers fire). Shared types from schemas.py (canonical contract).

"""Escalation state machine.

Depth is a property of the analysis with mandatory escalation triggers. The machine
evaluates triggers after each level and records every transition in the trace's
escalation_log. Skipping levels is permitted only as a logged exception.
De-escalation is refused outright.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .enums import ChecklistVerdict, ReasoningDepth
from .schemas import ReasoningTrace
from .trace import log_escalation


# ---------------------------------------------------------------------------
# Triggers (spec §4 escalation summary)
# ---------------------------------------------------------------------------

TRIGGER_L1_TO_L2 = {"matchup", "line_vs_number", "injury_flag"}
TRIGGER_L2_TO_L3 = {"bet_requested", "causal_claim", "signal_conflict"}
TRIGGER_L3_TO_L4 = {"real_exposure", "market_contradiction", "weak_link"}
TRIGGER_L4_TO_L5 = {
    "thesis_survived",
    "three_plus_legs",
    "full_picture",
    "exposure_requires_l5",  # spec §7 contract: published pick/card MUST be L5
}


@dataclass
class EscalationSignal:
    """What the pipeline observed at a level boundary."""

    depth: ReasoningDepth
    triggers: set[str] = field(default_factory=set)
    market_edge_pct: float = 0.0
    checklist_conflicts: int = 0
    weak_links: int = 0
    legs: int = 0


def next_depth(signal: EscalationSignal) -> tuple[ReasoningDepth | None, str | None]:
    """Return (target_depth, trigger_name) or (None, None).

    Fires the highest applicable target — e.g. 2+ CONFLICT tracks force L5
    regardless of leg count (spec §5).
    """
    t = signal.triggers

    if signal.checklist_conflicts >= 2:
        return ReasoningDepth.L5, "two_plus_conflicts"

    if signal.depth == ReasoningDepth.L1 and t & TRIGGER_L1_TO_L2:
        return ReasoningDepth.L2, sorted(t & TRIGGER_L1_TO_L2)[0]
    if signal.depth == ReasoningDepth.L2 and t & TRIGGER_L2_TO_L3:
        return ReasoningDepth.L3, sorted(t & TRIGGER_L2_TO_L3)[0]
    if signal.depth == ReasoningDepth.L3:
        if "real_exposure" in t:
            return ReasoningDepth.L4, "real_exposure"
        if "market_contradiction" in t and abs(signal.market_edge_pct) > 5.0:
            return ReasoningDepth.L4, "market_contradiction"
        if "weak_link" in t or signal.weak_links > 0:
            return ReasoningDepth.L4, "weak_link"
    if signal.depth == ReasoningDepth.L4 and t & TRIGGER_L4_TO_L5:
        return ReasoningDepth.L5, sorted(t & TRIGGER_L4_TO_L5)[0]
    return None, None


def escalate_to(
    trace: ReasoningTrace, target: ReasoningDepth, trigger: str
) -> None:
    """Move the trace to `target`, logging every intermediate level.

    Multi-level jumps log each skipped level as skipped=True — a logged
    exception, never silent. De-escalation raises.
    """
    ordered = ReasoningDepth.ordered()
    cur, tgt = ordered.index(trace.depth), ordered.index(target)
    if tgt < cur:
        raise ValueError(f"refusing silent de-escalation {trace.depth.value} → {target.value}")
    for i in range(cur, tgt):
        nxt = ordered[i + 1]
        skipped = (tgt - cur) > 1 and nxt != target
        log_escalation(trace, ordered[i], nxt, trigger, skipped=skipped)
    trace.depth = target  # the only place depth moves on escalation


def checklist_conflict_count(checklist: dict[str, ChecklistVerdict]) -> int:
    return sum(1 for v in checklist.values() if v == ChecklistVerdict.CONFLICT)


def count_weak_links(trace: ReasoningTrace) -> int:
    """Chains with a load-bearing INFERENCE/SINGLE_SOURCE link (spec §8 T5)."""
    from .enums import Verification

    n = 0
    for chain in trace.chains:
        for link in chain.links:
            if (
                link.load_bearing
                and link.verification in (Verification.INFERENCE, Verification.SINGLE_SOURCE)
            ):
                n += 1
                break
    return n
