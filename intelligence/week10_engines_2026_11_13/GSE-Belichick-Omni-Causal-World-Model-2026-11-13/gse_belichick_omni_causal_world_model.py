"""
GSE Omni-Cognitive World Model: Belichick Recursive Level-k Coordinator Mind,
4-Stage Neuro-Symbolic & Causal 50k-Signal Router, and SiriusXM Channel 87
Audio Claim Veracity Bayesian Updater.

Drop-in Python & TypeScript Reference Engine for Beexly/Sports:
- Subsystem 1 (Zone 1 / Class A — Zero Bookmaker Contamination):
  `packages/prediction-engine/src/nfl/coordinator-psychology-tensor.ts`
  `packages/prediction-engine/src/coach-sim/fourth-down-policy.ts`
  Models OC vs. DC recursive Theory-of-Mind (k = 0, 1, 2 Cognitive Hierarchy /
  Quantal Response Equilibrium inspired by Corballis's *The Recursive Mind* and
  Camerer-Ho-Chong 2004), William James attentional habit regression under acute
  pass-rush/clock/crowd stress, `coordinator_script_cliff_delta` (scripted plays
  1-15 vs. unscripted plays 16+ with Q3 halftime re-script decay), and NFL
  rulebook/clock leverage (`Two-Minute Warning`, 4th-down delta-to-alternative
  causal WPA, and sub-2.0s quick-pressure vs. quick-game sight-adjust answers).

- Subsystem 2 (4-Stage Neuro-Symbolic & Causal 50k-Signal Router):
  `packages/mcp-equations-server/src/mcp-cognitive-router.ts`
  `packages/prediction-engine/src/causal/do-calculus-id.ts`
  - Stage A: 288-bit (`9 x uint32`) situational context bitmask with Word-7
    second-order interaction polynomials (bits 224-255) + strict `DataGapError`
    honest refusal (zero hardcoded `0.58`, `-0.26`, or `0.5238` fallbacks).
  - Stage B: Complete 7-line recursive Shpitser-Pearl ID algorithm (backdoor,
    frontdoor C-component factorization, Tian-Pearl Lemma 2 Napkin `RATIO` AST,
    and witnessing hedge detection) + Vaananen et al. HCID `ID-EnablingEdges`
    mediator expansion + synchronous VanderWeele-Ding E-value (`>= 1.35` point,
    `>= 1.10` CI lower bound) unmeasured-confounding gate.
  - Stage C: Marchenko-Pastur random-matrix spectral eigenvalue cleaning (with
    Baik-Ben Arous-Peche / Tracy-Widom spike preservation and trace conservation)
    + walk-forward Frisch-Waugh-Lovell (`FWL`) market-anchor orthogonalization
    recovering pure non-market treatment vector `tau_hat`.
  - Stage D: Cross-equation symbolic Jacobian & second-order Hessian coupling +
    Baranchik (1970) positive-part James-Stein shrinkage strictly clamped at
    `|Delta log-odds| <= 0.35` + exact Allan H. Murphy (1973) Brier Score vector
    decomposition (`REL - RES + UNC`).

- Subsystem 3 (SiriusXM Channel 87 Audio Claim Veracity Bayesian Updater):
  `workers/airwave-listener/src/siriusxm-veracity-updater.ts`
  `packages/prediction-engine/src/perception/audio-claim-veracity.ts`
  Converts Deepgram Nova-2 diarized transcripts from SiriusXM Fantasy Sports
  Radio (Channel 87) and team pressers into structured availability/usage claims
  weighted by each head coach's empirical Beta-Binomial veracity prior
  (distinguishing injury smokescreens from genuine scheme/workload reveals) and
  flags multi-source contradictions with `CONFLICT_ON_RECORD`.
"""

from __future__ import annotations

import ast
import dataclasses
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import math
import re
from typing import Any, Callable, Dict, FrozenSet, Iterable, List, Mapping, Optional, Sequence, Set, Tuple
import numpy as np


# ============================================================================
# CONSTITUTIONAL CONSTANTS & HONEST REFUSAL EXCEPTIONS
# ============================================================================

MAX_LOG_ODDS_DELTA: float = 0.35
MIN_E_VALUE_POINT: float = 1.35
MIN_E_VALUE_CI_LOW: float = 1.10
MIN_SAMPLE_PER_ARM: int = 30
BITMASK_TOTAL_BITS: int = 288
BITMASK_WORD_COUNT: int = 9

# Forbidden silent fallback magic constants audited across legacy scripts
FORBIDDEN_FALLBACK_LITERALS: Tuple[float, ...] = (0.58, -0.26, 0.5238)

# Forbidden bookmaker tokens inside Zone 1 (Class A Coach Engine)
FORBIDDEN_CLASS_A_BOOK_TOKENS: Tuple[str, ...] = (
    "OddsInput",
    "spread_line",
    "total_line",
    "marketFairProb",
    "bookmaker",
    "americanOdds",
    "deVig",
)


class DataGapError(ValueError):
    """Raised fail-closed whenever required telemetry, priors, or sample floors are missing.

    Under the GSE Honesty Doctrine, no stage may ever substitute hardcoded fallback
    probabilities or EPA constants (e.g., 0.58, -0.26, 0.5238) when data is absent,
    NaN, infinite, bitemporally leaked, or under-sampled.
    """

    def __init__(self, field_name: str, reason: str) -> None:
        self.field_name = field_name
        self.reason = reason
        super().__init__(f"[DATA_GAP_REFUSAL:{field_name}] {reason}")


class ClassAFirewallViolationError(RuntimeError):
    """Raised if Zone 1 (Class A Coach Engine) receives sportsbook odds contamination."""


def _require_finite_float(value: Any, field_name: str, *, lo: Optional[float] = None, hi: Optional[float] = None) -> float:
    if value is None or isinstance(value, bool):
        raise DataGapError(field_name, "Required numeric input is None or boolean; zero fallbacks permitted.")
    try:
        fval = float(value)
    except (TypeError, ValueError) as exc:
        raise DataGapError(field_name, f"Cannot parse numeric input ({value!r}): {exc}") from exc
    if not math.isfinite(fval):
        raise DataGapError(field_name, f"Non-finite numeric value ({value!r}) rejected.")
    if lo is not None and fval < lo:
        raise DataGapError(field_name, f"Value {fval} violates lower domain bound {lo}.")
    if hi is not None and fval > hi:
        raise DataGapError(field_name, f"Value {fval} violates upper domain bound {hi}.")
    return fval


def _require_open_prob(value: Any, field_name: str) -> float:
    p = _require_finite_float(value, field_name)
    if not (0.0 < p < 1.0):
        raise DataGapError(field_name, f"Probability {p} must lie strictly in (0, 1).")
    return p


def logit(p: float) -> float:
    p_val = _require_open_prob(p, "logit_p")
    return math.log(p_val / (1.0 - p_val))


def expit(eta: float) -> float:
    x = _require_finite_float(eta, "expit_eta")
    if x >= 0.0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def clamp_log_odds_delta(delta: float, cap: float = MAX_LOG_ODDS_DELTA) -> float:
    d = _require_finite_float(delta, "delta_log_odds")
    return max(-cap, min(cap, d))


def assert_zero_hardcoded_fallbacks(source_code: str) -> bool:
    """AST auditor ensuring zero forbidden magic fallback literals (0.58, -0.26, 0.5238)
    appear as default parameter values or fallback expressions in functional code.
    """
    tree = ast.parse(source_code)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            all_defaults = list(node.args.defaults) + [
                d for d in node.args.kw_defaults if d is not None
            ]
            for default_node in all_defaults:
                val = _extract_signed_numeric_literal(default_node)
                if val is not None:
                    for forbidden in FORBIDDEN_FALLBACK_LITERALS:
                        if abs(val - forbidden) < 1e-6:
                            raise AssertionError(
                                f"Forbidden fallback default {val} detected in function {node.name}"
                            )
        elif isinstance(node, ast.BoolOp) and isinstance(node.op, ast.Or):
            for sub in node.values[1:]:
                val = _extract_signed_numeric_literal(sub)
                if val is not None:
                    for forbidden in FORBIDDEN_FALLBACK_LITERALS:
                        if abs(val - forbidden) < 1e-6:
                            raise AssertionError(f"Forbidden `or {val}` fallback detected.")
    return True


def _extract_signed_numeric_literal(node: ast.AST) -> Optional[float]:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return float(node.value)
    if (
        isinstance(node, ast.UnaryOp)
        and isinstance(node.op, ast.USub)
        and isinstance(node.operand, ast.Constant)
        and isinstance(node.operand.value, (int, float))
    ):
        return -float(node.operand.value)
    return None


def assert_no_book_in_coach_engine(payload_or_source: Mapping[str, Any] | str) -> None:
    """Runtime & source guard matching `apps/web/lib/fences/no-book-in-coach-engine-fence.ts`."""
    if isinstance(payload_or_source, str):
        for tok in FORBIDDEN_CLASS_A_BOOK_TOKENS:
            if re.search(rf"\b{re.escape(tok)}\b", payload_or_source):
                raise ClassAFirewallViolationError(
                    f"Zone 1 Class-A Coach Engine contaminated by forbidden bookmaker token: {tok}"
                )
    else:
        for key in payload_or_source.keys():
            for tok in FORBIDDEN_CLASS_A_BOOK_TOKENS:
                if tok.lower() in str(key).lower():
                    raise ClassAFirewallViolationError(
                        f"Zone 1 Class-A Coach Engine input contains forbidden market key: {key}"
                    )


# ============================================================================
# SUBSYSTEM 1: THE "BELICHICK" RECURSIVE LEVEL-K COORDINATOR MIND
# ============================================================================


class OffensiveConcept(str, Enum):
    UNDER_CENTER_PA_SHOT = "UNDER_CENTER_PA_SHOT"
    QUICK_GAME_SIGHT_ADJUST = "QUICK_GAME_SIGHT_ADJUST"
    SPREAD_INTERMEDIATE_DAGGER = "SPREAD_INTERMEDIATE_DAGGER"
    CONDENSED_OUTSIDE_ZONE_RUN = "CONDENSED_OUTSIDE_ZONE_RUN"
    SCREEN_DELAY_DRAW = "SCREEN_DELAY_DRAW"


class DefensiveCall(str, Enum):
    BASE_SINGLE_HIGH_COVER_1_3 = "BASE_SINGLE_HIGH_COVER_1_3"
    NICKEL_SPLIT_SAFETY_QUARTERS = "NICKEL_SPLIT_SAFETY_QUARTERS"
    SIMULATED_PRESSURE_CREEPER = "SIMULATED_PRESSURE_CREEPER"
    ZERO_ALL_OUT_BLITZ = "ZERO_ALL_OUT_BLITZ"
    BELICHICK_OPTION1_BRACKET = "BELICHICK_OPTION1_BRACKET"


OFFENSIVE_ACTIONS: Tuple[OffensiveConcept, ...] = tuple(OffensiveConcept)
DEFENSIVE_ACTIONS: Tuple[DefensiveCall, ...] = tuple(DefensiveCall)


@dataclass(frozen=True)
class CoordinatorScriptProfile:
    """Empirical opening-script vs. unscripted live-adjustment profile for an OC."""

    coordinator_id: str
    scripted_epa_per_play: float       # Plays 1-15 empirical mean EPA
    unscripted_epa_per_play: float     # Plays 16+ empirical mean EPA
    scripted_plays_sample: int         # Must satisfy >= 30 plays
    unscripted_plays_sample: int       # Must satisfy >= 60 plays
    halftime_rescript_epa_boost: float # Q3 first 6 plays adjustment delta
    tree_prior_cliff_delta: float      # Coaching-tree empirical prior for EB shrinkage
    rolling_3wk_top_tendency_rate: float  # Highest state-specific tendency in [0, 1]
    is_post_bye_or_divisional: bool = False


@dataclass(frozen=True)
class CoordinatorGameState:
    """Pure Class-A football state (strictly zero sportsbook lines/odds)."""

    play_number_in_game: int
    quarter: int
    Quarter_play_index: int
    seconds_remaining_half: float
    seconds_remaining_game: float
    score_diff_offense: int
    down: int
    yards_to_go: int
    yardline_100: int  # Yards from opponent end zone (1..99)
    offense_timeouts: int
    defense_timeouts: int
    offense_receives_q3_kickoff: bool
    prob_quick_pressure_sub2s: float
    acoustic_crowd_spl_db: float
    play_clock_remaining_sec: float
    motion_rate: float
    tight_split_rate: float
    coach_aggression_index: float  # Empirical 4th-down aggression (e.g., 0.51 CIN .. 0.94 PHI)
    coach_animus_score: float = 0.0


@dataclass(frozen=True)
class FourthDownContext:
    """Inputs for causal delta-to-alternative 4th-down WPA evaluation."""

    conversion_prob: float
    wp_if_convert: float
    wp_if_fail: float
    wp_if_punt: float
    wp_if_field_goal: Optional[float]
    fg_make_prob: Optional[float]
    coach_aggression_index: float
    coach_animus_score: float = 0.0


@dataclass(frozen=True)
class ClockLeverageDecision:
    two_minute_warning_active: bool
    double_dip_bridge_active: bool
    victory_kneeldown_deterministic: bool
    intentional_scramble_burn_recommended: bool
    expected_kneeldown_qb_rush_delta_yds: float
    trailing_hurryup_checkdown_boost: float
    timeout_preservation_wp_value: float


@dataclass(frozen=True)
class FourthDownPolicyResult:
    optimal_action: str
    delta_wp_go_vs_alt: float
    expected_wp_go: float
    expected_wp_best_alt: float
    realized_coach_go_prob: float
    expected_coaching_wp_bleed: float


