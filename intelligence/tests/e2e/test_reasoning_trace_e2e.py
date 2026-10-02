# Provenance: reasoning-depth-spec.md §8 (T1–T7 end-to-end acceptance tests),
# §4 (L1–L5 + escalation), §5 (checklist gate), §7 (adversaryReview contract:
# a published pick / multi-leg card MUST be L5).
# Tests the CANONICAL public surface of the reasoning package (reasoning/schemas.py
# contract): adversary_review, correlated_theses, killed_legs, validate_checklist,
# depth_contract_ok, the escalation state machine (next_depth/escalate_to),
# count_weak_links, check_hierarchy/HIERARCHY_ORDER, TraceStore save/load/resume.
# These are the seams the sibling L1–L5 builder owns; this suite is the c10
# final quality gate over them. The sibling's own unit tests (tests/test_adversary.py,
# tests/test_checklist.py) cover the same functions at unit depth — this file
# covers the spec §8 scenarios end to end.

"""End-to-end: reasoning-depth spec §8 acceptance tests T1–T7.

Each test builds a full ReasoningTrace (schemas.py canonical contract) and runs
it through the real adversarial pipeline, asserting the spec's exact outcomes.
"""

from __future__ import annotations

import pytest

from reasoning import (
    TRACKS,
    VERIFICATION_PRECEDENCE,
    BetLeg,
    BreakingCondition,
    CausalChain,
    CausalLink,
    ChecklistVerdict,
    EscalationSignal,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    TraceStore,
    Verification,
    adversary_review,
    check_hierarchy,
    correlated_theses,
    count_weak_links,
    depth_contract_ok,
    escalate_to,
    killed_legs,
    next_depth,
    validate_checklist,
)
from reasoning.levels import HIERARCHY_ORDER


# ---------------------------------------------------------------------------
# Shared builders
# ---------------------------------------------------------------------------

LEG_IDS = ["leg_mixon_anytime_td", "leg_pit_ml", "leg_under_41_5", "leg_pit_minus2_5"]


def _funnel_bc() -> BreakingCondition:
    # The Steelers-Browns W4 funnel: "PIT pressure lands" breaks if
    # Flacco gets the ball out fast (TTT < 2.3s) or lives in quick game.
    return BreakingCondition(
        id="bc_funnel",
        text="TTT < 2.3s breaks the pressure thesis",
        metric="ttt_seconds",
        op="<",
        threshold=2.3,
    )


def _funnel_link(**overrides) -> CausalLink:
    kw = dict(
        id="pit_pressure_lands",
        cause="PIT pass rush vs CLE interior OL down 2 starters",
        mechanism="pressure forces Flacco off his spot; he cannot set and drive",
        outcome="all four funnel legs require the pressure thesis to hold",
        verification=Verification.INFERENCE,  # the load-bearing link is INFERENCE
        breaking_conditions=[_funnel_bc()],
        load_bearing=True,
    )
    kw.update(overrides)
    return CausalLink(**kw)


def _funnel_legs() -> list[BetLeg]:
    return [
        BetLeg(id=LEG_IDS[0], description="Mixon anytime TD", causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id=LEG_IDS[1], description="PIT moneyline", causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id=LEG_IDS[2], description="Under 41.5", causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id=LEG_IDS[3], description="PIT -2.5", causal_link_ids=["pit_pressure_lands"], exposure=1.0),
    ]


def _clear_checklist(**overrides) -> dict:
    base = {t: ChecklistVerdict.CLEAR for t in TRACKS}
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# T1 — the pressure-funnel stack must be REJECTED at L5, never recommended.
# ---------------------------------------------------------------------------

