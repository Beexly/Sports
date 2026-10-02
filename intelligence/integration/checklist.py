# PROVENANCE: implements reasoning-depth-spec.md §5 (no-blind-spots mandatory checklist,
# five tracks, verdict values, precedence rule, the gate). Research basis:
# - tnf-intelligence-program-2026-10-01.md §2 (OL → scheme → QB hierarchy)
# - c09-map.md #13 (confidence has ~zero resolution: UNCHECKED/DATA-GAP must never pass
#   silently) and §3 contradictions (conflict-resolution discipline).
"""The blocking checklist validator: every L3+ analysis must check all five tracks."""
from __future__ import annotations

from .types import (
    TRACKS,
    ChecklistResult,
    ChecklistVerdict,
    ReasoningDepth,
    ReasoningTrace,
    Verification,
    VERIFICATION_PRECEDENCE,
)


def _depth_at_least(depth: ReasoningDepth, floor: ReasoningDepth) -> bool:
    order = ["L1", "L2", "L3", "L4", "L5"]
    return order.index(depth.value) >= order.index(floor.value)


def validate_checklist(trace: ReasoningTrace) -> ChecklistResult:
    """Blocking validator (spec §5 gate).

    - Below L3: verdicts are recorded but not enforced.
    - At L3+: any UNCHECKED track -> INVALID, naming the track. Halt, never downgrade silently.
    - 2+ CONFLICT -> escalated_to_l5=True (L5 required regardless of leg count).
    """
    verdicts = {t: trace.checklist.get(t, ChecklistVerdict.UNCHECKED) for t in TRACKS}

    if not _depth_at_least(trace.depth, ReasoningDepth.L3):
        return ChecklistResult(valid=True, verdicts=verdicts)

    unchecked = [t for t, v in verdicts.items() if v == ChecklistVerdict.UNCHECKED]
    if unchecked:
        return ChecklistResult(
            valid=False,
            verdicts=verdicts,
            invalid_reason=f"UNCHECKED track(s) at {trace.depth.value}: {', '.join(unchecked)}. "
                           f"Analysis is INVALID — halt, do not downgrade silently.",
        )

    conflicts = [t for t, v in verdicts.items() if v == ChecklistVerdict.CONFLICT]
    escalated = len(conflicts) >= 2
    return ChecklistResult(valid=True, verdicts=verdicts, escalated_to_l5=escalated)


def resolve_conflict(verifications: list[Verification]) -> Verification:
    """Precedence: live-verified > computed > corpus > single-source > inference (spec §5)."""
    return max(verifications, key=lambda v: VERIFICATION_PRECEDENCE[v])


def worst_plausible_assumption(track: str) -> str:
    """What the L4 adversary assumes for a DATA-GAP load-bearing track (spec §5 gate).

    The assumption is adverse to the bet thesis and is recorded in the trace —
    silence is not evidence (map #13).
    """
    assumptions = {
        "qb_behavior": "assume league-worst situational splits for the position (INT rate, "
                       "pressure-to-sack) — the thesis must survive the bad case.",
        "coaching_scheme": "assume the opposing playcaller fully adjusts to the thesis's "
                           "key tendency within one half.",
        "offensive_line": "assume the weakest plausible trench outcome (backup-grade play, "
                           "no continuity benefit).",
        "trust_signals": "assume no positive trust signal exists; any relied-upon chemistry "
                         "is unproven.",
        "scheme_matchup": "assume the opponent's scheme neutralizes the thesis's primary "
                          "mechanism.",
    }
    return assumptions.get(track, "assume the adverse case; record the assumption.")
