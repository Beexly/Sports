# Provenance: reasoning-depth-spec.md §8 T1 (the funnel must die at L4 —
# MANDATORY), T4 (correlated-thesis detection), T5 (verification propagation).
# Tests assert on trace objects, not prose, per the spec.

"""Tests for the L4 adversarial layer (reasoning/adversary.py)."""

import pytest

from reasoning.adversary import (
    adversary_review,
    correlated_theses,
    killed_legs,
    overconfidence_score,
    recommend_fusion,
)
from reasoning.enums import ChecklistVerdict, Exposure, ReasoningDepth, Verification
from reasoning.schemas import (
    BetLeg,
    BreakingCondition,
    CausalChain,
    CausalLink,
    ReasoningTrace,
)


# ---------------------------------------------------------------------------
# Fixture: Steelers @ Browns, Week 4 2026 — the exact pre-kickoff data from
# spec §§1/3/6.1. The pressure-funnel stack (4 legs) rests on ONE causal link:
# pit_pressure_lands. Its breaking conditions were BOTH true pre-kickoff
# (Monken quick-game 0.639 > 0.60, TTT < 2.3s), so the funnel must die.
# ---------------------------------------------------------------------------

def _funnel_link() -> CausalLink:
    return CausalLink(
        id="pit_pressure_lands",
        cause="CLE missing 2 interior OL starters",
        mechanism="PIT pass rush overwhelms backup interior OL",
        outcome="Watson pressured: sacks land, yards stay short of 187.5",
        verification=Verification.INFERENCE,
        breaking_conditions=[
            BreakingCondition(
                id="bc_ttt",
                text="TTT < 2.3s breaks the pressure thesis (ball out before rush lands)",
                metric="ttt_seconds",
                op="<",
                threshold=2.3,
            ),
            BreakingCondition(
                id="bc_quickgame",
                text="Quick-game rate > 0.60 neutralizes the pass rush",
                metric="quick_game_rate",
                op=">",
                threshold=0.60,
            ),
        ],
    )


def _funnel_trace() -> ReasoningTrace:
    link = _funnel_link()
    legs = [
        BetLeg(id="watson_under_187.5", description="Watson under 187.5 pass yards",
               causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id="under_38.5", description="Game under 38.5",
               causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id="watt_sacks_o0.5", description="T.J. Watt over 0.5 sacks",
               causal_link_ids=["pit_pressure_lands"], exposure=1.0),
        BetLeg(id="both_teams_2fg", description="Both teams 2+ field goals",
               causal_link_ids=["pit_pressure_lands"], exposure=1.0),
    ]
    return ReasoningTrace(
        trace_id="trace_20261002_pit_cle_w04",
        depth=ReasoningDepth.L4,
        game={"away": "PIT", "home": "CLE", "week": 4, "season": 2026},
        exposure=Exposure.CARD,
        legs=legs,
        chains=[CausalChain(id="chain_funnel", links=[link])],
        checklist={
            "qb_behavior": ChecklistVerdict.CLEAR,
            "coaching_scheme": ChecklistVerdict.CLEAR,
            "offensive_line": ChecklistVerdict.CLEAR,
            "trust_signals": ChecklistVerdict.CLEAR,
            "scheme_matchup": ChecklistVerdict.CONFLICT,
        },
        observed_values={
            "ttt_seconds": 2.1,        # Weeks 1–3 data: ball out fast
            "quick_game_rate": 0.639,  # Monken 2026 quick-game proxy
            "air_yards": 6.12,
        },
        track_evidence={
            "scheme_matchup": [
                ("Monken quick-game 0.639 vs league avg 0.508", Verification.COMPUTED),
                ("Air yards 8.33 → 6.12 under Monken", Verification.COMPUTED),
            ],
        },
    )


# --- T1: the funnel must die at L4 -----------------------------------------

class TestT1FunnelDies:
    def test_breaking_conditions_met(self):
        report = adversary_review(_funnel_trace())
        assert report.breaking_conditions_met is True

    def test_both_falsifiers_recorded_true(self):
        report = adversary_review(_funnel_trace())
        by_id = {r.condition_id: r for r in report.condition_results}
        assert by_id["bc_ttt"].met is True
        assert by_id["bc_ttt"].observed_value == 2.1
        assert by_id["bc_quickgame"].met is True
        assert by_id["bc_quickgame"].observed_value == 0.639

    def test_four_legs_bundled_as_one_thesis(self):
        report = adversary_review(_funnel_trace())
        assert len(report.correlated_theses) == 1
        bundle = report.correlated_theses[0]
        assert sorted(bundle.leg_ids) == sorted(
            ["watson_under_187.5", "under_38.5", "watt_sacks_o0.5", "both_teams_2fg"]
        )
        assert bundle.shared_link_ids == ["pit_pressure_lands"]
        assert bundle.combined_exposure == pytest.approx(4.0)

    def test_thesis_killed(self):
        report = adversary_review(_funnel_trace())
        bundle_id = report.correlated_theses[0].id
        assert report.thesis_verdicts[bundle_id] == "KILL"
        assert bundle_id in report.killed_thesis_ids

    def test_killed_legs_cover_the_stack(self):
        report = adversary_review(_funnel_trace())
        assert sorted(killed_legs(report)) == sorted(
            ["watson_under_187.5", "under_38.5", "watt_sacks_o0.5", "both_teams_2fg"]
        )

    def test_steelman_names_the_falsifiers(self):
        report = adversary_review(_funnel_trace())
        assert "0.639" in report.counter_argument
        assert "2.1" in report.counter_argument

    def test_pre_mortem_written(self):
        report = adversary_review(_funnel_trace())
        assert "0-4" in report.pre_mortem
        assert "pit_pressure_lands" in report.pre_mortem

    def test_inference_load_bearing_link_flagged_weak(self):
        # The funnel's load-bearing link is INFERENCE → weak_link (T5 overlap).
        report = adversary_review(_funnel_trace())
        assert report.weak_link is True
        assert any(w.link_id == "pit_pressure_lands" for w in report.weak_links)