class TestT1PressureFunnelRejected:
    """Spec §8 T1: 4-leg correlated stack on one INFERENCE link. When the
    breaking condition is met pre-kickoff (TTT 2.1s < 2.3s), the L4 adversary
    KILLS the thesis and the killed legs must be excluded from any L5
    recommendation. A card shallower than L5 is a contract violation."""

    def _trace(self) -> ReasoningTrace:
        return ReasoningTrace(
            trace_id="t1-funnel",
            depth=ReasoningDepth.L5,
            exposure=Exposure.CARD,
            legs=_funnel_legs(),
            chains=[CausalChain(id="funnel", links=[_funnel_link()])],
            observed_values={"ttt_seconds": 2.1, "quick_game_rate": 0.639, "air_yards": 6.12},
            checklist=_clear_checklist(),
        )

    def test_breaking_condition_met_kills_thesis(self):
        report = adversary_review(self._trace())
        assert report.breaking_conditions_met is True
        assert len(report.correlated_theses) == 1
        bundle = report.correlated_theses[0]
        assert bundle.leg_ids == sorted(LEG_IDS)
        assert report.thesis_verdicts[bundle.id] == "KILL"

    def test_all_four_funnel_legs_are_killed(self):
        report = adversary_review(self._trace())
        assert sorted(killed_legs(report)) == sorted(LEG_IDS)

    def test_killed_bundle_is_one_correlated_thesis(self):
        # Four bets, one thesis — never presented as four independent edges.
        bundles = correlated_theses(self._trace().legs, self._trace())
        assert len(bundles) == 1
        assert bundles[0].shared_link_ids == ["pit_pressure_lands"]
        assert bundles[0].combined_exposure == pytest.approx(4.0)

    def test_card_below_l5_is_contract_violation(self):
        assert depth_contract_ok(ReasoningDepth.L5, Exposure.CARD) is True
        assert depth_contract_ok(ReasoningDepth.L4, Exposure.CARD) is False
        assert depth_contract_ok(ReasoningDepth.L4, Exposure.PUBLISHED_PICK) is False


# ---------------------------------------------------------------------------
# T2 — DATA-GAP, not UNCHECKED; adversary assumes worst-plausible.
# ---------------------------------------------------------------------------

class TestT2ChecklistDataGap:
    """Spec §8 T2: a track with no data is DATA-GAP (recorded), never silently
    UNCHECKED. At L3+, UNCHECKED is INVALID. The adversary assumes the
    worst-plausible value for the gap and records the assumption."""

    def _trace(self, checklist: dict) -> ReasoningTrace:
        return ReasoningTrace(
            trace_id="t2-gap", depth=ReasoningDepth.L3, exposure=Exposure.PUBLISHED_PICK,
            checklist=checklist,
        )

    def test_unchecked_track_at_l3_is_invalid(self):
        checklist = _clear_checklist()
        del checklist["trust_signals"]  # never checked
        result = validate_checklist(self._trace(checklist))
        assert result.valid is False
        assert "trust_signals" in result.invalid_reason

    def test_data_gap_is_checked_not_invalid(self):
        result = validate_checklist(self._trace(_clear_checklist(trust_signals=ChecklistVerdict.DATA_GAP)))
        assert result.valid is True
        assert "trust_signals" in result.data_gaps

    def test_adversary_assumes_worst_plausible_for_gap(self):
        trace = self._trace(_clear_checklist(trust_signals=ChecklistVerdict.DATA_GAP))
        report = adversary_review(trace)
        gaps = [g for g in report.gap_assumptions if g.track == "trust_signals"]
        assert len(gaps) == 1
        assert "worst-plausible" in gaps[0].assumed_value


# ---------------------------------------------------------------------------
# T3 — escalation triggers fire through the real state machine.
# ---------------------------------------------------------------------------

