# Provenance:
#   - reasoning-depth-spec.md §5 (no-blind-spots: five mandatory tracks, verdict
#     values, the gate; precedence live-verified > computed > corpus >
#     single-source > inference), §6.3 (checklist verdicts closed enum), §7
#     (validateChecklist signature; published_pick/card MUST be L5), §8 T2
#     (DATA-GAP, not UNCHECKED, when a track has no data).
#   - c08 corpus: NO_BET_GOVERNOR_METHODOLOGY.md (no-bet reason codes:
#     missing_required_data maps to UNCHECKED-at-L3+ → INVALID),
#     AIRWAVE_OPERATOR_RUNBOOK.md (evidence gates: UNFALSIFIABLE claims can never
#     become pick evidence → UNCHECKED cannot be downgraded silently),
#     1776-classification-abstention (per-class gates → per-track verdicts, not
#     one global gate), RESCUE-2026-09-26-2-verifier-port.md (pre-registration:
#     the checklist is part of the persisted trace).
#   - c08 Phase-2 laneD: stub-mode honesty (JARVIS isStubMode() port →
#     stub_tracks forced DATA-GAP); no-bet governor code mapping
#     (missing_required_data / model_disagreement).

"""The no-blind-spots checklist validator.

The rule (spec §5): before the engine produces any pick, card, or game analysis
at L3+, it must check EVERY intelligence track — QB behavior, coaching/scheme,
offensive line, trust signals, scheme matchup — and record the verdict per
track, including 'checked, nothing material.' Silence is not evidence.

The gate:
  - any track UNCHECKED at L3+ → INVALID. Halt. Never downgrade silently.
  - DATA-GAP on a load-bearing track → recorded; the L4 adversary assumes
    worst-plausible (handled in adversary.py).
  - 2+ tracks CONFLICT → L5 required regardless of leg count.
"""

from __future__ import annotations

from .enums import TRACKS, ChecklistVerdict, Exposure, ReasoningDepth
from .schemas import ChecklistResult, ReasoningTrace

# Verdicts that count as "the track was checked" at L3+.
CHECKED_VERDICTS = frozenset(
    {
        ChecklistVerdict.CLEAR,
        ChecklistVerdict.NOTHING_MATERIAL,
        ChecklistVerdict.DATA_GAP,
        ChecklistVerdict.CONFLICT,
    }
)


def validate_checklist(trace: ReasoningTrace) -> ChecklistResult:
    """Validate the §5 checklist gate for a trace. Blocking validator, not advisory.

    Below L3, UNCHECKED tracks are permitted (the analysis is shallow by design).
    At L3+, any UNCHECKED track invalidates the trace and names the track.

    Stub-mode honesty (lane D, JARVIS isStubMode() port): tracks listed in
    trace.stub_tracks had their "data present" signal come from a stub, fixture,
    or mock — they are forced to DATA-GAP. A validator that reports CLEAR on
    fixture data is the exact failure the stub guard was built to prevent.
    """
    verdicts = {track: trace.checklist.get(track, ChecklistVerdict.UNCHECKED) for track in TRACKS}

    # Stub downgrade first: stub data is absence of data.
    stub_downgraded = [t for t in TRACKS if t in trace.stub_tracks]
    for t in stub_downgraded:
        verdicts[t] = ChecklistVerdict.DATA_GAP

    data_gaps = [t for t, v in verdicts.items() if v == ChecklistVerdict.DATA_GAP]
    conflicts = [t for t, v in verdicts.items() if v == ChecklistVerdict.CONFLICT]
    unchecked = [t for t, v in verdicts.items() if v == ChecklistVerdict.UNCHECKED]

    requires_l5 = len(conflicts) >= 2

    # No-bet governor mapping (lane D): unchecked-at-L3+ → missing_required_data
    # (HARD_PASS); any CONFLICT → model_disagreement (WATCH — explain before action).
    no_bet_codes: list[str] = []
    if trace.depth.is_at_least(ReasoningDepth.L3) and unchecked:
        no_bet_codes.append("missing_required_data")
    if conflicts:
        no_bet_codes.append("model_disagreement")

    if trace.depth.is_at_least(ReasoningDepth.L3) and unchecked:
        return ChecklistResult(
            valid=False,
            verdicts=verdicts,
            invalid_reason=(
                f"UNCHECKED track(s) at {trace.depth.value}: {', '.join(unchecked)}. "
                "Analysis is INVALID at L3+. Halt — do not downgrade silently."
            ),
            requires_l5=requires_l5,
            data_gaps=data_gaps,
            conflicts=conflicts,
            no_bet_codes=no_bet_codes,
            stub_downgraded=stub_downgraded,
        )

    return ChecklistResult(
        valid=True,
        verdicts=verdicts,
        invalid_reason=None,
        requires_l5=requires_l5,
        data_gaps=data_gaps,
        conflicts=conflicts,
        no_bet_codes=no_bet_codes,
        stub_downgraded=stub_downgraded,
    )


def depth_contract_ok(depth: ReasoningDepth, exposure: Exposure) -> bool:
    """Spec §7 contract: published picks and multi-leg cards MUST be L5.

    Anything shallower is a contract violation, surfaced loudly — never silent.
    """
    if exposure.requires_l5():
        return depth == ReasoningDepth.L5
    return True


def describe_gate(result: ChecklistResult) -> str:
    """Human-readable one-line summary of the gate outcome for review UIs."""
    if not result.valid:
        return f"INVALID — {result.invalid_reason}"
    flags = []
    if result.data_gaps:
        flags.append(f"data gaps: {', '.join(result.data_gaps)} (adversary assumes worst-plausible)")
    if result.conflicts:
        flags.append(f"conflicts: {', '.join(result.conflicts)}")
    if result.requires_l5:
        flags.append("2+ conflicts → L5 required")
    suffix = f" [{'; '.join(flags)}]" if flags else ""
    return f"PASS{suffix}"


__all__ = [
    "CHECKED_VERDICTS",
    "validate_checklist",
    "depth_contract_ok",
    "describe_gate",
]
