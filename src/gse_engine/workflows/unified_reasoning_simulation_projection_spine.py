"""Canonical Unified Reasoning -> 10k-World Simulation -> Derived Projections Spine (Wave 47).

Architecture contract:
  1. Watch & Audit Signals: ingest beat-reporter claims, social/charting metrics,
     cognitive/situational adjustments, and Stage-2 equations through MemTX +/-2.0
     sigma Huber clipping, LEDGER span verification, and anti-mirage quarantine
     (zeroing unverified rumors, garbage-time wp>=0.95 spikes, and future/odds leaks).
  2. Reason & Conserve Opportunity: synthesize OL/pass-rush trench balance, tempo,
     pass/rush balance, and red-zone rates, then conserve vacated targets and
     carries across healthy teammates via `reallocate_vacated_volume`.
  3. Coherent 10,000-World Simulation: run deterministic Philox-seeded vectorized
     worlds with exact world-by-world stat conservation (`sum(player_stats) == team_stats`).
  4. Unified Downstream Derivation: derive ALL Game Plays (full-game, 1H, 1Q, team
     totals), Player Props (12 markets), Correlated SGPs, and DraftKings DFS
     projections + MILP/Cash lineups from the single shared `projection_source_sha256`
     (`orphaned_non_simulated_projections == 0`). Market lines are read LAST under
     the `TRANSPARENT_PASS` conjunction gate and `OperatorSimulationHoldError`.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, cast

import numpy as np

from gse_engine.compute.dfs_optimizer import (
    SALARY_CAP,
    build_dfs_lineup,
    shrunk_empirical_covariance,
    solve_k22_dro_cash_or_dpp_gpp_milp,
)
from gse_engine.compute.volume_conservation import reallocate_vacated_volume
from gse_engine.fabric.philox import fnv1a_32_utf8, philox4x32_10
from gse_engine.gates.conjunction import evaluate_sgp_superadditivity_and_log_growth
from gse_engine.governance.simulation_hold_gate import (
    OperatorSimulationHoldError,
    assert_operator_simulation_week_approved,
)
from gse_engine.models import ConservedVolumeResult, DfsPlayerPoolItem, PlayerShare
from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
)

QUARANTINED_SIGNAL_KINDS: frozenset[str] = frozenset(
    {
        "unverified_rumor",
        "garbage_time_wp95",
        "future_postgame_leak",
        "market_odds_leak",
    }
)

_ACCEPTED_SIGNAL_KINDS: frozenset[str] = frozenset(
    {
        "beat_report",
        "social_charting",
        "cognitive_situational",
        "stage2_equation",
    }
)

_SPINE47_CACHE: dict[tuple[str, str, int, int, str], dict[str, Any]] = {}


@dataclass(frozen=True, slots=True)
class PregameReasoningSignal:
    """Single pre-simulation signal ingested from beat reporters, charting, or equations."""

    signal_id: str
    source: str
    kind: str
    team_side: str
    channel: str
    raw_delta: float
    sigma_scale: float
    reliability: float
    evidence_span: str
    description: str


def american_to_fair_prob_pair(over_american: int, under_american: int) -> tuple[float, float]:
    """Compute de-vigged fair market probabilities from two-sided American odds."""

    def _imp(am: int) -> float:
        return (100.0 / (am + 100.0)) if am > 0 else (-am / (-am + 100.0))

    p_o = _imp(over_american)
    p_u = _imp(under_american)
    tot = max(1e-9, p_o + p_u)
    return round(p_o / tot, 6), round(p_u / tot, 6)


def american_to_decimal(am: int) -> float:
    """Convert American odds integer to decimal payout multiplier."""
    return (1.0 + float(am) / 100.0) if am > 0 else (1.0 + 100.0 / float(abs(am)))


def _clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def default_matchup_context(
    away_team: str,
    home_team: str,
    *,
    as_of_week: int = 10,
    is_indoor: bool = False,
) -> dict[str, Any]:
    """Build deterministic baseline signals, rosters, and market lines for a matchup."""
    aw = away_team.strip().upper()
    hm = home_team.strip().upper()

    if aw == "IND" and hm == "HOU":
        signals: tuple[PregameReasoningSignal, ...] = (
            PregameReasoningSignal(
                signal_id="sig_ind_ol_beat_out",
                source="beat_reporter_wed_130pm_cst",
                kind="beat_report",
                team_side="away",
                channel="ol_disruption",
                raw_delta=0.14,
                sigma_scale=0.06,
                reliability=0.96,
                evidence_span="Raimann(LT OUT), Travis(RT OUT), Carlies(IR)",
                description="Starting tackles ruled out ahead of Will Anderson Jr.",
            ),
            PregameReasoningSignal(
                signal_id="sig_hou_wr_condensation",
                source="ap_practice_report",
                kind="beat_report",
                team_side="home",
                channel="epa_shift",
                raw_delta=0.045,
                sigma_scale=0.03,
                reliability=0.91,
                evidence_span="Woody Marks OUT, Montgomery FP, Harrison Jr DNP",
                description="Houston healthy RB/WR core concentrates around Stroud/Collins/Dell.",
            ),
            PregameReasoningSignal(
                signal_id="sig_ind_st_heavy_early",
                source="social_charting_sumersports",
                kind="social_charting",
                team_side="away",
                channel="pass_rate_shift",
                raw_delta=-0.045,
                sigma_scale=0.025,
                reliability=0.88,
                evidence_span="Early-down neutral rush rate +4.5% behind backup OTs",
                description="Steichen shifts to Taylor carries and quick TE Warren throws.",
            ),
            PregameReasoningSignal(
                signal_id="sig_ind_warren_1read",
                source="cognitive_situational_stage2",
                kind="stage2_equation",
                team_side="home",
                channel="td_rate_shift",
                raw_delta=0.03,
                sigma_scale=0.02,
                reliability=0.90,
                evidence_span="Ward Sr OUT + Carlies IR opens middle-field & WR1 seams",
                description="Colts secondary attrition raises Houston red-zone TD conversion.",
            ),
            PregameReasoningSignal(
                signal_id="sig_hou_dome_pace",
                source="nrg_venue_weather",
                kind="cognitive_situational",
                team_side="game",
                channel="pace_sec_shift",
                raw_delta=-0.65,
                sigma_scale=0.50,
                reliability=0.94,
                evidence_span="Retractable roof neutralizes 66F/3mph NNE forecast",
                description="Controlled indoor turf accelerates clean snap cadence.",
            ),
            PregameReasoningSignal(
                signal_id="sig_quarantine_garbage_wp95",
                source="mirage_detector",
                kind="garbage_time_wp95",
                team_side="away",
                channel="epa_shift",
                raw_delta=9.99,
                sigma_scale=0.10,
                reliability=0.99,
                evidence_span="wp>=0.95 prevent defense garbage EPA",
                description="Quarantined garbage-time distortion.",
            ),
            PregameReasoningSignal(
                signal_id="sig_quarantine_unbacked_rumor",
                source="anonymous_message_board",
                kind="unverified_rumor",
                team_side="home",
                channel="epa_shift",
                raw_delta=-9.99,
                sigma_scale=0.10,
                reliability=0.25,
                evidence_span="",
                description="Quarantined unbacked claim with zero span.",
            ),
        )
        away_roster: tuple[PlayerShare, ...] = (
            PlayerShare("IND_RB1", "Jonathan Taylor", "RB", True, 0.14, 0.68, 1),
            PlayerShare("IND_RB2", "Seth McGowan", "RB", True, 0.06, 0.24, 2),
            PlayerShare("IND_WR1", "Michael Pittman Jr.", "WR", True, 0.24, 0.02, 1),
            PlayerShare("IND_WR2", "Josh Downs", "WR", True, 0.22, 0.02, 2),
            PlayerShare("IND_TE1", "Tyler Warren", "TE", True, 0.24, 0.04, 1),
            PlayerShare("IND_TE2", "Will Mallory", "TE", False, 0.10, 0.00, 2),
        )
        home_roster: tuple[PlayerShare, ...] = (
            PlayerShare("HOU_RB1", "David Montgomery", "RB", True, 0.12, 0.62, 1),
            PlayerShare("HOU_RB2", "Woody Marks", "RB", False, 0.07, 0.30, 2),
            PlayerShare("HOU_RB3", "Dameon Pierce", "RB", True, 0.04, 0.06, 3),
            PlayerShare("HOU_WR1", "Nico Collins", "WR", True, 0.26, 0.01, 1),
            PlayerShare("HOU_WR2", "Tank Dell", "WR", True, 0.20, 0.01, 2),
            PlayerShare("HOU_WR3", "Marvin Harrison Jr.", "WR", False, 0.15, 0.00, 3),
            PlayerShare("HOU_TE1", "Dalton Schultz", "TE", True, 0.16, 0.00, 1),
        )
        qbs = {
            "away": {"player_id": "IND_QB", "name": "Daniel Jones", "salary": 5300},
            "home": {"player_id": "HOU_QB", "name": "C.J. Stroud", "salary": 6500},
        }
        market = {
            "home_spread": -12.5,
            "total": 44.5,
            "home_ml_american": -650,
            "away_ml_american": 470,
            "h1_spread": -7.0,
            "h1_total": 22.5,
            "q1_total": 9.5,
            "away_team_total": 16.5,
            "home_team_total": 28.5,
            "qb_home_pass_yds_line": 261.5,
            "wr1_home_rec_yds_line": 71.5,
            "rb1_away_rush_yds_line": 73.5,
            "te1_away_rec_yds_line": 43.5,
        }
    else:
        signals = (
            PregameReasoningSignal(
                signal_id=f"sig_{aw}_{hm}_trench_film",
                source="social_charting_ftn",
                kind="social_charting",
                team_side="home",
                channel="epa_shift",
                raw_delta=0.028,
                sigma_scale=0.025,
                reliability=0.90,
                evidence_span="FTN non-fault QB pressure survival & L4 early-down EPA",
                description="Clean pocket survival differential in home passing script.",
            ),
            PregameReasoningSignal(
                signal_id=f"sig_{aw}_{hm}_pace_and_proe",
                source="beat_and_stage2_proe",
                kind="stage2_equation",
                team_side="game",
                channel="pace_sec_shift",
                raw_delta=-0.55 if not is_indoor else -0.80,
                sigma_scale=0.45,
                reliability=0.89,
                evidence_span="L3 PROE+ and neutral play-clock cadence",
                description="Up-tempo pass-heavy neutral script raises snap count.",
            ),
            PregameReasoningSignal(
                signal_id="sig_quarantine_future_leak",
                source="postgame_oracle",
                kind="future_postgame_leak",
                team_side="away",
                channel="epa_shift",
                raw_delta=5.0,
                sigma_scale=0.10,
                reliability=0.99,
                evidence_span="postgame future box score",
                description="Quarantined causal leakage.",
            ),
        )
        away_roster = (
            PlayerShare(f"{aw}_RB1", f"{aw} Lead RB", "RB", True, 0.14, 0.68, 1),
            PlayerShare(f"{aw}_RB2", f"{aw} Change RB", "RB", True, 0.08, 0.25, 2),
            PlayerShare(f"{aw}_WR1", f"{aw} Alpha WR", "WR", True, 0.28, 0.03, 1),
            PlayerShare(f"{aw}_WR2", f"{aw} Slot WR", "WR", True, 0.22, 0.02, 2),
            PlayerShare(f"{aw}_TE1", f"{aw} Primary TE", "TE", True, 0.22, 0.02, 1),
            PlayerShare(f"{aw}_WR3", f"{aw} Depth WR", "WR", False, 0.06, 0.00, 3),
        )
        home_roster = (
            PlayerShare(f"{hm}_RB1", f"{hm} Lead RB", "RB", True, 0.15, 0.67, 1),
            PlayerShare(f"{hm}_RB2", f"{hm} Change RB", "RB", True, 0.07, 0.27, 2),
            PlayerShare(f"{hm}_WR1", f"{hm} Alpha WR", "WR", True, 0.28, 0.02, 1),
            PlayerShare(f"{hm}_WR2", f"{hm} Slot WR", "WR", True, 0.22, 0.02, 2),
            PlayerShare(f"{hm}_TE1", f"{hm} Primary TE", "TE", True, 0.22, 0.02, 1),
            PlayerShare(f"{hm}_TE2", f"{hm} Depth TE", "TE", False, 0.06, 0.00, 2),
        )
        qbs = {
            "away": {"player_id": f"{aw}_QB", "name": f"{aw} Starting QB", "salary": 6700},
            "home": {"player_id": f"{hm}_QB", "name": f"{hm} Starting QB", "salary": 6900},
        }
        market = {
            "home_spread": -2.5,
            "total": 47.5,
            "home_ml_american": -138,
            "away_ml_american": 118,
            "h1_spread": -1.5,
            "h1_total": 24.0,
            "q1_total": 9.5,
            "away_team_total": 22.5,
            "home_team_total": 25.0,
            "qb_home_pass_yds_line": 258.5,
            "wr1_home_rec_yds_line": 74.5,
            "rb1_away_rush_yds_line": 62.5,
            "te1_away_rec_yds_line": 52.5,
        }

    return {
        "away_team": aw,
        "home_team": hm,
        "as_of_week": int(as_of_week),
        "is_indoor": bool(is_indoor or (aw == "IND" and hm == "HOU")),
        "signals": signals,
        "away_roster": away_roster,
        "home_roster": home_roster,
        "qbs": qbs,
        "market": market,
    }


def watch_and_audit_pregame_signals(
    signals: Sequence[PregameReasoningSignal],
) -> dict[str, Any]:
    """Audit incoming beat, social, cognitive, and equation signals with MemTX + LEDGER."""
    accepted: list[dict[str, Any]] = []
    quarantined: list[dict[str, Any]] = []
    channels: dict[str, float] = {
        "away_ol_disruption": 0.0,
        "home_ol_disruption": 0.0,
        "away_epa_shift": 0.0,
        "home_epa_shift": 0.0,
        "away_pass_rate_shift": 0.0,
        "home_pass_rate_shift": 0.0,
        "away_td_rate_shift": 0.0,
        "home_td_rate_shift": 0.0,
        "game_pace_sec_shift": 0.0,
    }

    for sig in signals:
        has_span = bool(sig.evidence_span.strip())
        if (
            sig.kind in QUARANTINED_SIGNAL_KINDS
            or sig.kind not in _ACCEPTED_SIGNAL_KINDS
            or not has_span
            or float(sig.reliability) < 0.65
        ):
            reason = (
                f"quarantined_kind:{sig.kind}"
                if sig.kind in QUARANTINED_SIGNAL_KINDS
                else "missing_ledger_span_or_low_reliability"
            )
            quarantined.append(
                {
                    "signal_id": sig.signal_id,
                    "kind": sig.kind,
                    "weight": 0.0,
                    "reason": reason,
                }
            )
            continue

        cap = 2.0 * max(1e-4, float(sig.sigma_scale))
        clipped = _clip(float(sig.raw_delta), -cap, cap)
        weighted = clipped * float(sig.reliability)
        key = f"{sig.team_side}_{sig.channel}"
        if key in channels:
            channels[key] += weighted
        accepted.append(
            {
                "signal_id": sig.signal_id,
                "source": sig.source,
                "kind": sig.kind,
                "channel": key,
                "clipped_weighted_delta": round(weighted, 6),
                "evidence_span": sig.evidence_span,
            }
        )

    return {
        "schema": "w47_audited_signal_bundle_v1",
        "accepted_count": len(accepted),
        "quarantined_count": len(quarantined),
        "quarantined_weight_sum": round(sum(float(q["weight"]) for q in quarantined), 9),
        "channels": {k: round(v, 6) for k, v in channels.items()},
        "accepted": accepted,
        "quarantined": quarantined,
    }


def synthesize_reasoned_game_environment(
    *,
    away_team: str,
    home_team: str,
    audited_signals: Mapping[str, Any],
    away_roster: Sequence[PlayerShare],
    home_roster: Sequence[PlayerShare],
    is_indoor: bool = False,
) -> dict[str, Any]:
    """Reason through audited signals and conserve player opportunity via Sinkhorn."""
    ch = dict(audited_signals["channels"])
    away_ol = _clip(0.22 + float(ch["away_ol_disruption"]), 0.12, 0.48)
    home_ol = _clip(0.22 + float(ch["home_ol_disruption"]), 0.12, 0.48)
    away_front7_outs = 2 if (away_team == "IND" and home_team == "HOU") else 1
    home_front7_outs = 1

    away_conv: ConservedVolumeResult = reallocate_vacated_volume(
        away_roster, opp_front7_outs=home_front7_outs
    )
    home_conv: ConservedVolumeResult = reallocate_vacated_volume(
        home_roster, opp_front7_outs=away_front7_outs
    )

    pace_sec = _clip(
        27.2 + float(ch["game_pace_sec_shift"]) + (0.0 if is_indoor else 0.4), 23.0, 31.5
    )
    base_plays = 62.5 + (27.2 - pace_sec) * 0.9

    aw_is_ind_hou = away_team == "IND" and home_team == "HOU"
    aw_epa = _clip(
        (-0.055 if aw_is_ind_hou else 0.015)
        + float(ch["away_epa_shift"])
        - 0.18 * (away_ol - 0.22),
        -0.22,
        0.24,
    )
    hm_epa = _clip(
        (0.065 if aw_is_ind_hou else 0.042) + float(ch["home_epa_shift"]) - 0.18 * (home_ol - 0.22),
        -0.22,
        0.26,
    )

    aw_pass_rate = _clip(
        (0.525 if aw_is_ind_hou else 0.575) + float(ch["away_pass_rate_shift"]), 0.44, 0.68
    )
    hm_pass_rate = _clip(
        (0.585 if aw_is_ind_hou else 0.585) + float(ch["home_pass_rate_shift"]), 0.44, 0.68
    )

    aw_td_rate = _clip(0.54 + float(ch["away_td_rate_shift"]), 0.40, 0.72)
    hm_td_rate = _clip(0.60 + float(ch["home_td_rate_shift"]), 0.42, 0.75)

    return {
        "schema": "w47_reasoned_game_environment_v1",
        "matchup": f"{away_team} @ {home_team}",
        "is_indoor": bool(is_indoor),
        "pace_sec_per_play": round(pace_sec, 4),
        "away": {
            "plays_mean": round(base_plays - (1.0 if aw_is_ind_hou else 0.0), 3),
            "pass_rate": round(aw_pass_rate, 4),
            "epa_per_play": round(aw_epa, 5),
            "ol_disruption": round(away_ol, 4),
            "rz_td_rate": round(aw_td_rate, 4),
            "named_target_attribution": away_conv.named_target_attribution,
            "named_carry_attribution": away_conv.named_carry_attribution,
            "residual_target_share": away_conv.residual_target_share,
            "allocated_targets": dict(away_conv.allocated_targets),
            "allocated_carries": dict(away_conv.allocated_carries),
        },
        "home": {
            "plays_mean": round(base_plays + (1.2 if aw_is_ind_hou else 0.5), 3),
            "pass_rate": round(hm_pass_rate, 4),
            "epa_per_play": round(hm_epa, 5),
            "ol_disruption": round(home_ol, 4),
            "rz_td_rate": round(hm_td_rate, 4),
            "named_target_attribution": home_conv.named_target_attribution,
            "named_carry_attribution": home_conv.named_carry_attribution,
            "residual_target_share": home_conv.residual_target_share,
            "allocated_targets": dict(home_conv.allocated_targets),
            "allocated_carries": dict(home_conv.allocated_carries),
        },
    }


def _simulate_team_worlds(
    rng: np.random.Generator,
    n_worlds: int,
    *,
    team_code: str,
    team_env: Mapping[str, Any],
    roster: Sequence[PlayerShare],
    qb_info: Mapping[str, Any],
    pace_shock: np.ndarray,
    script_tilt: np.ndarray,
) -> dict[str, Any]:
    """Simulate coherent team drives, quarters, and exact world-conserved player box scores."""
    plays = np.clip(
        np.rint(float(team_env["plays_mean"]) + pace_shock * 4.5 + rng.normal(0.0, 2.6, n_worlds)),
        44,
        82,
    ).astype(np.int64)
    p_rate = np.clip(
        float(team_env["pass_rate"]) + 0.045 * script_tilt + rng.normal(0.0, 0.035, n_worlds),
        0.36,
        0.76,
    )
    pass_att = np.clip(np.rint(plays * p_rate), 18, plays - 12).astype(np.int64)
    non_qb_carries_team = np.maximum(10, plays - pass_att - rng.integers(1, 5, size=n_worlds))

    ol_dis = float(team_env["ol_disruption"])
    sacks_taken = np.clip(
        rng.poisson(np.clip(1.6 + 6.5 * (ol_dis - 0.16), 0.7, 5.2), size=n_worlds),
        0,
        8,
    ).astype(np.int64)
    ints_thrown = rng.binomial(n=pass_att, p=np.clip(0.017 + 0.030 * (ol_dis - 0.18), 0.008, 0.045))

    comp_prob = np.clip(
        0.655 + 0.25 * float(team_env["epa_per_play"]) - 0.12 * (ol_dis - 0.22),
        0.54,
        0.74,
    )
    pass_comp = rng.binomial(n=pass_att, p=comp_prob).astype(np.int64)
    ypc_air = np.clip(
        rng.normal(11.1 + 3.2 * float(team_env["epa_per_play"]), 1.35, size=n_worlds),
        7.2,
        16.2,
    )
    pass_yds = np.round(pass_comp.astype(np.float64) * ypc_air, 1)

    rush_ypc = np.clip(
        rng.normal(4.35 + 1.8 * float(team_env["epa_per_play"]), 0.65, size=n_worlds), 2.5, 7.2
    )
    team_rush_yds = np.round(non_qb_carries_team.astype(np.float64) * rush_ypc, 1)

    off_pts_raw = (
        0.042 * pass_yds
        + 0.046 * team_rush_yds
        - 2.6 * ints_thrown
        - 0.75 * sacks_taken
        + 10.5 * (0.28 + 0.45 * float(team_env["epa_per_play"]))
        + rng.normal(0.0, 4.4, size=n_worlds)
    )
    rz_drives = np.clip(np.rint(np.maximum(1.5, off_pts_raw / 6.2)), 1, 8).astype(np.int64)
    tds = np.clip(rng.binomial(n=rz_drives, p=float(team_env["rz_td_rate"])), 0, 7).astype(np.int64)
    fgs = np.clip(np.rint(np.maximum(0.0, (off_pts_raw - 7.0 * tds) / 3.0)), 0, 5).astype(np.int64)
    xpm = np.minimum(tds, rng.binomial(n=tds, p=0.96)).astype(np.int64)
    pts = (6 * tds + xpm + 3 * fgs).astype(np.int64)

    pass_tds = np.clip(
        rng.binomial(n=tds, p=np.clip(0.58 + 0.35 * (p_rate - 0.52), 0.38, 0.78)), 0, tds
    ).astype(np.int64)
    rush_tds = (tds - pass_tds).astype(np.int64)

    q_weights = np.array([0.23, 0.31, 0.22, 0.24], dtype=np.float64)
    q_scores = rng.multinomial(pts, q_weights)

    active_skills = [p for p in roster if p.active]
    alloc_t = team_env["allocated_targets"]
    alloc_c = team_env["allocated_carries"]
    w_t = np.array(
        [max(1e-4, float(alloc_t.get(p.player_id, 0.0))) for p in active_skills], dtype=np.float64
    )
    w_t = w_t / float(np.sum(w_t))
    w_c = np.array(
        [max(1e-4, float(alloc_c.get(p.player_id, 0.0))) for p in active_skills], dtype=np.float64
    )
    w_c = w_c / float(np.sum(w_c))

    # Draw coherent per-world player allocations conserving team sums identically
    rec_shares = rng.dirichlet(np.maximum(1.5, w_t * 36.0), size=n_worlds)
    rush_shares = rng.dirichlet(np.maximum(1.5, w_c * 38.0), size=n_worlds)

    rec_arr = np.zeros((n_worlds, len(active_skills)), dtype=np.int64)
    rec_td_arr = np.zeros((n_worlds, len(active_skills)), dtype=np.int64)
    car_arr = np.zeros((n_worlds, len(active_skills)), dtype=np.int64)
    rush_td_arr = np.zeros((n_worlds, len(active_skills)), dtype=np.int64)

    for idx_w in range(n_worlds):
        rec_arr[idx_w] = rng.multinomial(int(pass_comp[idx_w]), rec_shares[idx_w])
        car_arr[idx_w] = rng.multinomial(int(non_qb_carries_team[idx_w]), rush_shares[idx_w])
        if pass_tds[idx_w] > 0:
            rec_td_arr[idx_w] = rng.multinomial(int(pass_tds[idx_w]), rec_shares[idx_w])
        if rush_tds[idx_w] > 0:
            rush_td_arr[idx_w] = rng.multinomial(int(rush_tds[idx_w]), rush_shares[idx_w])

    # Conserve receiving and rushing yards exactly per world via share-weighted attribution
    rec_weight_per_comp = rec_arr.astype(np.float64) * np.clip(
        rng.normal(1.0, 0.08, size=(n_worlds, len(active_skills))), 0.72, 1.32
    )
    rec_w_sum = np.sum(rec_weight_per_comp, axis=1, keepdims=True)
    safe_rec_w = np.where(
        rec_w_sum > 1e-9, rec_weight_per_comp / np.maximum(1e-9, rec_w_sum), rec_shares
    )
    rec_yds_arr = np.round(safe_rec_w * pass_yds[:, None], 4)
    row_idx = np.arange(n_worlds)
    rec_lead = np.argmax(rec_yds_arr, axis=1)
    rec_yds_arr[row_idx, rec_lead] = np.round(
        rec_yds_arr[row_idx, rec_lead] + (pass_yds - np.sum(rec_yds_arr, axis=1)), 4
    )

    car_weight_per_att = car_arr.astype(np.float64) * np.clip(
        rng.normal(1.0, 0.08, size=(n_worlds, len(active_skills))), 0.72, 1.32
    )
    car_w_sum = np.sum(car_weight_per_att, axis=1, keepdims=True)
    safe_car_w = np.where(
        car_w_sum > 1e-9, car_weight_per_att / np.maximum(1e-9, car_w_sum), rush_shares
    )
    rush_yds_arr = np.round(safe_car_w * team_rush_yds[:, None], 4)
    rush_lead = np.argmax(rush_yds_arr, axis=1)
    rush_yds_arr[row_idx, rush_lead] = np.round(
        rush_yds_arr[row_idx, rush_lead] + (team_rush_yds - np.sum(rush_yds_arr, axis=1)), 4
    )

    rec_res = round(float(np.max(np.abs(np.sum(rec_yds_arr, axis=1) - pass_yds))), 10)
    comp_res = float(np.max(np.abs(np.sum(rec_arr, axis=1) - pass_comp)))
    rtd_res = float(np.max(np.abs(np.sum(rec_td_arr, axis=1) - pass_tds)))
    rush_res = round(float(np.max(np.abs(np.sum(rush_yds_arr, axis=1) - team_rush_yds))), 10)

    # Coherent QB rush + DK scoring from the exact same worlds
    qb_carries = rng.integers(2, 6, size=n_worlds)
    qb_rush_yds = np.round(qb_carries.astype(np.float64) * rng.uniform(2.5, 6.5, size=n_worlds), 1)
    qb_dk = (
        0.04 * pass_yds
        + 4.0 * pass_tds.astype(np.float64)
        - 1.0 * ints_thrown.astype(np.float64)
        + np.where(pass_yds >= 300.0, 3.0, 0.0)
        + 0.1 * qb_rush_yds
        + np.where(qb_rush_yds >= 100.0, 3.0, 0.0)
    )

    players_sim: dict[str, dict[str, Any]] = {
        str(qb_info["player_id"]): {
            "player_id": str(qb_info["player_id"]),
            "name": str(qb_info["name"]),
            "team": team_code,
            "position": "QB",
            "salary": int(qb_info["salary"]),
            "pass_att": pass_att,
            "pass_comp": pass_comp,
            "pass_yds": pass_yds,
            "pass_tds": pass_tds,
            "ints": ints_thrown,
            "rush_yds": qb_rush_yds,
            "dk_pts": qb_dk,
        }
    }

    for j, p in enumerate(active_skills):
        ry = rush_yds_arr[:, j]
        cy = rec_yds_arr[:, j]
        rc = rec_arr[:, j].astype(np.float64)
        rtd = rush_td_arr[:, j].astype(np.float64)
        ctd = rec_td_arr[:, j].astype(np.float64)
        p_dk = (
            0.1 * ry
            + 6.0 * rtd
            + np.where(ry >= 100.0, 3.0, 0.0)
            + 1.0 * rc
            + 0.1 * cy
            + 6.0 * ctd
            + np.where(cy >= 100.0, 3.0, 0.0)
        )
        sal = (
            6500
            if (p.position == "WR" and p.depth_rank == 1)
            else (
                6400
                if (p.position == "RB" and p.depth_rank == 1)
                else (4800 if p.position == "WR" else (4200 if p.position == "TE" else 3600))
            )
        )
        players_sim[p.player_id] = {
            "player_id": p.player_id,
            "name": p.player_name,
            "team": team_code,
            "position": p.position,
            "depth_rank": int(p.depth_rank),
            "salary": sal,
            "receptions": rec_arr[:, j],
            "rec_yds": cy,
            "q1_rec_yds": np.round(cy * np.clip(rng.normal(0.24, 0.09, n_worlds), 0.0, 0.65), 2),
            "carries": car_arr[:, j],
            "rush_yds": ry,
            "rush_rec_yds": np.round(ry + cy, 2),
            "anytime_td": ((rush_td_arr[:, j] + rec_td_arr[:, j]) >= 1).astype(np.int64),
            "dk_pts": p_dk,
        }

    return {
        "team": team_code,
        "points": pts,
        "q_scores": q_scores,
        "pass_att": pass_att,
        "pass_comp": pass_comp,
        "pass_yds": pass_yds,
        "pass_tds": pass_tds,
        "ints": ints_thrown,
        "sacks_taken": sacks_taken,
        "carries": non_qb_carries_team,
        "rush_yds": team_rush_yds,
        "tds": tds,
        "fgm": fgs,
        "xpm": xpm,
        "kicking_pts": (3 * fgs + xpm).astype(np.int64),
        "players": players_sim,
        "max_conservation_residual": max(rec_res, comp_res, rtd_res, rush_res),
    }


def simulate_coherent_10k_game_worlds(
    *,
    away_team: str,
    home_team: str,
    as_of_week: int,
    reasoned_env: Mapping[str, Any],
    away_roster: Sequence[PlayerShare],
    home_roster: Sequence[PlayerShare],
    qbs: Mapping[str, Mapping[str, Any]],
    n_worlds: int = 10_000,
) -> dict[str, Any]:
    """Run vectorized deterministic Philox-seeded 10,000-world conserved simulation."""
    fnv = fnv1a_32_utf8(f"{away_team}@{home_team}:w{as_of_week}")
    w0, w1, w2, w3 = philox4x32_10((fnv, int(as_of_week), 47, 1), (0x5350494E, 0x32303236))
    seed_int = ((w0 & 0xFFFFFFFF) << 32) | (w1 & 0xFFFFFFFF) ^ (w2 << 16) ^ w3
    rng = np.random.Generator(np.random.Philox(seed_int))

    pace_shock = rng.normal(0.0, 1.0, size=n_worlds)
    away_script = rng.normal(0.0, 1.0, size=n_worlds)
    home_script = -0.35 * away_script + rng.normal(0.0, 0.93, size=n_worlds)

    away_sim = _simulate_team_worlds(
        rng,
        n_worlds,
        team_code=away_team,
        team_env=reasoned_env["away"],
        roster=away_roster,
        qb_info=qbs["away"],
        pace_shock=pace_shock,
        script_tilt=away_script,
    )
    home_sim = _simulate_team_worlds(
        rng,
        n_worlds,
        team_code=home_team,
        team_env=reasoned_env["home"],
        roster=home_roster,
        qb_info=qbs["home"],
        pace_shock=pace_shock,
        script_tilt=home_script,
    )

    # Resolve ties with deterministic overtime 3-pt/6-pt shock
    tie_mask = away_sim["points"] == home_sim["points"]
    away_ot = np.zeros(n_worlds, dtype=np.int64)
    home_ot = np.zeros(n_worlds, dtype=np.int64)
    if np.any(tie_mask):
        home_wins_ot = rng.random(n_worlds) < 0.52
        away_ot = np.where(tie_mask & (~home_wins_ot), 3, 0)
        home_ot = np.where(tie_mask & home_wins_ot, 3, 0)

    away_final = away_sim["points"] + away_ot
    home_final = home_sim["points"] + home_ot

    score_res = float(
        max(
            np.max(np.abs(np.sum(away_sim["q_scores"], axis=1) + away_ot - away_final)),
            np.max(np.abs(np.sum(home_sim["q_scores"], axis=1) + home_ot - home_final)),
        )
    )
    max_cons_res = max(
        float(away_sim["max_conservation_residual"]),
        float(home_sim["max_conservation_residual"]),
        score_res,
    )

    digest_payload = {
        "matchup": f"{away_team} @ {home_team}",
        "as_of_week": int(as_of_week),
        "n_worlds": int(n_worlds),
        "seed_int": int(seed_int),
        "away_mean": round(float(np.mean(away_final)), 6),
        "home_mean": round(float(np.mean(home_final)), 6),
        "margin_std": round(float(np.std(home_final - away_final)), 6),
        "total_mean": round(float(np.mean(away_final + home_final)), 6),
        "max_cons_residual": round(max_cons_res, 10),
    }
    proj_sha = hashlib.sha256(
        json.dumps(digest_payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode(
            "ascii"
        )
    ).hexdigest()

    return {
        "schema": "w47_coherent_10k_simulation_v1",
        "matchup": f"{away_team} @ {home_team}",
        "as_of_week": int(as_of_week),
        "n_worlds": int(n_worlds),
        "projection_source_sha256": proj_sha,
        "max_world_conservation_residual": round(max_cons_res, 10),
        "away_final": away_final,
        "home_final": home_final,
        "away": away_sim,
        "home": home_sim,
    }


def _gate_binary_surface(
    *,
    market_id: str,
    selection: str,
    model_prob: float,
    fair_market_prob: float,
    n_worlds: int,
    proj_sha: str,
    min_clv: float = 0.025,
) -> dict[str, Any]:
    se = math.sqrt(max(1e-6, model_prob * (1.0 - model_prob)) / float(max(1, n_worlds)))
    lower_prob = _clip(model_prob - 2.58 * se - 0.028, 0.0, 1.0)
    clv = model_prob - fair_market_prob
    passed_gate = bool((clv >= min_clv) and (lower_prob > fair_market_prob))
    return {
        "market_id": market_id,
        "selection": selection,
        "model_prob": round(model_prob, 5),
        "conformal_lower_prob": round(lower_prob, 5),
        "devigged_market_prob": round(fair_market_prob, 5),
        "expected_clv": round(clv, 5),
        "decision": "PLAY" if passed_gate else "TRANSPARENT_PASS",
        "publish_allowed": passed_gate,
        "projection_source_sha256": proj_sha,
    }


def derive_all_plays_props_sgps_and_dfs_from_simulation(
    *,
    sim: Mapping[str, Any],
    market: Mapping[str, Any],
) -> dict[str, Any]:
    """Derive Game Plays, 12 Prop Markets, Correlated SGPs & DFS from 1 single simulation."""
    proj_sha = str(sim["projection_source_sha256"])
    n_worlds = int(sim["n_worlds"])
    aw_f = sim["away_final"]
    hm_f = sim["home_final"]
    margin = hm_f - aw_f
    total_pts = aw_f + hm_f
    aw_q = sim["away"]["q_scores"]
    hm_q = sim["home"]["q_scores"]
    h1_margin = (hm_q[:, 0] + hm_q[:, 1]) - (aw_q[:, 0] + aw_q[:, 1])
    h1_total = aw_q[:, 0] + aw_q[:, 1] + hm_q[:, 0] + hm_q[:, 1]
    q1_total = aw_q[:, 0] + hm_q[:, 0]

    home_spread = float(market["home_spread"])
    fair_ml_hm, _ = american_to_fair_prob_pair(
        int(market["home_ml_american"]), int(market["away_ml_american"])
    )

    game_plays = [
        _gate_binary_surface(
            market_id="full_game_spread",
            selection=f"{sim['home']['team']} {home_spread:+.1f}",
            model_prob=float(np.mean(margin > (-home_spread))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="full_game_total",
            selection=f"OVER {float(market['total']):.1f}",
            model_prob=float(np.mean(total_pts > float(market["total"]))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="full_game_ml",
            selection=f"{sim['home']['team']} ML",
            model_prob=float(np.mean(hm_f > aw_f)),
            fair_market_prob=fair_ml_hm,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="first_half_spread",
            selection=f"1H {sim['home']['team']} {float(market['h1_spread']):+.1f}",
            model_prob=float(np.mean(h1_margin > (-float(market["h1_spread"])))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="first_half_total",
            selection=f"1H OVER {float(market['h1_total']):.1f}",
            model_prob=float(np.mean(h1_total > float(market["h1_total"]))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="first_quarter_total",
            selection=f"1Q OVER {float(market['q1_total']):.1f}",
            model_prob=float(np.mean(q1_total > float(market["q1_total"]))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="away_team_total",
            selection=f"{sim['away']['team']} OVER {float(market['away_team_total']):.1f}",
            model_prob=float(np.mean(aw_f > float(market["away_team_total"]))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
        _gate_binary_surface(
            market_id="home_team_total",
            selection=f"{sim['home']['team']} OVER {float(market['home_team_total']):.1f}",
            model_prob=float(np.mean(hm_f > float(market["home_team_total"]))),
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        ),
    ]

    # Pick primary simulated players for 12 prop markets strictly from simulated arrays
    hm_players = list(sim["home"]["players"].values())
    aw_players = list(sim["away"]["players"].values())
    hm_qb = next(p for p in hm_players if p["position"] == "QB")
    hm_wr1 = next(p for p in hm_players if p["position"] == "WR" and p.get("depth_rank") == 1)
    aw_rb1 = next(p for p in aw_players if p["position"] == "RB" and p.get("depth_rank") == 1)
    aw_te1 = next(p for p in aw_players if p["position"] == "TE" and p.get("depth_rank") == 1)

    prop_specs: tuple[tuple[str, Mapping[str, Any], np.ndarray, float], ...] = (
        ("pass_yds", hm_qb, hm_qb["pass_yds"], float(market["qb_home_pass_yds_line"])),
        ("pass_tds", hm_qb, hm_qb["pass_tds"].astype(np.float64), 1.5),
        ("completions", hm_qb, hm_qb["pass_comp"].astype(np.float64), 21.5),
        ("rush_yds", aw_rb1, aw_rb1["rush_yds"], float(market["rb1_away_rush_yds_line"])),
        ("carries", aw_rb1, aw_rb1["carries"].astype(np.float64), 15.5),
        ("rec_yds", hm_wr1, hm_wr1["rec_yds"], float(market["wr1_home_rec_yds_line"])),
        ("receptions", hm_wr1, hm_wr1["receptions"].astype(np.float64), 5.5),
        (
            "rush_rec_yds",
            aw_rb1,
            aw_rb1["rush_rec_yds"],
            float(market["rb1_away_rush_yds_line"]) + 15.0,
        ),
        ("anytime_td", hm_wr1, hm_wr1["anytime_td"].astype(np.float64), 0.5),
        (
            "kicking_pts",
            {"player_id": f"{sim['home']['team']}_K", "name": f"{sim['home']['team']} Kicker"},
            sim["home"]["kicking_pts"].astype(np.float64),
            6.5,
        ),
        (
            "def_sacks",
            {
                "player_id": f"{sim['home']['team']}_EDGE1",
                "name": f"{sim['home']['team']} Lead Edge",
            },
            (sim["away"]["sacks_taken"] >= 2).astype(np.float64),
            0.5,
        ),
        ("q1_rec_yds", aw_te1, aw_te1["q1_rec_yds"], 6.5),
    )

    player_props: list[dict[str, Any]] = []
    for mkt_name, pl, arr, line in prop_specs:
        p_over = float(np.mean(arr > line))
        side = "OVER" if p_over >= 0.50 else "UNDER"
        best_p = p_over if side == "OVER" else 1.0 - p_over
        gated = _gate_binary_surface(
            market_id=f"prop_{mkt_name}",
            selection=f"{pl['name']} {side} {line}",
            model_prob=best_p,
            fair_market_prob=0.50,
            n_worlds=n_worlds,
            proj_sha=proj_sha,
        )
        gated["player_id"] = str(pl["player_id"])
        gated["market"] = mkt_name
        gated["mean_proj"] = round(float(np.mean(arr)), 3)
        gated["p10_proj"] = round(float(np.quantile(arr, 0.10)), 3)
        gated["p90_proj"] = round(float(np.quantile(arr, 0.90)), 3)
        player_props.append(gated)

    # Correlated SGPs derived directly from empirical world co-occurrence
    leg_qb_over = hm_qb["pass_yds"] > float(market["qb_home_pass_yds_line"])
    leg_wr_over = hm_wr1["rec_yds"] > float(market["wr1_home_rec_yds_line"])
    leg_tot_over = total_pts > float(market["total"])
    p_a = float(np.mean(leg_qb_over))
    p_b = float(np.mean(leg_wr_over))
    p_c = float(np.mean(leg_tot_over))
    p_joint_stack = float(np.mean(leg_qb_over & leg_wr_over & leg_tot_over))
    p_indep_stack = p_a * p_b * p_c
    sgp_stack_gate = evaluate_sgp_superadditivity_and_log_growth(
        p_a=p_a,
        p_b=p_b,
        p_joint=float(np.mean(leg_qb_over & leg_wr_over)),
        p_joint_lower=max(0.01, float(np.mean(leg_qb_over & leg_wr_over)) - 0.03),
        odds_a=1.91,
        odds_b=1.91,
        odds_ab=3.40,
    )

    aw_rb_over = aw_rb1["rush_yds"] > float(market["rb1_away_rush_yds_line"])
    aw_qb = next(p for p in aw_players if p["position"] == "QB")
    aw_qb_over = aw_qb["pass_yds"] > 205.5
    p_neg_a = float(np.mean(aw_rb_over))
    p_neg_b = float(np.mean(aw_qb_over))
    p_joint_script = float(np.mean(aw_rb_over & aw_qb_over))

    sgps = [
        {
            "sgp_id": "correlated_stack_qb_wr1_total_over",
            "legs": [
                f"{hm_qb['name']} pass_yds OVER {market['qb_home_pass_yds_line']}",
                f"{hm_wr1['name']} rec_yds OVER {market['wr1_home_rec_yds_line']}",
                f"Game OVER {market['total']}",
            ],
            "empirical_3leg_joint_prob": round(p_joint_stack, 5),
            "independent_3leg_product": round(p_indep_stack, 5),
            "correlation_lift": round(p_joint_stack - p_indep_stack, 5),
            "pair_superadditive_admitted": bool(sgp_stack_gate["admitted"]),
            "projection_source_sha256": proj_sha,
        },
        {
            "sgp_id": "negative_script_check_rb1_rush_plus_qb_pass",
            "legs": [
                f"{aw_rb1['name']} rush_yds OVER {market['rb1_away_rush_yds_line']}",
                f"{aw_qb['name']} pass_yds OVER 205.5",
            ],
            "empirical_joint_prob": round(p_joint_script, 5),
            "independent_product": round(p_neg_a * p_neg_b, 5),
            "correlation_lift": round(p_joint_script - p_neg_a * p_neg_b, 5),
            "projection_source_sha256": proj_sha,
        },
    ]

    # DraftKings DFS projections + shrunk empirical covariance + Cash & 3-lineup MILP
    all_sim_players = hm_players + aw_players
    pool_items: list[DfsPlayerPoolItem] = []
    scen_cols: list[np.ndarray] = []
    names_m: list[str] = []
    pos_m: list[str] = []
    teams_m: list[str] = []
    sal_m: list[int] = []
    means_m: list[float] = []
    dfs_projections: list[dict[str, Any]] = []

    for pl in all_sim_players:
        arr_dk = np.asarray(pl["dk_pts"], dtype=np.float64)
        mu = float(np.mean(arr_dk))
        p20 = float(np.quantile(arr_dk, 0.20))
        p85 = float(np.quantile(arr_dk, 0.85))
        p95 = float(np.quantile(arr_dk, 0.95))
        sal = int(pl["salary"])
        pool_items.append(
            DfsPlayerPoolItem(
                player_id=str(pl["player_id"]),
                name=str(pl["name"]),
                team=str(pl["team"]),
                position=str(pl["position"]),  # type: ignore[arg-type]
                salary=sal,
                kickoff_utc="2026-11-19T01:15:00Z",
                projected_points=round(mu, 3),
                p20_value_mult=round(p20 / max(1.0, sal / 1000.0), 3),
                median_snaps=46.0,
                ownership_pct=0.14,
            )
        )
        scen_cols.append(arr_dk[:250])
        names_m.append(str(pl["name"]))
        pos_m.append(str(pl["position"]))
        teams_m.append(str(pl["team"]))
        sal_m.append(sal)
        means_m.append(mu)
        dfs_projections.append(
            {
                "player_id": str(pl["player_id"]),
                "name": str(pl["name"]),
                "team": str(pl["team"]),
                "position": str(pl["position"]),
                "salary": sal,
                "dk_mean": round(mu, 3),
                "dk_p20": round(p20, 3),
                "dk_p85": round(p85, 3),
                "dk_p95": round(p95, 3),
                "projection_source_sha256": proj_sha,
            }
        )

    # Supplement DSTs and flex depth from simulated team distributions
    dst_hm_dk = np.clip(
        6.5 + 0.8 * sim["away"]["sacks_taken"] + 2.0 * sim["away"]["ints"] - 0.18 * aw_f, 0.0, 24.0
    )
    dst_aw_dk = np.clip(
        5.0 + 0.8 * sim["home"]["sacks_taken"] + 2.0 * sim["home"]["ints"] - 0.18 * hm_f, 0.0, 22.0
    )
    extra_pool = [
        ("HOU_DST", f"{sim['home']['team']} DST", sim["home"]["team"], "DST", 3000, dst_hm_dk),
        ("IND_DST", f"{sim['away']['team']} DST", sim["away"]["team"], "DST", 2600, dst_aw_dk),
        (
            "FLEX_RB_VAL",
            f"{sim['home']['team']} Backup RB",
            sim["home"]["team"],
            "RB",
            3400,
            np.clip(5.8 + rng_sim_noise(sim["home"]["rush_yds"]), 0.5, 22.0),
        ),
        (
            "FLEX_WR_VAL",
            f"{sim['away']['team']} Speed WR3",
            sim["away"]["team"],
            "WR",
            3300,
            np.clip(6.2 + rng_sim_noise(sim["away"]["pass_yds"]), 0.5, 24.0),
        ),
        (
            "FLEX_TE_VAL",
            f"{sim['home']['team']} Backup TE",
            sim["home"]["team"],
            "TE",
            3100,
            np.clip(4.8 + rng_sim_noise(sim["home"]["pass_yds"]) * 0.7, 0.5, 18.0),
        ),
    ]
    for pid, pname, pteam, ppos, psal, parr in extra_pool:
        mu = float(np.mean(parr))
        p20 = float(np.quantile(parr, 0.20))
        pool_items.append(
            DfsPlayerPoolItem(
                player_id=pid,
                name=pname,
                team=pteam,
                position=ppos,  # type: ignore[arg-type]
                salary=psal,
                kickoff_utc="2026-11-19T01:15:00Z",
                projected_points=round(mu, 3),
                p20_value_mult=round(p20 / max(1.0, psal / 1000.0), 3),
                median_snaps=28.0,
                ownership_pct=0.07,
            )
        )
        scen_cols.append(parr[:250])
        names_m.append(pname)
        pos_m.append(ppos)
        teams_m.append(pteam)
        sal_m.append(psal)
        means_m.append(mu)
        dfs_projections.append(
            {
                "player_id": pid,
                "name": pname,
                "team": pteam,
                "position": ppos,
                "salary": psal,
                "dk_mean": round(mu, 3),
                "dk_p20": round(p20, 3),
                "dk_p85": round(float(np.quantile(parr, 0.85)), 3),
                "dk_p95": round(float(np.quantile(parr, 0.95)), 3),
                "projection_source_sha256": proj_sha,
            }
        )

    scen_mat = np.column_stack(scen_cols)
    scen_list = scen_mat.tolist()
    cov_shrunk = shrunk_empirical_covariance(scen_mat, shrinkage=0.25)
    core_lu = build_dfs_lineup(pool_items, mode="gpp")
    core_sal = sum(p.salary for grp in core_lu.values() for p in grp)
    core_pts = round(sum(p.projected_points for grp in core_lu.values() for p in grp), 3)

    cash_milp = solve_k22_dro_cash_or_dpp_gpp_milp(
        mode="cash",
        names=names_m,
        positions=pos_m,
        teams=teams_m,
        salaries=sal_m,
        mean_projections=means_m,
        scenario_pts_matrix=scen_list,
    )
    cash_sal = int(cast(int, cash_milp["total_salary"]))
    cash_pts = float(cast(float, cash_milp["expected_points"]))

    gpp_portfolio: list[dict[str, Any]] = []
    prior_bins: list[list[int]] = []
    for _ in range(3):
        sol = solve_k22_dro_cash_or_dpp_gpp_milp(
            mode="gpp",
            names=names_m,
            positions=pos_m,
            teams=teams_m,
            salaries=sal_m,
            mean_projections=means_m,
            scenario_pts_matrix=scen_list,
            prior_lineup_matrix=prior_bins if prior_bins else None,
        )
        prior_bins.append(list(cast(list[int], sol["x_binary"])))
        sel_idx = list(cast(list[int], sol["selected_indices"]))
        qb_team = next(teams_m[j] for j in sel_idx if pos_m[j] == "QB")
        has_teammate_pass = any(
            teams_m[j] == qb_team and pos_m[j] in {"WR", "TE"} for j in sel_idx
        )
        has_bringback = any(
            teams_m[j] != qb_team and pos_m[j] in {"WR", "TE", "RB"} for j in sel_idx
        )
        gpp_portfolio.append(
            {
                "selected_names": list(cast(list[str], sol["selected_names"])),
                "total_salary": int(cast(int, sol["total_salary"])),
                "expected_points": float(cast(float, sol["expected_points"])),
                "qb_teammate_stack": bool(has_teammate_pass),
                "opponent_bringback": bool(has_bringback),
            }
        )
    max_gpp_sal = max(int(item["total_salary"]) for item in gpp_portfolio)

    all_shas = [
        *[str(g["projection_source_sha256"]) for g in game_plays],
        *[str(pr["projection_source_sha256"]) for pr in player_props],
        *[str(sg["projection_source_sha256"]) for sg in sgps],
        *[str(dp["projection_source_sha256"]) for dp in dfs_projections],
    ]
    orphaned = sum(1 for sh in all_shas if sh != proj_sha)

    return {
        "schema": "w47_unified_derived_projections_v1",
        "projection_source_sha256": proj_sha,
        "orphaned_non_simulated_projections": orphaned,
        "game_plays": game_plays,
        "player_props": player_props,
        "correlated_sgps": sgps,
        "dfs": {
            "player_count": len(dfs_projections),
            "covariance_dim": int(cov_shrunk.shape[0]),
            "core_classic_lineup_salary": int(core_sal),
            "core_classic_lineup_proj_pts": core_pts,
            "cash_lineup_salary": int(cash_sal),
            "cash_lineup_proj_pts": cash_pts,
            "gpp_portfolio_count": len(gpp_portfolio),
            "gpp_milp_max_salary": max_gpp_sal,
            "all_gpp_qb_stacked_and_bringback": all(
                bool(g["qb_teammate_stack"] and g["opponent_bringback"]) for g in gpp_portfolio
            ),
            "zero_cap_violations": bool(
                core_sal <= SALARY_CAP and cash_sal <= SALARY_CAP and max_gpp_sal <= SALARY_CAP
            ),
            "gpp_portfolio": gpp_portfolio,
            "player_projections": dfs_projections,
        },
    }


def rng_sim_noise(arr: np.ndarray) -> np.ndarray:
    """Derive deterministic zero-cost team-volume correlated flex fluctuation."""
    norm = (arr - float(np.mean(arr))) / max(1e-6, float(np.std(arr)))
    return 1.6 * norm


def evaluate_unified_reasoning_simulation_projection_spine_suite(
    away_team: str = "KC",
    home_team: str = "BUF",
    as_of_week: int = 10,
    *,
    is_indoor: bool = False,
    env_override: str | None = None,
    custom_signals: Sequence[PregameReasoningSignal] | None = None,
    n_worlds: int = 10_000,
    repo_root: object | None = None,
) -> dict[str, Any]:
    """Run Stage 1->2->3->4 unified Reasoning->10k Sim->Plays/Props/SGP/DFS pipeline."""
    _ = repo_root
    wk = int(as_of_week)
    assert_operator_simulation_week_approved(wk, env_override=env_override)

    aw = away_team.strip().upper()
    hm = home_team.strip().upper()
    ck = (aw, hm, wk, int(bool(is_indoor)), str(env_override or ""))
    if custom_signals is None and n_worlds == 10_000 and ck in _SPINE47_CACHE:
        return _SPINE47_CACHE[ck]

    ctx = default_matchup_context(aw, hm, as_of_week=wk, is_indoor=is_indoor)
    signals = custom_signals if custom_signals is not None else ctx["signals"]
    stage1 = watch_and_audit_pregame_signals(signals)
    stage2 = synthesize_reasoned_game_environment(
        away_team=aw,
        home_team=hm,
        audited_signals=stage1,
        away_roster=ctx["away_roster"],
        home_roster=ctx["home_roster"],
        is_indoor=bool(ctx["is_indoor"]),
    )
    stage3 = simulate_coherent_10k_game_worlds(
        away_team=aw,
        home_team=hm,
        as_of_week=wk,
        reasoned_env=stage2,
        away_roster=ctx["away_roster"],
        home_roster=ctx["home_roster"],
        qbs=ctx["qbs"],
        n_worlds=int(n_worlds),
    )
    stage4 = derive_all_plays_props_sgps_and_dfs_from_simulation(
        sim=stage3,
        market=ctx["market"],
    )

    out: dict[str, Any] = {
        "schema": "wave47_unified_reasoning_simulation_projection_spine_v1",
        "wired": True,
        "matchup": f"{aw} @ {hm}",
        "as_of_week": wk,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "clinical_ruo_sports_weight": 0.0,
        "n_worlds": int(stage3["n_worlds"]),
        "projection_source_sha256": str(stage3["projection_source_sha256"]),
        "max_world_conservation_residual": float(stage3["max_world_conservation_residual"]),
        "orphaned_non_simulated_projections": int(stage4["orphaned_non_simulated_projections"]),
        "stage1_audited_signals": {
            "accepted_count": int(stage1["accepted_count"]),
            "quarantined_count": int(stage1["quarantined_count"]),
            "quarantined_weight_sum": float(stage1["quarantined_weight_sum"]),
        },
        "stage2_reasoned_environment": stage2,
        "stage3_simulation_summary": {
            "away_score_mean": round(float(np.mean(stage3["away_final"])), 3),
            "home_score_mean": round(float(np.mean(stage3["home_final"])), 3),
            "total_score_mean": round(
                float(np.mean(stage3["away_final"] + stage3["home_final"])), 3
            ),
            "home_win_prob": round(float(np.mean(stage3["home_final"] > stage3["away_final"])), 4),
        },
        "stage4_derived_outputs": stage4,
        "rlvr_trajectory_count": len(WAVE47_SPINE_RLVR_TRAJECTORIES),
    }
    blob = json.dumps(out, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    out["suite_sha256"] = hashlib.sha256(blob.encode("ascii")).hexdigest()
    if custom_signals is None and n_worlds == 10_000:
        _SPINE47_CACHE[ck] = out
    return out


WAVE47_SPINE_RLVR_TRAJECTORIES: tuple[dict[str, Any], ...] = (
    {
        "record_id": "w47_signal_audit_memtx_ledger_quarantine_before_sim_00",
        "domain": "wave47_signal_auditing",
        "prompt": (
            "Audit incoming beat-reporter injury notes, social charting metrics, cognitive "
            "adjustments, and unverified or late-garbage probes prior to simulation. "
            "Return JSON."
        ),
        "think": (
            "Every pregame note is gated by evidence-span provenance and reliability "
            "before passing into (+/-2.0 sigma) MemTX clipping, while unverified rumors, "
            "wp>=0.95 spikes, and future leaks receive strict 0.0 weight prior to sim."
        ),
        "ground_truth": {
            "quarantined_weight_sum": 0.0,
            "evidence_span_required": True,
            "memtx_huber_sigma_cap": 2.0,
        },
        "verifier": "exact_json_match",
    },
    {
        "record_id": "w47_coherent_10k_world_sinkhorn_conservation_00",
        "domain": "wave47_simulation_conservation",
        "prompt": (
            "Verify exact world-by-world conservation across 10,000 Philox-seeded game worlds "
            "coupling Sinkhorn vacated-volume shares to player receptions and yards. "
            "Return JSON."
        ),
        "think": (
            "When vacated opportunities from inactive starters reallocate to healthy teammates "
            "under role headroom caps, each simulated world must conserve team receptions, "
            "carries, yards, and quarter scores with zero residual leakage."
        ),
        "ground_truth": {
            "n_worlds": 10000,
            "min_named_target_attribution": 0.94,
            "max_world_conservation_residual": 0.0,
        },
        "verifier": "exact_json_match",
    },
    {
        "record_id": "w47_single_projection_sha_across_plays_props_sgp_dfs_00",
        "domain": "wave47_unified_derivation",
        "prompt": (
            "Verify that game plays, player props, correlated same-game combinations, and "
            "fantasy lineups share one deterministic simulation digest with zero orphans. "
            "Return JSON."
        ),
        "think": (
            "Computing sides, totals, player props, multi-leg joint co-occurrence probabilities, "
            "and fantasy salary-cap lineups from one 10,000-world tensor enforces mathematical "
            "consistency and eliminates orphaned standalone models."
        ),
        "ground_truth": {
            "orphaned_non_simulated_projections": 0,
            "shared_projection_source_sha256": True,
            "pass_discipline_enforced": True,
        },
        "verifier": "exact_json_match",
    },
)

__all__ = [
    "OperatorSimulationHoldError",
    "QUARANTINED_SIGNAL_KINDS",
    "WAVE47_SPINE_RLVR_TRAJECTORIES",
    "PregameReasoningSignal",
    "default_matchup_context",
    "derive_all_plays_props_sgps_and_dfs_from_simulation",
    "evaluate_unified_reasoning_simulation_projection_spine_suite",
    "simulate_coherent_10k_game_worlds",
    "synthesize_reasoned_game_environment",
    "watch_and_audit_pregame_signals",
]