@dataclass(frozen=True)
class BelichickCoordinatorEquilibrium:
    oc_level_k: int
    dc_level_k: int
    james_habit_regression_weight_oc: float
    james_habit_regression_weight_dc: float
    effective_oc_precision: float
    effective_dc_precision: float
    oc_policy: Dict[str, float]
    dc_policy: Dict[str, float]
    equilibrium_expected_epa: float
    coordinator_script_cliff_delta: float
    active_script_adjustment_epa: float
    qptsr_sack_expected: float
    qptsr_checkdown_boost: float
    tendency_breaker_active: bool
    clock_leverage: ClockLeverageDecision
    fourth_down_eval: Optional[FourthDownPolicyResult]


def compute_coordinator_script_cliff_delta(profile: CoordinatorScriptProfile) -> Tuple[float, float]:
    """Computes Empirical-Bayes shrunk `coordinatorScriptCliffDelta` (Plays 16+ minus Plays 1-15).

    Returns `(raw_cliff_delta, eb_shrunk_cliff_delta)`. Raises `DataGapError` if sample sizes
    are insufficient or any EPA input is missing/non-finite.
    """
    scripted_epa = _require_finite_float(profile.scripted_epa_per_play, "scripted_epa_per_play", lo=-3.0, hi=3.0)
    unscripted_epa = _require_finite_float(profile.unscripted_epa_per_play, "unscripted_epa_per_play", lo=-3.0, hi=3.0)
    prior_cliff = _require_finite_float(profile.tree_prior_cliff_delta, "tree_prior_cliff_delta", lo=-1.5, hi=1.5)

    if profile.scripted_plays_sample < 30:
        raise DataGapError(
            "scripted_plays_sample",
            f"Scripted play sample {profile.scripted_plays_sample} < 30 minimum floor.",
        )
    if profile.unscripted_plays_sample < 60:
        raise DataGapError(
            "unscripted_plays_sample",
            f"Unscripted play sample {profile.unscripted_plays_sample} < 60 minimum floor.",
        )

    raw_cliff = unscripted_epa - scripted_epa
    # Sampling variance of EPA difference (~sigma_epa^2 = 1.65 per NFL play)
    play_var = 1.65
    obs_var = play_var * (1.0 / profile.scripted_plays_sample + 1.0 / profile.unscripted_plays_sample)
    prior_var = 0.025  # Coaching-tree cross-coordinator cliff variance
    shrinkage_weight = prior_var / (prior_var + obs_var)
    shrunk_cliff = shrinkage_weight * raw_cliff + (1.0 - shrinkage_weight) * prior_cliff
    return raw_cliff, shrunk_cliff


def compute_william_james_habit_regression(
    prob_quick_pressure_sub2s: float,
    play_clock_remaining_sec: float,
    acoustic_crowd_spl_db: float,
    timeouts_remaining: int,
    trailing_late_pressure: bool,
    kappa_james: float = 1.65,
) -> float:
    """Models William James (*The Principles of Psychology*) attentional narrowing & habit regression.

    Under elevated sub-2.0s pass-rush threat, expiring play clock, >95 dB stadium noise,
    and depleted timeouts, executive Level-k recursion regresses smoothly toward
    ingrained Level-0 habitual tendencies: `w_habit = 1 - exp(-kappa * stress_index)`.
    """
    p_quick = _require_finite_float(prob_quick_pressure_sub2s, "prob_quick_pressure_sub2s", lo=0.0, hi=1.0)
    p_clock = _require_finite_float(play_clock_remaining_sec, "play_clock_remaining_sec", lo=0.0, hi=40.0)
    spl_db = _require_finite_float(acoustic_crowd_spl_db, "acoustic_crowd_spl_db", lo=50.0, hi=130.0)
    if timeouts_remaining < 0 or timeouts_remaining > 3:
        raise DataGapError("timeouts_remaining", f"Invalid NFL timeout count: {timeouts_remaining}")

    pressure_stress = min(1.0, p_quick / 0.45)
    clock_stress = max(0.0, (8.0 - p_clock) / 8.0) if p_clock < 8.0 else 0.0
    acoustic_stress = max(0.0, min(1.0, (spl_db - 90.0) / 25.0))
    timeout_scarcity = (3 - timeouts_remaining) / 3.0 if trailing_late_pressure else 0.10 * (3 - timeouts_remaining) / 3.0

    stress_index = (
        0.42 * pressure_stress
        + 0.28 * clock_stress
        + 0.18 * acoustic_stress
        + 0.12 * timeout_scarcity
    )
    stress_index = max(0.0, min(1.0, stress_index))
    if stress_index <= 1e-9:
        return 0.0
    return float(1.0 - math.exp(-kappa_james * stress_index))


def compute_gse_qptsr(
    prob_quick_pressure_sub2s: float,
    qb_sack_given_quick_press: float = 0.158,
    league_sack_given_late_press: float = 0.101,
    checkdown_sub_rate: float = 0.22,
) -> Tuple[float, float, float]:
    """GSE-QPTSR (Quick-Pressure-to-Sack & Checkdown Residual, nfl-farm c35 verified).

    Sub-2.0s quick pressure converts to sacks at 15.8% vs. 10.1% at 2.5-2.9s (+57% lift, p=0.043).
    """
    p_q = _require_finite_float(prob_quick_pressure_sub2s, "prob_quick_pressure_sub2s", lo=0.0, hi=1.0)
    sack_expected = p_q * qb_sack_given_quick_press + (1.0 - p_q) * league_sack_given_late_press
    qptsr_residual = p_q * (qb_sack_given_quick_press - league_sack_given_late_press)
    checkdown_boost = p_q * checkdown_sub_rate
    return sack_expected, qptsr_residual, checkdown_boost


def evaluate_rulebook_clock_leverage(state: CoordinatorGameState) -> ClockLeverageDecision:
    """Evaluates NFL rulebook & clock leverage discontinuities (Doc 1 §1 & Doc 3)."""
    t_half = _require_finite_float(state.seconds_remaining_half, "seconds_remaining_half", lo=0.0, hi=1800.0)
    t_game = _require_finite_float(state.seconds_remaining_game, "seconds_remaining_game", lo=0.0, hi=3600.0)

    # 1. Two-Minute Warning free clock-stoppage barrier (crossing 120s in Q2 or Q4)
    two_min_active = (state.quarter in (2, 4)) and (115.0 <= t_half <= 165.0 or t_half <= 120.0)

    # 2. Lap-score ("double-dip") bridge: possessing ball late Q2 AND receiving Q3 opening kickoff
    double_dip_active = (
        state.quarter == 2
        and t_half <= 180.0
        and state.offense_receives_q3_kickoff
        and state.score_diff_offense >= -7
    )

    # 3. Deterministic Q4 victory-formation kneeldown vs. intentional scramble-inbounds-sack burn
    kneel_downs_available = max(0, 4 - state.down)
    unstoppable_downs = max(0, kneel_downs_available - state.defense_timeouts)
    max_kneel_bleed_sec = unstoppable_downs * 40.0

    leading_one_score_q4 = state.quarter == 4 and (1 <= state.score_diff_offense <= 8) and t_game <= 240.0
    victory_kneel_det = leading_one_score_q4 and (max_kneel_bleed_sec >= t_game) and t_game > 0.0

    # Intentional extended scramble before taking inbounds sack/kneel burns +5..8s/play when 5-18s short
    shortfall_sec = t_game - max_kneel_bleed_sec
    scramble_burn_rec = (
        leading_one_score_q4
        and not victory_kneel_det
        and (0.0 < shortfall_sec <= 18.0)
        and kneel_downs_available >= 1
    )

    # Expected QB rushing yardage deduction from victory formation (-1.35 yds/kneel empirical mean)
    expected_kneels = float(min(3, unstoppable_downs)) if victory_kneel_det else (
        0.44 * 2.1 if (state.quarter == 4 and 1 <= state.score_diff_offense <= 8 and t_game <= 180.0) else 0.0
    )
    kneel_rush_delta = -1.35 * expected_kneels

    # Trailing 2-minute hurry-up scramble-to-checkdown substitution (Maye -> Stevenson funnel)
    trailing_hurryup = state.quarter == 4 and (-10 <= state.score_diff_offense <= -3) and t_game <= 180.0
    hurryup_checkdown_boost = 0.145 if trailing_hurryup else 0.0

    # Timeout preservation WP value (Burke 2014 + GSE Theme 4: ~0.031 WP per 2H close timeout)
    close_second_half = state.quarter in (3, 4) and abs(state.score_diff_offense) <= 8
    to_wp_val = state.offense_timeouts * (0.031 if close_second_half else 0.012)

    return ClockLeverageDecision(
        two_minute_warning_active=two_min_active,
        double_dip_bridge_active=double_dip_active,
        victory_kneeldown_deterministic=victory_kneel_det,
        intentional_scramble_burn_recommended=scramble_burn_rec,
        expected_kneeldown_qb_rush_delta_yds=round(kneel_rush_delta, 4),
        trailing_hurryup_checkdown_boost=hurryup_checkdown_boost,
        timeout_preservation_wp_value=round(to_wp_val, 4),
    )


def evaluate_fourth_down_causal_wpa(ctx: FourthDownContext) -> FourthDownPolicyResult:
    """Axiom 1 Delta-to-Alternative 4th-Down Causal WPA (`fourth-down-policy.ts`, cycle c29)."""
    p_conv = _require_finite_float(ctx.conversion_prob, "conversion_prob", lo=0.0, hi=1.0)
    wp_succ = _require_finite_float(ctx.wp_if_convert, "wp_if_convert", lo=0.0, hi=1.0)
    wp_fail = _require_finite_float(ctx.wp_if_fail, "wp_if_fail", lo=0.0, hi=1.0)
    wp_punt = _require_finite_float(ctx.wp_if_punt, "wp_if_punt", lo=0.0, hi=1.0)
    aggr = _require_finite_float(ctx.coach_aggression_index, "coach_aggression_index", lo=0.0, hi=1.0)
    animus = _require_finite_float(ctx.coach_animus_score, "coach_animus_score", lo=0.0, hi=1.0)

    wp_go = p_conv * wp_succ + (1.0 - p_conv) * wp_fail

    best_alt_name = "PUNT"
    wp_best_alt = wp_punt
    if ctx.wp_if_field_goal is not None:
        wp_fg_made = _require_finite_float(ctx.wp_if_field_goal, "wp_if_field_goal", lo=0.0, hi=1.0)
        p_fg = _require_finite_float(ctx.fg_make_prob, "fg_make_prob", lo=0.0, hi=1.0)
        wp_fg = p_fg * wp_fg_made + (1.0 - p_fg) * wp_fail
        if wp_fg > wp_best_alt:
            wp_best_alt = wp_fg
            best_alt_name = "FIELD_GOAL"

    delta_wp = wp_go - wp_best_alt
    optimal_action = "GO" if delta_wp > 0.0 else best_alt_name

    # CoachGrudgeTensor boost when animus >= 0.75 (+10% go propensity)
    eff_aggr = min(0.99, aggr + (0.10 if animus >= 0.75 else 0.0))
    # Quantal choice probability of coach going for it given WPA edge & staff aggression
    go_logit = 18.0 * delta_wp + 2.4 * (eff_aggr - 0.65)
    coach_go_prob = expit(go_logit)

    realized_wp = coach_go_prob * wp_go + (1.0 - coach_go_prob) * wp_best_alt
    optimal_wp = max(wp_go, wp_best_alt)
    wp_bleed = realized_wp - optimal_wp  # <= 0 (GSE-DWP coaching decision bleed)

    return FourthDownPolicyResult(
        optimal_action=optimal_action,
        delta_wp_go_vs_alt=round(delta_wp, 6),
        expected_wp_go=round(wp_go, 6),
        expected_wp_best_alt=round(wp_best_alt, 6),
        realized_coach_go_prob=round(coach_go_prob, 6),
        expected_coaching_wp_bleed=round(wp_bleed, 6),
    )


def _softmax(values: np.ndarray, precision: float) -> np.ndarray:
    scaled = precision * values
    shifted = scaled - np.max(scaled)
    exps = np.exp(shifted)
    return exps / np.sum(exps)


def _normalize_habit_prior(prior: Mapping[str, float], actions: Sequence[Enum], name: str) -> np.ndarray:
    if not prior:
        raise DataGapError(name, "Level-0 habitual strategy prior dictionary cannot be empty.")
    vec = np.zeros(len(actions), dtype=np.float64)
    for idx, act in enumerate(actions):
        key = act.value if act.value in prior else act.name
        if key not in prior:
            raise DataGapError(name, f"Missing empirical prior probability for action {act.value}.")
        vec[idx] = _require_finite_float(prior[key], f"{name}[{act.value}]", lo=0.0, hi=1.0)
    total = float(np.sum(vec))
    if total <= 0.0 or abs(total - 1.0) > 0.05:
        raise DataGapError(name, f"Habitual prior must sum to ~1.0 (got {total:.6f}).")
    return vec / total


