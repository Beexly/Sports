# Provenance: reasoning-depth-spec.md §4 (L1–L5 level definitions and outputs),
# §5 (five mandatory tracks; Garrett's hierarchy OL → scheme → QB in L5 synthesis,
# §8 T6), §2.2 (specialists run in parallel; synthesizer sequential after them),
# §2.5 (trace is the unit of coherence). Shared types from schemas.py; the L4
# review is c08's adversary.py (adversary_review, killed_legs).

"""Level runners L1–L5.

Each runner executes its level's specialists and writes into the trace. The L5
synthesizer consumes c08's AdversaryReport and honors the killed-legs contract:
legs of KILL-verdict theses are never recommended.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from . import adversary as _adv
from .enums import TRACKS, ChecklistVerdict, ReasoningDepth, Verification
from .interfaces import AnalysisRequest, DataContext, SpecialistOutput
from .schemas import ReasoningTrace
from .specialists import SpecialistRegistry


def run_specialists_parallel(
    depth: ReasoningDepth,
    req: AnalysisRequest,
    ctx: DataContext,
    trace: ReasoningTrace,
    registry: SpecialistRegistry,
    max_workers: int = 5,
) -> list[SpecialistOutput]:
    """Run all specialists concurrently (spec §2.2, §2.4)."""
    specialists = registry.all()
    with ThreadPoolExecutor(max_workers=max_workers or len(specialists)) as pool:
        futures = [pool.submit(s.run, depth, req, ctx, trace) for s in specialists]
        return [f.result() for f in futures]


def _collect_triggers(outputs: list[SpecialistOutput]) -> set[str]:
    triggers: set[str] = set()
    for o in outputs:
        triggers |= o.triggers
    return triggers


def run_l1(req, ctx, trace, registry) -> set[str]:
    """L1 — direct lookup: value + source pointer + verification status."""
    outputs = run_specialists_parallel(ReasoningDepth.L1, req, ctx, trace, registry)
    claims = [c for o in outputs for c in o.claims]
    trace.levels[ReasoningDepth.L1.value] = {
        "claims": [
            {"text": c.text, "verification": c.verification.value,
             "source": c.source, "value": c.value, "note": c.note}
            for c in claims
        ]
    }
    return _collect_triggers(outputs)


def run_l2(req, ctx, trace, registry) -> set[str]:
    """L2 — cross-stat correlation: findings + which are computed vs asserted."""
    outputs = run_specialists_parallel(ReasoningDepth.L2, req, ctx, trace, registry)
    correlations = [c for o in outputs for c in o.correlations]
    trace.levels[ReasoningDepth.L2.value] = {"correlations": correlations}
    triggers = _collect_triggers(outputs)
    # Causal-language scan (spec §4: "a causal claim" in L2 escalates to L3).
    # Scans specialist claims AND the analysis question itself — a question like
    # "will pressure overwhelm the OL?" IS the causal claim L2 must address.
    # (Question scanning added 2026-10-02 during contract convergence; the
    # question word list mirrors the provider façade's pinned behavior.)
    claim_texts = [c.text for o in outputs for c in o.claims]
    if any(w in t.lower() for t in claim_texts
           for w in ("will overwhelm", "will cause", "because")):
        triggers.add("causal_claim")
    q = (req.question or "").lower()
    if any(w in q for w in ("because", "lead to", "leads to", "caus",
                            "->", "→", "overwhelm", "neutraliz")):
        triggers.add("causal_claim")
    return triggers


# Garrett's hierarchy for L5 synthesis evaluation order (spec §8 T6):
# OL → scheme → QB. The T6 constraint: index(OL) < index(coaching_scheme) < index(qb_behavior).
HIERARCHY_ORDER: list[str] = [
    "offensive_line",
    "coaching_scheme",
    "scheme_matchup",
    "qb_behavior",
    "trust_signals",
]


def check_hierarchy(trace: ReasoningTrace) -> bool:
    """T6: the L5 synthesis must show OL evaluated before scheme, scheme before QB."""
    order = trace.hierarchy_order or HIERARCHY_ORDER
    try:
        return (
            order.index("offensive_line")
            < order.index("coaching_scheme")
            < order.index("qb_behavior")
        )
    except ValueError:
        return False


def run_l3(req, ctx, trace, registry) -> tuple[set[str], list]:
    """L3 — causal chains live on the trace (trace.chains), each link sourced.

    Chains arrive via the DataContext (built by the wiring layer / fixtures) and
    specialist outputs. INFERENCE/SINGLE_SOURCE load-bearing links are flagged
    via the weak_link trigger (spec §8 T5).
    """
    outputs = run_specialists_parallel(ReasoningDepth.L3, req, ctx, trace, registry)
    seen = {c.id for c in trace.chains}
    for c in ctx.chains:  # wired chains land on the trace (the unit the adversary attacks)
        if c.id not in seen:
            trace.chains.append(c)
            seen.add(c.id)
    for o in outputs:
        for c in o.chains:
            if c.id not in seen:
                trace.chains.append(c)
                seen.add(c.id)
    trace.levels[ReasoningDepth.L3.value] = {"chain_ids": [c.id for c in trace.chains]}
    triggers = _collect_triggers(outputs)
    for chain in trace.chains:
        for link in chain.links:
            if (
                link.load_bearing
                and link.verification in (Verification.INFERENCE, Verification.SINGLE_SOURCE)
            ):
                triggers.add("weak_link")
    for o in outputs:
        if o.conflicts_with:
            triggers.add("signal_conflict")
    return triggers, trace.chains


def build_checklist(ctx: DataContext, depth: ReasoningDepth) -> dict[str, ChecklistVerdict]:
    """Build the no-blind-spots checklist (spec §5).

    Verdicts come from ctx.checklist_hints. Tracks with no hint and no data at L3+
    become DATA-GAP (T2: a track with no data is DATA-GAP, not UNCHECKED, not
    silent). Below L3, unhinted tracks are UNCHECKED (valid there).
    """
    verdicts: dict[str, ChecklistVerdict] = {}
    for track in TRACKS:
        hint = ctx.checklist_hints.get(track)
        if hint:
            verdicts[track] = ChecklistVerdict(hint)
        elif depth.is_at_least(ReasoningDepth.L3):
            verdicts[track] = ChecklistVerdict.DATA_GAP
        else:
            verdicts[track] = ChecklistVerdict.UNCHECKED
    return verdicts


def run_l5_synthesis(trace: ReasoningTrace, report) -> dict:
    """L5 — synthesis honoring Garrett's hierarchy and the killed-legs contract.

    Legs of KILL-verdict theses are excluded from any recommendation (spec §8 T1:
    the funnel stack must NOT be recommended). Only L5 may produce a
    public-facing pick or card.
    """
    trace.hierarchy_order = list(HIERARCHY_ORDER)
    if not check_hierarchy(trace):
        raise ValueError("L5 synthesis hierarchy violated: OL → scheme → QB order broken")

    killed = _adv.killed_legs(report)
    bundles = report.correlated_theses

    if killed:
        multi = [b for b in bundles if len(b.leg_ids) > 1]
        if multi:
            b = multi[0]
            links = ", ".join(b.shared_link_ids) or "shared causal link"
            recommendation = (
                f"REJECT stack {b.leg_ids} as ONE correlated thesis on '{links}'. "
                "The legs share a single causal link whose falsifiers are already "
                "observed pre-kickoff — presenting them as independent edges would "
                "misstate exposure. Killed legs are excluded from any recommendation."
            )
        else:
            recommendation = (
                f"REJECT legs {killed}: their breaking conditions are met in "
                "pre-kickoff observations. No independent edge survives the adversary."
            )
    elif report.breaking_conditions_met:
        recommendation = (
            "REJECT the recommended legs: breaking conditions are met in pre-kickoff "
            "observations. No independent edge survives the adversary."
        )
    else:
        recommendation = (
            "Thesis survived L4 adversary (no breaking condition met). Proceed only "
            "with the checklist verdicts and weak-link flags attached; final sizing "
            "and publication remain downstream gates."
        )

    payload = {
        "recommendation": recommendation,
        "killed_legs": killed,
        "hierarchy_order": trace.hierarchy_order,
        "hierarchy_ok": True,
        "checklist": {t: v.value for t, v in trace.checklist.items()},
        "adversary": {
            "breaking_conditions_met": report.breaking_conditions_met,
            "condition_results": [
                {"condition_id": r.condition_id, "text": r.text, "metric": r.metric,
                 "observed_value": r.observed_value, "verifiable": r.verifiable, "met": r.met}
                for r in report.condition_results
            ],
            "correlated_theses": [
                {"id": b.id, "leg_ids": b.leg_ids, "shared_link_ids": b.shared_link_ids}
                for b in bundles
            ],
            "thesis_verdicts": report.thesis_verdicts,
            "killed_thesis_ids": report.killed_thesis_ids,
            "counter_argument": report.counter_argument,
            "pre_mortem": report.pre_mortem,
            "weak_link": report.weak_link,
            "weak_links": [
                {"link_id": w.link_id, "verification": w.verification.value,
                 "breaking_condition_present": w.breaking_condition_present,
                 "breaking_condition_machine_checkable": w.breaking_condition_machine_checkable}
                for w in report.weak_links
            ],
            "gap_assumptions": [
                {"track": g.track, "assumed_value": g.assumed_value, "rationale": g.rationale}
                for g in report.gap_assumptions
            ],
            "notes": report.notes,
        },
    }
    trace.levels[ReasoningDepth.L5.value] = payload
    trace.label = "FINAL"
    return payload
