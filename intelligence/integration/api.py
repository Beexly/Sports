# PROVENANCE: implements reasoning-depth-spec.md §7 (analyze, adversaryReview,
# validateChecklist, correlatedTheses; "specialists run in parallel, synthesizer sequential";
# "analyze() with exposure published_pick|card MUST return depth L5"; "never returns a pick
# below L5"), §4 (escalation state machine), §5 (checklist gate), §2.6 (resume).
# Research basis: c09-map.md #19 (as-of quarantine — traces record observed_at basis; no
# post-settlement info leaks into pre-kickoff levels), #13 (resolution discipline).
"""Unified intelligence API: one callable interface over qb-behavior, coaching,
trust-signals, and reasoning. Owns the cross-module contracts and the end-to-end
game-analysis pipeline."""
from __future__ import annotations

import re
from dataclasses import asdict, is_dataclass
from enum import Enum
from typing import Any, Optional

from .checklist import validate_checklist, worst_plausible_assumption
from .escalation import (
    AnalysisContext,
    compute_depth,
    escalate,
    _depth_index,
)
from .pipeline import (
    build_causal_chains,
    build_l1,
    build_l2_correlations,
    detect_scheme_matchup_conflict,
    weakest_verification,
)
from .providers import ProviderRegistry
from .specialists import (
    AdversarySpecialist,
    run_specialists_parallel,
)
from .synthesis import synthesize
from .trace import TraceStore, make_trace_id, resume_trace, utcnow_iso
from .types import (
    AdversaryReport,
    AnalysisRequest,
    BetLeg,
    BreakingCondition,
    ChecklistVerdict,
    ContractViolation,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    SpecialistOutput,
    ThesisBundle,
    Verification,
    VERIFICATION_PRECEDENCE,
)

__all__ = ["analyze", "adversary_review", "validate_checklist", "correlated_theses",
           "ContractViolation"]

# Causal language that forces L2 -> L3 (spec §4: "a causal claim" in L2 output escalates).
# Deliberately narrow: bare "will" is not causal (too many false positives on bet questions).
_CAUSAL_LANGUAGE = re.compile(
    r"\bbecause\b|leads?\s+to|\bcauses?\b|->|→|overwhelm|neutraliz", re.IGNORECASE)


