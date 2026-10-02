# Shared fixtures for the integration test-suite (c10 orchestration consumes these too).
"""Helpers: registries, requests, and leg builders for spec §8 tests."""
from __future__ import annotations

from integration import AnalysisRequest, BetLeg, Exposure, ReasoningDepth
from integration.providers import DataGapError, ProviderRegistry, TrustSignalProvider
from integration.stubs import fixture_game, fixture_league_avgs, fixture_registry


def funnel_legs() -> tuple[BetLeg, ...]:
    """The four pressure-funnel legs from spec §8 T1, all on one causal link."""
    return (
        BetLeg(leg_id="watson_under_187.5", description="Watson under 187.5 pass yards",
               causal_links=("pit_pressure_lands",)),
        BetLeg(leg_id="under_38.5", description="Game under 38.5",
               causal_links=("pit_pressure_lands",)),
        BetLeg(leg_id="watt_sacks_o0.5", description="Watt over 0.5 sacks",
               causal_links=("pit_pressure_lands",)),
        BetLeg(leg_id="both_teams_2fg", description="Both teams 2+ FGs",
               causal_links=("pit_pressure_lands",)),
    )


def card_request() -> AnalysisRequest:
    return AnalysisRequest(
        game=fixture_game(),
        question="should we bet the pressure-funnel card?",
        exposure=Exposure.CARD,
        requested_depth=ReasoningDepth.L1,
        legs=funnel_legs(),
    )


class GapTrustProvider(TrustSignalProvider):
    """Trust-signal lane with no usable data (spec §8 T2)."""
    def get_trust_signals(self, team: str, week: int, season: int):
        raise DataGapError("trust_signals", f"no intake coverage for {team} in week {week}")


def gap_trust_registry() -> ProviderRegistry:
    reg = fixture_registry()
    return ProviderRegistry(qb=reg.qb, coaching=reg.coaching, trust=GapTrustProvider(), ol=reg.ol)


def no_ol_registry() -> ProviderRegistry:
    reg = fixture_registry()
    return ProviderRegistry(qb=reg.qb, coaching=reg.coaching, trust=reg.trust, ol=None)


NOW = "2026-10-02T05:00:00+00:00"