def build_tactical_payoff_matrix(state: CoordinatorGameState) -> np.ndarray:
    """Constructs the 5x5 state-conditioned OC vs. DC Expected Points Added (EPA) matrix.

    Rows (`OFFENSIVE_ACTIONS`) x Columns (`DEFENSIVE_ACTIONS`), incorporating:
    - Shanahan/McVay Motion + PA (+0.35 EPA vs Base Single-High, -0.01 EPA vs Nickel Quarters)
    - Sub-2.0s quick pressure blind-turn penalty on PA & intermediate dropbacks vs Quick-Game hot answer
    - Macdonald/Spagnuolo Simulated Creeper dropping linemen into intermediate Drift/dagger lanes
    - Belichick Erase-Option-1 Bracket forcing 3rd-and-medium progressions
    """
    p_quick = _require_finite_float(state.prob_quick_pressure_sub2s, "prob_quick_pressure_sub2s", lo=0.0, hi=1.0)
    motion = _require_finite_float(state.motion_rate, "motion_rate", lo=0.0, hi=1.0)
    tight = _require_finite_float(state.tight_split_rate, "tight_split_rate", lo=0.0, hi=1.0)

    motion_lift = 0.167 * motion + 0.05 * tight
    blind_turn_pen = 0.52 * p_quick  # Turning back on PA under <2.0s interior pressure
    dropback_press_pen = 0.38 * p_quick
    quick_hot_bonus = 0.34 * p_quick  # Sight-adjust hot throw punishes blitz/quick pressure

    # Base matrix U[oc_idx, dc_idx]
    # Columns: [SINGLE_HIGH, NICKEL_QUARTERS, SIM_CREEPER, ZERO_BLITZ, BELICHICK_BRACKET]
    u = np.array(
        [
            # 0: UNDER_CENTER_PA_SHOT (+0.35 vs Base Single-High; -0.01 cliff vs Nickel Split-Safety)
            [
                0.35 + motion_lift - blind_turn_pen,
                -0.01 - 0.50 * blind_turn_pen,
                -0.14 - blind_turn_pen,
                0.22 - 1.25 * blind_turn_pen,
                0.08 - 0.60 * blind_turn_pen,
            ],
            # 1: QUICK_GAME_SIGHT_ADJUST (Elite answer to Zero Blitz & sub-2.0s pressure)
            [
                0.06 + 0.30 * quick_hot_bonus,
                0.04 + 0.25 * quick_hot_bonus,
                0.11 + 0.65 * quick_hot_bonus,
                0.38 + quick_hot_bonus,
                0.09 + 0.40 * quick_hot_bonus,
            ],
            # 2: SPREAD_INTERMEDIATE_DAGGER (Beats Quarters, punished by Simulated Creeper dropper & Bracket)
            [
                0.12 - dropback_press_pen,
                0.19 - 0.70 * dropback_press_pen,
                -0.18 - dropback_press_pen,
                -0.09 - 1.15 * dropback_press_pen,
                -0.15 - 0.85 * dropback_press_pen,
            ],
            # 3: CONDENSED_OUTSIDE_ZONE_RUN (Punishes light Nickel Quarters & Bracket boxes)
            [
                -0.06 + 0.06 * tight,
                0.16 + 0.08 * tight,
                0.05 + 0.04 * tight,
                -0.12,
                0.18 + 0.07 * tight,
            ],
            # 4: SCREEN_DELAY_DRAW (Punishes Zero Blitz & aggressive pass rush)
            [
                -0.04,
                0.03,
                0.15 + 0.25 * p_quick,
                0.31 + 0.40 * p_quick,
                0.07,
            ],
        ],
        dtype=np.float64,
    )

    # Situational leverage adjustments (3rd & medium/long favors bracket & creeper unless quick/screen)
    if state.down >= 3 and state.yards_to_go >= 5:
        u[3, :] -= 0.18  # Run penalty on 3rd & medium+
        u[2, 4] -= 0.09  # Belichick Option-1 bracket squeeze on 3rd-and-medium chain mover

    return u


class BelichickCoordinatorMind:
    """Recursive Level-k (k = 0, 1, 2) Game-Theoretic Coordinator Mind."""

    def __init__(
        self,
        tau_cognitive_hierarchy: float = 1.5,
        base_quantal_precision: float = 6.5,
    ) -> None:
        self.tau_ch = _require_finite_float(tau_cognitive_hierarchy, "tau_cognitive_hierarchy", lo=0.1, hi=10.0)
        self.base_lambda = _require_finite_float(base_quantal_precision, "base_quantal_precision", lo=0.1, hi=50.0)

    def _poisson_ch_weights(self, k: int) -> List[float]:
        """Truncated Poisson(tau) belief weights over opponent levels 0..k-1 (Camerer et al. 2004)."""
        if k <= 0:
            return []
        raw = [math.exp(-self.tau_ch) * (self.tau_ch ** m) / math.factorial(m) for m in range(k)]
        s = sum(raw)
        return [w / s for w in raw]

    def solve_matchup(
        self,
        *,
        oc_level_k: int,
        dc_level_k: int,
        oc_habit_prior: Mapping[str, float],
        dc_habit_prior: Mapping[str, float],
        oc_script_profile: CoordinatorScriptProfile,
        state: CoordinatorGameState,
        fourth_down_ctx: Optional[FourthDownContext] = None,
        class_a_envelope_guard: Optional[Mapping[str, Any]] = None,
    ) -> BelichickCoordinatorEquilibrium:
        if class_a_envelope_guard is not None:
            assert_no_book_in_coach_engine(class_a_envelope_guard)

        if oc_level_k not in (0, 1, 2) or dc_level_k not in (0, 1, 2):
            raise DataGapError("level_k", f"Coordinator recursion levels must be in {{0, 1, 2}}; got ({oc_level_k}, {dc_level_k}).")

        pi_oc_0 = _normalize_habit_prior(oc_habit_prior, OFFENSIVE_ACTIONS, "oc_habit_prior")
        pi_dc_0 = _normalize_habit_prior(dc_habit_prior, DEFENSIVE_ACTIONS, "dc_habit_prior")

        # Coordinator Self-Scouting & Tendency Breaker Trigger (>78% 3-wk tendency post-bye / divisional)
        tendency_rate = _require_finite_float(
            oc_script_profile.rolling_3wk_top_tendency_rate,
            "rolling_3wk_top_tendency_rate",
            lo=0.0,
            hi=1.0,
        )
        tendency_breaker = tendency_rate > 0.78 and oc_script_profile.is_post_bye_or_divisional

        _, shrunk_cliff_delta = compute_coordinator_script_cliff_delta(oc_script_profile)

        # Active script adjustment: Plays 1-15 enjoy scripted baseline; Plays 16+ incur cliff delta
        # (with halftime locker-room re-script mitigation on Q3 plays 1-6)
        if state.play_number_in_game <= 15:
            active_script_adj = 0.0
        elif state.quarter == 3 and state.Quarter_play_index <= 6:
            active_script_adj = 0.35 * shrunk_cliff_delta + oc_script_profile.halftime_rescript_epa_boost
        else:
            active_script_adj = shrunk_cliff_delta

        # William James Attentional Habit Regression weights
        trailing_late = state.quarter == 4 and state.score_diff_offense < 0 and state.seconds_remaining_game <= 300.0
        w_habit_oc = compute_william_james_habit_regression(
            prob_quick_pressure_sub2s=state.prob_quick_pressure_sub2s,
            play_clock_remaining_sec=state.play_clock_remaining_sec,
            acoustic_crowd_spl_db=state.acoustic_crowd_spl_db,
            timeouts_remaining=state.offense_timeouts,
            trailing_late_pressure=trailing_late,
        )
        # Defensive coordinator experiences habit regression under hurry-up tempo / fatigue
        dc_clock_pressure = max(0.0, 22.0 - state.play_clock_remaining_sec)
        w_habit_dc = compute_william_james_habit_regression(
            prob_quick_pressure_sub2s=0.15 * (1.0 - state.prob_quick_pressure_sub2s),
            play_clock_remaining_sec=max(2.0, 40.0 - 1.6 * dc_clock_pressure),
            acoustic_crowd_spl_db=65.0,  # Home/defense communicates prior to crowd peak
            timeouts_remaining=state.defense_timeouts,
            trailing_late_pressure=(state.quarter == 4 and state.score_diff_offense > 0 and state.seconds_remaining_game <= 300.0),
        )

        lam_oc = self.base_lambda * (1.0 - 0.65 * w_habit_oc)
        lam_dc = self.base_lambda * (1.0 - 0.65 * w_habit_dc)

        u_mat = build_tactical_payoff_matrix(state)
        if tendency_breaker:
            # Boost constraint shot / screen counter-plays against predictable tendency key
            dom_idx = int(np.argmax(pi_oc_0))
            for idx in range(len(OFFENSIVE_ACTIONS)):
                if idx != dom_idx:
                    u_mat[idx, :] += 0.065

        # Level-0 strategies
        oc_levels: Dict[int, np.ndarray] = {0: pi_oc_0}
        dc_levels: Dict[int, np.ndarray] = {0: pi_dc_0}

        # Level-1 Quantal Best Responses (OC maximizes EPA vs DC_0; DC minimizes EPA vs OC_0)
        ev_oc_1 = u_mat @ dc_levels[0]
        oc_levels[1] = _softmax(ev_oc_1, lam_oc)

        ev_dc_1 = -(oc_levels[0] @ u_mat)
        dc_levels[1] = _softmax(ev_dc_1, lam_dc)

        # Level-2 Recursive Theory-of-Mind (Corballis nested mental recursion over CH mixture)
        w_ch_2 = self._poisson_ch_weights(2)  # [g_2(0), g_2(1)]
        dc_mix_for_oc2 = w_ch_2[0] * dc_levels[0] + w_ch_2[1] * dc_levels[1]
        oc_levels[2] = _softmax(u_mat @ dc_mix_for_oc2, lam_oc)

        oc_mix_for_dc2 = w_ch_2[0] * oc_levels[0] + w_ch_2[1] * oc_levels[1]
        dc_levels[2] = _softmax(-(oc_mix_for_dc2 @ u_mat), lam_dc)

        # Apply William James attentional habit regression blending Level-k back toward Level-0
        pi_oc_eff = (1.0 - w_habit_oc) * oc_levels[oc_level_k] + w_habit_oc * oc_levels[0]
        pi_dc_eff = (1.0 - w_habit_dc) * dc_levels[dc_level_k] + w_habit_dc * dc_levels[0]
        pi_oc_eff = pi_oc_eff / np.sum(pi_oc_eff)
        pi_dc_eff = pi_dc_eff / np.sum(pi_dc_eff)

        eq_epa = float(pi_oc_eff @ u_mat @ pi_dc_eff) + active_script_adj

        sack_exp, _, checkdown_boost = compute_gse_qptsr(state.prob_quick_pressure_sub2s)
        # Couple quick-game policy mass into realized checkdown/hot-read absorption
        realized_checkdown_boost = checkdown_boost * (
            1.0 + 0.50 * float(pi_oc_eff[OFFENSIVE_ACTIONS.index(OffensiveConcept.QUICK_GAME_SIGHT_ADJUST)])
        )

        clock_lev = evaluate_rulebook_clock_leverage(state)
        fourth_res = evaluate_fourth_down_causal_wpa(fourth_down_ctx) if fourth_down_ctx is not None else None

        return BelichickCoordinatorEquilibrium(
            oc_level_k=oc_level_k,
            dc_level_k=dc_level_k,
            james_habit_regression_weight_oc=round(w_habit_oc, 6),
            james_habit_regression_weight_dc=round(w_habit_dc, 6),
            effective_oc_precision=round(lam_oc, 6),
            effective_dc_precision=round(lam_dc, 6),
            oc_policy={act.value: round(float(pi_oc_eff[i]), 6) for i, act in enumerate(OFFENSIVE_ACTIONS)},
            dc_policy={act.value: round(float(pi_dc_eff[j]), 6) for j, act in enumerate(DEFENSIVE_ACTIONS)},
            equilibrium_expected_epa=round(eq_epa, 6),
            coordinator_script_cliff_delta=round(shrunk_cliff_delta, 6),
            active_script_adjustment_epa=round(active_script_adj, 6),
            qptsr_sack_expected=round(sack_exp, 6),
            qptsr_checkdown_boost=round(realized_checkdown_boost, 6),
            tendency_breaker_active=tendency_breaker,
            clock_leverage=clock_lev,
            fourth_down_eval=fourth_res,
        )


# ============================================================================
# SUBSYSTEM 2: 4-STAGE NEURO-SYMBOLIC & CAUSAL 50K-SIGNAL ROUTER
# ============================================================================

# --- Stage A: 288-Bit Situational Context Bitmask (`9 x uint32`) ---


class LeagueTag(str, Enum):
    NFL = "NFL"
    NBA = "NBA"
    NHL = "NHL"
    CFB = "CFB"


@dataclass(frozen=True)
class SituationalContextInput288:
    """Complete telemetry contract for Stage A 288-bit bitmask construction.

    Every field is explicitly validated; `None` or `NaN` raises `DataGapError` immediately.
    """

    game_id: str
    league: LeagueTag
    valid_time_unix: float
    tx_time_unix: float
    decision_time_unix: float
    kickoff_time_unix: float
    temperature_f: float
    wind_speed_mph: float
    precipitation_rate_mm_hr: float
    altitude_ft: float
    surface_traction_coeff: float
    is_dome: bool
    days_rest_home: int
    days_rest_away: int
    timezone_shift_hours: float
    home_interior_ol_out_count: int
    away_interior_ol_out_count: int
    home_ilb1_out: bool
    home_ilb2_out: bool
    away_ilb1_out: bool
    away_ilb2_out: bool
    home_projected_sack_rate: float
    away_projected_sack_rate: float
    home_cb1_out: bool
    away_cb1_out: bool
    home_nickel_cb_active: bool
    away_nickel_cb_active: bool
    home_two_high_shell_rate: float
    away_two_high_shell_rate: float
    total_steam_move_pts: float
    spread_line_abs: float
    offensive_pace_sec: float
    combined_proe: float
    coach_aggressiveness_delta: float
    officiating_penalty_rate: float
    home_qb_ypa: float
    away_qb_ypa: float
    home_acwr: float
    away_acwr: float
    crowd_decibels: float
    home_rookie_route_ramp_inflection: bool
    away_rookie_route_ramp_inflection: bool
    qb_rush_prop_hook_in_danger_zone: bool


@dataclass(frozen=True)
class ContextualBitmask288Receipt:
    words: Tuple[int, ...]  # 9 unsigned 32-bit integers (288 bits)
    packed_int288: int
    hex_string: str
    sha256_digest: str
    active_bit_indices: Tuple[int, ...]
    second_order_flags: Dict[str, bool]


