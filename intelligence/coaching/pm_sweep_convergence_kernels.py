"""PM Sweep & Deep-Math Convergence Kernels (2026-10-30).

Pure, deterministic, vectorized NumPy/math kernels wiring the Oct 30, 2026
X/IG PM Sweeps, 7-Signal Pack, and Deep-Math discoveries into the GSE
intelligence/coaching layer:

1. ``qb_breakdown_convergence_kernel``:
   - Separates OL pressure attribution (~0.72 OL weight) vs QB pressure-to-sack
     attribution (~0.68 QB weight) per @Timo_NFL (B6), plus Timo's 1.3607x
     behind-LOS screen filter ratio (0.4370 / 0.3211).
   - Continuous time-to-pressure / time-to-sack Weibull survival hazard per
     @kevin_cole (B9) & NGS continuous Pressure Probability (B16).
   - SCRACK (Scramble-vs-Sack Decision Index) and verified in-house PFR
     throwaway-rate table (Bo Nix: 0.097, Bryce Young: 0.094, Jayden Daniels: 0.079).

2. ``predict_presnap_coverage_shell``:
   - @KoalatyStats Pre-Snap Coverage Shell Predictor + @WideLeft Cover-1 Rate
     returning probabilities summing to 1.0 across
     (Cover_1_Man, Cover_3_Zone, Quarters_2High, Cover_2_Man, Zero_Sim_Blitz)
     conditioned on down, ydstogo, personnel ('11' vs '12'/'21'),
     motion_at_snap, and score_diff.
   - 2026 PFF Man-Coverage Lockdown CB registry (Travis Hunter: 0.0,
     Trent McDuffie: 2.8, Dee Alford: 20.0, Daylen Everette: 25.7,
     Jourdan Lewis: 35.0 passer rating allowed) + receiver target/YPRR
     suppression when facing lockdown man CBs.
   - SumerSports JSN elite dominance multiplier (target_share=0.353,
     air_yards_share=0.443, epa_per_target=+0.53) and LA Rams net-EPA
     undervaluation signal (#5 net EPA, 0.69 expected win rate vs 3-4 actual).

3. ``hierarchical_fg_make_prob`` & ``coach_fourth_down_behavioral_fork``:
   - @nfl_simulator 23,247-kick hierarchical field-goal probability model
     (calibrated to 97% at 30 yds, 80% at 45 yds, 61% at 55 yds) incorporating
     kick distance, surface wind (mph > 8), temperature, altitude air-density
     (EQ-PHYSICS-001, e.g., Denver 5,280 ft), dome/roof, and kicker
     Empirical-Bayes random effect.
   - @run_the_sims descriptive vs. prescriptive 4th-down fork (coaches go for it
     only 29% of the time the WP model says to: blends optimal WP go-rate with
     0.29 empirical coach compliance and tau_hat per-coach delta; walk-forward
     accuracy lift +11.1585pp on n=3,988).

4. ``eb_interception_catch_rate_shrinkage`` & ``multilevel_snap_timing_cadence_penalty``:
   - @nfl_simulator Empirical-Bayes INT catch-rate shrinkage (shrinking noisy
     INT/TWP conversion rates like Denver's 77% [13/17] toward the ~52% league
     prior -> ~55% posterior).
   - Nguyen & Yurko (CMU arXiv:2502.16313) multilevel snap-timing variance /
     silent-count edge-jump penalty (C-248 Same-Yardstick get-off).

5. ``trench_stuff_and_fractional_tackles``:
   - Big Data Bowl Momentum-Based Fractional Tackles (Nguyen, Jiang, Ellingwood B12)
     + 7-Signal Pack missed-tackle share (DET: 12 best; PHI: 49, CLE: 51, DEN: 56
     worst cluster), stuff-rate (yards <= 0), and explosive-RB rate (39 qualified
     benchmark).
"""

from __future__ import annotations

import math
from typing import Any, Mapping, Sequence

import numpy as np

# ============================================================================
# CONSTANTS & VERIFIED BENCHMARK REGISTRIES (2026-10-30 PM SWEEP + SIGNAL PACK)
# ============================================================================

TIMO_OL_PRESSURE_WEIGHT: float = 0.72
TIMO_QB_PRESSURE_WEIGHT: float = 0.28
TIMO_QB_P2S_WEIGHT: float = 0.68
TIMO_OL_P2S_WEIGHT: float = 0.32
TIMO_BEHIND_LOS_INFLATION_RATIO: float = 0.4370 / 0.3211  # ~1.360947 (1.3607x CSV benchmark)

VERIFIED_PFR_THROWAWAY_RATES_2026: dict[str, float] = {
    "Bo Nix": 0.097,
    "Bryce Young": 0.094,
    "Jayden Daniels": 0.079,
    "Caleb Williams": 0.074,
    "Josh Allen": 0.068,
    "Lamar Jackson": 0.062,
    "Patrick Mahomes": 0.059,
    "Jared Goff": 0.048,
    "Joe Burrow": 0.044,
    "LEAGUE_AVG": 0.058,
}

COVERAGE_SHELL_NAMES: tuple[str, ...] = (
    "Cover_1_Man",
    "Cover_3_Zone",
    "Quarters_2High",
    "Cover_2_Man",
    "Zero_Sim_Blitz",
)

PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING: dict[str, float] = {
    "Travis Hunter (JAX)": 0.0,
    "Travis Hunter": 0.0,
    "Trent McDuffie (LAR)": 2.8,
    "Trent McDuffie": 2.8,
    "Dee Alford (BUF)": 20.0,
    "Dee Alford": 20.0,
    "Daylen Everette (PIT)": 25.7,
    "Daylen Everette": 25.7,
    "Jourdan Lewis (JAX)": 35.0,
    "Jourdan Lewis": 35.0,
}

NFL_PASSER_RATING_MAN_BASELINE: float = 91.5

SUMERSPORTS_JSN_2026_BENCHMARK: dict[str, Any] = {
    "player": "Jaxon Smith-Njigba",
    "team": "SEA",
    "target_share": 0.353,
    "air_yards_share": 0.443,
    "epa_per_target": 0.53,
}

SUMERSPORTS_LAR_UNDERVALUATION_2026: dict[str, Any] = {
    "team": "LAR",
    "net_epa_rank": 5,
    "expected_win_rate": 0.69,
    "actual_wins": 3,
    "actual_losses": 4,
    "actual_win_rate": 3.0 / 7.0,
    "pythagorean_undervaluation_gap": 0.69 - (3.0 / 7.0),
}