class TestT3EscalationTriggers:
    """Spec §8 T3: triggers fire at each boundary — a matchup reaches L2, a
    bet request reaches L3, real exposure reaches L4, 3+ legs reach L5.
    De-escalation is refused; skips are logged, never silent."""

    @pytest.mark.parametrize(
        "depth,triggers,want_depth,want_trigger",
        [
            (ReasoningDepth.L1, {"matchup"}, ReasoningDepth.L2, "matchup"),
            (ReasoningDepth.L1, {"injury_flag"}, ReasoningDepth.L2, "injury_flag"),
            (ReasoningDepth.L2, {"bet_requested"}, ReasoningDepth.L3, "bet_requested"),
            (ReasoningDepth.L2, {"causal_claim"}, ReasoningDepth.L3, "causal_claim"),
            (ReasoningDepth.L3, {"real_exposure"}, ReasoningDepth.L4, "real_exposure"),
            (ReasoningDepth.L4, {"three_plus_legs"}, ReasoningDepth.L5, "three_plus_legs"),
            (ReasoningDepth.L4, {"thesis_survived"}, ReasoningDepth.L5, "thesis_survived"),
        ],
    )
    def test_trigger_fires(self, depth, triggers, want_depth, want_trigger):
        got_depth, got_trigger = next_depth(EscalationSignal(depth=depth, triggers=set(triggers)))
        assert got_depth == want_depth
        assert got_trigger == want_trigger

    def test_full_walk_card(self):
        # A 4-leg card walks L1→L2→L3→L4→L5 on the real triggers.
        plan = [
            (ReasoningDepth.L1, {"matchup"}, ReasoningDepth.L2),
            (ReasoningDepth.L2, {"bet_requested"}, ReasoningDepth.L3),
            (ReasoningDepth.L3, {"real_exposure"}, ReasoningDepth.L4),
            (ReasoningDepth.L4, {"three_plus_legs"}, ReasoningDepth.L5),
        ]
        trace = ReasoningTrace(trace_id="t3-walk", depth=ReasoningDepth.L1)
        for depth, triggers, want in plan:
            got, trig = next_depth(EscalationSignal(depth=trace.depth, triggers=set(triggers)))
            assert got == want, f"at {depth}: {trig}"
            escalate_to(trace, got, trig)
        assert trace.depth == ReasoningDepth.L5
        assert len(trace.escalation_log) == 4
        assert all(e.skipped is False for e in trace.escalation_log)

    def test_two_plus_conflicts_force_l5(self):
        got, trig = next_depth(
            EscalationSignal(depth=ReasoningDepth.L1, triggers=set(), checklist_conflicts=2)
        )
        assert got == ReasoningDepth.L5
        assert trig == "two_plus_conflicts"

    def test_deescalation_refused(self):
        trace = ReasoningTrace(trace_id="t3-de", depth=ReasoningDepth.L4)
        with pytest.raises(ValueError, match="de-escalation"):
            escalate_to(trace, ReasoningDepth.L2, "never")

    def test_skip_is_logged_not_silent(self):
        trace = ReasoningTrace(trace_id="t3-skip", depth=ReasoningDepth.L1)
        escalate_to(trace, ReasoningDepth.L3, "requested_depth_floor")
        assert trace.depth == ReasoningDepth.L3
        skipped = [e for e in trace.escalation_log if e.skipped]
        assert len(skipped) == 1
        assert skipped[0].from_depth == ReasoningDepth.L1
        assert skipped[0].to_depth == ReasoningDepth.L2


# ---------------------------------------------------------------------------
# T4 — correlated-thesis detection: one shared link = one thesis.
# ---------------------------------------------------------------------------

class TestT4CorrelatedTheses:
    """Spec §8 T4: legs sharing a causal link are ONE thesis with combined
    exposure. Legs with genuinely distinct links stay separate."""

    def test_shared_link_forms_one_bundle(self):
        legs = _funnel_legs()
        bundles = correlated_theses(legs, ReasoningTrace(trace_id="t4", depth=ReasoningDepth.L4, legs=legs))
        assert len(bundles) == 1
        assert bundles[0].shared_link_ids == ["pit_pressure_lands"]
        assert bundles[0].combined_exposure == pytest.approx(4.0)

    def test_independent_leg_stays_separate(self):
        legs = _funnel_legs() + [
            BetLeg(id="leg_independent", description="coin-flip prop",
                   causal_link_ids=["unrelated_weather_link"], exposure=0.5)
        ]
        bundles = correlated_theses(legs, ReasoningTrace(trace_id="t4b", depth=ReasoningDepth.L4, legs=legs))
        assert len(bundles) == 2
        funnel = next(b for b in bundles if len(b.leg_ids) == 4)
        assert funnel.combined_exposure == pytest.approx(4.0)


# ---------------------------------------------------------------------------
# T5 — weak load-bearing links are flagged, with machine-checkable bc.
# ---------------------------------------------------------------------------

class TestT5WeakLinkFlagged:
    """Spec §8 T5: a load-bearing link whose verification is INFERENCE (or
    SINGLE_SOURCE) is weak_link: true — EVEN WHEN its breaking condition is
    present. The bc must be present and machine-checkable; presence does not
    un-flag the weakness."""

    def _trace(self) -> ReasoningTrace:
        # bc NOT met here (TTT 2.8s) — this test is about the flag, not the kill.
        return ReasoningTrace(
            trace_id="t5-weak",
            depth=ReasoningDepth.L4,
            legs=_funnel_legs(),
            chains=[CausalChain(id="funnel", links=[_funnel_link()])],
            observed_values={"ttt_seconds": 2.8, "quick_game_rate": 0.639},
            checklist=_clear_checklist(),
        )

    def test_weak_link_flagged_despite_breaking_condition(self):
        report = adversary_review(self._trace())
        assert report.weak_link is True
        weak = [w for w in report.weak_links if w.link_id == "pit_pressure_lands"]
        assert len(weak) == 1
        assert weak[0].verification == Verification.INFERENCE
        assert weak[0].breaking_condition_present is True
        assert weak[0].breaking_condition_machine_checkable is True

    def test_count_weak_links_matches(self):
        assert count_weak_links(self._trace()) == 1

    def test_verification_precedence_is_spec_order(self):
        # Spec §5: computed > corpus > single-source > inference.
        assert VERIFICATION_PRECEDENCE[Verification.COMPUTED] > VERIFICATION_PRECEDENCE[Verification.CORPUS]
        assert VERIFICATION_PRECEDENCE[Verification.CORPUS] > VERIFICATION_PRECEDENCE[Verification.SINGLE_SOURCE]
        assert VERIFICATION_PRECEDENCE[Verification.SINGLE_SOURCE] > VERIFICATION_PRECEDENCE[Verification.INFERENCE]

    def test_single_source_link_also_weak(self):
        link = _funnel_link(verification=Verification.SINGLE_SOURCE)
        trace = self._trace()
        trace.chains = [CausalChain(id="funnel", links=[link])]
        assert count_weak_links(trace) == 1


