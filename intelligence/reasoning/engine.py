# Provenance: reasoning-depth-spec.md §7 (analyze pipeline: escalate through levels
# as triggers fire; published pick/card MUST be L5 with breaking_conditions_met
# false and adversarial report attached), §4 (escalation triggers), §2.6 (trace
# persistence/resume), §8 T7 (resume, don't restart). The L4 review is c08's
# adversarial layer (adversary.py: adversary_review, killed_legs); checklist
# validator c08's checklist.py (validate_checklist). Shared types: schemas.py.

"""Analysis engine: analyze(req, ctx) → ReasoningTrace.

Pipeline: L1 → L2 → L3 (chains on trace) → escalation check → L4 (checklist +
c08 adversary review) → escalation check → L5 (synthesis). Traces persist to
the store keyed by content hash and can be resumed by merging new levels (T7).
"""

from __future__ import annotations

import uuid

from . import adversary as _adv
from . import checklist as _chk
from .enums import ChecklistVerdict, ReasoningDepth
from .escalation import (
    EscalationSignal,
    checklist_conflict_count,
    count_weak_links,
    escalate_to,
    next_depth,
)
from .exceptions import ChecklistInvalid, ContractViolation, InvalidDepth
from .interfaces import AnalysisRequest, DataContext
from .levels import (
    build_checklist,
    run_l1,
    run_l2,
    run_l3,
    run_l5_synthesis,
)
from .schemas import ReasoningTrace
from .specialists import SpecialistRegistry
from .trace import TraceStore, log_escalation, utcnow


