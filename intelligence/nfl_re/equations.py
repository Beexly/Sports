"""equations.py — reconstructed NFL contextual-analytics engines.

Provenance classes per function:
  [PAYLOAD] algebra recovered from observed Next Gen Stats payload semantics (exact).
  [GEO]     coordinate transform derived from play.absoluteYardlineNumber/airYards.
  [FITTED]  surface fitted by us against real payload ground truth (out/cp_fit2.json).
  [RECON]   structural reconstruction of a proprietary model (Ghost, HMM); parameters
            are calibrated, not recovered.

Artifact: app.738fbeb581d2c85cb721.js sha256
39ffdf25a2368ba33d403b6a4ff59e5242c6af9b8d87d8b1c8580aaf495c3d0f (offsets in binary_map.csv).
"""
from __future__ import annotations
import math

FIELD_LENGTH, FIELD_WIDTH = 120.0, 53.3

def catch_point(absolute_yardline: float, air_yards: float, direction: str,
                lateral_offset: float = 0.0) -> tuple[float, float]:
    """[GEO] Target -> (x, y) catch point. Offense moves toward 120 when direction=="right"."""
    sign = 1.0 if direction == "right" else -1.0
    x = min(max(absolute_yardline + sign * air_yards, 0.0), FIELD_LENGTH)
    y = min(max(FIELD_WIDTH / 2.0 + lateral_offset, 0.0), FIELD_WIDTH)
    return x, y

def separation_at_release(air_yards: float, cushion: float, closing_speed: float,
                          time_to_arrival: float | None = None) -> float:
    """[GEO] Separation realised at the catch point: cushion decayed by closing speed."""
    tta = time_to_arrival if time_to_arrival is not None else air_yards / 24.0
    return max(cushion - closing_speed * tta, 0.0)

# Calibrated so the density integrates to the defender count over the field: the shell
# sigma grows with depth, so the local-peak normalisation needs one global constant.
GHOST_NORM = 0.265


def _ghost_sigma(dist_to_los: float) -> tuple[float, float]:
    """[RECON] anisotropic defender dispersion (lateral > depth)."""
    return 3.1 + 0.245 * dist_to_los, 1.9 + 0.155 * dist_to_los

def ghost_density(x: float, y: float, los_x: float, defenders_per_side: int = 5,
                  mirror: bool = True) -> float:
    """[RECON] Baseline (ghost) defender density, defenders per sq yd, normalised to count."""
    dist = abs(x - los_x)
    sx, sy = _ghost_sigma(dist)
    norm = 1.0 / (2.0 * math.pi * sx * sy)
    p = math.exp(-0.5 * (((x - los_x) / sx) ** 2 + ((y - FIELD_WIDTH / 2.0) / sy) ** 2))
    if mirror:
        p += math.exp(-0.5 * (((x - los_x) / sx) ** 2
                              + ((y - FIELD_WIDTH / 2.0) / (sy * 2.2)) ** 2))
    n = defenders_per_side * (2 if mirror else 1)
    return GHOST_NORM * n * norm * p / (2.0 if mirror else 1.0)

def interception_probability(x: float, y: float, los_x: float,
                             closing_speed: float = 3.0, air_yards: float = 10.0) -> float:
    """[RECON] Baseline hazard that a ghost defender occupies the catch point."""
    dens = ghost_density(x, y, los_x)
    tta = air_yards / 24.0
    z = -2.35 + 1.35 * dens + 0.28 * closing_speed * tta
    return 1.0 / (1.0 + math.exp(-z))

_CP_FIT = dict(intercept=-1.0966, air=0.002867, air_sq=-0.00006004, ytg=-0.004395,
               yl=0.000528, sep=0.62, cushion=-0.031, closing=0.014)

def completion_probability(air_yards: float, yards_to_go: float, down: int,
                           absolute_yardline: float, separation: float | None = None,
                           cushion: float | None = None,
                           closing_speed: float | None = None) -> float:
    """[FITTED]+[RECON] Expected completion probability. Tracking covariates enter as logit shifts."""
    c = _CP_FIT
    air = min(max(air_yards, 0.0), 65.0)
    z = (c["intercept"] + c["air"] * air + c["air_sq"] * air * air
         + c["ytg"] * min(max(yards_to_go, 1), 30) + c["yl"] * absolute_yardline)
    if separation is not None:
        z += c["sep"] * separation
    if cushion is not None:
        z += c["cushion"] * min(cushion, 15.0)
    if closing_speed is not None:
        z += c["closing"] * closing_speed
    return float(min(max(1.0 / (1.0 + math.exp(-z)), 0.01), 0.99))

def cpoe(completions: float, attempts: float, expected_cp_sum: float) -> float:
    """[PAYLOAD] CPOE in percentage points; identity behind completionPercentageAboveExpectation."""
    return 100.0 * ((completions - expected_cp_sum) / attempts)

def expected_yards_after_catch(air_yards: float, separation: float, defender_density: float,
                               closing_speed: float = 3.0) -> float:
    """[RECON] Expected YAC from the catch-point state (matches direction of the payload field)."""
    reach = max(separation, 0.4) * (1.0 + 0.09 * air_yards)
    return max(reach - 0.85 * closing_speed / (1.0 + defender_density), 0.0)

def yacoe(yards_after_catch: float, expected_yards_after_catch_: float) -> float:
    """[PAYLOAD] YAC over expected (additive)."""
    return yards_after_catch - expected_yards_after_catch_