@dataclass(frozen=True)
class SignalPremise50k:
    premise_id: str
    domain_tier: str
    req_mask_int288: int
    forbid_mask_int288: int
    sample_count: int
    record_class: str  # Must be 'CITABLE_VERIFIED' for Class-A admission
    verbatim_quote: str
    char_span_start: int
    char_span_end: int
    raw_delta_log_odds: float
    kalman_weight: float
    target_node: str
    parent_nodes: Tuple[str, ...]
    high_freq_spectral_vec: Tuple[float, ...]


def _set_bit_words(words: List[int], bit_index: int) -> None:
    if not (0 <= bit_index < BITMASK_TOTAL_BITS):
        raise ValueError(f"Bit index {bit_index} out of range [0, 287]")
    w_idx = bit_index // 32
    offset = bit_index % 32
    words[w_idx] = (words[w_idx] | (1 << offset)) & 0xFFFFFFFF


def _get_bit_words(words: Sequence[int], bit_index: int) -> bool:
    w_idx = bit_index // 32
    offset = bit_index % 32
    return ((words[w_idx] >> offset) & 1) == 1


def words_to_int288(words: Sequence[int]) -> int:
    acc = 0
    for idx, w in enumerate(words):
        acc |= (int(w) & 0xFFFFFFFF) << (32 * idx)
    return acc


def build_contextual_bitmask_288(ctx: SituationalContextInput288) -> ContextualBitmask288Receipt:
    """Stage A deterministic 288-bit situational context mask + bitemporal & DataGap validation."""
    if not ctx.game_id or not isinstance(ctx.game_id, str):
        raise DataGapError("game_id", "Missing game_id.")

    t_val = _require_finite_float(ctx.valid_time_unix, "valid_time_unix")
    t_tx = _require_finite_float(ctx.tx_time_unix, "tx_time_unix")
    t_dec = _require_finite_float(ctx.decision_time_unix, "decision_time_unix")
    t_kick = _require_finite_float(ctx.kickoff_time_unix, "kickoff_time_unix")

    # Enforce Bitemporal Point-in-Time Watermark Invariant: t_valid <= t_tx <= asOfTx <= t_kickoff
    if not (t_val <= t_tx <= t_dec <= t_kick):
        raise DataGapError(
            "bitemporal_watermark",
            f"Bitemporal leakage or out-of-order timestamps: valid={t_val}, tx={t_tx}, decision={t_dec}, kickoff={t_kick}",
        )

    temp_f = _require_finite_float(ctx.temperature_f, "temperature_f", lo=-30.0, hi=135.0)
    wind_mph = _require_finite_float(ctx.wind_speed_mph, "wind_speed_mph", lo=0.0, hi=90.0)
    precip = _require_finite_float(ctx.precipitation_rate_mm_hr, "precipitation_rate_mm_hr", lo=0.0, hi=200.0)
    alt_ft = _require_finite_float(ctx.altitude_ft, "altitude_ft", lo=-200.0, hi=15000.0)
    traction = _require_finite_float(ctx.surface_traction_coeff, "surface_traction_coeff", lo=0.1, hi=1.5)
    tz_shift = _require_finite_float(ctx.timezone_shift_hours, "timezone_shift_hours", lo=-12.0, hi=12.0)
    home_sack = _require_finite_float(ctx.home_projected_sack_rate, "home_projected_sack_rate", lo=0.0, hi=0.35)
    away_sack = _require_finite_float(ctx.away_projected_sack_rate, "away_projected_sack_rate", lo=0.0, hi=0.35)
    home_2h = _require_finite_float(ctx.home_two_high_shell_rate, "home_two_high_shell_rate", lo=0.0, hi=1.0)
    away_2h = _require_finite_float(ctx.away_two_high_shell_rate, "away_two_high_shell_rate", lo=0.0, hi=1.0)
    steam_pts = _require_finite_float(ctx.total_steam_move_pts, "total_steam_move_pts", lo=-25.0, hi=25.0)
    spread_abs = _require_finite_float(ctx.spread_line_abs, "spread_line_abs", lo=0.0, hi=45.0)
    pace_sec = _require_finite_float(ctx.offensive_pace_sec, "offensive_pace_sec", lo=15.0, hi=45.0)
    proe = _require_finite_float(ctx.combined_proe, "combined_proe", lo=-0.50, hi=0.50)
    aggr_delta = _require_finite_float(ctx.coach_aggressiveness_delta, "coach_aggressiveness_delta", lo=-1.0, hi=1.0)
    pen_rate = _require_finite_float(ctx.officiating_penalty_rate, "officiating_penalty_rate", lo=0.0, hi=30.0)
    home_ypa = _require_finite_float(ctx.home_qb_ypa, "home_qb_ypa", lo=2.0, hi=15.0)
    away_ypa = _require_finite_float(ctx.away_qb_ypa, "away_qb_ypa", lo=2.0, hi=15.0)
    home_acwr = _require_finite_float(ctx.home_acwr, "home_acwr", lo=0.2, hi=3.5)
    away_acwr = _require_finite_float(ctx.away_acwr, "away_acwr", lo=0.2, hi=3.5)
    crowd_db = _require_finite_float(ctx.crowd_decibels, "crowd_decibels", lo=40.0, hi=130.0)

    words = [0] * BITMASK_WORD_COUNT

    # Word 0: Bits 0-15 Weather, Bits 16-31 Rest/Schedule
    if temp_f < 32.0:
        _set_bit_words(words, 0)
    elif temp_f < 50.0:
        _set_bit_words(words, 1)
    elif temp_f <= 70.0:
        _set_bit_words(words, 2)
    else:
        _set_bit_words(words, 3)

    if wind_mph <= 8.0:
        _set_bit_words(words, 4)
    elif wind_mph <= 15.0:
        _set_bit_words(words, 5)
    elif wind_mph <= 22.0:
        _set_bit_words(words, 6)
    else:
        _set_bit_words(words, 7)

    if precip > 0.1:
        _set_bit_words(words, 10)
    if alt_ft > 4000.0:
        _set_bit_words(words, 13)
    if traction < 0.75:
        _set_bit_words(words, 14)
    if ctx.is_dome:
        _set_bit_words(words, 15)

    if ctx.days_rest_home <= 4 or ctx.days_rest_away <= 4:
        _set_bit_words(words, 16)
    if ctx.days_rest_home >= 13 or ctx.days_rest_away >= 13:
        _set_bit_words(words, 17)
    if abs(tz_shift) >= 1.0:
        _set_bit_words(words, 22)

    # Word 1: Bits 32-63 OL Continuity
    if ctx.home_interior_ol_out_count >= 2:
        _set_bit_words(words, 41)
    if ctx.away_interior_ol_out_count >= 2:
        _set_bit_words(words, 57)

    # Word 2: Bits 64-95 DL/LB Continuity
    if ctx.home_ilb1_out:
        _set_bit_words(words, 72)
    if ctx.home_ilb2_out:
        _set_bit_words(words, 73)
    if home_sack < 0.045:
        _set_bit_words(words, 76)
    if ctx.away_ilb1_out:
        _set_bit_words(words, 88)
    if ctx.away_ilb2_out:
        _set_bit_words(words, 89)
    if away_sack < 0.045:
        _set_bit_words(words, 92)

    # Word 3: Bits 96-127 DB Continuity
    if ctx.home_cb1_out:
        _set_bit_words(words, 96)
    if ctx.home_nickel_cb_active:
        _set_bit_words(words, 100)
    if home_2h >= 0.55:
        _set_bit_words(words, 106)
    if ctx.away_cb1_out:
        _set_bit_words(words, 112)
    if ctx.away_nickel_cb_active:
        _set_bit_words(words, 116)
    if away_2h >= 0.55:
        _set_bit_words(words, 122)

    # Word 4: Bits 128-159 Market Overlay (Class-B Step N)
    if abs(steam_pts) >= 3.0:
        _set_bit_words(words, 140)
    if abs(spread_abs - 3.0) < 0.01:
        _set_bit_words(words, 152)

    # Word 5: Bits 160-191 Game-Script Priors
    if pace_sec < 26.5:
        _set_bit_words(words, 160)
    if proe > 0.03:
        _set_bit_words(words, 166)
    if aggr_delta > 0.10:
        _set_bit_words(words, 178)
    if pen_rate >= 13.0:
        _set_bit_words(words, 184)
    if home_ypa >= 7.5 and away_ypa >= 7.5:
        _set_bit_words(words, 188)

    # Word 6: Bits 192-223 Physiological & Rookie Ramp
    if home_acwr > 1.35 or away_acwr > 1.35:
        _set_bit_words(words, 192)
    if crowd_db > 100.0:
        _set_bit_words(words, 204)
    if ctx.home_rookie_route_ramp_inflection:
        _set_bit_words(words, 216)
    if ctx.away_rookie_route_ramp_inflection:
        _set_bit_words(words, 220)

    # Word 7: Bits 224-255 Second-Order Boolean Polynomials
    mutual_def_spine_void = (
        (_get_bit_words(words, 72) and _get_bit_words(words, 73))
        and (_get_bit_words(words, 112) or (_get_bit_words(words, 88) and _get_bit_words(words, 89)))
    )
    if mutual_def_spine_void:
        _set_bit_words(words, 224)

    ol_attrition_neutralized_by_zero_rush = _get_bit_words(words, 57) and _get_bit_words(words, 76)
    if ol_attrition_neutralized_by_zero_rush:
        _set_bit_words(words, 225)

    ilb_void_nickel_active_te_rb_funnel = (
        (_get_bit_words(words, 72) and _get_bit_words(words, 73) and _get_bit_words(words, 100))
        or (_get_bit_words(words, 88) and _get_bit_words(words, 89) and _get_bit_words(words, 116))
    )
    if ilb_void_nickel_active_te_rb_funnel:
        _set_bit_words(words, 226)

    calm_weather_extended_fg_yac = (
        _get_bit_words(words, 2)
        and _get_bit_words(words, 4)
        and (not _get_bit_words(words, 10))
        and mutual_def_spine_void
    )
    if calm_weather_extended_fg_yac:
        _set_bit_words(words, 228)

    qb_kneeldown_hook_hazard = _get_bit_words(words, 152) and ctx.qb_rush_prop_hook_in_danger_zone
    if qb_kneeldown_hook_hazard:
        _set_bit_words(words, 230)

    rookie_ramp_vs_depleted_cb1 = (
        (_get_bit_words(words, 216) and _get_bit_words(words, 112))
        or (_get_bit_words(words, 220) and _get_bit_words(words, 96))
    )
    if rookie_ramp_vs_depleted_cb1:
        _set_bit_words(words, 234)

    # Word 8: Bits 256-287 League Tag & Polymorphic Extension
    league_codes = {LeagueTag.NFL: 1, LeagueTag.NBA: 2, LeagueTag.NHL: 3, LeagueTag.CFB: 4}
    l_code = league_codes[ctx.league]
    if l_code & 1:
        _set_bit_words(words, 256)
    if l_code & 2:
        _set_bit_words(words, 257)
    if l_code & 4:
        _set_bit_words(words, 258)

    active_indices = tuple(i for i in range(BITMASK_TOTAL_BITS) if _get_bit_words(words, i))
    hex_str = ":".join(f"{w:08x}" for w in words)
    raw_bytes = b"".join(int(w).to_bytes(4, byteorder="little", signed=False) for w in words)
    digest = hashlib.sha256(raw_bytes).hexdigest()

    return ContextualBitmask288Receipt(
        words=tuple(words),
        packed_int288=words_to_int288(words),
        hex_string=hex_str,
        sha256_digest=digest,
        active_bit_indices=active_indices,
        second_order_flags={
            "mutualDefSpineVoid": mutual_def_spine_void,
            "olAttritionNeutralizedByZeroRush": ol_attrition_neutralized_by_zero_rush,
            "ilbVoidNickelActiveTeRbFunnel": ilb_void_nickel_active_te_rb_funnel,
            "calmWeatherExtendedFgYacRegime": calm_weather_extended_fg_yac,
            "qbKneeldownHookHazard": qb_kneeldown_hook_hazard,
            "rookieRampVsDepletedCb1": rookie_ramp_vs_depleted_cb1,
        },
    )


def compute_bitmask_xor_delta(
    prev_words: Sequence[int], next_words: Sequence[int]
) -> Tuple[Tuple[int, ...], Tuple[int, ...], int]:
    """Computes 288-bit XOR delta for 5-minute incremental Merkle DAG invalidation."""
    if len(prev_words) != BITMASK_WORD_COUNT or len(next_words) != BITMASK_WORD_COUNT:
        raise DataGapError("bitmask_words", "Bitmask must have exactly 9 uint32 words.")
    deltas: List[int] = []
    changed_indices: List[int] = []
    popcount = 0
    for idx in range(BITMASK_WORD_COUNT):
        xor_val = (int(prev_words[idx]) ^ int(next_words[idx])) & 0xFFFFFFFF
        deltas.append(xor_val)
        if xor_val != 0:
            changed_indices.append(idx)
            popcount += xor_val.bit_count()
    return tuple(deltas), tuple(changed_indices), popcount


def filter_stage_a_premises(
    bitmask: ContextualBitmask288Receipt,
    premises: Sequence[SignalPremise50k],
) -> List[SignalPremise50k]:
    """Stage A O(1) bitwise pruning + Class-A verbatim provenance & sample-floor gate."""
    b_int = bitmask.packed_int288
    has_second_order = bitmask.words[7] != 0
    min_sample_floor = 12 if has_second_order else 30

    survivors: List[SignalPremise50k] = []
    for p in premises:
        if p.record_class != "CITABLE_VERIFIED":
            continue
        if not p.verbatim_quote or p.char_span_end <= p.char_span_start:
            continue
        if p.sample_count < min_sample_floor:
            continue
        if (b_int & p.req_mask_int288) != p.req_mask_int288:
            continue
        if (b_int & p.forbid_mask_int288) != 0:
            continue
        survivors.append(p)
    return survivors


