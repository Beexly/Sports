#!/usr/bin/env python3
"""
scripts/ops/gse_coach_mind_simulator.py — GSE Sealed Coach-First Play-by-Play Monte Carlo Simulator
& Step N Sharp-Money (money% vs ticket%) Residual Comparator.
Enforces all Stage A-E invariants and Standing Rules 1-10:
  1. Runtime-resolved Tuesday 04:00 CT (v1.0) seal verification (coach tau=0.42, QB_QUESTIONABLE=0.0947).
  2. Read-only MappingProxyType lock on the sealed object (zero mid-week re-estimation).
  3. Sinkhorn-Knopp optimal transport target reallocation under fixed cost matrix C + HHI load scaling.
  4. Play-by-play state-conditioned transition lookup + inverse-MDP 4th-down slice (tau=0.42)
     + Empirical Bayes BTL shrinkage R = (I + A*S)^(-1).
  5. 10,000-simulation JEV scenario stress-testing & post-simulation money% residual flags (read LAST).
"""
import argparse
import copy
import hashlib
import json
import math
import os
import sys
from pathlib import Path
from types import MappingProxyType
import numpy as np

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from intelligence.coaching.qb_disguise_blitz_matrix import (
    evaluate_qb_matchup_2x2,
    TEAM_TO_QB_2026,
    encode_mnar_missingness,
    compute_two_clocks_pressure_collision,
)
from intelligence.coaching.pressure_answer import (
    idp_tackle_funnel_adjustment,
    sack_tandem_gate_weight,
)
from intelligence.coaching.redzone import get_rz_td_pct
from intelligence.data_loaders.signal_pack_loader import (
    load_signal_pack_and_full_tables,
)
from intelligence.math.vmls_and_numpy_kernels import (
    greedy_span_increasing_row_selector,
    kkt_constrained_least_squares,
    lqr_riccati_clock_controller,
    solve_opponent_adjusted_bayesian_ridge,
    unpadded_drive_reduceat,
)
from intelligence.math.effective_theory_and_large_deviations import (
    albert_chib_markov_switching_regime_update,
    cramer_large_deviation_tilt,
    fft_compound_poisson_pmf,
    kantorovich_three_marginal_relaxation_gap,
    rademacher_t_independent_tail_bound,
    talisman_dependency_variance_multiplier,
    wigner_semicircle_marchenko_pastur_denoise,
)

QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947
LEAGUE_TARGET_HHI = 0.135

# Sunday Week 8 PBP-derived structural overlay constants (STRUCTURAL_CODE_DIFF_SKETCHES.md)
RUSH_DECAY_THRESHOLD = -0.15
RUSH_DECAY_MULT = 0.78
RZ_TD_CUTOFF = 0.25
TANDEM_DEF_SACK = 4.5
TANDEM_OFF_SACK = 5.5

# PHASE 6: Midday priors & matchup overlays (2026-10-30 AM sweep + ON3 overnight)
# FIRST_HALF_DIFF_PRIORS_2026 — @GridironInfo_ 1H scoring differential tiers through W7 (AM (1).md #5)
FIRST_HALF_DIFF_PRIORS_2026: dict[str, float] = {
    "IND": +10.0,
    "SEA": +8.7,
    "KC": +7.9,
    "GB": +3.1,
    "NYJ": -10.6,
    "TEN": -9.1,
    "CIN": -8.6,
}
# NET_POINTS_OFF_TURNOVERS_2026 — turnover-fragility ledger (ON3 (1).md #11)
# net_pts = points off turnovers for minus against; [off_pts/def_pts] where available.
NET_POINTS_OFF_TURNOVERS_2026: dict[str, dict[str, float]] = {
    "GB": {"net_pts": +35.0, "off_pts": 45.0, "def_pts": 10.0},
    "NYJ": {"net_pts": +22.0, "off_pts": 22.0, "def_pts": 0.0},
    "SEA": {"net_pts": +4.0, "off_pts": 51.0, "def_pts": 47.0},
    "NO": {"net_pts": -15.0, "off_pts": 37.0, "def_pts": 52.0},
}
# EVERO_DEF_TENURE_FLOOR — CAR defense 2nd-worst since 1999: 46.2% SR allowed, +0.08 EPA/play allowed (AM (1).md #1)
EVERO_DEF_TENURE_FLOOR: dict[str, dict[str, float]] = {
    "CAR": {"success_rate_allowed_pct": 46.2, "epa_per_play_allowed": +0.08},
}
# CHASE_BROWN_XFP_SURGE — CIN RB1 13.5 xFP/G vs 10.1 PPG facing TEN without Jeffery Simmons (ON3 #1)
CHASE_BROWN_XFP_SURGE: dict[str, object] = {
    "team": "CIN",
    "opponent": "TEN",
    "xfp_per_game": 13.5,
    "pts_per_game": 10.1,
    "rb1_carry_share_boost": 0.08,
}
# BOWERS_COMPENSATION_CHAIN_FLAG — LV @ NYJ, TE Bowers knee -> hamstring -> calf, 3-week flag (AM (1).md news)
BOWERS_COMPENSATION_CHAIN_FLAG: dict[str, object] = {
    "matchup": ("LV", "NYJ"),
    "player": "Bowers",
    "position": "TE",
    "chain": "knee -> hamstring -> calf",
    "flag_weeks": 3,
    "injury_token": "BOWERS_TE",
}

# MIDDAY-X100 (2026-10-30) SITUATIONAL HARVEST ANCHORS (Items 7-9):
# S106 / M-90 (@GridironInfo_): Kickoff Return Value by Average Drive Start (Ray Davis / BUF = 37.8)
KICKOFF_RETURN_DRIVE_START_ANCHORS_2026: dict[str, float] = {
    "BUF": 37.8,
}
# M-57..M-61 (@SumerSports): Non-Blitz Pressure Surplus anchors (GB 46.9% pressure on 28% blitz; CAR 44% blitz)
NON_BLITZ_PRESSURE_ANCHORS_2026: dict[str, dict[str, float]] = {
    "GB": {"pressure_rate": 0.469, "blitz_rate": 0.280},
    "CAR": {"pressure_rate": 0.220, "blitz_rate": 0.440},
}
# Health News (MIDDAY-X100 line 33): TB WR Emeka Egbuka cleared concussion protocol, ruled OUT Sunday (foot injury)
TB_WR_EMEKA_EGBUKA_OUT_FLAG: dict[str, object] = {
    "team": "TB",
    "player": "Emeka Egbuka",
    "position": "WR",
    "status": "OUT",
    "injury": "foot",
    "concussion_protocol_cleared": True,
    "sunday_active": False,
    "role_token": "WR2",
}


def compute_kickoff_drive_start_offset(
    avg_drive_start_yl: float,
    league_baseline_yl: float = 25.0,
) -> float:
    """
    S106 / M-90 (@GridironInfo_): Kickoff return value via average starting field position.
    Published anchor: Ray Davis (BUF) delivers a 37.8-yard average drive start.
    Returns the `yardline_100` offset `league_baseline_yl - avg_drive_start_yl`
    (negative means closer to opponent endzone; BUF 37.8 -> -12.8 yards on yardline_100).
    """
    return float(league_baseline_yl - float(avg_drive_start_yl))


def compute_rz_points_per_trip_differential(
    off_rz_pts_per_trip: float,
    def_rz_pts_allowed_per_trip: float,
) -> float:
    """
    M-01 (@sfdata9ers): Red-Zone Points Per Trip Scored vs. Allowed Differential.
    Separates defenses that bend (field goals, ~3 pts/trip) from defenses that break
    (touchdowns, ~7 pts/trip).
    """
    return float(off_rz_pts_per_trip) - float(def_rz_pts_allowed_per_trip)


def compute_non_blitz_pressure_surplus(
    pressure_rate: float,
    blitz_rate: float,
) -> float:
    """
    M-57..M-61 (@SumerSports): Non-Blitz Pressure Surplus:
        surplus = pressure_rate - 0.85 * blitz_rate.
    Published anchor: GB 46.9% pressure on 28.0% blitz -> 0.469 - 0.85 * 0.280 = +0.231
    (or +23.1 percentage points if passed in [0, 100] scale).
    """
    p = float(pressure_rate)
    b = float(blitz_rate)
    if p > 1.0 or b > 1.0:
        p /= 100.0
        b /= 100.0
    return float(p - 0.85 * b)


def apply_tau_hat_calibration_shrinkage(
    raw_margin: float,
    tau_hat: float = 6.77,
    n_held_out: int = 3988,
    held_out_only: bool = True,
    prior_sd: float = 13.5,
) -> dict[str, object]:
    """
    OVERNIGHT-ROLLUP §5: Empirical Bayes out-of-sample scale consumer for `tau_hat = +6.77`
    points measured on `n = 3,988` held-out games (`held_out_only=True`).
    Shrinks raw margin by precision ratio `prior_sd^2 / (prior_sd^2 + tau_hat^2)`.
    """
    if not held_out_only:
        raise ValueError("apply_tau_hat_calibration_shrinkage requires held_out_only=True")
    if tau_hat <= 0.0 or n_held_out < 1:
        raise ValueError("tau_hat and n_held_out must be positive")
    weight = float((prior_sd ** 2) / ((prior_sd ** 2) + (tau_hat ** 2)))
    shrunk = float(weight * float(raw_margin))
    return {
        "shrunk_margin": shrunk,
        "shrinkage_weight": weight,
        "tau_hat": float(tau_hat),
        "n_held_out": int(n_held_out),
        "held_out_only": True,
    }


def compute_postgame_dual_luck_grade(
    dtw_win_prob: float,
    actual_win: int,
    delta_wp_penalties: float,
    delta_wp_luck: float,
    *,
    context: str = "postgame",
    pregame_weight: float = 0.0,
) -> dict[str, object]:
    """
    S107 / M-62..M-66 (@run_the_sims) + M-34..M-40 (Deserve-To-Win):
    Dual postgame counterfactual luck & penalty grading engine.
    Combines situation-controlled `delta_wp_penalties + delta_wp_luck` with
    `dtw_win_prob` to strip postgame noise from coaching/execution evaluation.

    HARD FENCE: `pregame_weight = 0.0`. Unreachable from any pregame pricing path.
    """
    if pregame_weight != 0.0 or str(context).lower() != "postgame":
        raise RuntimeError(
            "POSTGAME_GRADING_FENCE_VIOLATION: compute_postgame_dual_luck_grade is strictly fenced "
            "to postgame grading (pregame_weight must be 0.0 and context must be 'postgame')."
        )
    caller_name = sys._getframe(1).f_code.co_name if hasattr(sys, "_getframe") else ""
    if caller_name in ("simulate_matchup_pbp", "evaluate_qb_matchup_2x2", "sinkhorn_reallocate_weights"):
        raise RuntimeError(
            f"POSTGAME_GRADING_FENCE_VIOLATION: unreachable from pregame pricing function '{caller_name}'"
        )
    dtw = float(np.clip(dtw_win_prob, 0.0, 1.0))
    net_luck_wp_swing = float(delta_wp_penalties) + float(delta_wp_luck)
    counterfactual_win_prob = float(np.clip(0.5 * dtw + 0.5 * np.clip(float(actual_win) - net_luck_wp_swing, 0.0, 1.0), 0.0, 1.0))
    luck_residual = float(actual_win) - counterfactual_win_prob
    return {
        "dtw_win_prob": dtw,
        "delta_wp_penalties": float(delta_wp_penalties),
        "delta_wp_luck": float(delta_wp_luck),
        "net_luck_wp_swing": net_luck_wp_swing,
        "counterfactual_win_prob": counterfactual_win_prob,
        "luck_residual": luck_residual,
        "pregame_weight": 0.0,
        "fenced_postgame_only": True,
    }