def expected_rush_yards(absolute_yardline: float, defenders_in_box: int,
                        yards_to_go: float, gap_width: float = 1.4) -> float:
    """[RECON] Expected rush yards from box density and leverage."""
    base = 3.05 - 0.235 * (defenders_in_box - 6) + 0.045 * yards_to_go
    goal_line = -0.8 if absolute_yardline > 94 else 0.0
    return max(base + goal_line * gap_width, -1.5)

def ryoe(rush_yards: float, expected_rush_yards_: float) -> float:
    """[PAYLOAD] Rush yards over expected (additive)."""
    return rush_yards - expected_rush_yards_

def decision_efficiency(chosen_cp: float, best_cp: float) -> float:
    """[RECON] DeepQB decision efficiency: chosen target cp / best available cp, 0..1."""
    return float(min(max(chosen_cp / best_cp, 0.0), 1.0)) if best_cp > 0 else 0.0

def optimal_target_rate(targeted_optimal: int, attempts: int) -> float:
    """[RECON] Share of throws to the highest-probability receiver."""
    return targeted_optimal / attempts if attempts else 0.0

EPA_BASIS_COEF = dict(intercept=0.0, down=-0.0041, dist=-0.0023, diff=0.00058,
                      secs=0.000041, down_x_dist=0.00012)

def epa_expected(down: int, yards_to_go: float, score_diff: float,
                 game_seconds_remaining: float, coef: dict | None = None) -> float:
    """[FITTED] Situational expectation of EPA on the residualisation basis."""
    c = coef or EPA_BASIS_COEF
    return (c["intercept"] + c["down"] * down + c["dist"] * yards_to_go
            + c["diff"] * score_diff + c["secs"] * game_seconds_remaining
            + c["down_x_dist"] * down * yards_to_go)

def epa_residual(epa: float, down: int, yards_to_go: float, score_diff: float,
                 game_seconds_remaining: float, coef: dict | None = None) -> float:
    """[FITTED] Context-adjusted EPA: the pure contextual residual."""
    return epa - epa_expected(down, yards_to_go, score_diff, game_seconds_remaining, coef)

HMM = dict(p_man_prior=0.5, mu_follow=1.05, sd_follow=0.42, mu_pass=0.28, sd_pass=0.34,
           p_stay_base=0.94, reaction_window=0.55, follow_threshold=0.65)

def motion_transition(dt: float, p_stay: float | None = None) -> float:
    """[RECON] Non-homogeneous stay probability; saturates once assignments lock."""
    ps = p_stay if p_stay is not None else HMM["p_stay_base"]
    return min(ps ** (max(dt, 1e-3) / HMM["reaction_window"]), 0.999)

def _emit(d: float, follow: int, state: str) -> float:
    mu, sd = (HMM["mu_follow"], HMM["sd_follow"]) if state == "man" else (HMM["mu_pass"], HMM["sd_pass"])
    p = math.exp(-0.5 * ((d - mu) / sd) ** 2) / (sd * math.sqrt(2 * math.pi))
    return p + (0.22 * p if state == "man" and follow else 0.0)

def hmm_coverage_decode(dx: float, dy: float, follow: int, dt: float,
                        prior_man: float | None = None) -> float:
    """[RECON] Posterior P(man) after a defender's reaction to pre-snap motion."""
    d = math.hypot(dx, dy)
    if d > HMM["follow_threshold"]:
        follow = 1
    pm = prior_man if prior_man is not None else HMM["p_man_prior"]
    ps = motion_transition(dt)
    pm_new = pm * ps + (1 - pm) * (1 - ps)
    denom = _emit(d, follow, "man") * pm_new + _emit(d, follow, "zone") * (1 - pm_new)
    return float(_emit(d, follow, "man") * pm_new / denom) if denom else pm_new

def coverage_responsibility(posterior_man: float, gap_crossed_yards: float) -> str:
    """[RECON] Categorical responsibility assignment used by charting tools."""
    if posterior_man >= 0.70:
        return "MAN_FOLLOW"
    if posterior_man <= 0.32 and gap_crossed_yards > 2.0:
        return "ZONE_PASS_OFF"
    if posterior_man <= 0.32:
        return "ZONE_SPOT_DROP"
    return "AMBIGUOUS"

def xpass(down: int, yards_to_go: float, score_diff: float, game_seconds_remaining: float) -> float:
    """[FITTED] Expected pass rate for the situation."""
    z = (-0.85 + 0.115 * min(yards_to_go, 25) - 0.30 * (down == 4)
         - 0.0011 * score_diff * (game_seconds_remaining < 900)
         + 0.55 * (down == 3 and yards_to_go > 6))
    return float(1.0 / (1.0 + math.exp(-z)))

def pass_over_expected(is_pass: int, down: int, yards_to_go: float, score_diff: float,
                       game_seconds_remaining: float) -> float:
    """[FITTED] xPass residual (positive = passed more than the situation predicts)."""
    return is_pass - xpass(down, yards_to_go, score_diff, game_seconds_remaining)

def within_play_expected_value(cp: float, air_yards: float, sep: float, density: float) -> float:
    """[RECON] Expected yards on the target given the defensive state."""
    yac_x = expected_yards_after_catch(air_yards, sep, density)
    return cp * (air_yards + yac_x) * (1.0 - min(density / 3.0, 0.30))

def positioning_residual(actual_sep: float, ghost_sep: float, standardise: float = 1.0) -> float:
    """[RECON] Ghosts positioning residual; negative = defence better than baseline."""
    return (actual_sep - ghost_sep) / standardise