EMPIRICAL_COACH_GO_COMPLIANCE: float = 0.29
TAU_WALKFORWARD_ACC_DELTA: float = 0.111585  # +11.1585pp on n=3,988 (2024 +8.7133pp, 2025 +13.5551pp)
TAU_HELD_OUT_PRIOR_ONLY_DELTA: float = 0.067703  # +6.7703pp original control on n=3,988

LEAGUE_INT_PER_TWP_PRIOR: float = 0.52
LEAGUE_INT_PRIOR_PSEUDO_TRIALS: float = 115.0  # Shrinks Denver 13/17 (76.5%) -> 55.15% (~55%)

SIGNAL_PACK_MISSED_TACKLES_2026: dict[str, int] = {
    "DET": 12,
    "MIN": 24,
    "BAL": 27,
    "KC": 28,
    "BUF": 31,
    "GB": 33,
    "LAR": 35,
    "SEA": 36,
    "PHI": 49,
    "CLE": 51,
    "DEN": 56,
}

SIGNAL_PACK_QUALIFIED_RB_BENCHMARK_COUNT: int = 39


def _sigmoid(x: float | np.ndarray) -> float | np.ndarray:
    arr = np.asarray(x, dtype=np.float64)
    clipped = np.clip(arr, -30.0, 30.0)
    out = 1.0 / (1.0 + np.exp(-clipped))
    if np.ndim(x) == 0:
        return float(out)
    return out


def _logit(p: float | np.ndarray) -> float | np.ndarray:
    arr = np.clip(np.asarray(p, dtype=np.float64), 1e-6, 1.0 - 1e-6)
    out = np.log(arr / (1.0 - arr))
    if np.ndim(p) == 0:
        return float(out)
    return out


# ============================================================================
# 1. QB BREAKDOWN CONVERGENCE KERNEL (@Timo_NFL B6, @kevin_cole B9, NGS B16)
# ============================================================================


def qb_breakdown_convergence_kernel(
    *,
    ol_pressure_rate: float = 0.28,
    qb_self_pressure_rate: float = 0.22,
    qb_fault_p2s_rate: float = 0.20,
    ol_leak_p2s_rate: float = 0.14,
    time_to_throw_sec: float | Sequence[float] | np.ndarray = 2.68,
    pass_rush_getoff_sec: float = 0.84,
    pocket_collapse_scale_sec: float = 2.95,
    weibull_shape_k: float = 2.35,
    scramble_rate_under_pressure: float = 0.14,
    sack_rate_under_pressure: float = 0.18,
    behind_los_screen_share: float = 0.12,
    qb_name: str | None = None,
    custom_throwaway_rate: float | None = None,
) -> dict[str, Any]:
    """Converge QB breakdown mechanics across @Timo_NFL, @kevin_cole, NGS & PFR.

    - Separates OL pressure attribution (0.72 OL weight, 0.28 QB weight) from
      QB pressure-to-sack attribution (0.68 QB weight, 0.32 OL weight) per @Timo_NFL (B6).
    - Models continuous time-to-pressure / time-to-sack survival hazard S(t) and
      NGS continuous Pressure Probability P_press(t) per @kevin_cole (B9) & NGS (B16).
    - Applies behind-LOS screen filter so quick screens do not mask true dropback
      pressure/throwaway rate (reproducing Timo's 1.3607x screen-filter inflation).
    - Computes SCRACK (Scramble-vs-Sack Decision Index) and looks up verified
      2026 PFR throwaway rate (Bo Nix: 0.097, Bryce Young: 0.094, Jayden Daniels: 0.079).
    """
    ol_p = float(np.clip(ol_pressure_rate, 0.01, 0.85))
    qb_p = float(np.clip(qb_self_pressure_rate, 0.01, 0.85))
    qb_p2s = float(np.clip(qb_fault_p2s_rate, 0.01, 0.75))
    ol_p2s = float(np.clip(ol_leak_p2s_rate, 0.01, 0.75))

    # @Timo_NFL B6 structural attribution split
    attributed_pressure_rate = (
        TIMO_OL_PRESSURE_WEIGHT * ol_p + TIMO_QB_PRESSURE_WEIGHT * qb_p
    )
    attributed_p2s_rate = (
        TIMO_QB_P2S_WEIGHT * qb_p2s + TIMO_OL_P2S_WEIGHT * ol_p2s
    )
    ol_pressure_attribution_share = (TIMO_OL_PRESSURE_WEIGHT * ol_p) / max(
        1e-6, attributed_pressure_rate
    )
    qb_sack_attribution_share = (TIMO_QB_P2S_WEIGHT * qb_p2s) / max(
        1e-6, attributed_p2s_rate
    )

    # Behind-LOS screen filter: removing behind-LOS screens (air_yards <= 0)
    # increases true non-screen pressure & throwaway density
    screen_share = float(np.clip(behind_los_screen_share, 0.0, 0.45))
    screen_filter_multiplier = 1.0 / max(0.55, 1.0 - screen_share)
    non_screen_pressure_rate = float(
        np.clip(attributed_pressure_rate * screen_filter_multiplier, 0.01, 0.90)
    )

    # @kevin_cole B9 Weibull time-to-pressure survival & NGS B16 continuous pressure probability
    ttt_arr = np.asarray(time_to_throw_sec, dtype=np.float64)
    effective_t = np.maximum(0.05, ttt_arr - max(0.0, pass_rush_getoff_sec - 0.80))
    lam = max(1.20, float(pocket_collapse_scale_sec) * (1.0 - 0.35 * (ol_p - 0.28)))
    k = max(1.05, float(weibull_shape_k))

    clean_pocket_survival = np.exp(-np.power(effective_t / lam, k))
    instantaneous_pressure_hazard = (k / lam) * np.power(effective_t / lam, k - 1.0)
    ngs_continuous_pressure_prob = np.clip(
        1.0 - clean_pocket_survival * (1.0 - 0.25 * attributed_pressure_rate),
        0.01,
        0.99,
    )

    # SCRACK: Scramble-vs-Sack Decision Index under pressure
    scr_rate = float(np.clip(scramble_rate_under_pressure, 0.0, 0.70))
    sck_rate = float(np.clip(sack_rate_under_pressure, 0.0, 0.70))
    denom = max(1e-6, scr_rate + sck_rate)
    scrack_signed = (scr_rate - sck_rate) / denom  # [-1, +1]
    scrack_index = 0.5 * (scrack_signed + 1.0)  # [0, 1]

    # Verified PFR Throwaway Rate lookup (7-Signal Pack)
    if custom_throwaway_rate is not None:
        raw_throwaway_rate = float(np.clip(custom_throwaway_rate, 0.0, 0.30))
    elif qb_name and qb_name in VERIFIED_PFR_THROWAWAY_RATES_2026:
        raw_throwaway_rate = VERIFIED_PFR_THROWAWAY_RATES_2026[qb_name]
    else:
        raw_throwaway_rate = VERIFIED_PFR_THROWAWAY_RATES_2026["LEAGUE_AVG"]

    non_screen_throwaway_rate = float(
        np.clip(raw_throwaway_rate * screen_filter_multiplier, 0.0, 0.35)
    )

    # Expected sack rate per dropback combining NGS continuous pressure, P2S, throwaway & SCRACK escape
    mean_ngs_press = float(np.mean(ngs_continuous_pressure_prob))
    throwaway_mitigation = max(0.70, 1.0 - 1.65 * (raw_throwaway_rate - 0.058))
    expected_sack_prob_per_dropback = float(
        np.clip(
            mean_ngs_press
            * attributed_p2s_rate
            * (1.0 - 0.30 * scrack_signed)
            * throwaway_mitigation,
            0.01,
            0.25,
        )
    )

    is_scalar = np.ndim(time_to_throw_sec) == 0
    return {
        "qb_name": qb_name or "UNSPECIFIED",
        "ol_pressure_weight": TIMO_OL_PRESSURE_WEIGHT,
        "qb_p2s_weight": TIMO_QB_P2S_WEIGHT,
        "attributed_pressure_rate": float(attributed_pressure_rate),
        "attributed_p2s_rate": float(attributed_p2s_rate),
        "ol_pressure_attribution_share": float(ol_pressure_attribution_share),
        "qb_sack_attribution_share": float(qb_sack_attribution_share),
        "screen_filter_multiplier": float(screen_filter_multiplier),
        "timo_benchmark_inflation_ratio": float(TIMO_BEHIND_LOS_INFLATION_RATIO),
        "non_screen_pressure_rate": float(non_screen_pressure_rate),
        "clean_pocket_survival": (
            float(clean_pocket_survival) if is_scalar else clean_pocket_survival
        ),
        "instantaneous_pressure_hazard": (
            float(instantaneous_pressure_hazard)
            if is_scalar
            else instantaneous_pressure_hazard
        ),
        "ngs_continuous_pressure_prob": (
            float(ngs_continuous_pressure_prob)
            if is_scalar
            else ngs_continuous_pressure_prob
        ),
        "scrack_signed": float(scrack_signed),
        "scrack_index": float(scrack_index),
        "pfr_throwaway_rate": float(raw_throwaway_rate),
        "non_screen_throwaway_rate": float(non_screen_throwaway_rate),
        "expected_sack_prob_per_dropback": float(expected_sack_prob_per_dropback),
    }