# --- T4: correlated-thesis detection ----------------------------------------

class TestCorrelatedTheses:
    def test_independent_legs_stay_separate(self):
        legs = [
            BetLeg(id="a", description="a", causal_link_ids=["link_1"], exposure=1.0),
            BetLeg(id="b", description="b", causal_link_ids=["link_2"], exposure=2.0),
        ]
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L4, legs=legs)
        bundles = correlated_theses(legs, trace)
        assert len(bundles) == 2
        assert bundles[0].combined_exposure == pytest.approx(1.0)

    def test_transitive_sharing_bundles(self):
        # a~b share link_1, b~c share link_2 → all one thesis.
        legs = [
            BetLeg(id="a", description="a", causal_link_ids=["link_1"]),
            BetLeg(id="b", description="b", causal_link_ids=["link_1", "link_2"]),
            BetLeg(id="c", description="c", causal_link_ids=["link_2"]),
        ]
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L4, legs=legs)
        bundles = correlated_theses(legs, trace)
        assert len(bundles) == 1
        assert sorted(bundles[0].leg_ids) == ["a", "b", "c"]

    def test_undeclared_links_become_singletons_with_note(self):
        legs = [BetLeg(id="a", description="a", causal_link_ids=[])]
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L4, legs=legs)
        report = adversary_review(trace)
        assert len(report.correlated_theses) == 1
        assert any("no causal links" in n for n in report.notes)


# --- T5: verification propagation --------------------------------------------

class TestWeakLinks:
    def test_single_source_load_bearing_flagged(self):
        link = CausalLink(
            id="l1", cause="c", mechanism="m", outcome="o",
            verification=Verification.SINGLE_SOURCE,
            breaking_conditions=[
                BreakingCondition(id="bc", text="t", metric="x", op=">", threshold=1.0)
            ],
        )
        trace = ReasoningTrace(
            trace_id="t", depth=ReasoningDepth.L4,
            chains=[CausalChain(id="ch", links=[link])],
            observed_values={"x": 0.5},
        )
        report = adversary_review(trace)
        assert report.weak_link is True
        w = report.weak_links[0]
        assert w.link_id == "l1"
        assert w.breaking_condition_present is True
        assert w.breaking_condition_machine_checkable is True

    def test_unfalsifiable_inference_noted(self):
        link = CausalLink(
            id="l2", cause="c", mechanism="m", outcome="o",
            verification=Verification.INFERENCE, breaking_conditions=[],
        )
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L4,
                               chains=[CausalChain(id="ch", links=[link])])
        report = adversary_review(trace)
        assert report.weak_link is True
        assert any("unfalsifiable" in n for n in report.notes)

    def test_corpus_links_not_weak(self):
        link = CausalLink(
            id="l3", cause="c", mechanism="m", outcome="o",
            verification=Verification.CORPUS,
            breaking_conditions=[
                BreakingCondition(id="bc", text="t", metric="x", op=">", threshold=1.0)
            ],
        )
        trace = ReasoningTrace(
            trace_id="t", depth=ReasoningDepth.L4,
            chains=[CausalChain(id="ch", links=[link])],
            observed_values={"x": 2.0},  # condition met, but link is CORPUS
        )
        report = adversary_review(trace)
        assert report.weak_link is False


# --- Breaking-condition evaluation -------------------------------------------

