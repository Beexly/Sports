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

# ---------------------------------------------------------------------------
# τ̂ fitted-artifact loaders (c04 BS-1).
#
# The fitted table and the fitters built from it are CACHED at module level:
# TauFitter.fit() is expensive and _build_data_context runs per game. Keyed
# by the resolved path so a test that points GSE_COACHING_DATA_DIR elsewhere
# gets its own cache entry rather than a stale one.
#
# Every loader returns None (or raises) when the artifact is missing. None of
# them synthesizes a default: a τ̂ of 0.5 with fallback_level "prior" would be
# indistinguishable from a real fitted estimate at the call site, which is
# precisely the failure this wiring exists to close.
# ---------------------------------------------------------------------------
_TAU_CACHE: dict[str, Any] = {}


def _search_dirs() -> list[str]:
    """Dirs to search for coaching artifacts.

    An explicit GSE_COACHING_DATA_DIR is exclusive. Falling through to the
    repo or the legacy path would make "this directory is empty" read as
    "the other directory has the file."
    """
    from coaching import base_data as _BD
    env = os.environ.get(_BD.ENV_VAR)
    if env:
        return [env]
    return _BD.candidate_dirs()


def _tau_table_path() -> Optional[str]:
    """Path to a fitted tau_hat.csv, or None when it is not present."""
    for d in _search_dirs():
        p = os.path.join(d, "tau_hat.csv")
        if os.path.exists(p):
            return p
    return None


def _wp_bin_label(wp: float) -> str:
    """Map a WP in [0,1] to the five coarse bins the τ̂ table is keyed on."""
    import numpy as np
    from coaching.coach_risk import WP_BINS, WP_BIN_LABELS
    return WP_BIN_LABELS[int(np.clip(np.digitize(wp, WP_BINS) - 1, 0, 4))]


def _tau_table() -> Optional[dict]:
    """{(team, season, region, wp_bin): row} from tau_hat.csv, or None."""
    path = _tau_table_path()
    if path is None:
        return None
    if path in _TAU_CACHE:
        return _TAU_CACHE[path]
    import csv as _csv
    table: dict[tuple, dict] = {}
    with open(path, newline="") as fh:
        for r in _csv.DictReader(fh):
            try:
                key = (r["team"], int(r["season"]), r["region"], r["wp_bin"])
                table[key] = {
                    "team": r["team"],
                    "season": int(r["season"]),
                    "region": r["region"],
                    "wp_bin": r["wp_bin"],
                    "tau_hat": float(r["tau_hat_served"]),
                    "fallback_level": r.get("fallback_level"),
                    "n_decisions": (int(r["n_decisions"])
                                    if r.get("n_decisions") not in (None, "")
                                    else None),
                    "window": r.get("window"),
                    "verification": "COMPUTED",
                }
            except (KeyError, TypeError, ValueError):
                # A malformed row is a loud omission, not a silent skip of
                # the whole table — but it is never turned into a 0.5.
                continue
    _TAU_CACHE[path] = table
    return table


def _fitted_fitter():
    """A fitted TauFitter, or DataGapError when pbp is unavailable.

    The fitter is built from nflverse pbp parquet, which is NOT in the repo
    (only 5–144-row test fixtures live in temp dirs, and the loader rejects
    them for missing columns). Building one from a fixture would produce a
    confident, meaningless τ̂ — the fabrication line. So: no pbp, no fitter.
    """
    from integration.providers import DataGapError
    from coaching import base_data as _BD
    from coaching import coach_risk as _CR

    for d in _search_dirs():
        import glob as _glob
        paths = sorted(_glob.glob(os.path.join(d, "pbp_*.parquet")))
        if not paths:
            continue
        cache_key = "fitter:" + "|".join(paths)
        if cache_key in _TAU_CACHE:
            return _TAU_CACHE[cache_key]
        fd = _CR.load_fourth_downs(paths)
        fitter = _CR.TauFitter(fd)
        fitter.fit(seasons=sorted({int(s) for s in fd["season"].unique()}))
        _TAU_CACHE[cache_key] = fitter
        return fitter
    raise DataGapError(
        "coaching",
        "no nflverse pbp parquet found, so TauFitter cannot be fitted. Tried: "
        + ", ".join(_BD.candidate_dirs())
        + ". Download with nflreadpy/nflverse and point "
        f"{_BD.ENV_VAR} at the directory holding pbp_YYYY.parquet. See "
        "intelligence/REAL-DATA-VALIDATION.md.",
    )