# ============================================================================
# 2. PRE-SNAP COVERAGE SHELL PREDICTOR & LOCKDOWN CB / JSN / LAR OVERLAYS
# ============================================================================


def predict_presnap_coverage_shell(
    *,
    down: int = 1,
    ydstogo: float = 10.0,
    personnel: str = "11",
    motion_at_snap: bool = False,
    score_diff: float = 0.0,
    def_cover1_base_rate: float = 0.23,
    primary_cb_name: str | None = None,
    receiver_name: str | None = None,
    receiver_target_share: float = 0.22,
    receiver_air_yards_share: float = 0.26,
    receiver_epa_per_target: float = 0.18,
    team_abbr: str | None = None,
) -> dict[str, Any]:
    """Predict pre-snap defensive coverage shell (@KoalatyStats + @WideLeft) & WR matchup.

    Returns a normalized 5-shell probability distribution summing to 1.0:
      - Cover_1_Man
      - Cover_3_Zone
      - Quarters_2High
      - Cover_2_Man
      - Zero_Sim_Blitz
    Plus 2026 PFF Lockdown Man CB suppression (Travis Hunter 0.0, Trent McDuffie 2.8,
    Dee Alford 20.0, Daylen Everette 25.7, Jourdan Lewis 35.0), SumerSports JSN elite
    dominance multiplier, and SumerSports LA Rams net-EPA undervaluation signal.
    """
    d = int(np.clip(down, 1, 4))
    ytg = float(np.clip(ydstogo, 1.0, 30.0))
    pers = str(personnel).strip()
    c1_base = float(np.clip(def_cover1_base_rate, 0.08, 0.48))

    # Base log-weights anchored to NFL 2026 shell priors with @WideLeft Cover-1 base rate
    logits = np.array(
        [
            math.log(max(0.05, c1_base)),          # Cover_1_Man
            math.log(0.32),                         # Cover_3_Zone
            math.log(0.24),                         # Quarters_2High
            math.log(0.09),                         # Cover_2_Man
            math.log(0.12),                         # Zero_Sim_Blitz
        ],
        dtype=np.float64,
    )

    # Down & distance adjustments (@KoalatyStats pre-snap decision surface)
    if d == 1:
        logits[1] += 0.22  # Cover 3 staple on 1st & 10
        logits[2] += 0.14  # Quarters run-fit / play-action shell
        logits[4] -= 0.28  # Lower zero/sim blitz on 1st down
    elif d == 2 and ytg >= 8.0:
        logits[2] += 0.26  # 2nd & long -> Two-High Quarters surge
        logits[1] += 0.10
    elif d == 3 and ytg <= 4.0:
        logits[0] += 0.42  # 3rd & short -> Cover 1 tight man
        logits[4] += 0.35  # Sim/Zero pressure on 3rd & short
        logits[2] -= 0.32
    elif d >= 3 and ytg >= 7.0:
        logits[2] += 0.30  # 3rd & long -> 2-High Quarters / sticks
        logits[3] += 0.28  # Cover 2 Man bracket
        logits[4] += 0.24  # 3rd down sim blitz

    # Personnel adjustments ('11' 3-WR vs '12'/'21' heavy)
    if pers == "11":
        logits[2] += 0.16  # Nickel/Dime 2-high shell vs 11 personnel
        logits[3] += 0.10
    elif pers in {"12", "13", "21", "22"}:
        logits[0] += 0.25  # Single-high Cover-1 / 8-man box vs multi-TE/FB
        logits[1] += 0.20  # Single-high Cover-3 buzz

    # Motion at snap (@SamHoppen / @KoalatyStats shell tell: forces safety rotation / zone check)
    if motion_at_snap:
        logits[1] += 0.18  # Motion at snap increases zone check (Cover 3 / Quarters)
        logits[2] += 0.12
        logits[0] -= 0.15  # Reduces static press Cover-1 without safety help

    # Score differential (offense perspective: positive = offense leading, negative = offense trailing)
    if score_diff <= -8.0:
        # Offense trailing by 8+ -> defense plays more 2-high umbrella to prevent explosives
        logits[2] += 0.25
        logits[3] += 0.15
        logits[0] -= 0.18
    elif score_diff >= 8.0:
        # Offense leading by 8+ -> defense loads box / single-high to stop clock-drain run
        logits[0] += 0.16
        logits[1] += 0.14

    # Softmax normalization
    shifted = logits - np.max(logits)
    exp_w = np.exp(shifted)
    probs = exp_w / np.sum(exp_w)

    shell_probs: dict[str, float] = {
        name: float(probs[i]) for i, name in enumerate(COVERAGE_SHELL_NAMES)
    }
    man_coverage_prob = float(
        shell_probs["Cover_1_Man"]
        + shell_probs["Cover_2_Man"]
        + 0.50 * shell_probs["Zero_Sim_Blitz"]
    )
    zone_coverage_prob = float(1.0 - man_coverage_prob)

    # PFF 2026 Lockdown Man CB suppression
    cb_passer_rating = (
        PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING.get(primary_cb_name)
        if primary_cb_name
        else None
    )
    if cb_passer_rating is not None:
        # Elite lockdown CBs suppress target share and YPRR on man-coverage snaps
        man_quality_gap = (
            NFL_PASSER_RATING_MAN_BASELINE - float(cb_passer_rating)
        ) / NFL_PASSER_RATING_MAN_BASELINE
        man_target_suppression_mult = float(
            np.clip(1.0 - 0.34 * man_quality_gap * man_coverage_prob, 0.62, 1.0)
        )
        man_yprr_suppression_mult = float(
            np.clip(1.0 - 0.42 * man_quality_gap * man_coverage_prob, 0.55, 1.0)
        )
        is_lockdown_cb = True
    else:
        man_target_suppression_mult = 1.0
        man_yprr_suppression_mult = 1.0
        is_lockdown_cb = False

    # SumerSports JSN elite dominance multiplier (target_share >= 0.30, air_yards_share >= 0.40, epa/target >= 0.45)
    ts = float(np.clip(receiver_target_share, 0.0, 0.60))
    ays = float(np.clip(receiver_air_yards_share, 0.0, 0.70))
    epa_t = float(np.clip(receiver_epa_per_target, -0.50, 1.20))
    if (
        receiver_name in {"Jaxon Smith-Njigba", "JSN"}
        or (ts >= 0.33 and ays >= 0.40 and epa_t >= 0.45)
    ):
        wopr = 1.5 * ts + 0.7 * ays
        jsn_dominance_multiplier = float(
            np.clip(1.0 + 0.18 * (wopr - 0.65) + 0.12 * epa_t, 1.05, 1.22)
        )
    else:
        jsn_dominance_multiplier = 1.0

    blended_receiving_multiplier = float(
        man_yprr_suppression_mult * jsn_dominance_multiplier
    )

    # SumerSports LA Rams net-EPA undervaluation check
    is_rams_undervaluation_spot = str(team_abbr or "").upper() in {"LAR", "LA"}
    rams_pythagorean_edge = (
        float(SUMERSPORTS_LAR_UNDERVALUATION_2026["pythagorean_undervaluation_gap"])
        if is_rams_undervaluation_spot
        else 0.0
    )

    return {
        "shell_probabilities": shell_probs,
        "predicted_primary_shell": max(shell_probs.items(), key=lambda kv: kv[1])[0],
        "man_coverage_prob": man_coverage_prob,
        "zone_coverage_prob": zone_coverage_prob,
        "primary_cb_name": primary_cb_name,
        "is_pff_lockdown_man_cb": is_lockdown_cb,
        "cb_man_passer_rating_allowed": cb_passer_rating,
        "man_target_suppression_mult": man_target_suppression_mult,
        "man_yprr_suppression_mult": man_yprr_suppression_mult,
        "jsn_dominance_multiplier": jsn_dominance_multiplier,
        "blended_receiving_multiplier": blended_receiving_multiplier,
        "is_rams_undervaluation_spot": is_rams_undervaluation_spot,
        "rams_pythagorean_win_gap": rams_pythagorean_edge,
    }