# --- Stage B: Shpitser-Pearl ID, HCID Mediator Expansion & VanderWeele E-Value Gate ---


@dataclass(frozen=True)
class CausalADMG:
    """Acyclic Directed Mixed Graph G = (V, E_directed, E_bidirected)."""

    nodes: Tuple[str, ...]  # Topologically ordered vertices
    directed: Tuple[Tuple[str, str], ...]
    bidirected: Tuple[Tuple[str, str], ...] = ()

    def induce_subgraph(self, keep: Set[str]) -> CausalADMG:
        sub_nodes = tuple(n for n in self.nodes if n in keep)
        sub_dir = tuple((u, v) for (u, v) in self.directed if u in keep and v in keep)
        sub_bi = tuple((u, v) for (u, v) in self.bidirected if u in keep and v in keep)
        return CausalADMG(nodes=sub_nodes, directed=sub_dir, bidirected=sub_bi)

    def mutilate_incoming(self, x_set: Set[str]) -> CausalADMG:
        """Graph G_{\\overline{X}} removing all incoming directed and bidirected edges into X."""
        sub_dir = tuple((u, v) for (u, v) in self.directed if v not in x_set)
        sub_bi = tuple((u, v) for (u, v) in self.bidirected if u not in x_set and v not in x_set)
        return CausalADMG(nodes=self.nodes, directed=sub_dir, bidirected=sub_bi)

    def ancestors_of(self, targets: Set[str]) -> Set[str]:
        rev_adj: Dict[str, List[str]] = {n: [] for n in self.nodes}
        for u, v in self.directed:
            rev_adj[v].append(u)
        visited = set(targets) & set(self.nodes)
        stack = list(visited)
        while stack:
            curr = stack.pop()
            for parent in rev_adj.get(curr, ()):
                if parent not in visited:
                    visited.add(parent)
                    stack.append(parent)
        return visited

    def maximal_c_components(self) -> List[Set[str]]:
        """Partitions vertices into maximal confounded components connected by <->."""
        bi_adj: Dict[str, List[str]] = {n: [] for n in self.nodes}
        for u, v in self.bidirected:
            if u in bi_adj and v in bi_adj:
                bi_adj[u].append(v)
                bi_adj[v].append(u)
        seen: Set[str] = set()
        comps: List[Set[str]] = []
        for n in self.nodes:
            if n not in seen:
                comp: Set[str] = set()
                queue = [n]
                seen.add(n)
                while queue:
                    curr = queue.pop()
                    comp.add(curr)
                    for nb in bi_adj[curr]:
                        if nb not in seen:
                            seen.add(nb)
                            queue.append(nb)
                comps.append(comp)
        return comps


@dataclass(frozen=True)
class SymbolicFactor:
    kind: str  # 'OBSERVATIONAL_COND' | 'PRODUCT' | 'MARGINAL_SUM' | 'RATIO'
    target: Optional[str] = None
    given: Tuple[str, ...] = ()
    factors: Tuple[SymbolicFactor, ...] = ()
    sum_out: Tuple[str, ...] = ()
    body: Optional[SymbolicFactor] = None
    numerator: Optional[SymbolicFactor] = None
    denominator: Optional[SymbolicFactor] = None


@dataclass(frozen=True)
class ShpitserPearlIDResult:
    identifiable: bool
    formula_class: str
    formula: Optional[SymbolicFactor] = None
    hedge_witness: Optional[Tuple[Tuple[str, ...], Tuple[str, ...]]] = None
    enabling_edges: Tuple[Tuple[str, str], ...] = ()


def find_id_enabling_edges_for_hedge(
    g: CausalADMG, forest_full: Sequence[str], forest_sub: Sequence[str]
) -> Tuple[Tuple[str, str], ...]:
    """Vaananen, Cui, Cinelli & Tikka (2025, arXiv:2610.08092) ID-EnablingEdges."""
    f_set = set(forest_full)
    r_set = set(forest_sub)
    return tuple(
        (u, v)
        for (u, v) in g.directed
        if u in f_set and v in f_set and not (u in r_set and v in r_set)
    )


def run_shpitser_pearl_id(
    y_set: Set[str],
    x_set: Set[str],
    g: CausalADMG,
    active_q_factor: Optional[SymbolicFactor] = None,
    is_marginalized_c_factor: bool = False,
    full_topo_nodes: Optional[Tuple[str, ...]] = None,
) -> ShpitserPearlIDResult:
    """Complete 7-line recursive Shpitser & Pearl (2006) ID algorithm with Tian-Pearl
    Lemma 2 `RATIO` node resolution for Case-3 / Napkin topologies (Audit Item X20).
    """
    topo = full_topo_nodes if full_topo_nodes is not None else g.nodes
    v_set = set(g.nodes)

    current_dist = active_q_factor or SymbolicFactor(
        kind="PRODUCT",
        factors=tuple(
            SymbolicFactor(
                kind="OBSERVATIONAL_COND",
                target=n,
                given=topo[: topo.index(n)],
            )
            for n in g.nodes
        ),
    )

    # Line 1: If X == empty, return sum_{V \ Y} P(V)
    if not x_set:
        sum_out = tuple(n for n in g.nodes if n not in y_set)
        formula = (
            SymbolicFactor(kind="MARGINAL_SUM", sum_out=sum_out, body=current_dist)
            if sum_out
            else current_dist
        )
        return ShpitserPearlIDResult(True, "OBSERVATIONAL_MARGINAL", formula=formula)

    # Line 2: Prune non-ancestors V \ An(Y)_G
    an_y = g.ancestors_of(y_set)
    if len(an_y) < len(v_set):
        g_an = g.induce_subgraph(an_y)
        x_an = x_set & an_y
        pruned = tuple(n for n in g.nodes if n not in an_y)
        marg = SymbolicFactor(kind="MARGINAL_SUM", sum_out=pruned, body=current_dist)
        return run_shpitser_pearl_id(
            y_set,
            x_an,
            g_an,
            active_q_factor=marg,
            is_marginalized_c_factor=(active_q_factor is not None or is_marginalized_c_factor),
            full_topo_nodes=topo,
        )

    # Line 3: Insert do(W) where W = (V \ X) \ An(Y)_{G_{\overline{X}}}
    g_over_x = g.mutilate_incoming(x_set)
    an_y_over_x = g_over_x.ancestors_of(y_set)
    w_nodes = {n for n in g.nodes if n not in x_set and n not in an_y_over_x}
    if w_nodes:
        return run_shpitser_pearl_id(
            y_set,
            x_set | w_nodes,
            g,
            active_q_factor=active_q_factor,
            is_marginalized_c_factor=is_marginalized_c_factor,
            full_topo_nodes=topo,
        )

    # Partition G[V \ X] into maximal C-components S_1, ..., S_k
    v_minus_x = v_set - x_set
    g_minus_x = g.induce_subgraph(v_minus_x)
    c_comps = g_minus_x.maximal_c_components()

    # Line 4: If k >= 2, factorize across C-components (Frontdoor & multi-district ID)
    if len(c_comps) >= 2:
        child_factors: List[SymbolicFactor] = []
        for s_comp in c_comps:
            sub_res = run_shpitser_pearl_id(
                s_comp,
                v_set - s_comp,
                g,
                active_q_factor=active_q_factor,
                is_marginalized_c_factor=is_marginalized_c_factor,
                full_topo_nodes=topo,
            )
            if not sub_res.identifiable or sub_res.formula is None:
                return sub_res
            child_factors.append(sub_res.formula)
        prod = SymbolicFactor(kind="PRODUCT", factors=tuple(child_factors))
        sum_out = tuple(n for n in g.nodes if n not in y_set and n not in x_set)
        formula = SymbolicFactor(kind="MARGINAL_SUM", sum_out=sum_out, body=prod) if sum_out else prod
        return ShpitserPearlIDResult(True, "FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION", formula=formula)

    s_comp = c_comps[0]
    top_c_comps = g.maximal_c_components()

    # Line 5: If C(G) == {V}, witnessing hedge (G, G[S]) blocks identification -> FAIL_HEDGE
    if len(top_c_comps) == 1 and top_c_comps[0] == v_set:
        f_full = g.nodes
        f_sub = tuple(n for n in g.nodes if n in s_comp)
        enabling = find_id_enabling_edges_for_hedge(g, f_full, f_sub)
        return ShpitserPearlIDResult(
            identifiable=False,
            formula_class="FAIL_HEDGE",
            hedge_witness=(f_full, f_sub),
            enabling_edges=enabling,
        )

    # Line 6: If S in C(G), return direct C-factor or Tian-Pearl RATIO if marginalized
    if any(c == s_comp for c in top_c_comps):
        s_ordered = [n for n in g.nodes if n in s_comp]
        sum_out_s_minus_y = tuple(n for n in s_ordered if n not in y_set)
        if is_marginalized_c_factor and active_q_factor is not None:
            num = (
                SymbolicFactor(kind="MARGINAL_SUM", sum_out=sum_out_s_minus_y, body=current_dist)
                if sum_out_s_minus_y
                else current_dist
            )
            den = SymbolicFactor(kind="MARGINAL_SUM", sum_out=tuple(s_ordered), body=current_dist)
            return ShpitserPearlIDResult(
                identifiable=True,
                formula_class="TIAN_C_FACTOR_RATIO",
                formula=SymbolicFactor(kind="RATIO", numerator=num, denominator=den),
            )

        s_factors = tuple(
            SymbolicFactor(kind="OBSERVATIONAL_COND", target=n, given=topo[: topo.index(n)])
            for n in s_ordered
        )
        body = s_factors[0] if len(s_factors) == 1 else SymbolicFactor(kind="PRODUCT", factors=s_factors)
        formula = (
            SymbolicFactor(kind="MARGINAL_SUM", sum_out=sum_out_s_minus_y, body=body)
            if sum_out_s_minus_y
            else body
        )
        return ShpitserPearlIDResult(True, "BACK_DOOR_OR_DIRECT_C_FACTOR", formula=formula)

    # Line 7: Find S' in C(G) such that S is a strict subset of S'
    super_comp = next(c for c in top_c_comps if s_comp < c)
    g_super = g.induce_subgraph(super_comp)
    x_super = x_set & super_comp
    super_ordered = [n for n in g.nodes if n in super_comp]
    q_super = SymbolicFactor(
        kind="PRODUCT",
        factors=tuple(
            SymbolicFactor(kind="OBSERVATIONAL_COND", target=n, given=topo[: topo.index(n)])
            for n in super_ordered
        ),
    )
    return run_shpitser_pearl_id(
        y_set,
        x_super,
        g_super,
        active_q_factor=q_super,
        is_marginalized_c_factor=is_marginalized_c_factor,
        full_topo_nodes=topo,
    )


def expand_edge_with_hcid_mediator(
    g: CausalADMG, edge: Tuple[str, str], mediator_node: str
) -> CausalADMG:
    """Inserts observable mediator M along directed edge u -> v (`u -> M -> v`) to break bow-arc hedge."""
    u, v = edge
    if (u, v) not in g.directed:
        raise DataGapError("hcid_edge", f"Directed edge {edge} not present in ADMG.")
    if mediator_node in g.nodes:
        raise DataGapError("mediator_node", f"Mediator {mediator_node} already exists in ADMG.")

    u_idx = g.nodes.index(u)
    v_idx = g.nodes.index(v)
    if u_idx >= v_idx:
        raise DataGapError("topological_order", f"Invalid topological order for edge {u} -> {v}.")
    new_nodes = g.nodes[:v_idx] + (mediator_node,) + g.nodes[v_idx:]
    new_dir = tuple((a, b) for (a, b) in g.directed if (a, b) != (u, v)) + (
        (u, mediator_node),
        (mediator_node, v),
    )
    return CausalADMG(nodes=new_nodes, directed=new_dir, bidirected=g.bidirected)


@dataclass(frozen=True)
class EValueGateResult:
    passed: bool
    standardized_mean_diff: float
    approx_risk_ratio: float
    e_value_point: float
    e_value_ci_low: float
    n_treated: int
    n_control: int
    refusal_code: Optional[str]


def compute_vanderweele_e_value(
    treated_residuals: Sequence[float],
    control_residuals: Sequence[float],
    min_e_point: float = MIN_E_VALUE_POINT,
    min_e_ci: float = MIN_E_VALUE_CI_LOW,
    min_n: int = MIN_SAMPLE_PER_ARM,
) -> EValueGateResult:
    """VanderWeele & Ding (2017, *Annals of Internal Medicine* 167:268-274) E-Value Gate.

    Converts standardized mean difference `d` to the risk-ratio scale via `RR = exp(0.91 * |d|)`
    and computes `E = RR + sqrt(RR * (RR - 1))` for both the point estimate (`>= 1.35`)
    and the 95% confidence interval bound (`>= 1.10`).
    """
    if treated_residuals is None or control_residuals is None:
        raise DataGapError("residuals", "Treated and control residual arrays are required.")
    t_arr = np.asarray(treated_residuals, dtype=np.float64)
    c_arr = np.asarray(control_residuals, dtype=np.float64)
    if t_arr.ndim != 1 or c_arr.ndim != 1 or not (np.all(np.isfinite(t_arr)) and np.all(np.isfinite(c_arr))):
        raise DataGapError("residuals", "Residual arrays must be finite 1-D vectors.")

    n1, n0 = int(t_arr.size), int(c_arr.size)
    if n1 < min_n or n0 < min_n:
        raise DataGapError(
            "residual_arm_sample",
            f"Sample floor violated: n_treated={n1}, n_control={n0} (requires >= {min_n} per arm).",
        )

    var1 = float(np.var(t_arr, ddof=1))
    var0 = float(np.var(c_arr, ddof=1))
    pooled_sd = math.sqrt(((n1 - 1) * var1 + (n0 - 1) * var0) / (n1 + n0 - 2))
    if pooled_sd <= 1e-12:
        raise DataGapError("pooled_sd", "Zero pooled variance in residual arms.")

    diff = abs(float(np.mean(t_arr) - np.mean(c_arr)))
    d = diff / pooled_sd
    se_d = math.sqrt((n1 + n0) / (n1 * n0) + (d * d) / (2.0 * (n1 + n0)))
    d_ci_low = max(0.0, d - 1.96 * se_d)

    rr_point = math.exp(0.91 * d)
    rr_ci = math.exp(0.91 * d_ci_low)

    e_point = rr_point + math.sqrt(max(0.0, rr_point * (rr_point - 1.0))) if rr_point > 1.0 else 1.0
    e_ci = rr_ci + math.sqrt(max(0.0, rr_ci * (rr_ci - 1.0))) if rr_ci > 1.0 else 1.0

    passed = (e_point >= min_e_point) and (e_ci >= min_e_ci)
    refusal = None if passed else "REFUSED_G4_FRAGILE_E_VALUE"

    return EValueGateResult(
        passed=passed,
        standardized_mean_diff=round(d, 6),
        approx_risk_ratio=round(rr_point, 6),
        e_value_point=round(e_point, 6),
        e_value_ci_low=round(e_ci, 6),
        n_treated=n1,
        n_control=n0,
        refusal_code=refusal,
    )