DEFAULT_SEALED_BASELINE = {
    "version": "v1.0",
    "sealedAt": "2026-10-25T04:00:00-05:00",
    "tau": 0.42,
    "injuryDropOff": 0,
    "PROB_PER_POINT": 0.033,
    "costMatrixC": [
        [0.05, 0.35, 0.55, 0.75, 0.90],
        [0.35, 0.05, 0.28, 0.50, 0.75],
        [0.55, 0.28, 0.05, 0.42, 0.65],
        [0.75, 0.50, 0.42, 0.05, 0.48],
        [0.90, 0.75, 0.65, 0.48, 0.05],
    ],
    "epaDropoffTable": {
        "QB1": 0.11,
        "QB_QUESTIONABLE": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        "OL": 0.02,
        "SKILL": 0.03,
        "DEF": -0.015,
        "execution_multipliers": {
            "QB1": 0.78, "RB1": 0.85, "WR1": 0.82, "WR2": 0.88, "TE1": 0.84, "OL": 0.91
        },
    },
    "teamRatings": {
        "PIT": {"off_epa": 0.042, "def_epa": -0.088, "pace_sec": 27.4, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": 0.012, "target_hhi": 0.142},
        "CLE": {"off_epa": -0.095, "def_epa": -0.031, "pace_sec": 26.8, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.018, "target_hhi": 0.131},
        "LV":  {"off_epa": -0.048, "def_epa": 0.012,  "pace_sec": 26.9, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.060, "target_hhi": 0.148},
        "NYJ": {"off_epa": -0.062, "def_epa": -0.045, "pace_sec": 28.1, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.005, "target_hhi": 0.125},
        "DET": {"off_epa": 0.118,  "def_epa": -0.042, "pace_sec": 26.5, "hfa": 1.56, "early_pass_rate": 0.51, "panic_pp": -0.015, "target_hhi": 0.159},
        "MIN": {"off_epa": 0.035,  "def_epa": -0.058, "pace_sec": 27.2, "hfa": 1.56, "early_pass_rate": 0.58, "panic_pp": -0.028, "target_hhi": 0.152},
        "GB":  {"off_epa": 0.068,  "def_epa": -0.019, "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.010, "target_hhi": 0.118},
        "CAR": {"off_epa": -0.105, "def_epa": 0.082,  "pace_sec": 27.6, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.008, "target_hhi": 0.138},
        "CIN": {"off_epa": 0.074,  "def_epa": 0.024,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.63, "panic_pp": 0.022, "target_hhi": 0.154},
        "TEN": {"off_epa": -0.082, "def_epa": -0.015, "pace_sec": 28.3, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": -0.010, "target_hhi": 0.133},
        "SEA": {"off_epa": 0.029,  "def_epa": -0.011, "pace_sec": 26.2, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.004, "target_hhi": 0.146},
        "CHI": {"off_epa": 0.018,  "def_epa": -0.049, "pace_sec": 26.7, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.009, "target_hhi": 0.129},
        "BUF": {"off_epa": 0.112,  "def_epa": -0.038, "pace_sec": 26.6, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": -0.055, "target_hhi": 0.112},
        "BAL": {"off_epa": 0.134,  "def_epa": -0.029, "pace_sec": 27.5, "hfa": 1.56, "early_pass_rate": 0.50, "panic_pp": 0.046, "target_hhi": 0.140},
    },
}

# Full 32-team fallback ratings derived from candidates/2026-10-25-week7-candidate.json
# so any of the 32 NFL teams can be simulated without mutating DEFAULT_SEALED_BASELINE's hash.
ALL_32_TEAM_RATINGS = {
    **DEFAULT_SEALED_BASELINE["teamRatings"],
    "ARI": {"off_epa": -0.024, "def_epa": 0.041,  "pace_sec": 26.9, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.006, "target_hhi": 0.139},
    "ATL": {"off_epa": 0.019,  "def_epa": 0.015,  "pace_sec": 26.7, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": -0.055, "target_hhi": 0.144},
    "DAL": {"off_epa": -0.012, "def_epa": 0.038,  "pace_sec": 26.5, "hfa": 1.56, "early_pass_rate": 0.59, "panic_pp": 0.031, "target_hhi": 0.161},
    "DEN": {"off_epa": -0.018, "def_epa": -0.064, "pace_sec": 27.1, "hfa": 1.85, "early_pass_rate": 0.54, "panic_pp": 0.014, "target_hhi": 0.128},
    "HOU": {"off_epa": 0.038,  "def_epa": -0.048, "pace_sec": 27.3, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.011, "target_hhi": 0.149},
    "IND": {"off_epa": 0.014,  "def_epa": 0.018,  "pace_sec": 26.3, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": 0.019, "target_hhi": 0.136},
    "JAX": {"off_epa": 0.011,  "def_epa": 0.035,  "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": 0.024, "target_hhi": 0.134},
    "KC":  {"off_epa": 0.089,  "def_epa": -0.054, "pace_sec": 27.8, "hfa": 1.72, "early_pass_rate": 0.60, "panic_pp": -0.012, "target_hhi": 0.141},
    "LA":  {"off_epa": 0.046,  "def_epa": 0.012,  "pace_sec": 27.2, "hfa": 1.45, "early_pass_rate": 0.56, "panic_pp": 0.008, "target_hhi": 0.156},
    "LAC": {"off_epa": 0.008,  "def_epa": -0.044, "pace_sec": 28.4, "hfa": 1.40, "early_pass_rate": 0.50, "panic_pp": -0.018, "target_hhi": 0.137},
    "MIA": {"off_epa": -0.039, "def_epa": -0.008, "pace_sec": 27.4, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.015, "target_hhi": 0.158},
    "NE":  {"off_epa": -0.071, "def_epa": 0.019,  "pace_sec": 27.6, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.012, "target_hhi": 0.124},
    "NO":  {"off_epa": -0.032, "def_epa": 0.014,  "pace_sec": 26.8, "hfa": 1.65, "early_pass_rate": 0.54, "panic_pp": 0.016, "target_hhi": 0.087},
    "NYG": {"off_epa": -0.068, "def_epa": 0.009,  "pace_sec": 27.5, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.021, "target_hhi": 0.155},
    "PHI": {"off_epa": 0.064,  "def_epa": -0.022, "pace_sec": 26.9, "hfa": 1.62, "early_pass_rate": 0.51, "panic_pp": 0.078, "target_hhi": 0.157},
    "SF":  {"off_epa": 0.096,  "def_epa": -0.035, "pace_sec": 28.0, "hfa": 1.58, "early_pass_rate": 0.53, "panic_pp": -0.009, "target_hhi": 0.145},
    "TB":  {"off_epa": 0.061,  "def_epa": 0.016,  "pace_sec": 26.8, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.014, "target_hhi": 0.147},
    "WAS": {"off_epa": 0.104,  "def_epa": 0.021,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": -0.011, "target_hhi": 0.143},
}

FORBIDDEN_MARKET_TOKENS = (
    "market", "odds", "book", "split", "ticket", "money", "vig", "spread_line", "total_line", "clv"
)


def _canon(x) -> str:
    """Canonical JSON, mirroring canonicalizeForSeal in locked-projection.ts.

    Built as a string rather than via json.dumps: the C encoder formats floats itself and
    ignores a float subclass __repr__, so the sub-1e-4 fixed-point rule cannot be expressed
    through it. Key order is lexicographic at every depth, matching sort_keys=True.
    """
    if x is None:
        return "null"
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, int):
        return str(x)
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")):
            raise ValueError(f"canonical_hash: non-finite {x}")
        if x.is_integer():
            # Above 1e21 both runtimes use exponent notation; below it Python's int() would
            # print full digits where JS prints an exponent. Mirror JS exactly.
            if abs(x) >= 1e21:
                return repr(x)
            return str(int(x))
        if abs(x) < 1e-4:
            fixed = f"{x:.8f}".rstrip("0").rstrip(".")
            return fixed if fixed != "-0" else "0"
        return repr(x)
    if isinstance(x, str):
        return json.dumps(x, ensure_ascii=False)
    if isinstance(x, (list, tuple)):
        return "[" + ",".join(_canon(v) for v in x) + "]"
    if isinstance(x, (dict, MappingProxyType)):
        return "{" + ",".join(
            f"{json.dumps(k, ensure_ascii=False)}:{_canon(x[k])}" for k in sorted(x.keys())
        ) + "}"
    raise TypeError(f"canonical_hash: unsupported {type(x).__name__}")


def canonical_hash(obj) -> str:
    blob = _canon(obj).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def freeze_deep(obj):
    if isinstance(obj, dict):
        return MappingProxyType({k: freeze_deep(v) for k, v in obj.items()})
    if isinstance(obj, list):
        return tuple(freeze_deep(v) for v in obj)
    return obj


def hhi_load_multiplier(target_hhi: float, league_hhi: float = LEAGUE_TARGET_HHI) -> float:
    """Scale positional dropoff in effective-contributor space N_eff = 1/HHI (Davies 2025)."""
    if target_hhi <= 0:
        return 1.0
    n_team = 1.0 / target_hhi
    n_league = 1.0 / league_hhi
    return max(0.55, min(1.60, math.sqrt(n_league / n_team)))


def load_week7_candidate_ratings_readonly(repo_root: str | None = None):
    """Load candidates/sealed-center.json (tau_coach=0.42) + candidates/2026-10-25-week7-candidate.json
    (32 teams, tau_rating=4.6607) and verify parent_seal_hash == sealed-center.merkle."""
    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[2]
    center_path = root / "candidates" / "sealed-center.json"
    cand_path = root / "candidates" / "2026-10-25-week7-candidate.json"
    if not (center_path.is_file() and cand_path.is_file()):
        return None
    center = json.loads(center_path.read_text(encoding="utf-8"))
    cand = json.loads(cand_path.read_text(encoding="utf-8"))
    if cand.get("parent_seal_hash") != center.get("merkle"):
        raise RuntimeError(
            f"SEAL_LINEAGE_MISMATCH: candidate parent_seal_hash {cand.get('parent_seal_hash')} != center merkle {center.get('merkle')}"
        )
    if float(center.get("tau", -1.0)) != 0.42:
        raise RuntimeError(f"SEAL_BROKEN: sealed-center tau={center.get('tau')} != 0.42")
    return freeze_deep({"sealed_center": center, "week7_candidate": cand})


def load_sealed_object_readonly(sealed_path: str = "/opt/model/sealed_baseline.json"):
    if os.path.exists(sealed_path):
        with open(sealed_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    else:
        raw = copy.deepcopy(DEFAULT_SEALED_BASELINE)
    if raw.get("version") != "v1.0":
        raise ValueError(f"SEAL_VIOLATION: Rejected non-v1.0 baseline ({raw.get('version')})")

    def assert_no_market_keys(node, path="root"):
        if isinstance(node, (dict, MappingProxyType)):
            for k, v in node.items():
                if any(tok in k.lower() for tok in FORBIDDEN_MARKET_TOKENS):
                    raise ValueError(f"CLASS_A_FIREWALL_VIOLATION: Market token '{k}' at {path}.{k}")
                assert_no_market_keys(v, f"{path}.{k}")
        elif isinstance(node, (list, tuple)):
            for idx, item in enumerate(node):
                assert_no_market_keys(item, f"{path}[{idx}]")

    assert_no_market_keys(raw)
    if raw.get("tau") != 0.42:
        raise RuntimeError(f"SEAL_BROKEN: coach tau={raw.get('tau')} != 0.42")
    if raw["epaDropoffTable"]["QB_QUESTIONABLE"] != QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF:
        raise RuntimeError("SEAL_BROKEN: QB_QUESTIONABLE != 0.0947")
    digest = canonical_hash(raw)
    return freeze_deep(raw), digest


def sinkhorn_reallocate_weights(C_tuple, base_shares, scratched_roles, eps: float = 0.10):
    C = np.array(C_tuple, dtype=np.float64)
    r = np.array(base_shares, dtype=np.float64)
    r = r / r.sum()
    c = r.copy()
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    for idx, rname in enumerate(role_names):
        if rname in scratched_roles:
            c[idx] = 0.01
    c = c / c.sum()
    K = np.exp(np.maximum(-C / eps, -700.0))
    u = np.ones_like(r)
    v = np.ones_like(c)
    for _ in range(200):
        u = r / np.maximum(K @ v, 1e-12)
        v = c / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        if (np.sum(np.abs(P.sum(axis=1) - r)) + np.sum(np.abs(P.sum(axis=0) - c))) <= 1e-9:
            break
    feasible_shares = P.sum(axis=0)
    mass_moved = float(0.5 * np.sum(np.abs(feasible_shares - r)))
    return feasible_shares, mass_moved


def brenier_one_third_stability_ratio(
    mu: np.ndarray | list[float],
    nu: np.ndarray | list[float],
    realized_weights: np.ndarray | list[float],
) -> float:
    """
    Sharp 1/3-Holder stability check for optimal transport reallocation
    (OpenAI math preprint `Sharp-One-Third-Stability-of-Brenier-Maps` / `lean/docs/374.md`):
        ||T_mu - T_nu||_{L2(rho)} <= C * W_2(mu, nu)^{1/3}.
    The 1/3 exponent is sharp in the general case (unlike 2/3, which requires stronger
    dual/convexity assumptions). This helper computes a simple 2-Wasserstein proxy on
    the pre-perturbation (mu) and post-perturbation (nu) target vectors and returns
    realized_L2_change / (W2_proxy ** (1/3) + 1e-8). Values systematically >> 1
    indicate excess sensitivity in the Sinkhorn reallocation step.
    """
    mu_arr = np.asarray(mu, dtype=np.float64)
    nu_arr = np.asarray(nu, dtype=np.float64)
    w_arr = np.asarray(realized_weights, dtype=np.float64)
    mu_arr = mu_arr / np.sum(mu_arr)
    nu_arr = nu_arr / np.sum(nu_arr)
    w_arr = w_arr / np.sum(w_arr)
    w2_proxy = float(np.sqrt(np.sum((mu_arr - nu_arr) ** 2)))
    realized_l2_change = float(np.linalg.norm(w_arr - mu_arr, ord=2))
    return float(realized_l2_change / ((w2_proxy ** (1.0 / 3.0)) + 1e-8))



def conserve_target_shares_kkt(raw_shares: list[float] | np.ndarray) -> np.ndarray:
    """Enforce exact zero-sum target/carry share conservation sum(s_i) == 1.0 via VMLS Ch. 16 KKT solver."""
    b_vec = np.asarray(raw_shares, dtype=np.float64)
    n = len(b_vec)
    x_star, _ = kkt_constrained_least_squares(
        A=np.eye(n, dtype=np.float64),
        b=b_vec,
        C=np.ones((1, n), dtype=np.float64),
        d=np.array([1.0], dtype=np.float64),
    )
    x_clipped = np.clip(x_star, 0.01, 0.92)
    return x_clipped / float(np.sum(x_clipped))


_MASTER_TENDENCIES_CACHE: dict[str, dict] | None = None


def load_master_w1_w7_tendencies(repo_root: str | None = None) -> dict[str, dict]:
    """Load all 32 teams' W1-W7 PBP tendencies from master_weeks_1_to_7_pbp_tendencies_2026.json."""
    global _MASTER_TENDENCIES_CACHE
    if _MASTER_TENDENCIES_CACHE is not None and repo_root is None:
        return _MASTER_TENDENCIES_CACHE
    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[2]
    p = root / "data" / "film_room_2026" / "master_weeks_1_to_7_pbp_tendencies_2026.json"
    if not p.is_file():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        teams = dict(data.get("teams", data))
        if "LAR" in teams and "LA" not in teams:
            teams["LA"] = teams["LAR"]
        elif "LA" in teams and "LAR" not in teams:
            teams["LAR"] = teams["LA"]
        if repo_root is None:
            _MASTER_TENDENCIES_CACHE = teams
        return teams
    except Exception:
        return {}


def compute_weekly_bayesian_ridge_power_ratings(repo_root: str | None = None) -> dict[str, float]:
    """Compute opponent-adjusted Bayesian Ridge team power ratings using VMLS Ch. 15 + 12-wk half-life."""
    tendencies = load_master_w1_w7_tendencies(repo_root)
    teams = sorted(ALL_32_TEAM_RATINGS.keys())
    n_teams = len(teams)
    idx_map = {t: i for i, t in enumerate(teams)}

    off_idx_list: list[int] = []
    def_idx_list: list[int] = []
    epa_list: list[float] = []
    age_list: list[float] = []
    prior_off = np.zeros(n_teams, dtype=np.float64)
    prior_def = np.zeros(n_teams, dtype=np.float64)

    for i, t in enumerate(teams):
        base_r = ALL_32_TEAM_RATINGS[t]
        prior_off[i] = float(base_r["off_epa"])
        prior_def[i] = -float(base_r["def_epa"])
        t_ov = tendencies.get(t) or {}
        cur_off = float(t_ov.get("off_epa_per_play", base_r["off_epa"]))
        cur_def = float(t_ov.get("def_epa_per_play", base_r["def_epa"]))
        w67_off = float(t_ov.get("off_epa_w6_w7", cur_off))
        w67_def = float(t_ov.get("def_epa_w6_w7", cur_def))

        opp_i = (i + 7) % n_teams
        # Full W1-W7 offensive & defensive observations (age = 3.0 weeks)
        off_idx_list.append(i)
        def_idx_list.append(opp_i)
        epa_list.append(cur_off - cur_def)
        age_list.append(3.0)

        # Recent W6-W7 offensive & defensive observations (age = 0.5 weeks)
        off_idx_list.append(i)
        def_idx_list.append((i + 13) % n_teams)
        epa_list.append(w67_off - w67_def)
        age_list.append(0.5)

    res = solve_opponent_adjusted_bayesian_ridge(
        off_team_idx=np.asarray(off_idx_list, dtype=np.int64),
        def_team_idx=np.asarray(def_idx_list, dtype=np.int64),
        epa_per_play=np.asarray(epa_list, dtype=np.float64),
        weeks_ago=np.asarray(age_list, dtype=np.float64),
        n_teams=n_teams,
        half_life_weeks=12.0,
        prior_off=prior_off,
        prior_def=prior_def,
        ridge_lambda=2.5,
    )
    net = res["net"]
    return {teams[i]: round(float(net[i]), 5) for i in range(n_teams)}


def load_week8_injuries_from_csv(repo_root: str | None = None) -> dict[str, list[str]]:
    """Read data/nflverse/injuries_2026.csv (Week 8 practice_status + Week 7 report_status)
    and map active injuries to epaDropoffTable & Sinkhorn role keys."""
    import csv

    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[2]
    csv_path = root / "data" / "nflverse" / "injuries_2026.csv"
    if not csv_path.is_file():
        return {}

    team_roles: dict[str, list[str]] = {}
    pos_counts: dict[tuple[str, str], int] = {}

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if str(r.get("week", "")) == "8"]

    # Prioritize Week 8 rows where available, supplement with Week 7 Out/Doubtful
    rows.sort(key=lambda r: int(r.get("week", 0)), reverse=True)
    seen_players: set[tuple[str, str]] = set()

    for r in rows:
        team = str(r.get("team", "")).strip()
        if team == "LA":
            team = "LAR"
        full_name = str(r.get("full_name", "")).strip()
        if not team or not full_name or (team, full_name) in seen_players:
            continue
        seen_players.add((team, full_name))

        pos = str(r.get("position", "")).strip().upper()
        rep_status = str(r.get("report_status", "")).strip()
        prac_status = str(r.get("practice_status", "")).strip()
        wk = int(r.get("week", 0))

        # report_status only. Week 8 practice rows are not a game designation.
        # Do not promote a blank report, a DNP, or "position == QB" into Out/Questionable.
        _ = prac_status, wk
        is_out_or_dnp = rep_status in ("Out", "Doubtful")
        is_quest_or_lp = rep_status == "Questionable"

        if not (is_out_or_dnp or is_quest_or_lp):
            continue

        roles = team_roles.setdefault(team, [])
        idx = pos_counts.get((team, pos), 0) + 1
        pos_counts[(team, pos)] = idx

        if pos == "QB":
            role = "QB1" if (is_out_or_dnp and idx == 1) else "QB_QUESTIONABLE"
        elif pos in ("T", "OT", "LT", "G", "C", "OL"):
            role = "LT" if idx == 1 else ""
        elif pos in ("CB", "DB"):
            role = "CB1" if idx == 1 else ""
        elif pos in ("DE", "EDGE", "LB", "OLB"):
            role = "EDGE1" if idx == 1 else ""
        elif pos == "WR":
            role = "WR1" if idx == 1 else ("WR2" if idx == 2 else "WR3")
        elif pos == "RB":
            role = "RB1" if idx == 1 else ""
        elif pos == "TE":
            role = "TE1" if idx == 1 else ""
        else:
            role = ""

        if role and role not in roles:
            roles.append(role)

    return team_roles


DOWN_BUCKETS = ("1st", "2nd", "3rd_short", "3rd_long")
FIELD_ZONES = ("own_20", "mid", "opp_20", "redzone")
SCORE_SCRIPTS = ("trailing_7+", "close", "leading_7+")

POSITIONAL_MARKET_PRIORS = {
    "rec_yds": 64.5,
    "WR1": 64.5,
    "WR2": 46.5,
    "WR3": 34.5,
    "TE1": 41.5,
    "rush_yds": 62.0,
    "RB1": 64.5,
    "rb_rec_yds": 16.5,
    "pass_yds": 232.5,
    "QB1": 232.5,
}


def empirical_bayes_line(player_gp: int, sample_mean: float, market: str = "rec_yds") -> float:
    """Empirical-Bayes shrinkage of noisy early-season/simulated player mean toward positional prior."""
    gp = max(1, int(player_gp))
    prior = float(POSITIONAL_MARKET_PRIORS.get(market, 58.5))
    w = min(0.55, max(0.25, gp / (gp + 7.0)))
    shrunk = w * float(sample_mean) + (1.0 - w) * prior
    if market in ("pass_yds", "QB1"):
        return float(np.clip(shrunk, 172.5, 278.5))
    if market == "rb_rec_yds":
        return float(np.clip(shrunk, 10.5, 32.5))
    return float(np.clip(shrunk, 38.5, 82.5))


def sample_lognormal(
    shrunk_mean: float,
    n_sims: int,
    rng: np.random.Generator,
    cv: float = 0.42,
) -> np.ndarray:
    """Sample realistic right-skewed NFL yardage distribution with coefficient of variation cv=0.42."""
    m = max(1.0, float(shrunk_mean))
    sigma2 = math.log(1.0 + cv * cv)
    sigma = math.sqrt(sigma2)
    mu = math.log(m) - 0.5 * sigma2
    return rng.lognormal(mean=mu, sigma=sigma, size=n_sims)


def _classify_down_bucket(down: int, ydstogo: int) -> str:
    if down == 1:
        return "1st"
    if down == 2:
        return "2nd"
    if down >= 3 and ydstogo <= 3:
        return "3rd_short"
    return "3rd_long"


def _classify_field_zone(yardline_100: int) -> str:
    if yardline_100 >= 80:
        return "own_20"
    if yardline_100 >= 40:
        return "mid"
    if yardline_100 > 20:
        return "opp_20"
    return "redzone"


def _classify_score_script(score_diff: float) -> str:
    if score_diff <= -7:
        return "trailing_7+"
    if score_diff >= 7:
        return "leading_7+"
    return "close"


def build_jev_state_tensor(spine_game: dict | None) -> dict:
    """
    Aggregate the 166 snap responses from `spine_game["snap_by_snap_log"]` into a
    48-state transition tensor keyed by `(offense_abbr, down_bucket, field_zone, score_script)`.
    """
    if not spine_game or not isinstance(spine_game, dict):
        return {"by_state": {}, "by_team": {}, "total_snaps_ingested": 0}
    snaps = spine_game.get("snap_by_snap_log") or []
    if not snaps:
        return {"by_state": {}, "by_team": {}, "total_snaps_ingested": 0}

    buckets: dict[tuple[str, str, str, str], list[tuple[float, float, float, float, float]]] = {}
    team_buckets: dict[str, list[tuple[float, float, float, float, float]]] = {}

    for s in snaps:
        off = str(s.get("offense", "")).strip()
        dfn = str(s.get("defense", "")).strip()
        if not off:
            continue
        down = int(s.get("down", 1))
        ydstogo = int(s.get("ydstogo", 10))
        yl100 = int(s.get("yardline_100", 75))
        sc_before = s.get("score_before") or {}
        s_diff = float(sc_before.get(off, 0)) - float(sc_before.get(dfn, 0))

        db = _classify_down_bucket(down, ydstogo)
        fz = _classify_field_zone(yl100)
        ss = _classify_score_script(s_diff)

        jev = s.get("jev_decisions") or {}
        off_p = (jev.get("off_play_call") or {}).get("probabilities") or {}
        pass_p = (
            float(off_p.get("quick_game_rpo", 0.0))
            + float(off_p.get("play_action_intermediate", 0.0))
            + float(off_p.get("deep_shot_pass", 0.0))
            + float(off_p.get("go_for_it_pass", 0.0))
            + 0.5 * float(off_p.get("screen_or_draw", 0.0))
        )
        press_noul = float(jev.get("pressure_disruption_noul", 0.32))
        tgt_p = (jev.get("target_carrier") or {}).get("probabilities") or {}
        rb1_p = float(tgt_p.get("RB1", 0.50))
        wr1_p = float(tgt_p.get("WR1", 0.24))

        res_play = s.get("resolved_play") or {}
        cal_out = res_play.get("calibrated_outcome_probs") or (jev.get("snap_outcome") or {}).get("probabilities") or {}
        pos_gain_p = (
            float(cal_out.get("short_gain_1_4", 0.25))
            + float(cal_out.get("chain_mover_5_11", 0.22))
            + float(cal_out.get("explosive_12_24", 0.08))
            + float(cal_out.get("breakaway_25_plus", 0.02))
        )

        rec = (pass_p, press_noul, rb1_p, wr1_p, pos_gain_p)
        buckets.setdefault((off, db, fz, ss), []).append(rec)
        team_buckets.setdefault(off, []).append(rec)

    def _summarize(rows: list[tuple[float, float, float, float, float]]) -> dict:
        arr = np.asarray(rows, dtype=np.float64)
        return {
            "count": len(rows),
            "pass_prob": round(float(np.mean(arr[:, 0])), 4),
            "pressure_disruption_noul": round(float(np.mean(arr[:, 1])), 4),
            "rb1_target_prob": round(float(np.mean(arr[:, 2])), 4),
            "wr1_target_prob": round(float(np.mean(arr[:, 3])), 4),
            "pos_gain_prob": round(float(np.mean(arr[:, 4])), 4),
        }

    by_state = {
        f"{k[0]}|{k[1]}|{k[2]}|{k[3]}": _summarize(v)
        for k, v in buckets.items()
    }
    by_team = {tm: _summarize(v) for tm, v in team_buckets.items()}
    return {
        "by_state": by_state,
        "by_team": by_team,
        "total_snaps_ingested": len(snaps),
    }


def simulate_matchup_pbp(
    away: str,
    home: str,
    away_inj: list,
    home_inj: list,
    sealed_state,
    expected_hash: str,
    n_sims: int = 5000,
    seed: int = 42,
    w1_w7_override: dict | None = None,
    return_vectors: bool = False,
    jev_state_tensor: dict | None = None,
    posted_home_spread: float | None = None,
    posted_total: float | None = None,
) -> dict:
    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash
    rng = np.random.default_rng(seed)
    tr_away = dict(sealed_state["teamRatings"].get(away) or ALL_32_TEAM_RATINGS[away])
    tr_home = dict(sealed_state["teamRatings"].get(home) or ALL_32_TEAM_RATINGS[home])

    away_sack_prob = 0.062
    home_sack_prob = 0.062
    away_comp_base = 0.645
    home_comp_base = 0.645
    away_wr1_share_emp = 0.26
    home_wr1_share_emp = 0.26
    away_rb1_share_emp = 0.62
    home_rb1_share_emp = 0.62

    master_tend = load_master_w1_w7_tendencies()
    aw_master = dict(master_tend.get(away) or {})
    hm_master = dict(master_tend.get(home) or {})

    if w1_w7_override is not None:
        if jev_state_tensor is None:
            jev_state_tensor = w1_w7_override.get("jev_state_tensor")
        if posted_home_spread is None and w1_w7_override.get("posted_home_spread") is not None:
            posted_home_spread = float(w1_w7_override["posted_home_spread"])
        if posted_total is None and w1_w7_override.get("posted_total") is not None:
            posted_total = float(w1_w7_override["posted_total"])
        aw_ov = {**aw_master, **(w1_w7_override.get("away") or {})}
        hm_ov = {**hm_master, **(w1_w7_override.get("home") or {})}
    else:
        aw_ov = aw_master
        hm_ov = hm_master

    away_off_rush_epa = float(aw_ov.get("off_rush_epa", 0.0))
    home_off_rush_epa = float(hm_ov.get("off_rush_epa", 0.0))
    away_rz_td_pct = float(aw_ov.get("redzone_td_pct", 0.55))
    home_rz_td_pct = float(hm_ov.get("redzone_td_pct", 0.55))
    away_epa_trend_delta = float(aw_ov.get("off_trend_delta_w67_vs_w15", 0.0))
    home_epa_trend_delta = float(hm_ov.get("off_trend_delta_w67_vs_w15", 0.0))
    away_def_blitz_pct = float(aw_ov.get("def_blitz_rate_pct", 26.0))
    home_def_blitz_pct = float(hm_ov.get("def_blitz_rate_pct", 26.0))
    away_def_sack_pct = float(aw_ov.get("def_sack_rate_pct", 4.2))
    home_def_sack_pct = float(hm_ov.get("def_sack_rate_pct", 4.2))
    away_ol_sack_pct = float(aw_ov.get("sack_rate_allowed_pct", aw_ov.get("sack_rate_allowed", 6.2)))
    home_ol_sack_pct = float(hm_ov.get("sack_rate_allowed_pct", hm_ov.get("sack_rate_allowed", 6.2)))

    # PHASE 6: Midday priors & matchup overlays
    away_first_half_prior = float(FIRST_HALF_DIFF_PRIORS_2026.get(away, 0.0))
    home_first_half_prior = float(FIRST_HALF_DIFF_PRIORS_2026.get(home, 0.0))
    away_net_pts_to = float(NET_POINTS_OFF_TURNOVERS_2026.get(away, {}).get("net_pts", 0.0))
    home_net_pts_to = float(NET_POINTS_OFF_TURNOVERS_2026.get(home, {}).get("net_pts", 0.0))

    # EVERO_DEF_TENURE_FLOOR: CAR defense 2nd-worst since 1999 (+0.08 EPA/play allowed) -> worsen CAR def_epa
    evero_epa_penalty = float(EVERO_DEF_TENURE_FLOOR.get("CAR", {}).get("epa_per_play_allowed", 0.0))
    if away == "CAR":
        tr_away["def_epa"] = float(tr_away.get("def_epa", 0.0)) + evero_epa_penalty
    if home == "CAR":
        tr_home["def_epa"] = float(tr_home.get("def_epa", 0.0)) + evero_epa_penalty

    # CHASE_BROWN_XFP_SURGE: CIN RB1 +3.4 xFP-over-PPG gap facing TEN without Jeffery Simmons -> nudge CIN rb1 carry share
    cb = CHASE_BROWN_XFP_SURGE
    cb_active = (
        (away == str(cb["team"]) and home == str(cb["opponent"]))
        or (home == str(cb["team"]) and away == str(cb["opponent"]))
    )
    cb_boost = float(cb.get("rb1_carry_share_boost", 0.0)) if cb_active else 0.0

    # PHASE 6 / AUDIT-DOMAIN-8: Two-sided Jeffery Simmons trade trench adjustment
    # CHI gains All-Pro DT Jeffery Simmons -> CHI interior pressure/run D upgrade (+4.2% interior pressure, -0.35 YPC inside zone)
    # TEN loses Simmons -> TEN interior run/pass rush downgrade (+0.085 rush EPA allowed)
    simmons_epa_shift = 0.035  # interior DL upgrade/downgrade magnitude
    simmons_sack_boost = 0.042  # +4.2% interior pressure for CHI
    if {away, home} == {"CHI", "SEA"}:
        # CHI defense upgraded: lower CHI def_epa allowed
        if away == "CHI":
            tr_away["def_epa"] = float(tr_away.get("def_epa", 0.0)) - simmons_epa_shift
            away_def_sack_pct = float(away_def_sack_pct) + simmons_sack_boost
        else:
            tr_home["def_epa"] = float(tr_home.get("def_epa", 0.0)) - simmons_epa_shift
            home_def_sack_pct = float(home_def_sack_pct) + simmons_sack_boost
    if {away, home} == {"TEN", "CIN"}:
        # TEN defense downgraded (lost Simmons): raise TEN def_epa allowed; CIN rb1 (Chase Brown) gets extra carry share
        if away == "TEN":
            tr_away["def_epa"] = float(tr_away.get("def_epa", 0.0)) + simmons_epa_shift
            if away == str(cb["team"]):
                away_rb1_share_emp = float(np.clip(away_rb1_share_emp + cb_boost, 0.35, 0.88))
        else:
            tr_home["def_epa"] = float(tr_home.get("def_epa", 0.0)) + simmons_epa_shift
            if home == str(cb["team"]):
                home_rb1_share_emp = float(np.clip(home_rb1_share_emp + cb_boost, 0.35, 0.88))

    # BOWERS_COMPENSATION_CHAIN_FLAG: LV @ NYJ, Bowers knee->hamstring->calf 3-week flag -> LV TE injury
    bm = BOWERS_COMPENSATION_CHAIN_FLAG
    bm_active = (
        {away, home} == set(bm["matchup"])
    )
    if bm_active:
        token = str(bm["injury_token"])
        if away == str(bm["matchup"][0]):
            if token not in away_inj:
                away_inj = list(away_inj) + [token]
        else:
            if token not in home_inj:
                home_inj = list(home_inj) + [token]

    # Item 7: TB WR Emeka Egbuka OUT Sunday (foot injury) state flag
    egbuka_out_applied = False
    if away == str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["team"]):
        egbuka_out_applied = True
        if str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["role_token"]) not in away_inj:
            away_inj = list(away_inj) + [str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["role_token"])]
    elif home == str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["team"]):
        egbuka_out_applied = True
        if str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["role_token"]) not in home_inj:
            home_inj = list(home_inj) + [str(TB_WR_EMEKA_EGBUKA_OUT_FLAG["role_token"])]

    # Item 7: Situational harvest call sites (S106 kickoff drive start, M-01 RZ pts/trip diff, M-57..M-61 non-blitz surplus)
    away_drive_start_offset = compute_kickoff_drive_start_offset(KICKOFF_RETURN_DRIVE_START_ANCHORS_2026.get(away, 25.0))
    home_drive_start_offset = compute_kickoff_drive_start_offset(KICKOFF_RETURN_DRIVE_START_ANCHORS_2026.get(home, 25.0))
    rz_pts_trip_diff_away = compute_rz_points_per_trip_differential(
        away_rz_td_pct * 7.0 + (1.0 - away_rz_td_pct) * 3.0,
        home_rz_td_pct * 7.0 + (1.0 - home_rz_td_pct) * 3.0,
    )
    non_blitz_surplus_away = compute_non_blitz_pressure_surplus(
        NON_BLITZ_PRESSURE_ANCHORS_2026.get(away, {}).get("pressure_rate", away_def_sack_pct * 4.2 / 100.0),
        NON_BLITZ_PRESSURE_ANCHORS_2026.get(away, {}).get("blitz_rate", away_def_blitz_pct / 100.0),
    )
    non_blitz_surplus_home = compute_non_blitz_pressure_surplus(
        NON_BLITZ_PRESSURE_ANCHORS_2026.get(home, {}).get("pressure_rate", home_def_sack_pct * 4.2 / 100.0),
        NON_BLITZ_PRESSURE_ANCHORS_2026.get(home, {}).get("blitz_rate", home_def_blitz_pct / 100.0),
    )

    if aw_ov:
        tr_away["early_pass_rate"] = 0.50 * float(tr_away["early_pass_rate"]) + 0.50 * float(
            aw_ov.get("early_down_pass_rate", tr_away["early_pass_rate"])
        )
        c_w17 = float(aw_ov.get("comp_rate_w1_w7", 0.645))
        c_w67 = float(aw_ov.get("comp_rate_w6_w7", c_w17))
        if c_w17 > 1.5:
            c_w17 /= 100.0
        if c_w67 > 1.5:
            c_w67 /= 100.0
        away_comp_base = float(np.clip(0.55 * c_w17 + 0.45 * c_w67, 0.48, 0.76))
        ol_sack = away_ol_sack_pct / 100.0
        def_press = float(hm_ov.get("def_pressure_rate", home_def_sack_pct * 4.2)) / 100.0
        # Sketch 4: Sack Tandem Gate
        press_w_aw = sack_tandem_gate_weight(home_def_sack_pct, away_ol_sack_pct)
        away_sack_prob = float(np.clip(0.55 * ol_sack + press_w_aw * (def_press * 0.30), 0.030, 0.125))
        if aw_ov.get("wr1_target_share"):
            val_wr = float(aw_ov["wr1_target_share"])
            away_wr1_share_emp = float(np.clip(val_wr / 100.0 if val_wr > 1.0 else val_wr, 0.14, 0.42))
        if aw_ov.get("rb1_carry_share"):
            val_rb = float(aw_ov["rb1_carry_share"])
            away_rb1_share_emp = float(np.clip(val_rb / 100.0 if val_rb > 1.0 else val_rb, 0.35, 0.88))
    if hm_ov:
        tr_home["early_pass_rate"] = 0.50 * float(tr_home["early_pass_rate"]) + 0.50 * float(
            hm_ov.get("early_down_pass_rate", tr_home["early_pass_rate"])
        )
        c_w17 = float(hm_ov.get("comp_rate_w1_w7", 0.645))
        c_w67 = float(hm_ov.get("comp_rate_w6_w7", c_w17))
        if c_w17 > 1.5:
            c_w17 /= 100.0
        if c_w67 > 1.5:
            c_w67 /= 100.0
        home_comp_base = float(np.clip(0.55 * c_w17 + 0.45 * c_w67, 0.48, 0.76))
        ol_sack = home_ol_sack_pct / 100.0
        def_press = float(aw_ov.get("def_pressure_rate", away_def_sack_pct * 4.2)) / 100.0
        # Sketch 4: Sack Tandem Gate
        press_w_hm = sack_tandem_gate_weight(away_def_sack_pct, home_ol_sack_pct)
        home_sack_prob = float(np.clip(0.55 * ol_sack + press_w_hm * (def_press * 0.30), 0.030, 0.125))
        if hm_ov.get("wr1_target_share"):
            val_wr = float(hm_ov["wr1_target_share"])
            home_wr1_share_emp = float(np.clip(val_wr / 100.0 if val_wr > 1.0 else val_wr, 0.14, 0.42))
        if hm_ov.get("rb1_carry_share"):
            val_rb = float(hm_ov["rb1_carry_share"])
            home_rb1_share_emp = float(np.clip(val_rb / 100.0 if val_rb > 1.0 else val_rb, 0.35, 0.88))

    # Sketch 1: Rush decay for RB1 carry share when team_off_rush_epa < RUSH_DECAY_THRESHOLD (-0.15)
    if away_off_rush_epa < RUSH_DECAY_THRESHOLD:
        away_rb1_share_emp = float(np.clip(away_rb1_share_emp - 0.08, 0.35, 0.88))
    if home_off_rush_epa < RUSH_DECAY_THRESHOLD:
        home_rb1_share_emp = float(np.clip(home_rb1_share_emp - 0.08, 0.35, 0.88))

    # PHASE 6: CHASE_BROWN_XFP_SURGE home-side carry-share nudge (CIN facing TEN without Simmons)
    if cb_active:
        if away == str(cb["team"]):
            away_rb1_share_emp = float(np.clip(away_rb1_share_emp + cb_boost, 0.35, 0.88))
        elif home == str(cb["team"]):
            home_rb1_share_emp = float(np.clip(home_rb1_share_emp + cb_boost, 0.35, 0.88))

    # Stage 1 / Stage 4: 2x2 QB Disguise x Blitz Matrix + MNAR Missingness Encoding
    hm_shells = hm_ov.get("coverage_shells_w1_w7") or {}
    aw_shells = aw_ov.get("coverage_shells_w1_w7") or {}
    hm_disguise_rate = float(hm_shells.get("two_high_shell_pct", 48.0)) * 0.62 / 100.0
    aw_disguise_rate = float(aw_shells.get("two_high_shell_pct", 48.0)) * 0.62 / 100.0

    away_qb_2x2 = evaluate_qb_matchup_2x2(away, opp_disguise_rate=hm_disguise_rate, opp_blitz_rate=home_def_blitz_pct)
    home_qb_2x2 = evaluate_qb_matchup_2x2(home, opp_disguise_rate=aw_disguise_rate, opp_blitz_rate=away_def_blitz_pct)
    mnar_flags = encode_mnar_missingness({
        "away_qb_questionable": None if "QB_QUESTIONABLE" in away_inj else 0.0,
        "home_qb_questionable": None if "QB_QUESTIONABLE" in home_inj else 0.0,
        "away_wr1_dnp": None if "WR1" in away_inj else 0.0,
        "home_wr1_dnp": None if "WR1" in home_inj else 0.0,
    })

    away_sack_prob = float(np.clip(away_sack_prob * float(away_qb_2x2["sack_prob_multiplier"]), 0.030, 0.125))
    home_sack_prob = float(np.clip(home_sack_prob * float(home_qb_2x2["sack_prob_multiplier"]), 0.030, 0.125))

    # PHASE 6: Two-Clocks Pressure Collision — QB time-to-throw vs defense time-to-pressure
    # def_t2p proxy derived from opposing def_sack_rate_pct (direct time-to-pressure not in flat tendencies):
    # base 2.7s, each defensive sack-rate point above 5.0% = 0.025s faster pressure, clamped [1.8, 3.5].
    COLLISION_SACK_MULT = 1.15  # sack-prob bump when pressure arrives before release
    two_clocks = {}

    def _apply_collision(_qb_2x2, _def_sack_pct, _sack_prob, _side):
        _ttt = _qb_2x2.get("ngs_time_to_throw_sec")
        if _ttt is None:
            return _sack_prob, None
        _def_t2p = float(np.clip(2.7 - (_def_sack_pct - 5.0) * 0.025, 1.8, 3.5))
        # Big Nickel confounder: early-down run-blitz when the opposing defense blitzes > 30%
        _bn = _def_sack_pct > 30.0
        _collision = compute_two_clocks_pressure_collision(_ttt, _def_t2p, early_down_run_blitz_confounder=_bn)
        two_clocks[_side] = _collision
        if _collision["pressure_before_release"]:
            _sack_prob = float(np.clip(_sack_prob * COLLISION_SACK_MULT, 0.030, 0.125))
        return _sack_prob, _collision

    away_sack_prob, _away_collision = _apply_collision(away_qb_2x2, home_def_sack_pct, away_sack_prob, "away")
    home_sack_prob, _home_collision = _apply_collision(home_qb_2x2, away_def_sack_pct, home_sack_prob, "home")

    away_to_mult = float(away_qb_2x2["int_prob_multiplier"])
    home_to_mult = float(home_qb_2x2["int_prob_multiplier"])

    epa_table = sealed_state["epaDropoffTable"]
    base_shares = [0.26, 0.21, 0.17, 0.20, 0.16]
    away_sh_raw, away_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, away_inj)
    home_sh_raw, home_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, home_inj)
    # VMLS Ch. 16 KKT Exact Target/Carry Share Conservation: sum(s_i) == 1.0
    away_sh = conserve_target_shares_kkt(away_sh_raw)
    home_sh = conserve_target_shares_kkt(home_sh_raw)
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    base_arr = np.asarray(base_shares, dtype=np.float64)
    base_arr = base_arr / np.sum(base_arr)
    # Solenoidal zero-sum conservation invariant: |sum(w_post - w_pre)| < 1e-12
    away_zero_sum_err = abs(float(np.sum(away_sh - base_arr)))
    home_zero_sum_err = abs(float(np.sum(home_sh - base_arr)))
    assert away_zero_sum_err < 1e-12, f"Solenoidal conservation violated (away): {away_zero_sum_err}"
    assert home_zero_sum_err < 1e-12, f"Solenoidal conservation violated (home): {home_zero_sum_err}"
    # Target post-perturbation vectors for Brenier 1/3 stability ratio logging
    away_nu = base_arr.copy()
    home_nu = base_arr.copy()
    for _idx, _rn in enumerate(role_names):
        if _rn in away_inj:
            away_nu[_idx] = 0.01
        if _rn in home_inj:
            home_nu[_idx] = 0.01
    brenier_ratio_away = brenier_one_third_stability_ratio(base_arr, away_nu, away_sh)
    brenier_ratio_home = brenier_one_third_stability_ratio(base_arr, home_nu, home_sh)
    exec_mults = epa_table["execution_multipliers"]
    away_eff_mult = sum(away_sh[i] * (exec_mults.get(rn, 0.90) if rn in away_inj else 1.0) for i, rn in enumerate(role_names))
    home_eff_mult = sum(home_sh[i] * (exec_mults.get(rn, 0.90) if rn in home_inj else 1.0) for i, rn in enumerate(role_names))
    away_drop = sum(float(epa_table[fl]) for fl in away_inj if fl in epa_table)
    home_drop = sum(float(epa_table[fl]) for fl in home_inj if fl in epa_table)
    away_net_epa = (
        ((tr_away["off_epa"] - away_drop) * away_eff_mult)
        - tr_home["def_epa"]
        + 0.35 * float(away_qb_2x2["epa_shift_vs_baseline"])
    )
    home_net_epa = (
        ((tr_home["off_epa"] - home_drop) * home_eff_mult)
        - tr_away["def_epa"]
        + (tr_home["hfa"] / 79.1)
        + 0.35 * float(home_qb_2x2["epa_shift_vs_baseline"])
    )

    r_shrink = 1.0 / (1.0 + 45.0 * 0.04)
    away_pass_delta = (1.0 - r_shrink) * (tr_away["early_pass_rate"] - 0.54)
    home_pass_delta = (1.0 - r_shrink) * (tr_home["early_pass_rate"] - 0.54)

    has_jev_tensor = bool(jev_state_tensor and jev_state_tensor.get("total_snaps_ingested", 0) > 0)
    jev_pass_arr = np.zeros((2, 4, 4, 3), dtype=np.float64)
    jev_press_arr = np.zeros((2, 4, 4, 3), dtype=np.float64)
    if has_jev_tensor:
        by_st = jev_state_tensor.get("by_state") or {}
        by_tm = jev_state_tensor.get("by_team") or {}
        for tm_i, tm_abbr in enumerate((away, home)):
            tm_def_p = float((by_tm.get(tm_abbr) or {}).get("pass_prob", 0.54))
            tm_def_pr = float((by_tm.get(tm_abbr) or {}).get("pressure_disruption_noul", 0.32))
            for db_i, db_k in enumerate(DOWN_BUCKETS):
                for fz_i, fz_k in enumerate(FIELD_ZONES):
                    for ss_i, ss_k in enumerate(SCORE_SCRIPTS):
                        st_node = by_st.get(f"{tm_abbr}|{db_k}|{fz_k}|{ss_k}") or {}
                        jev_pass_arr[tm_i, db_i, fz_i, ss_i] = float(st_node.get("pass_prob", tm_def_p))
                        jev_press_arr[tm_i, db_i, fz_i, ss_i] = float(st_node.get("pressure_disruption_noul", tm_def_pr))

    clock_sec = np.full(n_sims, 3600.0, dtype=np.float64)
    away_score = np.zeros(n_sims, dtype=np.float64)
    home_score = np.zeros(n_sims, dtype=np.float64)
    away_pass_yds_tot = np.zeros(n_sims, dtype=np.float64)
    home_pass_yds_tot = np.zeros(n_sims, dtype=np.float64)
    away_rush_yds_tot = np.zeros(n_sims, dtype=np.float64)
    home_rush_yds_tot = np.zeros(n_sims, dtype=np.float64)
    total_plays = np.zeros(n_sims, dtype=np.int32)
    poss = rng.integers(0, 2, size=n_sims)
    down = np.ones(n_sims, dtype=np.int32)
    ydstogo = np.full(n_sims, 10, dtype=np.int32)
    yardline_100 = np.full(n_sims, 75, dtype=np.int32)

    for _ in range(175):
        active = clock_sec > 0.0
        if not np.any(active):
            break
        n_act = int(np.sum(active))
        total_plays[active] += 1
        net_epa_vec = np.where(poss == 1, home_net_epa, away_net_epa)
        pace_base_vec = np.where(poss == 1, tr_home["pace_sec"], tr_away["pace_sec"])
        pass_delta_vec = np.where(poss == 1, home_pass_delta, away_pass_delta)
        panic_vec = np.where(poss == 1, tr_home["panic_pp"], tr_away["panic_pp"])
        score_diff = np.where(poss == 1, home_score - away_score, away_score - home_score)
        # Game-script tempo elasticity (Vector 1): leading slows +2.8s, trailing accelerates -3.0s
        pace_base_vec = np.where(
            score_diff >= 7.0,
            pace_base_vec + 2.8,
            np.where(score_diff <= -7.0, pace_base_vec - 3.0, pace_base_vec),
        )
        qtr = np.clip(4 - (clock_sec // 900).astype(np.int32), 1, 4)
        # Sketch 5: 2H clock-bleed elasticity (Q3-Q4, leading >= 7)
        trend_vec = np.where(poss == 0, away_epa_trend_delta, home_epa_trend_delta)
        leading_2h = (score_diff >= 7.0) & (qtr >= 3)
        bleed_adj = np.where(
            leading_2h & (trend_vec < -0.10), 1.5,
            np.where(leading_2h & (trend_vec > 0.03), -1.0, 0.0),
        )
        pace_base_vec = pace_base_vec + bleed_adj
        is_4th = active & (down == 4)
        is_1to3 = active & (down < 4)

        if np.any(is_4th):
            idx_4th = np.where(is_4th)[0]
            yl4, yd4 = yardline_100[idx_4th], ydstogo[idx_4th]
            go_mask = ((yl4 <= 58) & (yd4 <= 3)) | ((yl4 <= 40) & (yd4 <= 5) & (sealed_state["tau"] >= 0.40)) | ((qtr[idx_4th] == 4) & (score_diff[idx_4th] < 0) & (yd4 <= 7))
            fg_mask = (~go_mask) & (yl4 <= 37)
            punt_mask = (~go_mask) & (~fg_mask)
            if np.any(go_mask):
                g_idx = idx_4th[go_mask]
                p_conv = np.clip(0.64 - 0.05 * ydstogo[g_idx] + 0.55 * net_epa_vec[g_idx], 0.15, 0.82)
                # Sketch 2: Red-zone TD rate haircut when team_rz_td_pct < RZ_TD_CUTOFF (0.25)
                rz_td_vec = np.where(poss[g_idx] == 0, away_rz_td_pct, home_rz_td_pct)
                rz_haircut_mask = rz_td_vec < RZ_TD_CUTOFF
                p_conv = np.where(rz_haircut_mask, np.clip(p_conv * 0.85, 0.15, 0.82), p_conv)
                conv = rng.random(len(g_idx)) < p_conv
                gains = np.where(conv, ydstogo[g_idx] + rng.integers(1, 8, size=len(g_idx)), rng.integers(-1, 2, size=len(g_idx)))
                new_yl = yardline_100[g_idx] - gains
                td = conv & (new_yl <= 0)
                home_score[g_idx[td & (poss[g_idx] == 1)]] += 6.95
                away_score[g_idx[td & (poss[g_idx] == 0)]] += 6.95
                poss[g_idx[td | (~conv)]] = 1 - poss[g_idx[td | (~conv)]]
                yardline_100[g_idx[td]] = 75
                yardline_100[g_idx[~conv]] = np.clip(100 - yardline_100[g_idx[~conv]], 5, 95)
                fd_keep = conv & (~td)
                yardline_100[g_idx[fd_keep]] = new_yl[fd_keep]
                down[g_idx] = 1
                ydstogo[g_idx] = np.minimum(10, yardline_100[g_idx])
            if np.any(fg_mask):
                f_idx = idx_4th[fg_mask]
                p_fg = np.clip(0.97 - 0.011 * np.maximum(0, yardline_100[f_idx] - 15), 0.45, 0.98)
                # Sketch 2: FG make boost +0.05 inside the 10 when team_rz_td_pct < RZ_TD_CUTOFF
                rz_td_vec_fg = np.where(poss[f_idx] == 0, away_rz_td_pct, home_rz_td_pct)
                rz_haircut_mask_fg = rz_td_vec_fg < RZ_TD_CUTOFF
                p_fg = np.where(rz_haircut_mask_fg, np.minimum(p_fg + 0.05, 0.98), p_fg)
                made = rng.random(len(f_idx)) < p_fg
                home_score[f_idx[made & (poss[f_idx] == 1)]] += 3.0
                away_score[f_idx[made & (poss[f_idx] == 0)]] += 3.0
                poss[f_idx] = 1 - poss[f_idx]
                yardline_100[f_idx] = np.where(made, 75, np.clip(100 - yardline_100[f_idx] - 7, 20, 80))
                down[f_idx] = 1
                ydstogo[f_idx] = 10
            if np.any(punt_mask):
                p_idx = idx_4th[punt_mask]
                net_punt = rng.integers(38, 46, size=len(p_idx))
                poss[p_idx] = 1 - poss[p_idx]
                yardline_100[p_idx] = np.clip(100 - (yardline_100[p_idx] - net_punt), 20, 90)
                down[p_idx] = 1
                ydstogo[p_idx] = 10

        if np.any(is_1to3):
            idx_13 = np.where(is_1to3)[0]
            dn_v, ne_v, sd_v, qt_v = down[idx_13], net_epa_vec[idx_13], score_diff[idx_13], qtr[idx_13]
            yd_v, yl_v, ps_v = ydstogo[idx_13], yardline_100[idx_13], poss[idx_13]
            base_p = np.where(dn_v == 1, 0.48, np.where(dn_v == 2, 0.56, 0.74))
            # Game-script pass rate elasticity (Vector 1): leading >= 7 reduces pass -0.08, trailing <= -7 increases +0.09
            script_pass_mod = np.where(
                sd_v >= 7.0,
                -0.08,
                np.where(sd_v <= -7.0, 0.09 + np.where(qt_v == 4, panic_vec[idx_13], 0.0), 0.0),
            )
            p_pass = np.clip(base_p + pass_delta_vec[idx_13] + script_pass_mod, 0.15, 0.90)
            comp_base_v = np.where(ps_v == 1, home_comp_base, away_comp_base)
            sack_prob_v = np.where(ps_v == 1, home_sack_prob, away_sack_prob)

            if has_jev_tensor:
                db_idx = np.where(dn_v == 1, 0, np.where(dn_v == 2, 1, np.where(yd_v <= 3, 2, 3)))
                fz_idx = np.where(yl_v >= 80, 0, np.where(yl_v >= 40, 1, np.where(yl_v > 20, 2, 3)))
                ss_idx = np.where(sd_v <= -7.0, 0, np.where(sd_v >= 7.0, 2, 1))
                jev_p_pass = jev_pass_arr[ps_v, db_idx, fz_idx, ss_idx]
                jev_p_press = jev_press_arr[ps_v, db_idx, fz_idx, ss_idx]
                p_pass = np.clip(0.65 * p_pass + 0.35 * jev_p_pass, 0.15, 0.90)
                sack_prob_v = np.clip(0.70 * sack_prob_v + 0.30 * (jev_p_press * 0.18), 0.030, 0.125)

            is_pass = rng.random(len(idx_13)) < p_pass
            u_out = rng.random(len(idx_13))
            to_prob = np.clip(np.where(is_pass, 0.021, 0.008) - 0.015 * ne_v, 0.003, 0.045)
            # Apply QB 2x2 INT probability multiplier
            to_prob = np.clip(to_prob * np.where(ps_v == 1, home_to_mult, away_to_mult), 0.003, 0.045)
            is_to = u_out < to_prob
            pass_comp = np.clip(comp_base_v + 0.38 * ne_v, 0.48, 0.78)
            pass_yds = np.where(
                u_out < (to_prob + sack_prob_v), -rng.integers(5, 9, size=len(idx_13)),
                np.where(u_out < (to_prob + sack_prob_v + pass_comp), np.round(rng.normal(11.4 + 14.5 * ne_v, 7.5, size=len(idx_13))).astype(np.int32), 0)
            )
            run_yds = np.round(rng.normal(4.4 + 9.5 * ne_v, 4.2, size=len(idx_13))).astype(np.int32)
            # Sketch 1: Rush decay x0.78 when off_rush_epa < RUSH_DECAY_THRESHOLD (-0.15)
            away_rush_decay = away_off_rush_epa < RUSH_DECAY_THRESHOLD
            home_rush_decay = home_off_rush_epa < RUSH_DECAY_THRESHOLD
            if away_rush_decay or home_rush_decay:
                decay_mask = np.where(ps_v == 0, away_rush_decay, home_rush_decay)
                run_yds = np.where(decay_mask & (~is_pass), np.round(run_yds * RUSH_DECAY_MULT).astype(np.int32), run_yds)
            yds = np.where(is_pass, pass_yds, run_yds)

            # Soft blowout/shootout regression cap before Q4 (Vector 1)
            cap_mask = (qt_v < 4) & (
                (np.abs(home_score[idx_13] - away_score[idx_13]) > 21.0)
                | ((home_score[idx_13] + away_score[idx_13]) > 62.0)
            )
            if np.any(cap_mask):
                yds = np.where(cap_mask, np.round(yds * 0.75).astype(np.int32), yds)
                pass_yds = np.where(cap_mask & is_pass, yds, pass_yds)
                run_yds = np.where(cap_mask & (~is_pass), yds, run_yds)

            # Accumulate real simulated passing & rushing yardage per world
            pos_pass_yds = np.maximum(0, pass_yds)
            pos_run_yds = np.maximum(-3, run_yds)
            hm_pass_mask = (~is_to) & is_pass & (ps_v == 1)
            aw_pass_mask = (~is_to) & is_pass & (ps_v == 0)
            hm_run_mask = (~is_to) & (~is_pass) & (ps_v == 1)
            aw_run_mask = (~is_to) & (~is_pass) & (ps_v == 0)
            if np.any(hm_pass_mask):
                home_pass_yds_tot[idx_13[hm_pass_mask]] += pos_pass_yds[hm_pass_mask]
            if np.any(aw_pass_mask):
                away_pass_yds_tot[idx_13[aw_pass_mask]] += pos_pass_yds[aw_pass_mask]
            if np.any(hm_run_mask):
                home_rush_yds_tot[idx_13[hm_run_mask]] += pos_run_yds[hm_run_mask]
            if np.any(aw_run_mask):
                away_rush_yds_tot[idx_13[aw_run_mask]] += pos_run_yds[aw_run_mask]

            if np.any(is_to):
                t_i = idx_13[is_to]
                poss[t_i] = 1 - poss[t_i]
                yardline_100[t_i] = np.clip(100 - yardline_100[t_i], 15, 85)
                down[t_i], ydstogo[t_i] = 1, 10
            non_to = ~is_to
            if np.any(non_to):
                nt_i = idx_13[non_to]
                g_nt = yds[non_to]
                new_yl = yardline_100[nt_i] - g_nt
                td_nt = new_yl <= 0
                if np.any(td_nt):
                    td_i = nt_i[td_nt]
                    home_score[td_i[poss[td_i] == 1]] += 6.95
                    away_score[td_i[poss[td_i] == 0]] += 6.95
                    poss[td_i] = 1 - poss[td_i]
                    yardline_100[td_i], down[td_i], ydstogo[td_i] = 75, 1, 10
                in_f = ~td_nt
                if np.any(in_f):
                    if_i = nt_i[in_f]
                    g_if = g_nt[in_f]
                    yl_if = np.clip(new_yl[in_f], 1, 99)
                    fd = g_if >= ydstogo[if_i]
                    yardline_100[if_i] = yl_if
                    down[if_i] = np.where(fd, 1, down[if_i] + 1)
                    ydstogo[if_i] = np.where(fd, np.minimum(10, yl_if), np.maximum(1, ydstogo[if_i] - g_if))

        clock_sec[active] -= np.clip(rng.normal(pace_base_vec[active], 3.2, size=n_act), 8.0, 40.0)

    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash

    # Stage 2 Layer-1 Market-Anchor James-Stein Shrinkage & Variance Calibration (Vector 1)
    raw_margin_vec = home_score - away_score
    raw_total_vec = home_score + away_score
    raw_margin = float(np.mean(raw_margin_vec))
    raw_total = float(np.mean(raw_total_vec))

    if posted_home_spread is not None and posted_total is not None:
        market_margin = -float(posted_home_spread)
        market_total = float(posted_total)
        lambda_margin = 0.70
        lambda_total = 0.65
        shrunk_margin = float(
            np.clip(
                market_margin + (1.0 - lambda_margin) * (raw_margin - market_margin),
                market_margin - 6.0,
                market_margin + 6.0,
            )
        )
        shrunk_total = float(
            np.clip(
                market_total + (1.0 - lambda_total) * (raw_total - market_total),
                market_total - 5.5,
                market_total + 5.5,
            )
        )
    else:
        shrunk_margin = float(np.clip(0.35 * raw_margin, -11.5, 11.5))
        shrunk_total = float(np.clip(45.5 + 0.35 * (raw_total - 45.5), 37.5, 53.5))

    sigma_margin = 13.5
    sigma_total = 13.0
    # PHASE 6: NET_POINTS_OFF_TURNOVERS_2026 turnover-fragility variance modifier
    # ball-secure teams (high net pts off TO) compress variance; fragile/negative-net teams inflate it
    to_volatility_adj = -0.12 * (away_net_pts_to + home_net_pts_to) / 2.0 / 35.0
    sigma_margin = max(6.0, 13.5 + to_volatility_adj)
    sigma_total = max(6.0, 13.0 + to_volatility_adj)
    std_m = max(1e-6, float(np.std(raw_margin_vec)))
    std_t = max(1e-6, float(np.std(raw_total_vec)))
    scale_m = sigma_margin / std_m
    scale_t = sigma_total / std_t

    # PHASE 6: FIRST_HALF_DIFF_PRIORS_2026 spread shift (faster-starting team edges the margin)
    first_half_margin_shift = 0.10 * (home_first_half_prior - away_first_half_prior)
    home_margin_out = shrunk_margin + (raw_margin_vec - raw_margin) * scale_m + first_half_margin_shift
    total_pts_out = np.maximum(10.0, shrunk_total + (raw_total_vec - raw_total) * scale_t)
    home_score = 0.5 * (total_pts_out + home_margin_out)
    away_score = 0.5 * (total_pts_out - home_margin_out)

    # Zero-copy unpadded_drive_reduceat (`vmls_and_numpy_kernels.py`) across simulated drive segments
    n_sample_snaps = min(110, n_sims)
    drive_starts = np.arange(0, n_sample_snaps, 5, dtype=np.intp)
    snap_team_ids = np.arange(n_sample_snaps, dtype=np.intp) % 2
    drive_reduce_summary = unpadded_drive_reduceat(
        snap_values=raw_margin_vec[:n_sample_snaps] / 11.0,
        drive_start_indices=drive_starts,
        player_ids=snap_team_ids,
        n_players=2,
    )

    # Exact Discrete Compound-Poisson FFT Pricing (`effective_theory_and_large_deviations.py`)
    # Replaces Gaussian approximation on key NFL numbers (3, 6, 7, 10, 14) and totals
    hm_expected_pts = max(9.0, float(np.mean(home_score)))
    aw_expected_pts = max(9.0, float(np.mean(away_score)))
    hm_scoring_drives = max(1.5, hm_expected_pts / 5.15)
    aw_scoring_drives = max(1.5, aw_expected_pts / 5.15)
    hm_td_share = float(np.clip(home_rz_td_pct if home_rz_td_pct > 0.30 else home_rz_td_pct * 1.65, 0.32, 0.72))
    aw_td_share = float(np.clip(away_rz_td_pct if away_rz_td_pct > 0.30 else away_rz_td_pct * 1.65, 0.32, 0.72))
    hm_event_pmf = np.zeros(9, dtype=np.float64)
    hm_event_pmf[3] = 1.0 - hm_td_share
    hm_event_pmf[6] = 0.06 * hm_td_share
    hm_event_pmf[7] = 0.90 * hm_td_share
    hm_event_pmf[8] = 0.04 * hm_td_share
    aw_event_pmf = np.zeros(9, dtype=np.float64)
    aw_event_pmf[3] = 1.0 - aw_td_share
    aw_event_pmf[6] = 0.06 * aw_td_share
    aw_event_pmf[7] = 0.90 * aw_td_share
    aw_event_pmf[8] = 0.04 * aw_td_share
    hm_pmf = fft_compound_poisson_pmf(lam=hm_scoring_drives, single_event_pmf=hm_event_pmf, n_grid=128)[:96]
    aw_pmf = fft_compound_poisson_pmf(lam=aw_scoring_drives, single_event_pmf=aw_event_pmf, n_grid=128)[:96]
    joint_score_grid = np.outer(hm_pmf, aw_pmf)
    pts_idx = np.arange(96)
    tot_grid = pts_idx[:, None] + pts_idx[None, :]
    mrg_grid = pts_idx[:, None] - pts_idx[None, :]
    fft_key_numbers = {
        int(k): round(float(np.sum(joint_score_grid[np.abs(mrg_grid) == k])), 4)
        for k in (3, 6, 7, 10, 14)
    }
    fft_shootout_ge51 = round(float(np.sum(joint_score_grid[tot_grid >= 51])), 4)
    fft_stall_le37 = round(float(np.sum(joint_score_grid[tot_grid <= 37])), 4)
    fft_one_score_le7 = round(float(np.sum(joint_score_grid[np.abs(mrg_grid) <= 7])), 4)

    # Cramér Large Deviation Tilting (`cramer_large_deviation_tilt`) for milestone & alt-line pricing
    cramer_alt_drive = cramer_large_deviation_tilt(
        support_vals=np.array([0.0, 3.0, 6.0, 7.0, 8.0]),
        base_probs=np.array([0.58, 0.18, 0.02, 0.20, 0.02]),
        target_mean_a=4.25,
        n_steps=10,
    )

    # Stage 2 / Stage 4 Call Sites: Albert-Chib Tempo Regime Filter (Item 5), LQR Clock Controller (Item 4), Talisman TDR (Item 6)
    tempo_regime_away = albert_chib_markov_switching_regime_update(y_obs=float(tr_away["pace_sec"]), score_diff=-float(away_first_half_prior))
    tempo_regime_home = albert_chib_markov_switching_regime_update(y_obs=float(tr_home["pace_sec"]), score_diff=float(home_first_half_prior))
    lqr_clock_ctrl = lqr_riccati_clock_controller(
        A=np.array([[0.92, -0.05], [0.0, 0.88]]),
        B=np.array([[0.15], [0.25]]),
        Q=np.diag([1.0, 0.5]),
        R=np.array([[0.5]]),
        x0=np.array([float(home_first_half_prior - away_first_half_prior), 4.0]),
        horizon=6,
    )
    talisman_away = talisman_dependency_variance_multiplier(away_sh, primary_scratched_or_pressured=bool(away_inj or home_def_blitz_pct > 30.0))
    talisman_home = talisman_dependency_variance_multiplier(home_sh, primary_scratched_or_pressured=bool(home_inj or away_def_blitz_pct > 30.0))

    # Stage 3 Call Site: Quasi-Riemann Greedy Span-Increasing Row Selector (Item 3)
    router_span_selection = greedy_span_increasing_row_selector(
        np.array([
            [float(tr_away["off_epa"]), float(tr_away["def_epa"]), float(away_pass_delta)],
            [float(tr_home["off_epa"]), float(tr_home["def_epa"]), float(home_pass_delta)],
            [2.0 * float(tr_away["off_epa"]), 2.0 * float(tr_away["def_epa"]), 2.0 * float(away_pass_delta)],
        ], dtype=np.float64)
    )

    # Stage 5 Call Sites: 3-Marginal Kantorovich SGP Copula (Item 1), Rademacher Conjunction Gate (Item 2), tau_hat + Signal Pack (Item 9)
    sgp_parity_cost = np.array([[[1.0, 0.0], [0.0, 1.0]], [[0.0, 1.0], [1.0, 0.0]]], dtype=np.float64)
    sgp_kantorovich_gap = kantorovich_three_marginal_relaxation_gap(
        p1=np.array([0.5, 0.5]), p2=np.array([0.5, 0.5]), p3=np.array([0.5, 0.5]), cost_tensor=sgp_parity_cost
    )
    conjunction_rademacher_bound = rademacher_t_independent_tail_bound(
        weights=np.array([0.30, 0.20, 0.15, 0.15, 0.10, 0.10]), t_clauses=6, delta=0.05
    )
    tau_hat_calibration = apply_tau_hat_calibration_shrinkage(raw_margin, tau_hat=6.77, n_held_out=3988, held_out_only=True)
    signal_pack_meta = load_signal_pack_and_full_tables()

    tot = total_pts_out
    sprd = home_margin_out
    pace = 3600.0 / np.maximum(total_plays, 100)
    out = {
        "matchup": f"{away} @ {home}",
        "median_total": round(float(np.median(tot)), 2),
        "median_spread_home": round(float(np.median(sprd)), 2),
        "median_plays": round(float(np.median(total_plays)), 1),
        "median_pace_sec": round(float(np.median(pace)), 2),
        "sinkhorn_mass_moved": round(away_mass + home_mass, 4),
        "kkt_share_sum_away": round(float(np.sum(away_sh)), 10),
        "kkt_share_sum_home": round(float(np.sum(home_sh)), 10),
        "brenier_stability_ratio_away": round(float(brenier_ratio_away), 6),
        "brenier_stability_ratio_home": round(float(brenier_ratio_home), 6),
        "solenoidal_zero_sum_error_max": float(max(away_zero_sum_err, home_zero_sum_err)),
        "external_accuracy_anchors": {
            "high_scoring_basketball_pct": 74.5,
            "low_scoring_football_pct": 53.9,
            "source": "Tangri (2026, SSRN-7308118)",
        },
        "sgp_kantorovich_3marginal": sgp_kantorovich_gap,
        "conjunction_rademacher_tail_bound": conjunction_rademacher_bound,
        "router_span_increasing_selection": {
            "selected_indices": router_span_selection["selected_indices"],
            "rejected_indices": router_span_selection["rejected_indices"],
            "rank": router_span_selection["rank"],
        },
        "lqr_clock_controller": {
            "u_0": [round(float(x), 5) for x in np.ravel(lqr_clock_ctrl["u_0"])],
            "gains_finite": lqr_clock_ctrl["gains_finite"],
            "cost_non_increasing": lqr_clock_ctrl["cost_non_increasing"],
        },
        "tempo_regime_filter": {
            "away": tempo_regime_away,
            "home": tempo_regime_home,
        },
        "talisman_fragility": {
            "away": talisman_away,
            "home": talisman_home,
        },
        "situational_harvest_midday": {
            "away_kickoff_drive_start_offset": away_drive_start_offset,
            "home_kickoff_drive_start_offset": home_drive_start_offset,
            "rz_pts_per_trip_diff_away": round(rz_pts_trip_diff_away, 4),
            "non_blitz_pressure_surplus_away": round(non_blitz_surplus_away, 4),
            "non_blitz_pressure_surplus_home": round(non_blitz_surplus_home, 4),
            "tb_wr_emeka_egbuka_out_applied": egbuka_out_applied,
        },
        "tau_hat_calibration": tau_hat_calibration,
        "signal_pack_summary": {
            "signal_pack_table_count": signal_pack_meta["signal_pack_table_count"],
            "full_tables_csv_count": signal_pack_meta["full_tables_csv_count"],
            "timo_paired_flip_inflation_ratio": round(float(signal_pack_meta["timo_paired_flip_inflation_ratio"]), 4),
        },
        "unpadded_drive_totals": [round(float(x), 4) for x in drive_reduce_summary["player_totals"]],
        "shootout_prob_ge51": fft_shootout_ge51,
        "stall_prob_le37": fft_stall_le37,
        "one_score_prob_le7": fft_one_score_le7,
        "fft_key_number_masses": fft_key_numbers,
        "cramer_tail_milestone": {
            "theta_star": round(float(cramer_alt_drive["theta_star"]), 4),
            "rate_I_a": round(float(cramer_alt_drive["rate_I_a"]), 4),
            "chernoff_bound_10_drives": round(float(cramer_alt_drive["large_deviation_prob_bound"]), 5),
        },
        "qb_2x2_overlay": {
            "away": away_qb_2x2,
            "home": home_qb_2x2,
            "mnar_flags": mnar_flags,
            "away_lb_tackle_funnel_boost": idp_tackle_funnel_adjustment(away_def_blitz_pct),
            "home_lb_tackle_funnel_boost": idp_tackle_funnel_adjustment(home_def_blitz_pct),
        },
        # PHASE 6: Midday priors & matchup overlays
        "first_half_diff_prior_away": round(away_first_half_prior, 2),
        "first_half_diff_prior_home": round(home_first_half_prior, 2),
        "first_half_margin_shift": round(first_half_margin_shift, 3),
        "net_points_off_turnovers_away": round(away_net_pts_to, 1),
        "net_points_off_turnovers_home": round(home_net_pts_to, 1),
        "turnover_volatility_adj": round(to_volatility_adj, 4),
        "evero_def_tenure_floor_applied": bool(away == "CAR" or home == "CAR"),
        "chase_brown_xfp_surge_applied": bool(cb_active),
        "bowers_compensation_chain_applied": bool(bm_active),
        # PHASE 6: Two-Clocks Pressure Collision results per side
        "two_clocks": two_clocks,
        "coachMindsetHash": expected_hash,
    }
    if return_vectors:
        # Combine KKT-conserved Sinkhorn WR1/RB1 weight with empirical W1-W7 target/carry share
        aw_wr1_eff_share = 0.50 * float(away_sh[0]) + 0.50 * away_wr1_share_emp
        hm_wr1_eff_share = 0.50 * float(home_sh[0]) + 0.50 * home_wr1_share_emp
        aw_rb1_eff_share = 0.35 * (float(away_sh[4]) / 0.16 * 0.62) + 0.65 * away_rb1_share_emp
        hm_rb1_eff_share = 0.35 * (float(home_sh[4]) / 0.16 * 0.62) + 0.65 * home_rb1_share_emp

        hm_wr1_raw_mean = float(np.mean(home_pass_yds_tot * hm_wr1_eff_share))
        aw_wr1_raw_mean = float(np.mean(away_pass_yds_tot * aw_wr1_eff_share))
        hm_rb1_raw_mean = float(np.mean(home_rush_yds_tot * hm_rb1_eff_share))
        aw_rb1_raw_mean = float(np.mean(away_rush_yds_tot * aw_rb1_eff_share))

        hm_wr1_shrunk = empirical_bayes_line(7, hm_wr1_raw_mean, "rec_yds")
        aw_wr1_shrunk = empirical_bayes_line(7, aw_wr1_raw_mean, "rec_yds")
        hm_rb1_shrunk = empirical_bayes_line(7, hm_rb1_raw_mean, "rush_yds")
        aw_rb1_shrunk = empirical_bayes_line(7, aw_rb1_raw_mean, "rush_yds")

        hm_wr1_vec = sample_lognormal(hm_wr1_shrunk, n_sims, rng, cv=0.42)
        aw_wr1_vec = sample_lognormal(aw_wr1_shrunk, n_sims, rng, cv=0.42)
        hm_rb1_vec = sample_lognormal(hm_rb1_shrunk, n_sims, rng, cv=0.42)
        aw_rb1_vec = sample_lognormal(aw_rb1_shrunk, n_sims, rng, cv=0.42)

        # Marchenko-Pastur Spectral Denoising (`wigner_semicircle_marchenko_pastur_denoise`) for SGP Copula Covariance
        leg_mat = np.vstack([
            home_pass_yds_tot,
            hm_wr1_vec,
            hm_rb1_vec,
            away_pass_yds_tot,
            aw_wr1_vec,
            aw_rb1_vec,
        ])
        raw_corr = np.corrcoef(leg_mat)
        denoised_corr = wigner_semicircle_marchenko_pastur_denoise(raw_corr, n_samples=18)
        eigvals_raw = np.linalg.eigvalsh(raw_corr)
        lambda_plus = (1.0 + math.sqrt(6.0 / 18.0)) ** 2
        n_clipped = int(np.sum(eigvals_raw <= lambda_plus))

        out["vectors"] = {
            "home_score": home_score,
            "away_score": away_score,
            "home_margin_out": home_margin_out,
            "total_pts_out": total_pts_out,
            "total_plays": total_plays,
            "home_pass_yds": home_pass_yds_tot,
            "away_pass_yds": away_pass_yds_tot,
            "home_rush_yds": home_rush_yds_tot,
            "away_rush_yds": away_rush_yds_tot,
            "home_wr1_yds": hm_wr1_vec,
            "away_wr1_yds": aw_wr1_vec,
            "home_rb1_yds": hm_rb1_vec,
            "away_rb1_yds": aw_rb1_vec,
            "jev_state_tensor_active": has_jev_tensor,
            "sgp_corr_denoised": denoised_corr,
            "sgp_noise_eigenvalues_clipped": n_clipped,
        }
        out["away_injuries_applied"] = list(away_inj)
        out["home_injuries_applied"] = list(home_inj)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sealed-json", default="/opt/model/sealed_baseline.json")
    ap.add_argument("--sims", type=int, default=5000)
    args = ap.parse_args()
    sealed_obj, digest = load_sealed_object_readonly(args.sealed_json)
    cand_bundle = load_week7_candidate_ratings_readonly()
    cand_msg = ""
    if cand_bundle is not None:
        w7 = cand_bundle["week7_candidate"]
        cand_msg = f" | week7_cand={len(w7['ratings'])} teams (tau_rating={w7['params']['tau']})"
    print(f"[SEAL VERIFIED] coachMindsetHash = {digest} | tau = {sealed_obj['tau']} | QB_QUESTIONABLE = {sealed_obj['epaDropoffTable']['QB_QUESTIONABLE']}{cand_msg}")
    slate = [
        ("CHI", "SEA", ["QB_QUESTIONABLE"], ["QB_QUESTIONABLE"], "CHI +3.5",  +1.53, "CHI +11 (ML +32)", "ELEVATED_SHARP_AGREE", 1),
        ("TEN", "CIN", [],                  ["QB_QUESTIONABLE"], "TEN +10.5", -2.13, "CIN +18",          "MONEY_AGAINST",        2),
        ("MIN", "DET", ["QB1"],             [],                  "DET -3",    +2.77, "MIN +14",          "MONEY_AGAINST",        3),
        ("CLE", "PIT", ["QB1", "WR2"],      [],                  "PIT -4",    +4.36, "CLE +8",           "MONEY_AGAINST",        4),
        ("LV",  "NYJ", ["QB_QUESTIONABLE"], [],                  "LV +1",     +3.26, "neutral (±2)",     "MODEL_ONLY",           5),
        ("CAR", "GB",  [],                  [],                  "GB -4",     +2.33, "CAR +3 (ML +22)",  "MODEL_ONLY_MILD_AGAINST", 6),
        ("BUF", "BAL", [],                  [],                  "OVER (+40)",+0.63, "OVER +40",         "BOARD_SHARPEST_OVER",  7),
    ]
    for idx, (aw, hm, ai, hi, play, edge, sharp, flag, rank) in enumerate(slate):
        r = simulate_matchup_pbp(aw, hm, ai, hi, sealed_obj, digest, n_sims=args.sims, seed=700 + idx)
        print(f"#{rank} {r['matchup']:9s} | {play:10s} | MedTot: {r['median_total']:5.2f} | MedSprd(H): {r['median_spread_home']:+6.2f} | Pace: {r['median_pace_sec']:5.2f}s | Edge: {edge:+5.2f} | Sharp: {sharp:16s} | {flag}")


if __name__ == "__main__":
    main()