# ============================================================================
# 3. HIERARCHICAL 23,247-KICK FG MODEL & 4TH-DOWN BEHAVIORAL FORK
# ============================================================================

# Exact quadratic logit coefficients solved so neutral sea-level calm conditions
# at temp=70F yield:
#   distance=30 -> p = 0.97 (logit = +3.4760986898352733)
#   distance=45 -> p = 0.80 (logit = +1.3862943611198906)
#   distance=55 -> p = 0.61 (logit = +0.4473122180436593)
_FG_LOGIT_30: float = math.log(0.97 / 0.03)
_FG_LOGIT_45: float = math.log(0.80 / 0.20)
_FG_LOGIT_55: float = math.log(0.61 / 0.39)


def _baseline_fg_logit_from_distance(
    kick_distance_yds: float | np.ndarray,
) -> float | np.ndarray:
    """Lagrange quadratic interpolation through (30, logit(0.97)), (45, logit(0.80)), (55, logit(0.61))."""
    d = np.asarray(kick_distance_yds, dtype=np.float64)
    l30 = ((d - 45.0) * (d - 55.0)) / ((30.0 - 45.0) * (30.0 - 55.0))
    l45 = ((d - 30.0) * (d - 55.0)) / ((45.0 - 30.0) * (45.0 - 55.0))
    l55 = ((d - 30.0) * (d - 45.0)) / ((55.0 - 30.0) * (55.0 - 45.0))
    logit_val = _FG_LOGIT_30 * l30 + _FG_LOGIT_45 * l45 + _FG_LOGIT_55 * l55
    if np.ndim(kick_distance_yds) == 0:
        return float(logit_val)
    return logit_val