# ---------------------------------------------------------------------------
# T6 — L5 synthesis respects the evaluation hierarchy.
# ---------------------------------------------------------------------------

class TestT6Hierarchy:
    """Spec §8 T6: the L5 synthesis must show offensive line evaluated before
    scheme, scheme before QB behavior."""

    def test_correct_order_passes(self):
        trace = ReasoningTrace(
            trace_id="t6", depth=ReasoningDepth.L5,
            hierarchy_order=list(HIERARCHY_ORDER),
        )
        assert check_hierarchy(trace) is True

    def test_wrong_order_fails(self):
        trace = ReasoningTrace(
            trace_id="t6b", depth=ReasoningDepth.L5,
            hierarchy_order=["qb_behavior", "coaching_scheme", "offensive_line",
                             "trust_signals", "scheme_matchup"],
        )
        assert check_hierarchy(trace) is False

    def test_hierarchy_order_starts_with_offensive_line(self):
        assert HIERARCHY_ORDER.index("offensive_line") < HIERARCHY_ORDER.index("coaching_scheme")
        assert HIERARCHY_ORDER.index("coaching_scheme") < HIERARCHY_ORDER.index("qb_behavior")


# ---------------------------------------------------------------------------
# T7 — resume, don't restart: original levels immutable, news as new level.
# ---------------------------------------------------------------------------

class TestT7Resume:
    """Spec §8 T7: Thursday's injury news resumes Wednesday's trace. The
    original levels are never rewritten; the new information lands as a new
    level entry and the escalation log records the merge."""

    def test_resume_merges_without_rewriting(self, tmp_path):
        store = TraceStore(str(tmp_path / "traces"))
        wednesday_levels = {
            "L1": {"claims": ["PIT -2.5 vs CLE, W4"]},
            "L2": {"claims": ["Flacco TTT 2.1s under pressure"]},
            "L3": {"chains": ["funnel"]},
        }
        wednesday = ReasoningTrace(
            trace_id="wed", depth=ReasoningDepth.L3,
            question="PIT vs CLE W4 card",
            levels=dict(wednesday_levels),
        )
        h = store.save(wednesday)

        news_payload = {
            "new_signals": ["injury: CLE LT DNP Thursday"],
            "claims": ["CLE LT out — pressure thesis strengthens"],
        }
        thursday = store.resume(h, "L4_thursday_update", news_payload, note="thursday injury news")

        # Original levels byte-identical — Wednesday's reasoning is immutable.
        for level in ("L1", "L2", "L3"):
            assert thursday.levels[level] == wednesday_levels[level]
        # The news is a NEW level entry, not an overwrite.
        assert thursday.levels["L4_thursday_update"] == news_payload
        # The merge is recorded in the escalation log.
        assert any("resume_merge" in e.trigger for e in thursday.escalation_log)
        assert thursday.trace_id == "wed::resumed"

    def test_resumed_trace_round_trips(self, tmp_path):
        store = TraceStore(str(tmp_path / "traces"))
        original = ReasoningTrace(
            trace_id="t7", depth=ReasoningDepth.L3,
            levels={"L1": {"claims": ["x"]}},
            checklist={"qb_behavior": ChecklistVerdict.CLEAR},
        )
        h = store.save(original)
        resumed = store.resume(h, "L2_update", {"claims": ["y"]})
        h2 = store.save(resumed)
        loaded = store.load(h2)
        assert loaded.levels["L2_update"] == {"claims": ["y"]}
        assert loaded.levels["L1"] == {"claims": ["x"]}
        assert loaded.checklist["qb_behavior"] == ChecklistVerdict.CLEAR
