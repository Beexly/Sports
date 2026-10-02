# PROVENANCE: test fixture for reasoning-depth-spec.md §8 T1 (Steelers @ Browns, Week 4 2026).
# All values are taken from the spec's own worked example (§3, §6.1) and
# tnf-intelligence-program-2026-10-01.md (Monken case study, #5 pass rush):
# - CLE missing 2 interior OL starters (spec §6.1 example trace, CORPUS)
# - Monken 2026 quick-game 0.639 vs league avg 0.508; air yards 8.33 -> 6.12 (Track 2, COMPUTED)
# - PIT pass rush rank 5 (program doc §4: "vs the #5 pass rush")
# - Watson INT splits: 3-5% under hit vs 0.8-3.2% clean (spec §6.1 L4 counter-argument, Track 1)
# - Trust signals: Rodgers-Metcalf video (frustration), Wilson rising role (program doc §1)
# FIXTURE NOTE: ttt_seconds=2.18 is stipulated to satisfy the spec's stated pre-kickoff
# condition (TTT < 2.3s, "both thresholds were satisfied in Weeks 1-3 data", §8 T1).
# Production providers MUST supply measured TTT; the stub exists only so T1 is deterministic.
"""In-memory stub providers seeded with the PIT@CLE Week 4 2026 fixture."""
from __future__ import annotations

from .providers import (
    CoachProfile,
    CoachingProvider,
    DataGapError,
    OLProvider,
    OLState,
    PressureSplits,
    ProviderRegistry,
    QBBehaviorProfile,
    QBBehaviorProvider,
    SchemeFingerprint,
    TrustSignal,
    TrustSignalProvider,
)
from .types import Verification

WEEK, SEASON = 4, 2026


class StubQBBehaviorProvider(QBBehaviorProvider):
    def get_qb_profile(self, qb_id: str, week: int, season: int) -> QBBehaviorProfile:
        if qb_id == "deshaun-watson":
            return QBBehaviorProfile(
                qb_id=qb_id, name="Deshaun Watson", team="CLE", week=week, season=season,
                epa_per_dropback=0.02, pressure_to_sack_rate=0.18,
                aggressiveness=0.12, adot=6.9, target_hhi=0.14,
                verification=Verification.CORPUS)
        if qb_id == "aaron-rodgers":
            return QBBehaviorProfile(
                qb_id=qb_id, name="Aaron Rodgers", team="PIT", week=week, season=season,
                target_hhi=0.21, trust_target_share_3rd=0.34,
                verification=Verification.CORPUS)
        raise DataGapError("qb_behavior", f"no fixture profile for {qb_id}")

    def get_pressure_splits(self, qb_id: str, week: int, season: int) -> PressureSplits:
        if qb_id == "deshaun-watson":
            return PressureSplits(
                qb_id=qb_id, int_rate_clean=0.020, int_rate_pressure=0.040,
                epa_per_dropback_clean=0.08, epa_per_dropback_pressure=-0.31,
                verification=Verification.CORPUS)  # spec §6.1: 3-5% under hit vs 0.8-3.2% clean
        raise DataGapError("qb_behavior", f"no fixture pressure splits for {qb_id}")


class StubCoachingProvider(CoachingProvider):
    def get_coach_profile(self, coach_id: str, season: int) -> CoachProfile:
        if coach_id == "todd-monken":
            return CoachProfile(
                coach_id=coach_id, name="Todd Monken", role="HC", team="CLE", season=season,
                early_down_pass_rate=0.562,
                yoy_delta_note="quick-game proxy 0.476 (2023 BAL) -> 0.518 (2025 BAL) -> 0.639 (2026 CLE)",
                verification=Verification.COMPUTED)
        raise DataGapError("coaching_scheme", f"no fixture profile for {coach_id}")

    def get_scheme_fingerprint(self, team: str, week: int, season: int) -> SchemeFingerprint:
        if team == "CLE":
            return SchemeFingerprint(
                team=team, week=week, season=season,
                quickgame_rate=0.639, avg_air_yards=6.12, ttt_seconds=2.18,
                early_down_pass_rate=0.562, motion_rate=0.41,
                verification=Verification.COMPUTED)
        if team == "PIT":
            return SchemeFingerprint(
                team=team, week=week, season=season,
                quickgame_rate=0.44, avg_air_yards=7.8, motion_rate=0.52,
                verification=Verification.COMPUTED)
        raise DataGapError("coaching_scheme", f"no fixture fingerprint for {team}")


class StubTrustSignalProvider(TrustSignalProvider):
    def get_trust_signals(self, team: str, week: int, season: int) -> tuple[TrustSignal, ...]:
        if team == "PIT":
            return (
                TrustSignal(player_id="aaron-rodgers", signal_type="frustration",
                            text="viral video: Rodgers burying Metcalf ('this mfer sucks ass')",
                            source_url="x-intake-registry/trust-signal-intake",
                            observed_at="2026-09-30", verification=Verification.SINGLE_SOURCE),
                TrustSignal(player_id="roman-wilson", signal_type="role_change",
                            text="usage trending up (3-5-7 receptions); last man in the trust circle",
                            source_url="x-intake-registry/trust-signal-intake",
                            observed_at="2026-10-01", verification=Verification.SINGLE_SOURCE),
            )
        return ()


class StubOLProvider(OLProvider):
    def get_ol_state(self, team: str, week: int, season: int) -> OLState:
        if team == "CLE":
            return OLState(
                team=team, week=week, season=season,
                starters_out=("CLE-C (out)", "CLE-LG (out)"),
                practice_status=(("CLE-C (out)", "DNP"), ("CLE-LG (out)", "DNP")),
                continuity_index=0.62, pressure_rate_allowed=0.31,
                verification=Verification.CORPUS)
        if team == "PIT":
            return OLState(team=team, week=week, season=season,
                           starters_out=(), continuity_index=0.88,
                           pressure_rate_allowed=0.24, verification=Verification.CORPUS)
        raise DataGapError("offensive_line", f"no fixture OL state for {team}")


def fixture_registry() -> ProviderRegistry:
    """All four providers wired (no UNCHECKED tracks for the T1 fixture)."""
    return ProviderRegistry(
        qb=StubQBBehaviorProvider(),
        coaching=StubCoachingProvider(),
        trust=StubTrustSignalProvider(),
        ol=StubOLProvider(),
    )


def fixture_game() -> dict:
    return {
        "away": "PIT", "home": "CLE", "week": WEEK, "season": SEASON,
        "qbs": {"CLE": "deshaun-watson", "PIT": "aaron-rodgers"},
        "playcallers": {"CLE": "Todd Monken"},
        "defense": {"PIT": {"pass_rush_rank": 5}},
    }


def fixture_league_avgs() -> dict:
    return {"quickgame_rate": 0.508}