def hierarchical_fg_make_prob(
    kick_distance_yds: float | Sequence[float] | np.ndarray,
    *,
    wind_mph: float = 0.0,
    temp_f: float = 70.0,
    altitude_ft: float = 0.0,
    is_dome: bool = False,
    kicker_eb_logit_effect: float = 0.0,
    kicker_makes_above_expected: float | None = None,
    kicker_attempts: int | None = None,
) -> dict[str, Any]:
    """@nfl_simulator 23,247-kick hierarchical FG make probability model + EQ-PHYSICS-001.

    Calibrated to exact empirical benchmarks under neutral baseline conditions
    (wind_mph <= 8, temp_f = 70, altitude_ft = 0, is_dome = False, neutral kicker):
      - 30 yds -> 0.9700 (97%)
      - 45 yds -> 0.8000 (80%)
      - 55 yds -> 0.6100 (61%)

    Incorporates:
      - Surface wind penalty above 8 mph (scaled by distance Interaction: longer kicks
        spend longer in flight and suffer quadratic crosswind/drag dispersion).
      - Cold temperature compression penalty below 50°F.
      - EQ-PHYSICS-001 barometric altitude air-density reduction
        rho(h) = rho_0 * exp(-h / 27800 ft), boosting carry on 40+ yd kicks
        (e.g. Denver 5,280 ft reduces air drag by ~17.3%).
      - Kicker Empirical-Bayes random effect (shrunk with k_prior = 45 kicks).
    """
    dist = np.asarray(kick_distance_yds, dtype=np.float64)
    base_logit = np.asarray(_baseline_fg_logit_from_distance(dist), dtype=np.float64)

    # EQ-PHYSICS-001 barometric air density ratio rho / rho_0
    alt = max(0.0, float(altitude_ft))
    air_density_ratio = math.exp(-alt / 27800.0)
    drag_reduction_frac = 1.0 - air_density_ratio  # ~0.173 at 5,280 ft (Denver)

    # Altitude helps kicks >= 35 yds by reducing aerodynamic drag
    dist_scale = np.clip((dist - 30.0) / 25.0, 0.0, 1.6)
    altitude_logit_boost = 1.85 * drag_reduction_frac * dist_scale

    if is_dome:
        wind_logit_penalty = np.zeros_like(base_logit)
        temp_logit_penalty = np.zeros_like(base_logit)
    else:
        effective_wind = max(0.0, float(wind_mph) - 8.0)
        wind_logit_penalty = -0.048 * effective_wind * (0.45 + 0.85 * dist_scale)
        cold_degrees = max(0.0, 50.0 - float(temp_f))
        temp_logit_penalty = -0.011 * cold_degrees * (0.40 + 0.60 * dist_scale)

    # Kicker Empirical-Bayes random effect
    eb_effect = float(kicker_eb_logit_effect)
    if kicker_makes_above_expected is not None and kicker_attempts is not None and kicker_attempts > 0:
        n_att = float(kicker_attempts)
        shrink_w = n_att / (n_att + 45.0)
        eb_effect += shrink_w * (float(kicker_makes_above_expected) / max(1.0, n_att)) * 4.2

    total_logit = (
        base_logit
        + altitude_logit_boost
        + wind_logit_penalty
        + temp_logit_penalty
        + eb_effect
    )
    make_prob = _sigmoid(total_logit)

    is_scalar = np.ndim(kick_distance_yds) == 0
    return {
        "kick_distance_yds": float(dist) if is_scalar else dist,
        "fg_make_prob": float(make_prob) if is_scalar else make_prob,
        "baseline_neutral_prob": (
            float(_sigmoid(base_logit)) if is_scalar else _sigmoid(base_logit)
        ),
        "air_density_ratio": float(air_density_ratio),
        "drag_reduction_frac": float(drag_reduction_frac),
        "altitude_logit_boost": (
            float(altitude_logit_boost) if is_scalar else altitude_logit_boost
        ),
        "wind_logit_penalty": (
            float(wind_logit_penalty) if is_scalar else wind_logit_penalty
        ),
        "temp_logit_penalty": (
            float(temp_logit_penalty) if is_scalar else temp_logit_penalty
        ),
        "kicker_eb_logit_effect": float(eb_effect),
    }


def coach_fourth_down_behavioral_fork(
    *,
    wp_go: float,
    wp_fg: float,
    wp_punt: float,
    coach_tau_hat: float = 0.0,
    empirical_go_compliance: float = EMPIRICAL_COACH_GO_COMPLIANCE,
    yardline_100: int = 42,
    ydstogo: int = 2,
) -> dict[str, Any]:
    """@run_the_sims descriptive vs. prescriptive 4th-down fork + tau_hat integration.

    Prescriptive branch: selects the action maximizing win probability
    max(wp_go, wp_fg, wp_punt).
    Descriptive branch: accounts for the empirical fact that NFL coaches go for it
    only ~29% of the time the WP model prescribes 'GO' (unless modified by per-coach
    tau_hat aggressiveness delta, validated at +11.1585pp walk-forward accuracy lift
    on n=3,988 opponent-half 4th downs).
    """
    w_go = float(np.clip(wp_go, 0.001, 0.999))
    w_fg = float(np.clip(wp_fg, 0.001, 0.999))
    w_punt = float(np.clip(wp_punt, 0.001, 0.999))

    action_wps = {"GO": w_go, "FG": w_fg, "PUNT": w_punt}
    prescriptive_action = max(action_wps.items(), key=lambda kv: kv[1])[0]
    wp_max = action_wps[prescriptive_action]
    best_conservative_action = "FG" if w_fg >= w_punt else "PUNT"
    wp_conservative = action_wps[best_conservative_action]

    go_wp_edge = w_go - wp_conservative
    base_compliance = float(np.clip(empirical_go_compliance, 0.05, 0.95))
    tau_delta = float(np.clip(coach_tau_hat, -0.45, 0.45))

    if go_wp_edge > 0.0:
        # WP model says GO, but baseline coach compliance is 29% + coach tau_hat delta
        edge_intensity = float(_sigmoid((go_wp_edge - 0.025) * 35.0))
        coach_go_prob = float(
            np.clip(
                base_compliance * (0.65 + 0.70 * edge_intensity) + tau_delta,
                0.02,
                0.98,
            )
        )
    else:
        # WP model says kick/punt; only ultra-aggressive tau_hat or tiny negative edge triggers go
        coach_go_prob = float(
            np.clip(
                0.06 * math.exp(30.0 * max(-0.15, go_wp_edge)) + max(0.0, 0.5 * tau_delta),
                0.01,
                0.60,
            )
        )

    rem_prob = 1.0 - coach_go_prob
    # Split remaining probability between FG and PUNT based on field position & WP
    if yardline_100 <= 38 and w_fg >= w_punt - 0.03:
        fg_share_of_conservative = float(_sigmoid((w_fg - w_punt) * 40.0 + 1.2))
    else:
        fg_share_of_conservative = float(_sigmoid((w_fg - w_punt) * 40.0 - 1.5))

    coach_fg_prob = rem_prob * fg_share_of_conservative
    coach_punt_prob = rem_prob * (1.0 - fg_share_of_conservative)

    descriptive_probs = {
        "GO": float(coach_go_prob),
        "FG": float(coach_fg_prob),
        "PUNT": float(coach_punt_prob),
    }
    action_predicted = max(descriptive_probs.items(), key=lambda kv: kv[1])[0]

    expected_wp_given_coach = (
        coach_go_prob * w_go + coach_fg_prob * w_fg + coach_punt_prob * w_punt
    )
    wp_gap = float(wp_max - expected_wp_given_coach)

    return {
        "prescriptive_optimal_action": prescriptive_action,
        "wp_max": float(wp_max),
        "action_predicted": action_predicted,
        "descriptive_action_probs": descriptive_probs,
        "coach_go_prob": float(coach_go_prob),
        "expected_wp_given_coach": float(expected_wp_given_coach),
        "wp_gap": float(wp_gap),
        "empirical_go_compliance_anchor": base_compliance,
        "coach_tau_hat": tau_delta,
        "tau_walkforward_acc_delta_benchmark": TAU_WALKFORWARD_ACC_DELTA,
    }


