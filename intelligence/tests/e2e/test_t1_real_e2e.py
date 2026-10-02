# PROVENANCE — gse-intelligence-build / tests/e2e/test_t1_real_e2e.py
# P1 audit item: "T1 e2e must go through analyze(), not hand-built traces — and
# commit a real test for the PARTIAL verdict."
#
# WHY THIS FILE EXISTS
# --------------------
# tests/e2e/test_reasoning_trace_e2e.py::TestT1PressureFunnelRejected builds a
# ReasoningTrace BY HAND (chains=[CausalChain(...)], observed_values={...},
# checklist=_clear_checklist()). That proves the adversary kills a funnel when
# the chain is already present and its breaking condition already met. It never
# proves the real system BUILDS that chain, and it never touches analyze().
#
# The hand-built test passes on fixtures and on real data alike, so it cannot
# distinguish "the funnel kill works" from "nothing was ever checked".
#
# The other half of the audit item: the PARTIAL verdict. Measured, not asserted
# from a stale note. REAL-DATA-VALIDATION.md line 30 records what happens on
# real providers — and the numbers below are what analyze() actually returns:
#
#     label:     INVALID
#     depth:     L1
#     checklist: qb_behavior DATA-GAP, coaching_scheme DATA-GAP,
#                offensive_line UNCHECKED, trust_signals UNCHECKED,
#                scheme_matchup NOTHING-MATERIAL
#     levels:    []   <- the adversary never ran; there was nothing to kill
#
# THAT IS THE PARTIAL VERDICT, and it is the honest one: on real feeds the
# funnel kill does not fire AND the card is not recommended, because
# build_causal_chains needs an OL provider serving non-empty starters_out and
# nflverse pbp has no injury columns. UNCHECKED at L3+ is INVALID per spec §5
# and is never downgraded silently. The refusal is the feature.
#
# What this test therefore pins:
#   1. On REAL providers analyze() returns INVALID — never FINAL. A regression
#      that made this publishable would be the exact failure the audit found.
#   2. The offensive_line track is UNCHECKED with no OL provider, which is what
#      makes the chain unconstructable. Named, not incidental.
#   3. On STUB providers the same request DOES reach L5 and the funnel IS
#      killed — the negative control. Without it, (1) could pass simply because
#      the request was malformed.
#   4. The kill on stubs bundles all four legs into ONE correlated thesis, so
#      a future refactor cannot quietly make them four independent edges.
#
# Note on labels: "PARTIAL" is a documented VERDICT in REAL-DATA-VALIDATION.md,
# not a trace.label value. trace.label is one of FINAL / INVALID /
# "ANALYSIS-DRAFT — not for publication" (api.py:493-498, levels.py:237,
# schemas.py:305). Asserting trace.label == "PARTIAL" would fail for a
# reason unrelated to the behaviour under test.
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
for p in (ROOT, os.path.join(ROOT, "qb-behavior", "src")):
    if p not in sys.path:
        sys.path.insert(0, p)

from integration.api import analyze
from integration.providers import ProviderRegistry
from integration.stubs import fixture_league_avgs, fixture_registry
from tests.helpers import card_request, funnel_legs

from coaching.provider import CoachingEngineProvider
from coaching.ol_provider import NflverseOLProvider
from qb_behavior.situational.provider import SituationalQBProvider

pytestmark = pytest.mark.e2e


def _real_registry() -> ProviderRegistry:
    """Real providers, no OL, no trust intake — the measured 2026-10-02 setup.

    ol=None is the load-bearing part: it is why no chain is built and why the
    trace is INVALID rather than killed.
    """
    return ProviderRegistry(qb=SituationalQBProvider(),
                           coaching=CoachingEngineProvider(),
                           trust=None, ol=None)


@pytest.fixture(scope="module")
def trace():
    """Real providers, no OL, no trust intake — the measured 2026-10-02 setup."""
    return analyze(card_request(), _real_registry(),
                   league_avgs=fixture_league_avgs())