class TestConditionEvaluation:
    def test_missing_metric_is_unverifiable_not_met(self):
        link = CausalLink(
            id="l", cause="c", mechanism="m", outcome="o",
            verification=Verification.COMPUTED,
            breaking_conditions=[
                BreakingCondition(id="bc", text="t", metric="nope", op="<", threshold=1.0)
            ],
        )
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L4,
                               chains=[CausalChain(id="ch", links=[link])],
                               observed_values={})
        report = adversary_review(trace)
        r = report.condition_results[0]
        assert r.verifiable is False
        assert r.met is None
        assert report.breaking_conditions_met is False
        assert any("UNVERIFIABLE" in n for n in report.notes)

    def test_all_operators(self):
        from reasoning.schemas import evaluate_condition
        cases = [
            ("<", 1.0, 2.0, True), ("<", 3.0, 2.0, False),
            ("<=", 2.0, 2.0, True), (">", 3.0, 2.0, True),
            (">=", 2.0, 2.0, True), ("==", 2.0, 2.0, True),
            ("!=", 2.0, 2.0, False),
        ]
        for op, value, threshold, expected in cases:
            cond = BreakingCondition(id="c", text="t", metric="m", op=op, threshold=threshold)
            assert evaluate_condition(cond, {"m": value}).met is expected, op

    def test_invalid_op_rejected(self):
        with pytest.raises(ValueError):
            BreakingCondition(id="c", text="t", metric="m", op="~", threshold=1.0)


# --- Thesis survival when falsifiers are absent --------------------------------

class TestThesisSurvival:
    def test_thesis_survives_when_conditions_unmet(self):
        trace = _funnel_trace()
        # Slow TTT and low quick-game: the funnel's falsifiers are NOT true.
        trace.observed_values = {"ttt_seconds": 2.8, "quick_game_rate": 0.45, "air_yards": 8.3}
        report = adversary_review(trace)
        assert report.breaking_conditions_met is False
        bundle_id = report.correlated_theses[0].id
        assert report.thesis_verdicts[bundle_id] == "SURVIVE"
        assert killed_legs(report) == []


# --- Phase-5 improvements: overconfidence, fusion choice, near-misses, REJECT ---

class TestOverconfidenceScore:
    def test_funnel_bundle_overconfidence(self):
        # TNF funnel: 4 legs, chain-overlap rho_bar ~0.7 → OR 3.1, n_eff ~1.29.
        s = overconfidence_score(4, rho_bar=0.7)
        assert s.or_ratio == pytest.approx(3.1)
        assert s.n_eff == pytest.approx(4 / 3.1, rel=1e-3)
        assert s.rho_source != "measured"
        assert "INFERENCE" in s.note

    def test_independent_legs_no_overconfidence(self):
        s = overconfidence_score(4, rho_bar=0.0, rho_source="measured")
        assert s.or_ratio == pytest.approx(1.0)
        assert s.n_eff == pytest.approx(4.0)
        assert s.note == ""

    def test_invalid_inputs_rejected(self):
        with pytest.raises(ValueError):
            overconfidence_score(0, 0.5)
        with pytest.raises(ValueError):
            overconfidence_score(4, 1.5)

    def test_report_scores_bundles(self):
        report = adversary_review(_funnel_trace())
        bundle_id = report.correlated_theses[0].id
        assert bundle_id in report.overconfidence
        assert report.overconfidence[bundle_id].n_eff < 2.0


class TestRecommendFusion:
    def test_conflict_means_cu(self):
        assert recommend_fusion(True, True, True) == "CU"

    def test_identifiable_common_structure_means_ici(self):
        assert recommend_fusion(False, True, False) == "ICI"

    def test_known_correlation_without_structure_means_ci(self):
        assert recommend_fusion(True, False, False) == "CI"

    def test_unknown_defaults_to_ci(self):
        assert recommend_fusion(False, False, False) == "CI"


class TestNearMisses:
    def test_near_miss_recorded(self):
        # bc_ttt: op "<" threshold 2.3. observed 2.5 is unmet but within 15%.
        trace = _funnel_trace()
        trace.observed_values = {"ttt_seconds": 2.5, "quick_game_rate": 0.45}
        report = adversary_review(trace)
        assert report.breaking_conditions_met is False
        assert any(r.condition_id == "bc_ttt" for r in report.near_misses)

    def test_far_miss_not_recorded(self):
        trace = _funnel_trace()
        trace.observed_values = {"ttt_seconds": 2.8, "quick_game_rate": 0.45}
        report = adversary_review(trace)
        assert report.near_misses == []

    def test_met_condition_is_not_a_near_miss(self):
        report = adversary_review(_funnel_trace())  # both conditions met
        assert report.breaking_conditions_met is True
        assert report.near_misses == []


class TestRejectRegister:
    def test_tagged_link_flagged(self):
        trace = _funnel_trace()
        trace.chains[0].links[0].tags = ["xfp_fpoe_rank"]
        report = adversary_review(trace)
        assert len(report.reject_hits) == 1
        assert "xfp_fpoe_rank" in report.reject_hits[0]
        assert report.would_not_claim  # inherited by published output

    def test_untagged_link_clean(self):
        report = adversary_review(_funnel_trace())
        assert report.reject_hits == []


class TestWouldNotClaim:
    def test_undeclared_structure_leg_gets_would_not_claim(self):
        trace = _funnel_trace()
        for i, leg in enumerate(trace.legs):
            leg.causal_link_ids = [f"distinct_link_{i}"]  # no shared structure
        report = adversary_review(trace)
        assert report.would_not_claim
        assert any("no declared causal structure" in c for c in report.would_not_claim)