# ============================================================================
# 4. EMPIRICAL-BAYES INT SHRINKAGE & CMU MULTILEVEL SNAP-TIMING CADENCE
# ============================================================================


def eb_interception_catch_rate_shrinkage(
    interceptions: int | Sequence[int] | np.ndarray,
    turnover_worthy_throws: int | Sequence[int] | np.ndarray,
    *,
    league_prior_rate: float = LEAGUE_INT_PER_TWP_PRIOR,
    prior_pseudo_trials: float = LEAGUE_INT_PRIOR_PSEUDO_TRIALS,
) -> dict[str, Any]:
    """@nfl_simulator Empirical-Bayes INT/TWP catch-rate shrinkage.

    Shrinks noisy observed interception conversion rates (e.g., Denver's 13 INTs
    on 17 turnover-worthy throws = 76.47% / ~77%) toward the ~52% NFL prior:
      p_EB = (INT + k * p_0) / (TWP + k)
    With p_0 = 0.52 and k = 115, Denver's 13/17 shrinks to 55.15% (~55%), matching
    the @nfl_simulator benchmark.
    """
    ints_arr = np.asarray(interceptions, dtype=np.float64)
    twp_arr = np.maximum(np.asarray(turnover_worthy_throws, dtype=np.float64), ints_arr)
    safe_twp = np.maximum(1.0, twp_arr)

    raw_rate = np.where(twp_arr > 0, ints_arr / safe_twp, league_prior_rate)
    p0 = float(np.clip(league_prior_rate, 0.10, 0.90))
    k = max(1.0, float(prior_pseudo_trials))

    shrunk_rate = (ints_arr + k * p0) / (twp_arr + k)
    shrinkage_factor = k / (twp_arr + k)
    expected_regression_delta = shrunk_rate - raw_rate

    is_scalar = np.ndim(interceptions) == 0 and np.ndim(turnover_worthy_throws) == 0
    return {
        "raw_int_catch_rate": float(raw_rate) if is_scalar else raw_rate,
        "eb_shrunk_int_catch_rate": float(shrunk_rate) if is_scalar else shrunk_rate,
        "shrinkage_weight_on_prior": (
            float(shrinkage_factor) if is_scalar else shrinkage_factor
        ),
        "expected_rate_regression_delta": (
            float(expected_regression_delta)
            if is_scalar
            else expected_regression_delta
        ),
        "league_prior_rate": p0,
        "prior_pseudo_trials": k,
    }


def multilevel_snap_timing_cadence_penalty(
    *,
    qb_cadence_sd_sec: float = 0.34,
    league_avg_cadence_sd_sec: float = 0.34,
    is_silent_road_count: bool = False,
    crowd_noise_db: float = 88.0,
    motion_at_snap: bool = False,
    edge_rusher_base_getoff_sec: float = 0.83,
) -> dict[str, Any]:
    """Nguyen & Yurko (CMU arXiv:2502.16313) multilevel snap-timing & C-248 get-off model.

    Models heterogeneous QB pre-snap cadence variance (sigma_QB):
      - High cadence variability freezes defensive edge rushers (+get-off delay,
        higher defensive offsides draw rate).
      - Road silent count in high crowd noise collapses effective cadence entropy,
        allowing edge rushers to time the guards' head-bob and jump the snap
        (-get-off time in seconds, higher pressure disruption & false-start risk).
      - Motion-at-snap acts as a timing tell unless paired with multi-cadence variance.
    """
    base_sd = max(0.05, float(qb_cadence_sd_sec))
    lg_sd = max(0.10, float(league_avg_cadence_sd_sec))

    # Crowd noise & silent-count compression of cadence variance
    noise_excess = max(0.0, float(crowd_noise_db) - 85.0) / 20.0
    silent_compression = 0.58 if is_silent_road_count else 1.0
    motion_tell_compression = 0.90 if (motion_at_snap and base_sd < lg_sd) else 1.0

    effective_cadence_sd = base_sd * silent_compression * motion_tell_compression / (
        1.0 + 0.22 * noise_excess
    )

    # Edge rusher get-off shift (C-248 Same-Yardstick get-off adjustment)
    # Negative delta = faster jump by pass rusher; positive delta = rusher frozen by cadence
    sd_gap = effective_cadence_sd - lg_sd
    getoff_delta_sec = float(np.clip(0.28 * sd_gap, -0.09, 0.08))
    adjusted_edge_getoff_sec = float(
        np.clip(edge_rusher_base_getoff_sec + getoff_delta_sec, 0.68, 1.05)
    )

    # Pressure probability multiplier & pre-snap penalty hazards
    pressure_disruption_mult = float(
        np.clip(1.0 - 1.45 * getoff_delta_sec, 0.88, 1.18)
    )
    false_start_prob_per_snap = float(
        np.clip(
            0.014
            + (0.012 if is_silent_road_count else 0.0)
            + 0.008 * noise_excess,
            0.005,
            0.065,
        )
    )

    return {
        "raw_qb_cadence_sd_sec": base_sd,
        "effective_cadence_sd_sec": float(effective_cadence_sd),
        "c248_getoff_delta_sec": getoff_delta_sec,
        "adjusted_edge_getoff_sec": adjusted_edge_getoff_sec,
        "pressure_disruption_mult": pressure_disruption_mult,
        "false_start_prob_per_snap": false_start_prob_per_snap,
        "is_silent_road_count": bool(is_silent_road_count),
    }


# ============================================================================
# 5. TRENCH STUFF RATE & BIG DATA BOWL MOMENTUM FRACTIONAL TACKLES (B12)
# ============================================================================