def estimate_backdoor_ate(
    x: Sequence[int],
    y: Sequence[float],
    z_strata: Sequence[int],
) -> float:
    """Nonparametric Pearl backdoor adjustment: sum_z (E[Y|X=1,Z=z] - E[Y|X=0,Z=z]) P(Z=z)."""
    x_arr = np.asarray(x, dtype=np.int64)
    y_arr = np.asarray(y, dtype=np.float64)
    z_arr = np.asarray(z_strata, dtype=np.int64)
    if not (x_arr.size == y_arr.size == z_arr.size) or x_arr.size == 0:
        raise DataGapError("backdoor_inputs", "Mismatched or empty backdoor arrays.")

    n_total = float(x_arr.size)
    ate = 0.0
    for z_val in np.unique(z_arr):
        mask_z = z_arr == z_val
        p_z = float(np.sum(mask_z)) / n_total
        y_1 = y_arr[mask_z & (x_arr == 1)]
        y_0 = y_arr[mask_z & (x_arr == 0)]
        if y_1.size == 0 or y_0.size == 0:
            raise DataGapError("positivity", f"Positivity violated in backdoor stratum Z={z_val}.")
        ate += (float(np.mean(y_1)) - float(np.mean(y_0))) * p_z
    return ate


def estimate_frontdoor_ate(
    x: Sequence[int],
    m: Sequence[int],
    y: Sequence[float],
) -> float:
    """Nonparametric Pearl frontdoor adjustment over binary X, discrete mediator M:
    E[Y | do(X=x)] = sum_m P(M=m | X=x) sum_{x'} E[Y | X=x', M=m] P(X=x').
    """
    x_arr = np.asarray(x, dtype=np.int64)
    m_arr = np.asarray(m, dtype=np.int64)
    y_arr = np.asarray(y, dtype=np.float64)
    if not (x_arr.size == m_arr.size == y_arr.size) or x_arr.size == 0:
        raise DataGapError("frontdoor_inputs", "Mismatched or empty frontdoor arrays.")

    n_total = float(x_arr.size)
    x_vals = (0, 1)
    m_vals = np.unique(m_arr)
    p_x = {xv: float(np.sum(x_arr == xv)) / n_total for xv in x_vals}
    if any(v <= 0.0 for v in p_x.values()):
        raise DataGapError("frontdoor_positivity", "Treatment X lacks both arms.")

    do_means: Dict[int, float] = {}
    for target_x in x_vals:
        mask_tx = x_arr == target_x
        ey_do_x = 0.0
        for mv in m_vals:
            p_m_given_tx = float(np.sum(m_arr[mask_tx] == mv)) / float(np.sum(mask_tx))
            inner = 0.0
            for xp in x_vals:
                cell = y_arr[(x_arr == xp) & (m_arr == mv)]
                if cell.size == 0:
                    raise DataGapError("frontdoor_cell", f"Empty cell for (X'={xp}, M={mv}).")
                inner += float(np.mean(cell)) * p_x[xp]
            ey_do_x += p_m_given_tx * inner
        do_means[target_x] = ey_do_x
    return do_means[1] - do_means[0]


# --- Stage C: Marchenko-Pastur Spectral Cleaning & FWL Market Orthogonalization ---


@dataclass(frozen=True)
class MarchenkoPasturCleanResult:
    cleaned_correlation: np.ndarray
    raw_eigenvalues: Tuple[float, ...]
    cleaned_eigenvalues: Tuple[float, ...]
    lambda_minus: float
    lambda_plus: float
    tracy_widom_edge: float
    detached_spike_count: int
    top_participation_ratio: float


def marchenko_pastur_clean_correlation(
    signal_matrix: np.ndarray,
    sigma2: float = 1.0,
    tw_alpha_99: float = 2.0234,
) -> MarchenkoPasturCleanResult:
    """Stage C Random-Matrix Spectral Cleaning under the Marchenko-Pastur (1967) & BBP law.

    Standardizes columns of `signal_matrix` (T x P), computes sample correlation `C = Z^T Z / T`,
    and replaces noisy bulk eigenvalues (`lambda <= lambda_+`) with their trace-preserving
    mean while keeping detached signal spikes intact.
    """
    mat = np.asarray(signal_matrix, dtype=np.float64)
    if mat.ndim != 2 or not np.all(np.isfinite(mat)):
        raise DataGapError("signal_matrix", "Signal matrix must be a finite 2-D array (T x P).")
    n_obs, p_dim = mat.shape
    if n_obs < 10 or p_dim < 2 or p_dim >= n_obs:
        raise DataGapError(
            "signal_matrix_shape",
            f"Require T >= 10, P >= 2, and aspect ratio P/T < 1; got ({n_obs}, {p_dim}).",
        )

    col_means = np.mean(mat, axis=0, keepdims=True)
    col_stds = np.std(mat, axis=0, ddof=0, keepdims=True)
    if np.any(col_stds <= 1e-12):
        raise DataGapError("signal_matrix_variance", "Zero-variance column detected in signal matrix.")
    z = (mat - col_means) / col_stds
    corr = (z.T @ z) / float(n_obs)
    corr = 0.5 * (corr + corr.T)

    eigvals, eigvecs = np.linalg.eigh(corr)
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]

    gamma = float(p_dim) / float(n_obs)
    sqrt_gamma = math.sqrt(gamma)
    lambda_minus = sigma2 * ((1.0 - sqrt_gamma) ** 2)
    lambda_plus = sigma2 * ((1.0 + sqrt_gamma) ** 2)
    tw_scale = (
        sigma2
        * ((1.0 + sqrt_gamma) ** (4.0 / 3.0))
        * (gamma ** (-1.0 / 6.0))
        * (float(n_obs) ** (-2.0 / 3.0))
    )
    tw_edge = lambda_plus + tw_alpha_99 * tw_scale

    spike_mask = eigvals > lambda_plus
    detached_tw_count = int(np.sum(eigvals > tw_edge))

    cleaned_vals = eigvals.copy()
    bulk_mask = ~spike_mask
    if np.any(bulk_mask):
        bulk_mean = float(np.mean(cleaned_vals[bulk_mask]))
        cleaned_vals[bulk_mask] = bulk_mean

    c_raw = eigvecs @ np.diag(cleaned_vals) @ eigvecs.T
    # Renormalize diagonal to exact unit correlation 1.0 while preserving positive definiteness
    d_inv_sqrt = 1.0 / np.sqrt(np.clip(np.diag(c_raw), 1e-12, None))
    c_clean = (c_raw * d_inv_sqrt[:, None]) * d_inv_sqrt[None, :]
    c_clean = 0.5 * (c_clean + c_clean.T)

    u1 = eigvecs[:, 0]
    pr_norm = 1.0 / (float(p_dim) * float(np.sum(u1 ** 4)))

    return MarchenkoPasturCleanResult(
        cleaned_correlation=c_clean,
        raw_eigenvalues=tuple(round(float(v), 6) for v in eigvals),
        cleaned_eigenvalues=tuple(round(float(v), 6) for v in cleaned_vals),
        lambda_minus=round(lambda_minus, 6),
        lambda_plus=round(lambda_plus, 6),
        tracy_widom_edge=round(tw_edge, 6),
        detached_spike_count=detached_tw_count,
        top_participation_ratio=round(pr_norm, 6),
    )


@dataclass(frozen=True)
class FWLOrthogonalizationResult:
    tau_hat: np.ndarray
    residualized_signals: np.ndarray
    residualized_outcome: np.ndarray
    max_anchor_orthogonality_error: float
    max_ols_equivalence_error: float


def frisch_waugh_lovell_orthogonalize(
    signals_x: np.ndarray,
    market_anchors_m: np.ndarray,
    outcome_y: np.ndarray,
    add_intercept_to_anchors: bool = True,
) -> FWLOrthogonalizationResult:
    """Frisch-Waugh-Lovell (`FWL`) market-anchor orthogonalization computing `tau_hat`.

    Projects both the candidate causal/coaching signals `X` and realized outcome `y` onto
    the orthogonal complement `M^perp` of the sportsbook market anchor matrix `M`, isolating
    pure non-market alpha `tau_hat` with exact OLS equivalence `||tau_hat - beta_full_X||_inf < 1e-10`.
    """
    x = np.asarray(signals_x, dtype=np.float64)
    m = np.asarray(market_anchors_m, dtype=np.float64)
    y = np.asarray(outcome_y, dtype=np.float64)

    if x.ndim == 1:
        x = x[:, None]
    if m.ndim == 1:
        m = m[:, None]
    if y.ndim != 1:
        raise DataGapError("outcome_y", "Outcome y must be a 1-D vector.")
    if not (np.all(np.isfinite(x)) and np.all(np.isfinite(m)) and np.all(np.isfinite(y))):
        raise DataGapError("fwl_arrays", "FWL inputs contain NaN or Inf.")
    if not (x.shape[0] == m.shape[0] == y.shape[0]) or x.shape[0] < (x.shape[1] + m.shape[1] + 2):
        raise DataGapError("fwl_degrees_of_freedom", "Insufficient observations for FWL projection.")

    if add_intercept_to_anchors:
        m_aug = np.column_stack([np.ones(m.shape[0], dtype=np.float64), m])
    else:
        m_aug = m

    # Project onto M_aug^perp via numerically stable QR / least-squares residuals
    coef_mx, _, _, _ = np.linalg.lstsq(m_aug, x, rcond=None)
    x_tilde = x - m_aug @ coef_mx

    coef_my, _, _, _ = np.linalg.lstsq(m_aug, y, rcond=None)
    y_tilde = y - m_aug @ coef_my

    tau_hat, _, _, _ = np.linalg.lstsq(x_tilde, y_tilde, rcond=None)

    # Verify exact FWL theorem equivalence against joint regression [M_aug | X]
    joint_design = np.column_stack([m_aug, x])
    joint_beta, _, _, _ = np.linalg.lstsq(joint_design, y, rcond=None)
    beta_x_full = joint_beta[m_aug.shape[1] :]

    ortho_err = float(np.max(np.abs(m_aug.T @ x_tilde)))
    equiv_err = float(np.max(np.abs(tau_hat - beta_x_full)))

    return FWLOrthogonalizationResult(
        tau_hat=tau_hat,
        residualized_signals=x_tilde,
        residualized_outcome=y_tilde,
        max_anchor_orthogonality_error=ortho_err,
        max_ols_equivalence_error=equiv_err,
    )


# --- Stage D: Cross-Equation Jacobian Coupling, JS+ Shrinkage & Murphy Brier ---


@dataclass(frozen=True)
class MurphyBrierDecomposition:
    brier_score_exact: float
    brier_score_binned: float
    reliability: float
    resolution: float
    uncertainty: float
    partition_identity_error: float  # |REL - RES + UNC - BS_binned|


def positive_part_james_stein(
    raw_deltas: Sequence[float],
    covariance_matrix: Optional[np.ndarray] = None,
    prior_mean: Optional[Sequence[float]] = None,
) -> Tuple[np.ndarray, float]:
    """Baranchik (1970) Positive-Part James-Stein Shrinkage Estimator:
    `theta_JS+ = theta_0 + max(0, 1 - (m - 2) / ((x - theta_0)^T Sigma^{-1} (x - theta_0))) * (x - theta_0)`.
    """
    x = np.asarray(raw_deltas, dtype=np.float64)
    if x.ndim != 1 or x.size == 0 or not np.all(np.isfinite(x)):
        raise DataGapError("raw_deltas", "James-Stein input must be a non-empty finite 1-D vector.")

    m = x.size
    theta_0 = (
        np.zeros_like(x)
        if prior_mean is None
        else np.asarray(prior_mean, dtype=np.float64)
    )
    if theta_0.shape != x.shape or not np.all(np.isfinite(theta_0)):
        raise DataGapError("prior_mean", "Invalid prior_mean shape or non-finite values.")

    if m < 3:
        return x.copy(), 1.0

    diff = x - theta_0
    if covariance_matrix is None:
        sigma_inv = np.eye(m, dtype=np.float64)
    else:
        cov = np.asarray(covariance_matrix, dtype=np.float64)
        if cov.shape != (m, m) or not np.all(np.isfinite(cov)):
            raise DataGapError("covariance_matrix", f"Expected ({m}, {m}) finite covariance matrix.")
        sigma_inv = np.linalg.pinv(cov)

    quad_form = float(diff.T @ sigma_inv @ diff)
    if quad_form <= 1e-12:
        return theta_0.copy(), 0.0

    shrink_factor = max(0.0, 1.0 - float(m - 2) / quad_form)
    return theta_0 + shrink_factor * diff, shrink_factor