class AnalysisEngine:
    def __init__(self, store_dir: str = "/tmp/gse-traces",
                 registry: SpecialistRegistry | None = None):
        self.store = TraceStore(store_dir)
        self.registry = registry or SpecialistRegistry()

    # -- trace lifecycle ---------------------------------------------------

    def new_trace(self, req: AnalysisRequest) -> ReasoningTrace:
        stamp = utcnow().replace(":", "").replace("+", "Z")
        return ReasoningTrace(
            trace_id=f"{stamp}-{uuid.uuid4().hex[:8]}",
            question=req.question,
            depth=ReasoningDepth.L1,
            exposure=req.exposure,
            game={"away": req.game.away, "home": req.game.home,
                  "week": req.game.week, "season": req.game.season},
            created_at=utcnow(),
        )

    # -- main pipeline -----------------------------------------------------

    def analyze(self, req: AnalysisRequest, ctx: DataContext) -> ReasoningTrace:
        if req.requested_depth is not None and not isinstance(
            req.requested_depth, ReasoningDepth
        ):
            raise InvalidDepth(f"requested_depth must be ReasoningDepth, got {req.requested_depth!r}")

        trace = (
            self.store.load(req.resume_trace_id)
            if req.resume_trace_id
            else self.new_trace(req)
        )
        trace.exposure = req.exposure

        # A resumed trace must still honor the depth contract: a card or
        # published pick below L5 is a contract violation, never a quiet pass.
        floor = self._effective_floor(req)
        if floor is not None and floor.rank() > trace.depth.rank():
            escalate_to(trace, floor, self._floor_trigger_name(req))

        # L1 — direct lookup.
        triggers = run_l1(req, ctx, trace, self.registry)
        if trace.depth == ReasoningDepth.L1:
            log_escalation(trace, ReasoningDepth.L1, ReasoningDepth.L1, "level_complete")
            self._maybe_escalate(trace, ReasoningDepth.L1, triggers, req, ctx)
        if trace.depth == ReasoningDepth.L1 and self._effective_floor(req) is None:
            return self._finalize(trace)

        # L2 — correlation.
        self._run_at(trace, req, ctx, ReasoningDepth.L2, lambda: run_l2(req, ctx, trace, self.registry))
        if trace.depth == ReasoningDepth.L2 and self._effective_floor(req) is None:
            return self._finalize(trace)

        # L3 — causal chains on the trace.
        def _l3():
            return run_l3(req, ctx, trace, self.registry)[0]

        self._run_at(trace, req, ctx, ReasoningDepth.L3, _l3)

        # L4 — checklist + adversary (the adversarial layer is c08's).
        if trace.depth.is_at_least(ReasoningDepth.L4):
            self._run_l4(req, ctx, trace)
            # Post-L4 escalation re-check: the completed L4 can fire L4 → L5
            # triggers (three_plus_legs, thesis_survived, two_plus_conflicts).
            # Without this, a genuine L3 → L4 walk never reaches L5. Added
            # 2026-10-02 during contract convergence (the provider façade's
            # pinned T3 behavior requires it).
            if trace.depth == ReasoningDepth.L4:
                self._maybe_escalate(trace, ReasoningDepth.L4, set(), req, ctx)

        # L5 — synthesis.
        if trace.depth == ReasoningDepth.L5:
            if trace.adversary_report is None:
                self._run_l4(req, ctx, trace)  # ensure the report exists
            run_l5_synthesis(trace, trace.adversary_report)

        return self._finalize(trace)

    def _effective_floor(self, req: AnalysisRequest) -> ReasoningDepth | None:
        """The depth the trace must reach: the requested floor, raised to L5
        when the exposure contract demands it (spec §7: a published pick or
        multi-leg card MUST be L5)."""
        floor = req.requested_depth
        if req.exposure.requires_l5():
            if floor is None or ReasoningDepth.L5.rank() > floor.rank():
                return ReasoningDepth.L5
        return floor

    def _run_at(self, trace, req, ctx, depth, runner):
        if depth.value not in trace.levels and trace.depth.is_at_least(depth):
            triggers = runner()
            log_escalation(trace, depth, depth, "level_complete")
            if trace.depth.value == depth.value:
                # Genuine walk (not a jump replay): triggers may escalate further.
                self._maybe_escalate(trace, depth, triggers, req, ctx)
            # Jump replay: payload only — the depth is already higher.

    def _floor_trigger_name(self, req: AnalysisRequest) -> str:
        if (
            req.exposure.requires_l5()
            and (req.requested_depth is None
                 or req.requested_depth.rank() < ReasoningDepth.L5.rank())
        ):
            return "exposure_requires_l5"
        return "requested_depth_floor"

    def _maybe_escalate(self, trace, depth, triggers, req, ctx):
        floor = self._effective_floor(req)
        if floor is not None and ReasoningDepth.ordered().index(floor) > ReasoningDepth.ordered().index(depth):
            escalate_to(trace, floor, self._floor_trigger_name(req))
            return
        signal = EscalationSignal(
            depth=depth,
            triggers=set(triggers),
            market_edge_pct=req.market_edge_pct,
            checklist_conflicts=(
                checklist_conflict_count(trace.checklist)
                if trace.checklist else 0
            ),
            weak_links=count_weak_links(trace),
            legs=len(req.legs),
        )
        # Request-derived triggers (spec §4 escalation summary: "bet requested,
        # causal claim made, or signal conflict" escalates L2 → L3; a bet
        # request implies a matchup for L1 → L2). Added 2026-10-02 during
        # contract convergence — the provider façade's bet requests must drive
        # escalation the same way the old integration layer did.
        if req.legs:
            signal.triggers.add("bet_requested")
            if depth == ReasoningDepth.L1:
                signal.triggers.add("matchup")
        # Exposure-driven triggers (spec §4 / §7 contract).
        if depth == ReasoningDepth.L3:
            if req.exposure.requires_l5():
                signal.triggers.add("real_exposure")
            if req.market_edge_pct and abs(req.market_edge_pct) > 5.0:
                signal.triggers.add("market_contradiction")
        if depth == ReasoningDepth.L4:
            if req.legs and len(req.legs) >= 3:
                signal.triggers.add("three_plus_legs")
            if req.exposure.requires_l5():
                signal.triggers.add("thesis_survived")
        target, trigger = next_depth(signal)
        if target is not None:
            escalate_to(trace, target, trigger)

    def _run_l4(self, req, ctx, trace):
        # No-blind-spots checklist (T2: gaps stay DATA-GAP).
        built = build_checklist(ctx, ReasoningDepth.L4)
        trace.checklist = {t: v for t, v in built.items()}
        gate = _chk.validate_checklist(trace)
        if not gate.valid:
            raise ChecklistInvalid(
                f"checklist gate rejected trace at L4: {gate.invalid_reason}",
                invalid_tracks=[
                    t for t in gate.verdicts
                    if gate.verdicts[t] == ChecklistVerdict.UNCHECKED
                ],
            )
        trace.levels[ReasoningDepth.L4.value] = {
            "checklist": {t: v.value for t, v in built.items()}
        }
        # The adversarial layer reads legs + chains + observed_values from the
        # trace (c08 adversary.py: adversary_review(trace)).
        trace.legs = list(req.legs)
        trace.observed_values = dict(ctx.observations)
        trace.track_evidence = dict(ctx.track_evidence)
        report = _adv.adversary_review(trace)
        trace.adversary_report = report
        trace.levels[ReasoningDepth.L4.value]["adversary"] = {
            "breaking_conditions_met": report.breaking_conditions_met,
            "correlated_theses": len(report.correlated_theses),
            "killed_thesis_ids": report.killed_thesis_ids,
        }
        log_escalation(trace, trace.depth, trace.depth, "adversary_review_complete")

    def _finalize(self, trace: ReasoningTrace) -> ReasoningTrace:
        # Defensive contract check (spec §7): a published pick or multi-leg
        # card below L5 is a contract violation — surfaced loudly, never silent.
        if not _chk.depth_contract_ok(trace.depth, trace.exposure):
            raise ContractViolation(
                f"depth contract violated: {trace.exposure.value} at {trace.depth.value}, "
                "published picks and cards MUST be L5"
            )
        trace.content_hash = self.store.save(trace)
        return trace


def analyze(req: AnalysisRequest, ctx: DataContext,
            store_dir: str = "/tmp/gse-traces") -> ReasoningTrace:
    return AnalysisEngine(store_dir=store_dir).analyze(req, ctx)