def trench_stuff_and_fractional_tackles(
    carry_yards: Sequence[float] | np.ndarray,
    *,
    ball_carrier_mass_kg: float = 98.0,
    pre_contact_speed_mps: float = 6.8,
    defender_speed_drops_mps: Sequence[float] | np.ndarray = (3.8, 2.2, 0.8),
    def_team_abbr: str | None = None,
    custom_team_missed_tackles: int | None = None,
    explosive_threshold_yds: float = 10.0,
) -> dict[str, Any]:
    """Big Data Bowl Momentum Fractional Tackles (Nguyen, Jiang, Ellingwood B12) + 7-Signal Pack.

    1. Fractional Tackles (B12):
       Credits each contacting defender j with the fraction of ball-carrier
       forward momentum Delta p_j = m_BC * max(0, delta_v_j) halted during the
       contact window, summing to 1.0 across involved defenders.
    2. Trench Stuff Rate & Explosive RB Rate (7-Signal Pack):
       Computes stuff rate (yards <= 0), explosive run rate (yards >= explosive_threshold_yds),
       and integrates the verified 2026 Missed-Tackle Leaderboard
       (DET: 12 best; worst cluster PHI: 49, CLE: 51, DEN: 56; 39 qualified RB benchmark).
    """
    yards_arr = np.asarray(carry_yards, dtype=np.float64)
    if yards_arr.size == 0:
        raise ValueError("carry_yards must contain at least one carry observation")

    stuff_mask = yards_arr <= 0.0
    explosive_mask = yards_arr >= float(explosive_threshold_yds)
    stuff_rate = float(np.mean(stuff_mask))
    explosive_run_rate = float(np.mean(explosive_mask))

    # Momentum-based fractional tackles (B12: Delta p = m * Delta v)
    mass = max(60.0, float(ball_carrier_mass_kg))
    v0 = max(0.5, float(pre_contact_speed_mps))
    initial_momentum_kg_mps = mass * v0

    drops = np.maximum(0.0, np.asarray(defender_speed_drops_mps, dtype=np.float64))
    momentum_halted_per_defender = mass * drops
    total_momentum_halted = float(np.sum(momentum_halted_per_defender))

    if total_momentum_halted > 1e-6:
        fractional_tackle_credits = momentum_halted_per_defender / total_momentum_halted
    else:
        fractional_tackle_credits = np.zeros_like(drops)

    residual_forward_momentum = max(0.0, initial_momentum_kg_mps - total_momentum_halted)

    # 7-Signal Pack missed-tackle adjustment
    if custom_team_missed_tackles is not None:
        missed_tackles = int(custom_team_missed_tackles)
    elif def_team_abbr and def_team_abbr.upper() in SIGNAL_PACK_MISSED_TACKLES_2026:
        missed_tackles = SIGNAL_PACK_MISSED_TACKLES_2026[def_team_abbr.upper()]
    else:
        missed_tackles = 33  # League median

    # Normalize against league median (33): DET (12) suppresses YAC/explosives;
    # PHI (49) / CLE (51) / DEN (56) boost broken-tackle explosive probability
    missed_tackle_yac_multiplier = float(
        np.clip(1.0 + 0.0065 * (missed_tackles - 33.0), 0.84, 1.18)
    )

    return {
        "n_carries": int(yards_arr.size),
        "stuff_rate": stuff_rate,
        "explosive_run_rate": explosive_run_rate,
        "mean_yards_per_carry": float(np.mean(yards_arr)),
        "initial_momentum_kg_mps": initial_momentum_kg_mps,
        "momentum_halted_per_defender": momentum_halted_per_defender,
        "fractional_tackle_credits": fractional_tackle_credits,
        "fractional_tackle_sum": float(np.sum(fractional_tackle_credits)),
        "residual_forward_momentum_kg_mps": residual_forward_momentum,
        "def_team_missed_tackles_2026": missed_tackles,
        "missed_tackle_yac_multiplier": missed_tackle_yac_multiplier,
        "qualified_rb_leaderboard_benchmark_count": SIGNAL_PACK_QUALIFIED_RB_BENCHMARK_COUNT,
    }