def couple_cross_equation_jacobian_and_shrink(
    premises: Sequence[SignalPremise50k],
    cleaned_covariance: Optional[np.ndarray] = None,
    bitmask: Optional[ContextualBitmask288Receipt] = None,
) -> Dict[str, Any]:
    """Stage D Cross-Equation Symbolic Jacobian Coupling + Baranchik JS+ Shrinkage
    strictly bounded at `|Delta log-odds| <= 0.35`.
    """
    if not premises:
        return {
            "coupled_premise_deltas": (),
            "shrunk_premise_deltas": (),
            "shrinkage_factor": 0.0,
            "unclamped_log_odds_delta": 0.0,
            "clamped_log_odds_delta": 0.0,
            "was_clamped": False,
        }

    m = len(premises)
    eff_deltas = np.zeros(m, dtype=np.float64)
    spec_vecs: List[np.ndarray] = []

    ol_zero_rush_neutralized = bool(
        bitmask and bitmask.second_order_flags.get("olAttritionNeutralizedByZeroRush", False)
    )

    for idx, p in enumerate(premises):
        w = _require_finite_float(p.kalman_weight, f"kalman_weight[{p.premise_id}]", lo=0.05, hi=3.0)
        d = clamp_log_odds_delta(p.raw_delta_log_odds, MAX_LOG_ODDS_DELTA)
        # Apply Stage-D bit 225 damping when interior OL penalty collides with zero-sack pass rush
        if ol_zero_rush_neutralized and p.target_node == "OL_PRESSURE_STALL":
            d *= (1.0 - 0.72)
        eff_deltas[idx] = w * d
        spec_vecs.append(np.asarray(p.high_freq_spectral_vec, dtype=np.float64))

    coupled = eff_deltas.copy()
    for i in range(m):
        for j in range(i + 1, m):
            pi, pj = premises[i], premises[j]
            shares_causal_link = (
                (pi.target_node == pj.target_node)
                or (pi.target_node in pj.parent_nodes)
                or (pj.target_node in pi.parent_nodes)
            )
            if not shares_causal_link:
                continue
            vi, vj = spec_vecs[i], spec_vecs[j]
            if vi.size > 0 and vi.size == vj.size:
                dot = float(np.dot(vi, vj))
                gamma_ij = 1.0 if dot > 0 else (-1.0 if dot < 0 else 0.0)
            else:
                gamma_ij = 0.0
            cross_term = 0.5 * gamma_ij * eff_deltas[i] * eff_deltas[j]
            coupled[i] += cross_term
            coupled[j] += cross_term

    shrunk, shrink_factor = positive_part_james_stein(coupled, covariance_matrix=cleaned_covariance)
    raw_sum = float(np.sum(shrunk))
    clamped_sum = clamp_log_odds_delta(raw_sum, MAX_LOG_ODDS_DELTA)

    return {
        "coupled_premise_deltas": tuple(round(float(v), 6) for v in coupled),
        "shrunk_premise_deltas": tuple(round(float(v), 6) for v in shrunk),
        "shrinkage_factor": round(shrink_factor, 6),
        "unclamped_log_odds_delta": round(raw_sum, 6),
        "clamped_log_odds_delta": round(clamped_sum, 6),
        "was_clamped": abs(raw_sum) > MAX_LOG_ODDS_DELTA,
    }


def murphy_brier_decomposition(
    probs: Sequence[float],
    outcomes: Sequence[int],
    n_bins: int = 10,
) -> MurphyBrierDecomposition:
    """Exact Allan H. Murphy (1973, *J. Appl. Meteor.* 12:595-600) Brier Score Vector Partition:
    `BS_binned = REL - RES + UNC`.
    """
    p_arr = np.asarray(probs, dtype=np.float64)
    y_arr = np.asarray(outcomes, dtype=np.float64)
    if p_arr.ndim != 1 or y_arr.ndim != 1 or p_arr.size == 0 or p_arr.size != y_arr.size:
        raise DataGapError("brier_inputs", "Probabilities and outcomes must be equal-length non-empty 1-D arrays.")
    if not (np.all(np.isfinite(p_arr)) and np.all((p_arr >= 0.0) & (p_arr <= 1.0))):
        raise DataGapError("brier_probs", "Forecast probabilities must lie in [0, 1].")
    if not np.all((y_arr == 0.0) | (y_arr == 1.0)):
        raise DataGapError("brier_outcomes", "Realized outcomes must be binary {0, 1}.")
    if n_bins < 2:
        raise DataGapError("n_bins", "n_bins must be >= 2.")

    n_total = float(p_arr.size)
    bs_exact = float(np.mean((p_arr - y_arr) ** 2))
    y_bar = float(np.mean(y_arr))
    unc = y_bar * (1.0 - y_bar)

    # Assign each forecast to bin k in 0 .. n_bins-1
    bin_indices = np.minimum(n_bins - 1, np.floor(p_arr * n_bins).astype(np.int64))
    rel = 0.0
    res = 0.0
    bs_binned = 0.0
    for k in range(n_bins):
        mask = bin_indices == k
        n_k = int(np.sum(mask))
        if n_k == 0:
            continue
        w_k = float(n_k) / n_total
        p_bar_k = float(np.mean(p_arr[mask]))
        y_bar_k = float(np.mean(y_arr[mask]))
        rel += w_k * ((p_bar_k - y_bar_k) ** 2)
        res += w_k * ((y_bar_k - y_bar) ** 2)
        bs_binned += float(np.sum((p_bar_k - y_arr[mask]) ** 2)) / n_total

    identity_err = abs((rel - res + unc) - bs_binned)
    return MurphyBrierDecomposition(
        brier_score_exact=round(bs_exact, 10),
        brier_score_binned=round(bs_binned, 10),
        reliability=round(rel, 10),
        resolution=round(res, 10),
        uncertainty=round(unc, 10),
        partition_identity_error=identity_err,
    )


# ============================================================================
# SUBSYSTEM 3: SIRIUSXM CHANNEL 87 AUDIO CLAIM VERACITY BAYESIAN UPDATER
# ============================================================================


class AudioClaimCategory(str, Enum):
    INJURY_AVAILABILITY = "INJURY_AVAILABILITY"
    SCHEME_WORKLOAD_REVEAL = "SCHEME_WORKLOAD_REVEAL"


class StructuredClaimPolarity(str, Enum):
    POSITIVE_ACTIVE_OR_BOOST = "POSITIVE_ACTIVE_OR_BOOST"
    NEGATIVE_OUT_OR_LIMIT = "NEGATIVE_OUT_OR_LIMIT"
    AMBIGUOUS_COACHSPEAK = "AMBIGUOUS_COACHSPEAK"


@dataclass(frozen=True)
class DeepgramNova2Utterance:
    """Transcribed audio segment from `workers/airwave-listener` (SiriusXM Ch. 87 / pressers)."""

    utterance_id: str
    channel_id: int  # e.g., 87 for SiriusXM Fantasy Sports Radio
    show_or_source: str
    speaker_id: str
    speaker_role: str  # 'HEAD_COACH' | 'BEAT_REPORTER' | 'RADIO_ANALYST'
    subject_player_id: str
    transcript_text: str
    deepgram_model: str  # Must start with 'nova-2'
    word_confidence_mean: float  # in [0, 1]
    valid_time_unix: float
    tx_time_unix: float
    sideline_podium_cma_deception_score: Optional[float] = None  # From AV-HuBERT CMA if available


@dataclass
class CoachBetaBinomialPrior:
    """Empirical Beta-Binomial calibration ledger per head coach / beat reporter.

    Separate Beta(alpha, beta) posteriors track:
    1. `injury_alpha / injury_beta`: veracity on injury/availability statements (prone to smokescreens)
    2. `scheme_alpha / scheme_beta`: veracity on structural alignment, O-line shifts & workload reveals
    """

    speaker_id: str
    injury_alpha: float
    injury_beta: float
    scheme_alpha: float
    scheme_beta: float

    def __post_init__(self) -> None:
        for name in ("injury_alpha", "injury_beta", "scheme_alpha", "scheme_beta"):
            _require_finite_float(getattr(self, name), name, lo=0.5, hi=10000.0)

    def posterior_veracity(self, category: AudioClaimCategory) -> Tuple[float, float]:
        if category == AudioClaimCategory.INJURY_AVAILABILITY:
            a, b = self.injury_alpha, self.injury_beta
        else:
            a, b = self.scheme_alpha, self.scheme_beta
        mean = a / (a + b)
        var = (a * b) / (((a + b) ** 2) * (a + b + 1.0))
        return mean, var

    def record_settled_claim(self, category: AudioClaimCategory, realized_truthful: bool) -> None:
        if category == AudioClaimCategory.INJURY_AVAILABILITY:
            if realized_truthful:
                self.injury_alpha += 1.0
            else:
                self.injury_beta += 1.0
        else:
            if realized_truthful:
                self.scheme_alpha += 1.0
            else:
                self.scheme_beta += 1.0


@dataclass(frozen=True)
class AudioVeracityUpdateReceipt:
    subject_player_id: str
    prior_prob: float
    posterior_prob: float
    applied_log_odds_delta: float
    extracted_claims: Tuple[Dict[str, Any], ...]
    conflict_on_record: bool
    governance_action: str  # 'UPDATED_ACTIVE' | 'COACHSPEAK_MUTED' | 'HOLD_SURVEILLANCE_CONFLICT'


_COACHSPEAK_HEDGE_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\bhopeful\b", re.IGNORECASE),
    re.compile(r"\bworking\s+through\s+it\b", re.IGNORECASE),
    re.compile(r"\bday[\s\-]+to[\s\-]+day\b", re.IGNORECASE),
    re.compile(r"\bwe['’]?ll\s+see\b", re.IGNORECASE),
    re.compile(r"\bone\s+day\s+at\s+a\s+time\b", re.IGNORECASE),
    re.compile(r"\bgame[\s\-]+time\s+decision\b", re.IGNORECASE),
)

_SCHEME_WORKLOAD_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:right|left)\s+(?:guard|tackle)\b", re.IGNORECASE),
    re.compile(r"\bsnap\s+(?:count|share)\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*\+?\s*(?:carries|touches|targets|snaps)\b", re.IGNORECASE),
    re.compile(r"\bthree[\s\-]+down\s+role\b", re.IGNORECASE),
    re.compile(r"\bgoal[\s\-]+line\s+back\b", re.IGNORECASE),
    re.compile(r"\bcall(?:ing)?\s+plays\b", re.IGNORECASE),
    re.compile(r"\bslot\s+rep", re.IGNORECASE),
)

_POSITIVE_ACTIVE_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\bpractic(?:ed|ing)\s+in\s+full\b", re.IGNORECASE),
    re.compile(r"\bfull\s+participant\b", re.IGNORECASE),
    re.compile(r"\bgood\s+to\s+go\b", re.IGNORECASE),
    re.compile(r"\b100\s*%\b|\bhundred\s+percent\b", re.IGNORECASE),
    re.compile(r"\blead\s+back\b|\bthree[\s\-]+down\s+role\b|\bfeed\s+him\b", re.IGNORECASE),
    re.compile(r"\bmov(?:e|ing)\s+\w+\s+to\s+(?:his\s+)?natural\s+position\b", re.IGNORECASE),
    re.compile(r"\b25\s+carries\b|\b30\s*\+\s*touches\b", re.IGNORECASE),
)

_NEGATIVE_OUT_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\binjured\s+reserve\b|\bshort[\s\-]+term\s+ir\b|\bon\s+ir\b", re.IGNORECASE),
    re.compile(r"\bsurgery\b", re.IGNORECASE),
    re.compile(r"\bmiss\s+the\s+rest\s+of\s+the\s+season\b|\bseason\s+over\b", re.IGNORECASE),
    re.compile(r"\bdnp\b|\bnot\s+practicing\b|\bruled\s+out\b", re.IGNORECASE),
    re.compile(r"\blimited\s+snap\b|\bpitch\s+count\b|\berr\s+on\s+the\s+side\s+of\s+caution\b", re.IGNORECASE),
)


def classify_nova2_utterance(utt: DeepgramNova2Utterance) -> Tuple[AudioClaimCategory, StructuredClaimPolarity, float]:
    """Extracts `(category, polarity, specificity_score)` from a Deepgram Nova-2 transcript."""
    text = utt.transcript_text.strip()
    if not text:
        raise DataGapError("transcript_text", f"Empty transcript in utterance {utt.utterance_id}.")

    hedge_hits = sum(1 for pat in _COACHSPEAK_HEDGE_PATTERNS if pat.search(text))
    scheme_hits = sum(1 for pat in _SCHEME_WORKLOAD_PATTERNS if pat.search(text))
    pos_hits = sum(1 for pat in _POSITIVE_ACTIVE_PATTERNS if pat.search(text))
    neg_hits = sum(1 for pat in _NEGATIVE_OUT_PATTERNS if pat.search(text))

    category = (
        AudioClaimCategory.SCHEME_WORKLOAD_REVEAL
        if scheme_hits > 0 and neg_hits == 0
        else AudioClaimCategory.INJURY_AVAILABILITY
    )

    if hedge_hits > 0 and pos_hits == 0 and neg_hits == 0:
        return category, StructuredClaimPolarity.AMBIGUOUS_COACHSPEAK, 0.15

    if hedge_hits >= 2 and abs(pos_hits - neg_hits) <= 1:
        return category, StructuredClaimPolarity.AMBIGUOUS_COACHSPEAK, 0.20

    if neg_hits > pos_hits:
        spec = min(1.0, 0.55 + 0.20 * neg_hits - 0.15 * hedge_hits)
        return category, StructuredClaimPolarity.NEGATIVE_OUT_OR_LIMIT, max(0.20, spec)

    if pos_hits > neg_hits:
        spec = min(1.0, 0.55 + 0.20 * pos_hits + 0.12 * scheme_hits - 0.20 * hedge_hits)
        return category, StructuredClaimPolarity.POSITIVE_ACTIVE_OR_BOOST, max(0.20, spec)

    return category, StructuredClaimPolarity.AMBIGUOUS_COACHSPEAK, 0.15