def _fitted_engine():
    """A fitted SituationalEngine, or DataGapError when pbp is unavailable."""
    from integration.providers import DataGapError
    from coaching import base_data as _BD
    from coaching import situational_wp as _SW

    for d in _search_dirs():
        import glob as _glob
        paths = sorted(_glob.glob(os.path.join(d, "pbp_*.parquet")))
        if not paths:
            continue
        cache_key = "engine:" + "|".join(paths)
        if cache_key in _TAU_CACHE:
            return _TAU_CACHE[cache_key]
        import pandas as pd
        frames = []
        for p in paths:
            import pyarrow.parquet as pq
            have = set(pq.read_schema(p).names)
            need = [c for c in ("down", "play_type", "yardline_100", "ydstogo",
                                "score_differential", "game_seconds_remaining",
                                "qtr", "posteam", "defteam", "season", "week",
                                "game_id", "drive", "wpa") if c in have]
            frames.append(pd.read_parquet(p, columns=need))
        pbp = pd.concat(frames, ignore_index=True)
        # SituationalEngine derives its own 4th-down / FG / state frames from
        # the full pbp frame in __init__ — there is no separate fit() step.
        engine = _SW.SituationalEngine(pbp)
        _TAU_CACHE[cache_key] = engine
        return engine
    raise DataGapError(
        "coaching",
        "no nflverse pbp parquet found, so SituationalEngine cannot be fitted. "
        "Tried: " + ", ".join(_BD.candidate_dirs())
        + f". Download with nflreadpy/nflverse and point {_BD.ENV_VAR} at it. "
        "See intelligence/REAL-DATA-VALIDATION.md.",
    )


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

    # -- τ̂ risk preference (c04 BS-1; the VALIDATED gate) --------------------
    #
    # P1 audit item: coach_risk.TauFitter / situational_wp.SituationalEngine /
    # behavior.expected_wp_given_coach were never called from the live path.
    # The only validated gate sat beside the engine instead of inside it.
    #
    # The gate was validated on nflverse pbp (G_tau +6.77pp Hamming, n=3,988)
    # but neither the pbp parquet nor the fitted tau_hat.csv was ever
    # committed — see REAL-DATA-VALIDATION.md. So this method is wired and
    # real, and it raises DataGapError naming the refit command when the
    # artifact is absent. It does NOT return 0.5, a league mean, or any
    # stand-in value: an unfitted τ̂ that looks fitted is the exact failure
    # mode this audit is about.
    def get_tau_hat(self, team: str, season: int, region: str,
                    wp: float) -> dict[str, Any]:
        """Served τ̂ for one (team, season, region, wp_bin) cell.

        `region` is "opp" or "own"; wp is the live win probability of the
        team in possession. Returns the served value plus the fallback level
        that produced it (unit / pooled / league / league_region / prior) so
        a caller can tell a real per-team estimate from a backed-off one.

        Raises DataGapError when the fitted table is absent. See module note.
        """
        import os as _os
        from coaching import base_data as _BD

        table = _tau_table()
        if table is None:
            tried = ", ".join(_BD.candidate_dirs())
            raise DataGapError(
                "coaching",
                "tau_hat.csv (fitted 4th-down risk preference) is not present. "
                f"Tried: {tried}. Regenerate with: python -m coaching.refit_tau "
                "--seasons 2022-2026 --out "
                f"{_os.path.join(_BD.REPO_DATA_DIR, 'tau_hat.csv')} "
                "(requires nflverse pbp parquet, which is not in the repo). "
                "Until then tau_hat is UNVALIDATED at serving time — see "
                "intelligence/REAL-DATA-VALIDATION.md. Never defaulted to a "
                "league mean: an unfitted tau that reads as fitted is the "
                "silent-degradation failure this gate exists to prevent.",
            )
        wpb = _wp_bin_label(wp)
        key = (team, int(season), region, wpb)
        row = table.get(key)
        if row is None:
            raise DataGapError(
                "coaching",
                f"no tau_hat cell for team={team} season={season} "
                f"region={region} wp_bin={wpb} (wp={wp:.3f}). The fitted table "
                f"holds {len(table)} cells; this one was never served.",
            )
        return dict(row)

    def expected_wp_given_coach(self, team: str, season: int, yardline_100: int,
                                ydstogo: int, score_differential: int,
                                game_seconds_remaining: int, qtr: int,
                                wp: float,
                                timeouts_rem: int = 3) -> dict[str, Any]:
        """Behavior-conditioned WP (c04 BS-4) — WP of the action the coach is
        PREDICTED to take, not the WP-maximizing one. This is the L3 causal
        hook: drive-outcome probability conditioned on coach behavior.

        Composition only (TauFitter + SituationalEngine); no new fitting.
        Raises DataGapError when either fitted artifact is absent.
        """
        from coaching import coach_risk as _CR
        from coaching import situational_wp as _SW
        from coaching import behavior as _BH

        fitter = _fitted_fitter()
        engine = _fitted_engine()
        out = _BH.expected_wp_given_coach(
            engine, fitter, team, int(season), int(yardline_100), int(ydstogo),
            int(score_differential), int(game_seconds_remaining), int(qtr),
            float(wp), int(timeouts_rem))
        out["verification"] = "COMPUTED"
        out["tau_input_verification"] = "CORPUS"
        return out


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