def _ser(obj: Any) -> Any:
    """Serialize dataclasses / enums / tuples to JSON-able structures."""
    if isinstance(obj, Enum):
        return obj.value
    if is_dataclass(obj):
        return {k: _ser(v) for k, v in asdict(obj).items()}
    if isinstance(obj, (tuple, list)):
        return [_ser(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _ser(v) for k, v in obj.items()}
    return obj


def _context_from_request(req: AnalysisRequest) -> AnalysisContext:
    q = req.question or ""
    return AnalysisContext(
        has_matchup=bool(req.game.get("away") and req.game.get("home")),
        has_line_or_number=bool(req.legs) or any(
            k in q.lower() for k in ("under", "over", "spread", "line", "total")),
        has_injury_flag="injur" in q.lower(),
        bet_requested=bool(req.legs) or req.exposure in (Exposure.PUBLISHED_PICK, Exposure.CARD),
        has_causal_claim=bool(req.legs) or bool(_CAUSAL_LANGUAGE.search(q)),
        real_exposure=req.exposure in (Exposure.PUBLISHED_PICK, Exposure.CARD),
        market_contradiction_pct=float(req.game.get("market_contradiction_pct", 0.0) or 0.0),
        leg_count=len(req.legs),
        full_picture_requested=bool(req.game.get("full_picture", False)),
    )


_TRACK_FOR_AGENT = {"stat": "offensive_line", "scheme": "coaching_scheme",
                    "behavior": "qb_behavior", "signal": "trust_signals"}
_STATUS_TO_VERDICT = {"CLEAR": ChecklistVerdict.CLEAR, "DATA-GAP": ChecklistVerdict.DATA_GAP,
                      "UNCHECKED": ChecklistVerdict.UNCHECKED,
                      "NOTHING-MATERIAL": ChecklistVerdict.NOTHING_MATERIAL}


def _checklist_verdicts(outputs: dict[str, SpecialistOutput],
                         chains: list) -> dict[str, ChecklistVerdict]:
    verdicts: dict[str, ChecklistVerdict] = {}
    for agent, track in _TRACK_FOR_AGENT.items():
        out = outputs.get(agent)
        status = (out.track_status.get(track) if out else None) or "UNCHECKED"
        verdicts[track] = _STATUS_TO_VERDICT.get(status, ChecklistVerdict.UNCHECKED)
    if detect_scheme_matchup_conflict(chains, outputs):
        verdicts["scheme_matchup"] = ChecklistVerdict.CONFLICT
    elif chains:
        verdicts["scheme_matchup"] = ChecklistVerdict.CLEAR
    else:
        verdicts["scheme_matchup"] = ChecklistVerdict.NOTHING_MATERIAL
    return verdicts


# ---------------------------------------------------------------------------
# correlatedTheses — spec §7, §4 L4, §8 T4
# ---------------------------------------------------------------------------

def correlated_theses(legs: tuple[BetLeg, ...],
                      link_conditions: dict[str, list[BreakingCondition]]
                      ) -> list[ThesisBundle]:
    """Group legs sharing >=1 causal link into a single ThesisBundle (spec §8 T4).

    N legs on one causal link = ONE thesis with combined exposure, never presented
    as N independent edges.
    """
    by_link: dict[str, list[BetLeg]] = {}
    for leg in legs:
        for link in leg.causal_links:
            by_link.setdefault(link, []).append(leg)
    bundles: list[ThesisBundle] = []
    for link, grouped in by_link.items():
        if len(grouped) < 2:
            continue
        conds = link_conditions.get(link, [])
        met = [c.is_met() for c in conds]
        broken = bool(conds) and all(m is True for m in met)
        bundles.append(ThesisBundle(
            legs=tuple(grouped), shared_link=link, thesis_broken=broken,
            note=("legs share one causal link: a single thesis with combined exposure, "
                  "never N independent edges")))
    return bundles


# ---------------------------------------------------------------------------
# adversaryReview — spec §4 L4 (breaking-condition check, correlated-thesis
# detection, steelman, pre-mortem)
# ---------------------------------------------------------------------------

def _steelman(outputs: dict[str, SpecialistOutput]) -> tuple[str, tuple]:
    cands = []
    for agent in ("behavior", "stat", "signal"):
        out = outputs.get(agent)
        if not out:
            continue
        for c in out.claims:
            t = c.text.lower()
            if any(k in t for k in ("int rate", "turnover", "pressure converts", "counter")):
                cands.append(c)
    if not cands:
        return ("No material counter-evidence surfaced; the thesis stands unopposed.", ())
    best = max(cands, key=lambda c: VERIFICATION_PRECEDENCE[c.verification])
    return (
        f"Strongest counter: {best.text} [{best.source}]. If the defense stunts into "
        f"quick-game windows, neutralized pressure can still convert to hits and turnovers — "
        f"the neutralization chain's INFERENCE link is where this thesis can die.",
        (best,))


def _pre_mortem(legs: tuple[BetLeg, ...], bundles: list[ThesisBundle],
                broken: bool) -> str:
    if broken and bundles:
        b = bundles[0]
        return (
            f"It is Monday and the correlated stack went 0-{len(b.legs)}: the adjustment "
            f"held as in prior weeks, the pass rush never landed, and every leg died on the "
            f"same broken link ({b.shared_link}). The card was one bet with "
            f"{len(b.legs)} receipts.")
    return ("It is Monday and the card lost: name the single mechanism that failed, "
            "with the pre-kickoff number that should have warned us.")


def adversary_review(legs: tuple[BetLeg, ...],
                     link_conditions: dict[str, list[BreakingCondition]],
                     chains: list,
                     outputs: dict[str, SpecialistOutput]) -> AdversaryReport:
    """L4 adversary pass (spec §4): falsification, not a tone."""
    bundles = correlated_theses(legs, link_conditions)
    seen: dict[tuple, BreakingCondition] = {}
    for leg in legs:
        for link in leg.causal_links:
            for c in link_conditions.get(link, []):
                seen[(c.metric, c.operator, c.threshold)] = c
    evaluated = tuple(seen.values())
    met = [c.is_met() for c in evaluated]
    # Unevaluable (None) conditions do NOT count as met — silence is not evidence.
    breaking_conditions_met = bool(evaluated) and all(m is True for m in met)

    weak_link = any(
        weakest_verification(*(lnk.verification for lnk in ch.links))
        in (Verification.INFERENCE, Verification.SINGLE_SOURCE)
        for ch in chains
    )
    counter_argument, counter_evidence = _steelman(outputs)
    return AdversaryReport(
        breaking_conditions_met=breaking_conditions_met,
        evaluated_conditions=evaluated,
        correlated_theses=tuple(bundles),
        counter_argument=counter_argument,
        counter_evidence=counter_evidence,
        pre_mortem=_pre_mortem(legs, bundles, breaking_conditions_met),
        weak_link=weak_link,
    )


# ---------------------------------------------------------------------------
# analyze — the end-to-end pipeline
# ---------------------------------------------------------------------------

def analyze(req: AnalysisRequest,
            providers: ProviderRegistry,
            store: Optional[TraceStore] = None,
            league_avgs: Optional[dict[str, float]] = None,
            now_iso: Optional[str] = None) -> ReasoningTrace:
    """Run the full pipeline. Specialists in parallel; synthesizer sequential after.

    Contract (spec §7): exposure published_pick|card MUST return depth L5; a pick is
    never returned below L5 — anything shallower is labeled ANALYSIS-DRAFT.
    """
    now = now_iso or utcnow_iso()
    depth, elog = compute_depth(req, _context_from_request(req), now)
    trace = ReasoningTrace(trace_id="pending", game=dict(req.game), depth=depth,
                           escalation_log=list(elog))

    def ensure(target: ReasoningDepth, trigger: str) -> None:
        while _depth_index(trace.depth) < _depth_index(target):
            nxt, entry = escalate(trace.depth, trigger, now)
            trace.depth = nxt
            trace.escalation_log.append(entry)

    # Specialists run in parallel at every depth (spec §2.4); deeper levels consume more.
    tool_log: list[dict[str, Any]] = []
    outputs = run_specialists_parallel(req, providers, tool_log=tool_log)
    trace.tool_calls.extend(tool_log)
    # The adversary gets the same data access, as a separate falsification pass (spec §7).
    outputs["adversary"] = AdversarySpecialist().run(req, providers)

    # L1 — direct lookup.
    trace.levels["L1"] = {"claims": [_ser(c) for c in build_l1(outputs)]}

    # L2 — cross-stat correlation.
    trace.levels["L2"] = {"correlations": [_ser(c) for c in build_l2_correlations(outputs, league_avgs)]}

    # L3 — causal chains (every link sourced, breaking conditions listed).
    chains: list = []
    link_conditions: dict[str, list[BreakingCondition]] = {}
    if _depth_index(trace.depth) >= _depth_index(ReasoningDepth.L3):
        chains, link_conditions = build_causal_chains(req.game, providers, league_avgs)
        trace.levels["L3"] = {"chains": [_ser(ch) for ch in chains]}
        weak = any(
            weakest_verification(*(lnk.verification for lnk in ch.links))
            in (Verification.INFERENCE, Verification.SINGLE_SOURCE)
            for ch in chains)
        if weak:
            ensure(ReasoningDepth.L4, "weak_link")

    # Checklist gate (spec §5) — blocking at L3+.
    trace.checklist = _checklist_verdicts(outputs, chains)
    checklist_result = validate_checklist(trace)
    if not checklist_result.valid:
        trace.label = "INVALID"
        trace.trace_id = make_trace_id(trace.game, trace.depth, trace.levels)
        if store:
            store.save(trace)
        return trace
    if checklist_result.escalated_to_l5:
        ensure(ReasoningDepth.L5, "conflict_2plus")

    # L4 — adversary.
    report: Optional[AdversaryReport] = None
    if _depth_index(trace.depth) >= _depth_index(ReasoningDepth.L4):
        report = adversary_review(req.legs, link_conditions, chains, outputs)
        trace.levels["L4"] = _ser(report)
        if req.legs and not all(b.thesis_broken for b in report.correlated_theses):
            # Thesis survived the adversary -> full synthesis required (spec §4).
            ensure(ReasoningDepth.L5, "thesis_survived")
        # DATA-GAP load-bearing tracks: adversary assumes worst-plausible, recorded.
        gaps = [t for t, v in trace.checklist.items() if v == ChecklistVerdict.DATA_GAP]
        if gaps:
            trace.levels["L4"]["gap_assumptions"] = {
                t: worst_plausible_assumption(t) for t in gaps}

    # L5 — synthesis across tracks, in Garrett's hierarchy order (spec §8 T6).
    if _depth_index(trace.depth) >= _depth_index(ReasoningDepth.L5):
        chain_summaries = [{"conclusion": ch.conclusion,
                            "weakest": weakest_verification(
                                *(lnk.verification for lnk in ch.links)).value}
                           for ch in chains]
        trace.levels["L5"] = synthesize(trace, report, chain_summaries)
        trace.label = "FINAL"
    else:
        trace.label = "ANALYSIS-DRAFT — not for publication"

    # Exposure contract: a pick/card is unpublishable below L5 (spec §7).
    if req.exposure in (Exposure.PUBLISHED_PICK, Exposure.CARD) and trace.depth != ReasoningDepth.L5:
        raise ContractViolation(
            f"exposure={req.exposure.value} requires L5, got {trace.depth.value}")

    trace.trace_id = make_trace_id(trace.game, trace.depth, trace.levels)

    # Resume: merge as a NEW level on the old trace; never rewrite (spec §2.6, T7).
    if req.resume_trace_id and store:
        old = store.load(req.resume_trace_id)
        if old is None:
            raise KeyError(f"no such trace: {req.resume_trace_id}")
        merged = resume_trace(store, req.resume_trace_id,
                              f"update_{now[:10]}",
                              {"depth": trace.depth.value, "levels": trace.levels,
                               "label": trace.label},
                              trigger="new_signals")
        store.save(merged)
        return merged

    if store:
        store.save(trace)
    return trace