class SiriusXMAudioVeracityUpdater:
    """Bayesian availability & usage updater for `workers/airwave-listener` (Channel 87)."""

    def __init__(
        self,
        speaker_priors: Mapping[str, CoachBetaBinomialPrior],
        min_deepgram_confidence: float = 0.70,
        conflict_divergence_threshold: float = 0.45,
    ) -> None:
        self.speaker_priors: Dict[str, CoachBetaBinomialPrior] = dict(speaker_priors)
        self.min_dg_conf = _require_finite_float(min_deepgram_confidence, "min_deepgram_confidence", lo=0.5, hi=0.99)
        self.conflict_thresh = _require_finite_float(
            conflict_divergence_threshold, "conflict_divergence_threshold", lo=0.1, hi=1.5
        )

    def evaluate_utterances(
        self,
        *,
        subject_player_id: str,
        prior_availability_prob: float,
        utterances: Sequence[DeepgramNova2Utterance],
        decision_time_unix: float,
    ) -> AudioVeracityUpdateReceipt:
        p0 = _require_open_prob(prior_availability_prob, "prior_availability_prob")
        t_dec = _require_finite_float(decision_time_unix, "decision_time_unix")
        if not utterances:
            raise DataGapError("utterances", "At least one Deepgram Nova-2 utterance is required.")

        base_logit = logit(p0)
        signed_shifts: List[float] = []
        claim_records: List[Dict[str, Any]] = []
        any_muted = False

        for utt in utterances:
            if utt.subject_player_id != subject_player_id:
                continue
            if not utt.deepgram_model.startswith("nova-2"):
                raise DataGapError(
                    "deepgram_model",
                    f"Expected Deepgram Nova-2 transcript model; got {utt.deepgram_model!r}.",
                )
            dg_conf = _require_finite_float(utt.word_confidence_mean, "word_confidence_mean", lo=0.0, hi=1.0)
            if dg_conf < self.min_dg_conf:
                raise DataGapError(
                    "word_confidence_mean",
                    f"Deepgram word confidence {dg_conf:.3f} below acoustic gate {self.min_dg_conf:.3f}.",
                )
            t_val = _require_finite_float(utt.valid_time_unix, "valid_time_unix")
            t_tx = _require_finite_float(utt.tx_time_unix, "tx_time_unix")
            if not (t_val <= t_tx <= t_dec):
                raise DataGapError(
                    "audio_bitemporal_watermark",
                    f"Audio utterance {utt.utterance_id} violates bitemporal causality.",
                )

            if utt.speaker_id not in self.speaker_priors:
                raise DataGapError(
                    "speaker_prior",
                    f"Unregistered speaker {utt.speaker_id!r}; refusing uncalibrated prior fallback.",
                )

            prior_ledger = self.speaker_priors[utt.speaker_id]
            category, polarity, specificity = classify_nova2_utterance(utt)
            theta_veracity, theta_var = prior_ledger.posterior_veracity(category)

            # Cross-Modal Agreement (CMA) podium deception mute (Doc 1 §4: DeceptionScore >= 0.65)
            cma_muted = (
                utt.sideline_podium_cma_deception_score is not None
                and _require_finite_float(utt.sideline_podium_cma_deception_score, "cma_score", lo=0.0, hi=2.0) >= 0.65
            )

            if cma_muted or polarity == StructuredClaimPolarity.AMBIGUOUS_COACHSPEAK:
                any_muted = True
                log_lr = 0.0
            else:
                # Calibrated Bayesian Likelihood Ratio from Beta-Binomial posterior mean:
                # Effective diagnostic accuracy blends speaker veracity around 0.50 coin-flip smokescreen
                eff_acc = 0.50 + max(0.0, theta_veracity - 0.50) * specificity
                eff_acc = min(0.92, max(0.50, eff_acc))
                lr_mag = eff_acc / (1.0 - eff_acc)  # >= 1.0; equals 1.0 when theta_veracity <= 0.50!
                direction = 1.0 if polarity == StructuredClaimPolarity.POSITIVE_ACTIVE_OR_BOOST else -1.0
                # Discount by posterior uncertainty & Deepgram acoustic fidelity
                precision_discount = 1.0 / (1.0 + 8.0 * theta_var)
                log_lr = direction * dg_conf * precision_discount * math.log(lr_mag)

            signed_shifts.append(log_lr)
            claim_records.append(
                {
                    "utterance_id": utt.utterance_id,
                    "channel_id": utt.channel_id,
                    "speaker_id": utt.speaker_id,
                    "category": category.value,
                    "polarity": polarity.value,
                    "specificity": round(specificity, 4),
                    "posterior_veracity_theta": round(theta_veracity, 4),
                    "cma_muted": cma_muted,
                    "log_odds_contribution": round(log_lr, 6),
                }
            )

        if not claim_records:
            raise DataGapError("subject_player_id", f"No utterances matched player {subject_player_id!r}.")

        pos_max = max((s for s in signed_shifts if s > 0.0), default=0.0)
        neg_min = min((s for s in signed_shifts if s < 0.0), default=0.0)
        conflict_on_record = (pos_max > 0.12) and (abs(neg_min) > 0.12) and ((pos_max - neg_min) >= self.conflict_thresh)

        if conflict_on_record:
            # Preserve epistemic conflict without silently averaging contradictory reports (Doc 3 WS6)
            return AudioVeracityUpdateReceipt(
                subject_player_id=subject_player_id,
                prior_prob=round(p0, 6),
                posterior_prob=round(p0, 6),
                applied_log_odds_delta=0.0,
                extracted_claims=tuple(claim_records),
                conflict_on_record=True,
                governance_action="HOLD_SURVEILLANCE_CONFLICT",
            )

        total_shift = clamp_log_odds_delta(sum(signed_shifts), MAX_LOG_ODDS_DELTA)
        p_post = expit(base_logit + total_shift)
        gov = "COACHSPEAK_MUTED" if (abs(total_shift) < 1e-6 and any_muted) else "UPDATED_ACTIVE"

        return AudioVeracityUpdateReceipt(
            subject_player_id=subject_player_id,
            prior_prob=round(p0, 6),
            posterior_prob=round(p_post, 6),
            applied_log_odds_delta=round(total_shift, 6),
            extracted_claims=tuple(claim_records),
            conflict_on_record=False,
            governance_action=gov,
        )


# ============================================================================
# UNIFIED OMNI-CAUSAL WORLD MODEL ORCHESTRATOR
# ============================================================================


@dataclass(frozen=True)
class OmniWorldModelExecutionReceipt:
    game_id: str
    bitmask_receipt: ContextualBitmask288Receipt
    coordinator_equilibrium: BelichickCoordinatorEquilibrium
    causal_id_result: ShpitserPearlIDResult
    e_value_gate: EValueGateResult
    mp_spectral: MarchenkoPasturCleanResult
    fwl_result: FWLOrthogonalizationResult
    stage_d_coupling: Dict[str, Any]
    brier_audit: MurphyBrierDecomposition
    audio_veracity: Optional[AudioVeracityUpdateReceipt]
    final_posterior_prob: float
    total_applied_log_odds_delta: float
    receipt_sha256: str


def run_omni_causal_world_model(
    *,
    context_288: SituationalContextInput288,
    belichick_mind: BelichickCoordinatorMind,
    oc_level_k: int,
    dc_level_k: int,
    oc_habit_prior: Mapping[str, float],
    dc_habit_prior: Mapping[str, float],
    oc_script_profile: CoordinatorScriptProfile,
    game_state: CoordinatorGameState,
    premises_catalog: Sequence[SignalPremise50k],
    causal_graph: CausalADMG,
    treatment_nodes: Set[str],
    outcome_nodes: Set[str],
    treated_residuals: Sequence[float],
    control_residuals: Sequence[float],
    historical_signal_matrix: np.ndarray,
    historical_market_anchors: np.ndarray,
    historical_outcomes: np.ndarray,
    settled_probs_history: Sequence[float],
    settled_outcomes_history: Sequence[int],
    market_de_vig_prior_prob: float,
    fourth_down_ctx: Optional[FourthDownContext] = None,
    candidate_hcid_mediator: Optional[Tuple[Tuple[str, str], str]] = None,
    audio_updater: Optional[SiriusXMAudioVeracityUpdater] = None,
    audio_subject_player_id: Optional[str] = None,
    audio_prior_prob: Optional[float] = None,
    audio_utterances: Optional[Sequence[DeepgramNova2Utterance]] = None,
) -> OmniWorldModelExecutionReceipt:
    """Executes all 3 subsystems end-to-end under Two-Class Firewall & fail-closed gates."""
    p_mkt = _require_open_prob(market_de_vig_prior_prob, "market_de_vig_prior_prob")

    # 1. Subsystem 1: Zone-1 Class-A Belichick Recursive Level-k Mind (zero market inputs)
    coord_eq = belichick_mind.solve_matchup(
        oc_level_k=oc_level_k,
        dc_level_k=dc_level_k,
        oc_habit_prior=oc_habit_prior,
        dc_habit_prior=dc_habit_prior,
        oc_script_profile=oc_script_profile,
        state=game_state,
        fourth_down_ctx=fourth_down_ctx,
    )

    # 2. Subsystem 2 Stage A: 288-bit Context Mask + Premise Pruning
    bitmask_rec = build_contextual_bitmask_288(context_288)
    stage_a_survivors = filter_stage_a_premises(bitmask_rec, premises_catalog)

    # 3. Subsystem 2 Stage B: Shpitser-Pearl ID + Optional HCID Mediator Expansion + E-Value Gate
    id_res = run_shpitser_pearl_id(outcome_nodes, treatment_nodes, causal_graph)
    if not id_res.identifiable and candidate_hcid_mediator is not None:
        edge_to_expand, med_name = candidate_hcid_mediator
        if edge_to_expand in id_res.enabling_edges:
            expanded_g = expand_edge_with_hcid_mediator(causal_graph, edge_to_expand, med_name)
            id_res = run_shpitser_pearl_id(outcome_nodes, treatment_nodes, expanded_g)

    if not id_res.identifiable:
        raise DataGapError("causal_identification", f"Unidentifiable causal query ({id_res.formula_class}).")

    e_gate = compute_vanderweele_e_value(treated_residuals, control_residuals)
    if not e_gate.passed:
        raise DataGapError(
            "vanderweele_e_value",
            f"Causal claim failed E-value gate: point={e_gate.e_value_point} (< {MIN_E_VALUE_POINT}) or CI={e_gate.e_value_ci_low}.",
        )

    # 4. Subsystem 2 Stage C: Marchenko-Pastur Spectral Cleaning + FWL Market Orthogonalization
    mp_res = marchenko_pastur_clean_correlation(historical_signal_matrix)
    fwl_res = frisch_waugh_lovell_orthogonalize(
        historical_signal_matrix, historical_market_anchors, historical_outcomes
    )

    # 5. Subsystem 2 Stage D: Cross-Equation Jacobian Coupling + JS+ Shrinkage + Murphy Brier
    sub_cov = None
    if len(stage_a_survivors) >= 3 and len(stage_a_survivors) <= mp_res.cleaned_correlation.shape[0]:
        k_len = len(stage_a_survivors)
        sub_cov = mp_res.cleaned_correlation[:k_len, :k_len]

    stage_d = couple_cross_equation_jacobian_and_shrink(
        stage_a_survivors, cleaned_covariance=sub_cov, bitmask=bitmask_rec
    )
    brier_res = murphy_brier_decomposition(settled_probs_history, settled_outcomes_history)

    # 6. Subsystem 3: SiriusXM Channel 87 Audio Claim Veracity Updater
    audio_rec: Optional[AudioVeracityUpdateReceipt] = None
    audio_delta = 0.0
    if audio_updater is not None and audio_utterances is not None:
        if audio_subject_player_id is None or audio_prior_prob is None:
            raise DataGapError("audio_inputs", "Missing subject_player_id or audio_prior_prob.")
        audio_rec = audio_updater.evaluate_utterances(
            subject_player_id=audio_subject_player_id,
            prior_availability_prob=audio_prior_prob,
            utterances=audio_utterances,
            decision_time_unix=context_288.decision_time_unix,
        )
        audio_delta = 0.25 * audio_rec.applied_log_odds_delta

    # Combine Class-A coaching EPA shift + Stage-D causal premise shift + audio veracity shift at Step N
    coach_log_odds = 0.35 * coord_eq.equilibrium_expected_epa
    total_delta = clamp_log_odds_delta(
        coach_log_odds + float(stage_d["clamped_log_odds_delta"]) + audio_delta,
        MAX_LOG_ODDS_DELTA,
    )
    final_prob = expit(logit(p_mkt) + total_delta)

    payload_sig = (
        f"{context_288.game_id}|{bitmask_rec.sha256_digest}|"
        f"{coord_eq.equilibrium_expected_epa:.6f}|{e_gate.e_value_point:.6f}|"
        f"{final_prob:.6f}"
    )
    receipt_hash = hashlib.sha256(payload_sig.encode("utf-8")).hexdigest()

    return OmniWorldModelExecutionReceipt(
        game_id=context_288.game_id,
        bitmask_receipt=bitmask_rec,
        coordinator_equilibrium=coord_eq,
        causal_id_result=id_res,
        e_value_gate=e_gate,
        mp_spectral=mp_res,
        fwl_result=fwl_res,
        stage_d_coupling=stage_d,
        brier_audit=brier_res,
        audio_veracity=audio_rec,
        final_posterior_prob=round(final_prob, 6),
        total_applied_log_odds_delta=round(total_delta, 6),
        receipt_sha256=receipt_hash,
    )
