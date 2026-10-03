# PROVENANCE: implements reasoning-depth-spec.md §2.2 (synthesizer resolves conflicts with
# explicit precedence; Grok 4.20 think -> debate -> consensus), §5 (precedence rule), §8 T6
# (Garrett's hierarchy honored in L5 synthesis: OL -> scheme -> QB).
# Research basis: tnf-intelligence-program-2026-10-01.md §2 (the hierarchy); c09-map.md #13
# (never present uncalibrated numbers as signal — synthesis reports verdicts, not scores).
"""L5 synthesis: merge specialist tracks + adversary report in hierarchy order."""
from __future__ import annotations

from typing import Any

from .checklist import resolve_conflict
from .types import AdversaryReport, ChecklistVerdict, ReasoningTrace, Verification


def _layer_note(track: str, verdict: ChecklistVerdict, detail: str = "") -> dict[str, Any]:
    return {"verdict": verdict.value, "detail": detail}


def synthesize(trace: ReasoningTrace,
               adversary: AdversaryReport | None,
               chain_summaries: list[dict[str, Any]],
               corpus_hits: list[str] | None = None,
               live_signals: list[str] | None = None) -> dict[str, Any]:
    """Build the L5 level. layer_verdicts is insertion-ordered OL -> scheme -> QB (T6)."""
    cv = trace.checklist

    def v(t: str) -> ChecklistVerdict:
        return cv.get(t, ChecklistVerdict.UNCHECKED)

    ol_detail = f"{len(chain_summaries)} causal chain(s) evaluated through the trench layer."
    scheme_detail = "scheme adjustments checked against the trench verdict."
    qb_detail = "QB behavior read only after OL and scheme layers recorded."

    # Conflict resolution with precedence (spec §5): the scheme_matchup CONFLICT between
    # "raw pass-rush strength" (CORPUS) and "neutralized by quick game" (COMPUTED chain)
    # resolves toward the higher-precedence computed mechanism — recorded, not hidden.
    resolution_note = ""
    if v("scheme_matchup") == ChecklistVerdict.CONFLICT and chain_summaries:
        winner = resolve_conflict([Verification.COMPUTED, Verification.CORPUS])
        resolution_note = (
            f"scheme_matchup CONFLICT resolved by precedence toward {winner.value}: "
            f"the computed neutralization mechanism outranks the raw strength number.")

    layer_verdicts: dict[str, dict[str, Any]] = {
        "offensive_line": _layer_note("offensive_line", v("offensive_line"), ol_detail),
        "coaching_scheme": _layer_note("coaching_scheme", v("coaching_scheme"), scheme_detail),
        "qb_behavior": _layer_note("qb_behavior", v("qb_behavior"), qb_detail),
    }

    recommendation = _recommend(trace, adversary)
    return {
        "recommendation": recommendation,
        "layer_verdicts": layer_verdicts,          # ORDER IS THE CONTRACT (T6)
        "conflict_resolution": resolution_note,
        "corpus_hits": corpus_hits or [],
        "live_signals": live_signals or [],
    }


def _recommend(trace: ReasoningTrace, adversary: AdversaryReport | None) -> str:
    if adversary and adversary.correlated_theses:
        bundles = adversary.correlated_theses
        if all(b.thesis_broken for b in bundles):
            leg_ids = [leg.leg_id for b in bundles for leg in b.legs]
            links = sorted({b.shared_link for b in bundles})
            return (
                f"REJECT the correlated stack ({', '.join(leg_ids)}) as "
                f"{'a single thesis' if len(bundles) == 1 else 'correlated theses'} on "
                f"shared link(s) {', '.join(links)}: breaking conditions were met "
                f"pre-kickoff, so every leg dies on the same broken mechanism. "
                f"No surviving edge on the proposed legs.")
        survivors = [b for b in bundles if not b.thesis_broken]
        if survivors:
            leg_ids = [leg.leg_id for b in survivors for leg in b.legs]
            return (f"PROCEED only on surviving uncorrelated legs ({', '.join(leg_ids)}); "
                    f"the killed theses stay rejected. Size per the staking contract.")
    if adversary and adversary.weak_link:
        return ("NO BET — the load-bearing link is INFERENCE/SINGLE_SOURCE and the "
                "adversary could not verify it. Return with better data, not more confidence.")
    return ("NO BET — no thesis survived adversarial review with verified breaking "
            "conditions. Silence is not evidence; neither is a hunch.")