@pytest.fixture(scope="module")
def stub_trace():
    """Negative control: OL serving, so the chain is buildable and the kill runs."""
    return analyze(card_request(), fixture_registry(),
                   league_avgs=fixture_league_avgs())


class TestT1OnRealProvidersIsPartial:
    """The PARTIAL verdict, measured through the real entry point."""

    def test_real_providers_never_reach_FINAL(self, trace):
        """The load-bearing assertion. A publishable funnel card on real feeds
        would be the P1 defect; this fails loudly if it ever happens."""
        assert trace.label != "FINAL", (
            f"real-provider T1 published as FINAL — the funnel kill fired on "
            f"data that cannot support it: {trace.label}")

    def test_real_provider_trace_is_INVALID(self, trace):
        assert trace.label == "INVALID"

    def test_ol_track_is_unchecked_with_no_provider(self, trace):
        """Names the cause: no OL provider -> UNCHECKED -> INVALID at L3+."""
        checklist = trace.checklist or {}
        ol = checklist.get("offensive_line")
        val = ol.value if hasattr(ol, "value") else ol
        assert val == "UNCHECKED", f"offensive_line should be UNCHECKED, got {val!r}"

    def test_no_levels_because_nothing_was_checkable(self, trace):
        """The adversary never ran. levels is empty, so no thesis was killed —
        'did not fire' and 'fired and killed' are different states and the
        test must not conflate them."""
        assert list(trace.levels.keys()) == [], (
            f"expected no levels on real providers, got {list(trace.levels.keys())}")

    def test_no_recommendation_is_emitted(self, trace):
        """Depth never advanced past the requested L1, so no L5 card exists."""
        assert trace.depth.value == "L1"


class TestT1OnStubsStillKillsTheFunnel:
    """Negative control: the request is well-formed and the kill really works.

    Without this, TestT1OnRealProvidersIsPartial could pass because the
    request was malformed rather than because the gate is honest.
    """

    def test_stub_run_reaches_l5_and_is_FINAL(self, stub_trace):
        assert stub_trace.depth.value == "L5"
        assert stub_trace.label == "FINAL"

    def test_funnel_is_killed_at_l4(self, stub_trace):
        l4 = stub_trace.levels.get("L4", {})
        assert l4.get("breaking_conditions_met") is True, (
            f"stub funnel should have a met breaking condition: {l4}")

    def test_all_four_legs_killed_as_one_thesis(self, stub_trace):
        """Four legs, ONE shared link. Never four independent edges.
        The bundle shares exactly one link, and all four leg ids are present
        — a refactor that split them into four edges would fail here."""
        l4 = stub_trace.levels.get("L4", {})
        theses = l4.get("correlated_theses") or []
        assert len(theses) == 1, f"expected 1 bundled thesis, got {len(theses)}"
        bundle = theses[0]
        leg_ids = sorted(x["leg_id"] for x in bundle.get("legs", []))
        assert leg_ids == sorted(l.leg_id for l in funnel_legs()), (
            f"bundle leg set drifted: {leg_ids}")
        assert bundle.get("shared_link") == "pit_pressure_lands", (
            f"bundle no longer shares one link: {bundle.get('shared_link')}")
        assert bundle.get("thesis_broken") is True


def test_ol_provider_moves_the_track_off_unchecked():
    """Week 4 2026 is in the injury file. The track must be checked.
    It must not become FINAL just because the trench was looked at.
    """
    reg = ProviderRegistry(
        qb=SituationalQBProvider(),
        coaching=CoachingEngineProvider(),
        trust=None,
        ol=NflverseOLProvider(),
    )
    traced = analyze(card_request(), reg, league_avgs=fixture_league_avgs())
    ol = (traced.checklist or {}).get("offensive_line")
    val = ol.value if hasattr(ol, "value") else ol
    assert val != "UNCHECKED", val
    assert traced.label != "FINAL"
