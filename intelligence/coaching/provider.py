# PROVENANCE — gse-intelligence-build / coaching / provider.py
# Implements: contracts/integration-contracts.md §1 (CoachingProvider ABC).
# Research basis: corpus-intelligence/deep/c03/buildable-systems.md (M01-M12),
#   reasoning-depth-spec.md T1 (fixture), integration/providers.py (contract).
"""CoachingEngineProvider — the CoachingProvider implementation.

Boundary discipline (A6 interface contract):
- PROE / fingerprints / tendencies: this module (COMPUTED from nflverse pbp).
- τ / 4th-down risk preference: c04's module — fourth_down_go_rate is None
  with a data_gap naming c04, never a home-grown substitute.
- Charting-gapped fields (motion, play-action, rpo, TTT, blitz, man/zone):
  None with data_gap, never zero-filled.
"""
from __future__ import annotations

import sys
import os
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from integration.providers import (
    CoachProfile,
    CoachingProvider,
    DataGapError,
    ProviderRegistry,
    SchemeFingerprint,
)
from integration.types import Verification

from coaching import fingerprint as FP
from coaching import tenures as TN


def _fnum(v) -> Optional[float]:
    try:
        x = float(v)
        return x if x == x else None
    except (TypeError, ValueError):
        return None


class CoachingEngineProvider(CoachingProvider):
    """Real CoachingProvider over the coaching tendency engine tables."""

    # -- CoachProfile ------------------------------------------------------
    def get_coach_profile(self, coach_id: str, season: int) -> CoachProfile:
        name = coach_id.replace("-", " ")
        rec = TN.lookup_coach(name, season)
        if rec is None:
            # try exact slug match across registry (handles multi-word names)
            for slug, records in TN._load().items():
                if slug == coach_id:
                    rec = next((r for r in records if r["season"] == season), None)
                    name = records[0]["name"] if records else name
                    break
        if rec is None:
            raise DataGapError(
                "coaching",
                f"no verified tenure record for coach_id={coach_id} season={season} "
                f"(registry holds {TN.registry_coverage()['verified_rows']} verified rows; "
                f"full 32-team registry is queued research)",
            )
        row = rec["row"]
        side = rec["side"]
        early = _fnum(row.get("pass_rate_early")) if side == "offense" else None
        yoy = TN.yoy_delta(rec["name"], season, "pass_rate_early")
        yoy_note = (f"YoY early-down pass rate {yoy['prev']:.3f} -> {yoy['cur']:.3f} "
                    f"({yoy['delta']:+.3f}, yr {yoy['years_with_team']} with {yoy['team']})"
                    if yoy and early is not None else None)
        return CoachProfile(
            coach_id=coach_id,
            name=rec["name"],
            role=rec["role"],
            team=rec["team"],
            season=season,
            early_down_pass_rate=early,
            fourth_down_go_rate=None,  # c04 owns τ / 4th-down risk preference
            blitz_rate=None,           # charting-gapped
            man_coverage_rate=None,    # charting-gapped
            yoy_delta_note=yoy_note,
            verification=Verification.CORPUS,
            data_gap="; ".join(d for d in [
                "fourth_down_go_rate: c04 owns 4th-down risk preference (τ)",
                "blitz_rate/man_coverage_rate: not in nflverse pbp (DATA_GAPS.md)",
            ] if d),
        )

    # -- SchemeFingerprint -------------------------------------------------
    def get_scheme_fingerprint(self, team: str, week: int, season: int) -> SchemeFingerprint:
        row = FP.weekly_fingerprint(season, team, week)
        if row is None:
            raise DataGapError(
                "coaching",
                f"no weekly tendency row for {team} season={season} week={week} "
                f"(pbp_2026 covers weeks 1-3 only as of 2026-10-02)",
            )
        gaps = [
            "motion_rate: not in nflverse pbp (DATA_GAPS.md)",
            "play_action_rate: play_action column absent from all 5 pbp seasons — charting-gapped",
            "rpo_rate: rpo column absent from all 5 pbp seasons — charting-gapped",
            "ttt_seconds: time-to-throw unavailable in nflverse; NGS internal-only per doctrine",
        ]
        return SchemeFingerprint(
            team=team,
            week=week,
            season=season,
            motion_rate=None,
            play_action_rate=None,
            shotgun_rate=_fnum(row.get("shotgun_rate")),
            rpo_rate=None,
            quickgame_rate=_fnum(row.get("quick_game_rate")),
            ttt_seconds=None,
            avg_air_yards=_fnum(row.get("avg_air_yards")),
            early_down_pass_rate=_fnum(row.get("early_down_pass_rate")),
            verification=Verification.COMPUTED,
            data_gap="; ".join(gaps),
        )

    # -- Pressure-answer adaptation (buildable-systems.md #24, additive) -----
    def get_pressure_answer(self, team: str, week: int,
                            season: int) -> dict | None:
        """Pressure-answer signal ahead of (season, week).

        Predictive read: `faced_elite_last_week` = the team just faced a
        top-5 pass rush in week-1; teams with a positive answer profile
        (`profile_hit_rate`) systematically respond with elevated quick-game
        the following week (the Monken template). `last_week_delta` is the
        already-observed answer (None when week-1 is unplayed). All-None
        when nothing is known — never a guess.
        """
        from coaching import pressure_answer as PA
        faced = PA.faced_top5_rush(season, week - 1, team) if week > 1 else None
        delta = PA.answer_delta(season, week - 1, team) if week > 1 else None
        prof = PA.pressure_answer_profile(season, team)
        if faced is None and delta is None and not prof["weeks"]:
            return None
        return {"team": team, "season": season, "week": week,
                "faced_elite_last_week": faced,
                "last_week_opponent": PA.opponent(season, week - 1, team)
                if week > 1 else None,
                "last_week_delta": delta,
                "profile_hit_rate": prof["hit_rate"],
                "profile_n": prof["n_post_rush_weeks"]}

    # -- In-game adjustment quantifier (M10, additive) -----------------------
    def get_adjustment(self, season: int, team: str,
                       week: int) -> dict[str, Any] | None:
        """Week-to-week scheme adjustment: Mahalanobis distance of the week's
        tendency vector vs the season-to-date baseline (M10). Returns the
        row with the top_decile flag, or None when uncharted. Used by the
        façade to mark QB trailing form as spanning a scheme-regime change.
        """
        from coaching import adjustments as ADJ
        return ADJ.get_adjustment(season, team, week)


def real_registry(qb=None, trust=None, ol=None) -> ProviderRegistry:
    """ProviderRegistry with the REAL coaching engine wired.

    Other tracks are injectable (pass the stub providers in tests). This does
    NOT disturb integration/stubs.py::fixture_registry() — the e2e suite keeps
    its pinned stub values; this is the production wiring point.
    """
    return ProviderRegistry(
        qb=qb,
        coaching=CoachingEngineProvider(),
        trust=trust,
        ol=ol,
    )
