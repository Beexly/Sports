# PROVENANCE: implements reasoning-depth-spec.md §4 (reasoning levels L1–L5, escalation
# triggers, escalation summary table) and §7 SPEC notes (escalation as a state machine;
# level-skipping is a logged exception, never silent).
#
# LEGACY STATUS (2026-10-02, Batch 2): this module is a TEST-PINNED reference
# implementation of spec §4. The production escalation path is
# reasoning/escalation.py (EscalationSignal/next_depth/escalate_to), driven by
# reasoning/engine.py. This module's compute_depth/AnalysisContext API is kept
# ONLY because tests/test_units.py pins it; no production code may import it.
# The closed enums it uses (ReasoningDepth, Exposure) are converged with
# reasoning/enums.py via integration/types.py (one vocabulary). Do not extend.
"""Escalation state machine for reasoning depth (legacy test-pinned reference)."""
from __future__ import annotations

from dataclasses import dataclass

from .types import AnalysisRequest, EscalationEntry, Exposure, ReasoningDepth


@dataclass(frozen=True)
class AnalysisContext:
    """Observable flags that drive escalation (spec §4 trigger table)."""
    has_matchup: bool = False
    has_line_or_number: bool = False
    has_injury_flag: bool = False
    bet_requested: bool = False
    has_causal_claim: bool = False
    signal_conflict: bool = False
    real_exposure: bool = False
    market_contradiction_pct: float = 0.0          # |edge| vs market, implied-prob points
    weak_load_bearing_link: bool = False          # INFERENCE / SINGLE_SOURCE load-bearing
    thesis_survived: bool = False                 # adversary could not kill it
    leg_count: int = 0
    full_picture_requested: bool = False


# Exposure floors: requested_depth is a floor; exposure can only raise it (spec §7).
EXPOSURE_FLOOR: dict[Exposure, ReasoningDepth] = {
    Exposure.NONE: ReasoningDepth.L1,
    Exposure.ANALYSIS: ReasoningDepth.L2,
    Exposure.PUBLISHED_PICK: ReasoningDepth.L5,
    Exposure.CARD: ReasoningDepth.L5,
}


def _depth_index(d: ReasoningDepth) -> int:
    return ["L1", "L2", "L3", "L4", "L5"].index(d.value)


def escalate(current: ReasoningDepth, trigger: str, at: str) -> tuple[ReasoningDepth, EscalationEntry]:
    """Single-step escalation. Skipping levels raises; callers must walk step by step
    so every transition is logged (spec: skipping is a logged exception, never silent)."""
    order = [ReasoningDepth.L1, ReasoningDepth.L2, ReasoningDepth.L3,
             ReasoningDepth.L4, ReasoningDepth.L5]
    idx = order.index(current)
    if idx >= len(order) - 1:
        entry = EscalationEntry(current, current, f"{trigger} (already at max)", at)
        return current, entry
    nxt = order[idx + 1]
    return nxt, EscalationEntry(current, nxt, trigger, at)


def compute_depth(req: AnalysisRequest, ctx: AnalysisContext,
                  now_iso: str) -> tuple[ReasoningDepth, list[EscalationEntry]]:
    """Walk the escalation table from the requested floor. Returns final depth + log.

    Every upward step is logged — including the exposure floor (spec: skipping levels
    is a logged exception, never silent)."""
    depth = req.requested_depth
    log: list[EscalationEntry] = []

    def maybe(target: ReasoningDepth, trigger: str) -> None:
        nonlocal depth
        while _depth_index(depth) < _depth_index(target):
            depth, entry = escalate(depth, trigger, now_iso)
            log.append(entry)

    # Exposure floor first: a card / published pick MUST be L5 (spec §7).
    maybe(EXPOSURE_FLOOR[req.exposure], f"exposure_{req.exposure.value}_floor")

    # L1 -> L2: matchup / line-vs-number / injury flag
    if ctx.has_matchup or ctx.has_line_or_number or ctx.has_injury_flag:
        triggers = []
        if ctx.has_matchup:
            triggers.append("matchup")
        if ctx.has_line_or_number:
            triggers.append("line_vs_number")
        if ctx.has_injury_flag:
            triggers.append("injury_flag")
        maybe(ReasoningDepth.L2, "+".join(triggers))

    # L2 -> L3: bet requested, causal claim, or signal conflict
    if ctx.bet_requested or ctx.has_causal_claim or ctx.signal_conflict:
        triggers = []
        if ctx.bet_requested:
            triggers.append("bet_requested")
        if ctx.has_causal_claim:
            triggers.append("causal_claim")
        if ctx.signal_conflict:
            triggers.append("signal_conflict")
        maybe(ReasoningDepth.L3, "+".join(triggers))

    # L3 -> L4: real exposure, market contradiction > 5%, weak load-bearing link
    if ctx.real_exposure or ctx.market_contradiction_pct > 5.0 or ctx.weak_load_bearing_link:
        triggers = []
        if ctx.real_exposure:
            triggers.append("real_exposure")
        if ctx.market_contradiction_pct > 5.0:
            triggers.append(f"market_contradiction_{ctx.market_contradiction_pct:.1f}pct")
        if ctx.weak_load_bearing_link:
            triggers.append("weak_link")
        maybe(ReasoningDepth.L4, "+".join(triggers))

    # L4 -> L5: thesis survives adversary, 3+ legs, or full picture requested
    if ctx.thesis_survived or ctx.leg_count >= 3 or ctx.full_picture_requested:
        triggers = []
        if ctx.thesis_survived:
            triggers.append("thesis_survived")
        if ctx.leg_count >= 3:
            triggers.append(f"{ctx.leg_count}_legs")
        if ctx.full_picture_requested:
            triggers.append("full_picture")
        maybe(ReasoningDepth.L5, "+".join(triggers))

    return depth, log