def wr_360_all_metrics_kernel(
    *,
    # Layer 1: Coach's Mind & Play-Caller Equilibrium
    neutral_pass_rate_pct: float = 55.0,
    proe_pct: float = 0.0,
    motion_pct: float = 50.0,
    play_action_pct: float = 22.0,
    sequence_predictability_flag: bool = False,
    script_panic_pp: float = 0.03,
    # Layer 2: Trenches & Two-Clocks Pressure Collision
    ol_sack_rate_allowed_pct: float = 6.5,
    dl_unblitzed_disruption_pct: float = 14.5,
    qb_fault_sack_share_pct: float = 20.0,
    time_to_pressure_sec: float = 2.55,
    route_stem_time_sec: float = 2.45,
    # Layer 3: Opposing Defense & Coverage Shell Funnel
    def_funnel_classification: str = "BALANCED_SHELL",
    def_wr_target_share_allowed_pct: float = 60.0,
    def_te_target_share_allowed_pct: float = 21.0,
    def_epa_rank: int = 16,
    def_missed_tackles_w1_w7: int = 33,
    def_yac_allowed_per_comp: float = 5.2,
    motion_plus_pa_epa_beater: float = 0.0,
    two_high_shell_pct: float = 44.0,
    primary_cb_fp_per_route: float = 0.30,
    # Layer 4: Game Script & Pace of Play
    off_neutral_sec_per_snap: float = 27.0,
    opp_neutral_sec_per_snap: float = 27.0,
    off_plays_per_game: float = 63.0,
    projected_spread_margin: float = 0.0,  # positive = offense favored
    # Layer 5: Environmental & Venue Factors
    wind_mph: float = 0.0,
    temp_f: float = 68.0,
    altitude_ft: float = 0.0,
    is_dome: bool = False,
    # Layer 6: Route Participation, Snap Alignment & Target Dispersion
    recent_snap_pct: float = 0.85,
    route_participation_pct: float = 0.90,
    target_share_pct: float = 25.0,
    n_eff_receivers: float = 6.0,
    sinkhorn_reallocated_yards_delta: float = 0.0,
    # Layer 7: Depth of Target (aDOT), Air Yards Share & WOPR (C-287)
    adot_yds: float = 10.5,
    air_yards_share_pct: float = 32.0,
    # Layer 8: Separation Score (SEP), Open-Target Rate, Contested Catch & 1READ%
    open_target_rate_pct: float = 78.0,
    catchable_target_rate_pct: float = 78.0,
    contested_catch_rate_pct: float = 50.0,
    first_read_target_share_pct: float = 30.0,
    yprr_vs_man: float = 2.10,
    yprr_vs_zone: float = 1.95,
    opp_man_coverage_pct: float = 28.0,
    # Layer 9: DVOA / Ridge-Adjusted EPA & Crossing Speeds / Kinematics (C-248)
    wr_dvoa_pct: float = 5.0,
    horizontal_cross_speed_mph: float = 18.2,
    season_fppg: float = 14.5,
    season_xfppg: float = 14.5,
    base_rec_yards_mean: float = 60.0,
    base_receptions_mean: float = 5.0,
) -> Dict[str, Any]:
    """Unified 360-Degree Wide Receiver Kernel integrating Coach's Mind, Trenches,
    Defense/Coverage Funnel, Game Script & Pace, Environment, Route Participation,
    aDOT/WOPR, Separation/Open-Target Rate, DVOA, Crossing Speeds, and xFP.
    """
    # 1. Pace & Game Script Dropback Volume
    blended_sec_per_snap = 0.58 * float(off_neutral_sec_per_snap) + 0.42 * float(opp_neutral_sec_per_snap)
    pace_factor = float(np.clip(27.0 / max(21.0, blended_sec_per_snap), 0.88, 1.14))
    # Leading teams (>= +7) bleed clock (+2.8s/snap, -8% pass rate); trailing teams speed up
    script_pass_delta = float(np.clip(-0.0085 * float(projected_spread_margin), -0.10, 0.10))
    effective_pass_rate = float(
        np.clip((float(neutral_pass_rate_pct) / 100.0) + (float(proe_pct) / 200.0) + script_pass_delta, 0.42, 0.72)
    )
    projected_team_dropbacks = float(off_plays_per_game) * pace_factor * effective_pass_rate

    # 2. Coach's Mind Motion + Play-Action & Predictability Modifier
    motion_pa_synergy = 1.0 + 0.08 * float(np.clip(motion_plus_pa_epa_beater, -0.25, 0.35))
    predictability_tax = 0.975 if sequence_predictability_flag else 1.0

    # 3. Trench Two-Clocks Collision (Time-to-Pressure vs Route Stem Depth)
    # Deep stems (high aDOT / route_stem_time_sec) get truncated when OL leaks pressure faster than stem develops
    trench_mismatch = (float(ol_sack_rate_allowed_pct) - 6.5) * 0.008 + (float(dl_unblitzed_disruption_pct) - 14.5) * 0.005
    clock_margin_sec = float(time_to_pressure_sec) - float(route_stem_time_sec)
    two_clocks_survival = float(np.clip(1.0 + 0.22 * math.tanh(2.5 * clock_margin_sec) - trench_mismatch, 0.82, 1.12))

    # 4. Opposing Defense Funnel & Missed-Tackle YAC Multiplier
    funnel_upper = str(def_funnel_classification).upper()
    if "TE_MIDDLE" in funnel_upper:
        funnel_wr_mult = float(np.clip(0.955 + 0.002 * (float(def_wr_target_share_allowed_pct) - 58.0), 0.90, 1.02))
    elif "WR_BOUNDARY" in funnel_upper or "OUTSIDE" in funnel_upper or "PASS_FUNNEL" in funnel_upper:
        funnel_wr_mult = float(np.clip(1.045 + 0.002 * (float(def_wr_target_share_allowed_pct) - 60.0), 0.98, 1.12))
    else:
        funnel_wr_mult = float(np.clip(1.0 + 0.002 * (float(def_wr_target_share_allowed_pct) - 59.0), 0.94, 1.06))

    yac_tackling_mult = float(
        np.clip(1.0 + 0.0035 * (float(def_missed_tackles_w1_w7) - 33.0) + 0.025 * (float(def_yac_allowed_per_comp) - 5.2), 0.90, 1.14)
    )

    # 5. Environmental Aerodynamics (Decoupled Wind > 8 mph = -3.007 yds/mph team pass drag)
    if is_dome:
        env_yards_delta = 0.0
    else:
        excess_wind = max(0.0, float(wind_mph) - 8.0)
        team_wind_drag_yds = -3.007 * excess_wind
        altitude_boost_yds = 3.5 * (1.0 - math.exp(-max(0.0, float(altitude_ft)) / 27800.0))
        env_yards_delta = (team_wind_drag_yds + altitude_boost_yds) * (float(target_share_pct) / 100.0)

    # 6. All 7 WR Skill Pillars:
    # WOPR (C-287): 1.5 * Target Share + 0.7 * Air Yards Share
    wopr = 1.5 * (float(target_share_pct) / 100.0) + 0.7 * (float(air_yards_share_pct) / 100.0)
    # Man vs Zone YPRR blend (C-281)
    man_frac = float(np.clip(float(opp_man_coverage_pct) / 100.0, 0.05, 0.75))
    blended_yprr = man_frac * float(yprr_vs_man) + (1.0 - man_frac) * float(yprr_vs_zone)
    # Separation & Open-Target Efficiency + Horizontal Cross Speed (mph) + DVOA
    sep_open_mult = float(np.clip(1.0 + 0.0035 * (float(open_target_rate_pct) - 78.0), 0.90, 1.10))
    cross_speed_mult = float(np.clip(1.0 + 0.018 * (float(horizontal_cross_speed_mph) - 18.0), 0.94, 1.08))
    dvoa_mult = float(np.clip(1.0 + 0.0022 * float(wr_dvoa_pct), 0.92, 1.10))
    dispersion_mult = float(np.clip(1.0 - 0.015 * max(0.0, float(n_eff_receivers) - 6.0), 0.92, 1.05))
    xfp_regression_delta = float(season_xfppg) - float(season_fppg)

    composite_wr_multiplier = float(
        np.clip(
            pace_factor
            * motion_pa_synergy
            * predictability_tax
            * two_clocks_survival
            * funnel_wr_mult
            * yac_tackling_mult
            * sep_open_mult
            * cross_speed_mult
            * dvoa_mult
            * dispersion_mult,
            0.72,
            1.35,
        )
    )

    adjusted_rec_yards = max(
        0.0,
        float(base_rec_yards_mean) * composite_wr_multiplier + env_yards_delta + float(sinkhorn_reallocated_yards_delta),
    )
    adjusted_receptions = max(
        0.0,
        float(base_receptions_mean) * float(np.clip(pace_factor * funnel_wr_mult * sep_open_mult * dispersion_mult, 0.78, 1.28)),
    )

    return {
        "projected_team_dropbacks": projected_team_dropbacks,
        "pace_factor": pace_factor,
        "effective_pass_rate": effective_pass_rate,
        "script_pass_delta": script_pass_delta,
        "motion_pa_synergy": motion_pa_synergy,
        "predictability_tax": predictability_tax,
        "two_clocks_survival": two_clocks_survival,
        "funnel_wr_mult": funnel_wr_mult,
        "yac_tackling_mult": yac_tackling_mult,
        "env_yards_delta": env_yards_delta,
        "wopr": wopr,
        "blended_yprr": blended_yprr,
        "sep_open_mult": sep_open_mult,
        "cross_speed_mult": cross_speed_mult,
        "dvoa_mult": dvoa_mult,
        "dispersion_mult": dispersion_mult,
        "xfp_regression_delta": xfp_regression_delta,
        "composite_wr_multiplier": composite_wr_multiplier,
        "adjusted_rec_yards": adjusted_rec_yards,
        "adjusted_receptions": adjusted_receptions,
        "route_participation_pct": float(route_participation_pct),
        "recent_snap_pct": float(recent_snap_pct),
        "adot_yds": float(adot_yds),
    }

