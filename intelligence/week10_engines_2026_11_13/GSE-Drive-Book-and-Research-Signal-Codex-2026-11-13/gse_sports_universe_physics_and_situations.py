"""
GSE + GSI Sports Universe Physics, Biomechanics, Scheme Geometry & Market Microstructure Codex
==============================================================================================

Executable, zero-external-dependency Python 3 signal producers operationalizing the physical,
atmospheric, biomechanical, computer-vision, causal-inference, football-strategy, and
market-microstructure laws across Garrett Baxley's Google Drive book & research paper library
for native use by every agent in the Beexly/Sports + Beexly/agent-bus + GSI fleet.

Doctrinal Enforcement (per `What I Was Still Missing` 1MLt5ZTM7lWZ8CqeyJMdOsj_FB4PZxxh4bbBdQPE1dy8
and `GSE and GSI Execution Plan` 1nV5L97GHg-u25LiKM-pnBiudxI2pG72tKnYUdYVqAcw):
1. Fail-Closed Inputs (`DataGapError`): Missing, None, NaN, Inf, or physically out-of-bounds
   inputs raise `DataGapError`. Never emit silent 0.5, synthetic rows, or league-mean fallbacks.
2. Bitemporal Point-in-Time Guard (`BitemporalLeakageError`): When `observed_at_epoch_ms` and
   `decision_timestamp_epoch_ms` are supplied, strictly enforces `observed_at <= decision_ts`.
3. Explicit Directional `home_sign` in {-1, +1} on every LIVE/DARK signal output, with
   `|delta_log_odds| <= 0.35` matching Stage D Jacobian shrinkage (`packages/mcp-equations-server`
   and `packages/verifier`).
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any, Literal, Mapping, Sequence

# ---------------------------------------------------------------------------
# Constants & Physical / Domain Boundaries
# ---------------------------------------------------------------------------

R_DRY_AIR_J_KG_K: float = 287.058       # Specific gas constant for dry air, J/(kg*K)
R_WATER_VAPOR_J_KG_K: float = 461.495   # Specific gas constant for water vapor, J/(kg*K)
EPSILON_MOLAR_RATIO: float = R_DRY_AIR_J_KG_K / R_WATER_VAPOR_J_KG_K  # ~0.62199 < 1 (vapor is lighter!)
ISO_SEA_LEVEL_RHO_KG_M3: float = 1.225  # Standard dry air at 15C, 1013.25 hPa
GRAVITY_M_S2: float = 9.80665
LAPSE_RATE_K_M: float = 0.0065
T0_SEA_LEVEL_K: float = 288.15
P0_SEA_LEVEL_HPA: float = 1013.25
MOLAR_MASS_DRY_AIR_KG_MOL: float = 0.0289652
UNIVERSAL_GAS_R_J_MOL_K: float = 8.314462618

NFL_BALL_MASS_KG: float = 0.415         # Official NFL game football (~14.6 oz)
NFL_BALL_AREA_M2: float = 0.0235        # Reference cross-sectional area of prolate spheroid
NFL_GOALPOST_HALF_WIDTH_YD: float = 18.5 / (2.0 * 3.0)  # 9.25 ft = 3.0833 yd
NFL_CROSSBAR_HEIGHT_M: float = 3.048    # 10.0 ft
YARDS_TO_METERS: float = 0.9144
MPH_TO_M_S: float = 0.44704

MAX_STAGE_D_ABS_LOG_ODDS: float = 0.35  # Cap enforced by @sports/verifier & Stage D router


class DataGapError(ValueError):
    """Raised on None, NaN, Inf, or out-of-range inputs (Iron Law #9 & #14: never fake 0.5)."""


class BitemporalLeakageError(ValueError):
    """Raised when observed_at_epoch_ms > decision_timestamp_epoch_ms (Warehouse.asof guard)."""


HomeSign = Literal[1, -1]
GateState = Literal["LIVE", "DARK", "DISABLED"]


@dataclass(frozen=True)
class SignalOutput:
    """Standardized, bridge-compatible signal emission across all 25 Beexly/Sports packages."""

    signal_id: str
    domain: str
    value: float
    home_sign: HomeSign
    delta_epa_per_play: float
    delta_points_game: float
    delta_log_odds: float
    gate: GateState
    target_monorepo_package: str
    source_drive_file_id: str
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StadiumVenueProfile:
    venue_id: str
    name: str
    city: str
    elevation_m: float
    is_indoor: bool
    latitude_deg: float
    longitude_deg: float


STADIUM_PSYCHROMETRICS_REGISTRY: dict[str, StadiumVenueProfile] = {
    "DEN": StadiumVenueProfile("DEN", "Empower Field at Mile High", "Denver", 1609.0, False, 39.7439, -105.0201),
    "MEX": StadiumVenueProfile("MEX", "Estadio Azteca", "Mexico City", 2200.0, False, 19.3029, -99.1505),
    "MUN": StadiumVenueProfile("MUN", "Allianz Arena", "Munich", 520.0, False, 48.2188, 11.6247),
    "MIA": StadiumVenueProfile("MIA", "Hard Rock Stadium", "Miami Gardens", 3.0, False, 25.9580, -80.2389),
    "GB": StadiumVenueProfile("GB", "Lambeau Field", "Green Bay", 195.0, False, 44.5013, -88.0622),
    "BUF": StadiumVenueProfile("BUF", "Highmark Stadium", "Orchard Park", 182.0, False, 42.7738, -78.7870),
    "KC": StadiumVenueProfile("KC", "GEHA Field at Arrowhead Stadium", "Kansas City", 250.0, False, 39.0489, -94.4839),
    "MIN": StadiumVenueProfile("MIN", "U.S. Bank Stadium", "Minneapolis", 256.0, True, 44.9736, -93.2575),
    "DET": StadiumVenueProfile("DET", "Ford Field", "Detroit", 183.0, True, 42.3400, -83.0456),
    "SEA": StadiumVenueProfile("SEA", "Lumen Field", "Seattle", 4.0, False, 47.5952, -122.3316),
}


# ---------------------------------------------------------------------------
# Validation & Clamp Helpers
# ---------------------------------------------------------------------------

def _require_finite(name: str, val: Any, lo: float | None = None, hi: float | None = None) -> float:
    if val is None or isinstance(val, bool):
        raise DataGapError(f"Missing or boolean input for '{name}': got {val!r}")
    try:
        fval = float(val)
    except (TypeError, ValueError) as exc:
        raise DataGapError(f"Non-numeric input for '{name}': got {val!r}") from exc
    if not math.isfinite(fval):
        raise DataGapError(f"Non-finite input for '{name}': got {fval!r}")
    if lo is not None and fval < lo:
        raise DataGapError(f"Input '{name}'={fval} below physical minimum {lo}")
    if hi is not None and fval > hi:
        raise DataGapError(f"Input '{name}'={fval} above physical maximum {hi}")
    return fval


def enforce_bitemporal_asof(
    observed_at_epoch_ms: int | float | None,
    decision_timestamp_epoch_ms: int | float | None,
) -> None:
    """Enforces Warehouse.asof(t) point-in-time non-leakage invariant."""
    if observed_at_epoch_ms is None and decision_timestamp_epoch_ms is None:
        return
    obs = _require_finite("observed_at_epoch_ms", observed_at_epoch_ms, 0.0)
    dec = _require_finite("decision_timestamp_epoch_ms", decision_timestamp_epoch_ms, 0.0)
    if obs > dec:
        raise BitemporalLeakageError(
            f"Bitemporal violation: observed_at_epoch_ms ({obs:.0f}) > decision_timestamp_epoch_ms ({dec:.0f})"
        )


def _clamp_log_odds(delta_log_odds: float) -> float:
    return max(-MAX_STAGE_D_ABS_LOG_ODDS, min(MAX_STAGE_D_ABS_LOG_ODDS, delta_log_odds))


def _resolve_home_sign(signed_home_delta: float, fallback_home_focus: bool = True) -> HomeSign:
    if signed_home_delta > 0.0:
        return 1
    if signed_home_delta < 0.0:
        return -1
    return 1 if fallback_home_focus else -1


def _sigmoid(z: float) -> float:
    if z >= 0:
        ez = math.exp(-z)
        return 1.0 / (1.0 + ez)
    ez = math.exp(z)
    return ez / (1.0 + ez)


# ===========================================================================
# 1. STADIUM PSYCHROMETRICS & 3D BALLISTICS
# ===========================================================================

def barometric_pressure_at_altitude_hpa(elevation_m: float) -> float:
    """
    Tropospheric barometric formula P(h) in hPa.
    High-altitude venues: Denver (1609m -> ~834.3 hPa), Mexico City (2200m -> ~775.4 hPa),
    Munich (520m -> ~952.1 hPa).
    """
    h = _require_finite("elevation_m", elevation_m, -100.0, 5500.0)
    exponent = (GRAVITY_M_S2 * MOLAR_MASS_DRY_AIR_KG_MOL) / (UNIVERSAL_GAS_R_J_MOL_K * LAPSE_RATE_K_M)
    return P0_SEA_LEVEL_HPA * ((1.0 - (LAPSE_RATE_K_M * h) / T0_SEA_LEVEL_K) ** exponent)


def magnus_saturation_vapor_pressure_hpa(temp_c: float) -> float:
    """Magnus-Tetens saturation vapor pressure e_s(T_c) in hPa."""
    tc = _require_finite("temp_c", temp_c, -45.0, 60.0)
    return 6.1078 * math.exp((17.27 * tc) / (tc + 237.3))


def humid_air_density_kg_m3(
    temp_c: float,
    pressure_hpa: float,
    rel_humidity_pct: float,
) -> float:
    """
    Humid-air psychrometric density rho(T, P, RH) in kg/m^3 via Dalton's law + Ideal Gas Law.

    Physical Law: Water vapor (M_v = 18.016 g/mol) is lighter than dry N2/O2 air
    (M_d = 28.965 g/mol). Replacing dry-air molecules with H2O molecules at fixed (T, P)
    strictly REDUCES air density: d(rho)/d(RH) < 0!
    """
    tc = _require_finite("temp_c", temp_c, -45.0, 60.0)
    p_hpa = _require_finite("pressure_hpa", pressure_hpa, 600.0, 1100.0)
    rh = _require_finite("rel_humidity_pct", rel_humidity_pct, 0.0, 100.0)

    t_k = tc + 273.15
    e_sat_hpa = magnus_saturation_vapor_pressure_hpa(tc)
    p_vapor_pa = (rh / 100.0) * e_sat_hpa * 100.0
    p_total_pa = p_hpa * 100.0
    if p_vapor_pa >= p_total_pa:
        raise DataGapError("Vapor pressure cannot equal or exceed total barometric pressure")
    p_dry_pa = p_total_pa - p_vapor_pa
    return (p_dry_pa / (R_DRY_AIR_J_KG_K * t_k)) + (p_vapor_pa / (R_WATER_VAPOR_J_KG_K * t_k))


def stull_wet_bulb_temp_c(temp_c: float, rel_humidity_pct: float) -> float:
    """Stull (2011) closed-form psychrometric wet-bulb temperature Twb in Celsius."""
    tc = _require_finite("temp_c", temp_c, -40.0, 55.0)
    rh = _require_finite("rel_humidity_pct", rel_humidity_pct, 1.0, 100.0)
    return (
        tc * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(tc + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )


@dataclass(frozen=True)
class BallisticTrajectoryResult:
    carry_yards: float
    lateral_drift_yards: float
    hang_time_s: float
    apex_height_m: float
    air_density_kg_m3: float
    drag_reduction_pct_vs_iso: float
    clears_crossbar: bool
    within_uprights: bool


def simulate_3d_ballistics(
    launch_speed_mph: float,
    launch_angle_deg: float,
    temp_c: float,
    elevation_m: float = 0.0,
    rel_humidity_pct: float = 50.0,
    wind_speed_mph: float = 0.0,
    wind_Azimuth_rel_deg: float = 90.0,
    mode: Literal["field_goal", "deep_pass"] = "field_goal",
    target_distance_yards: float = 52.0,
    is_indoor: bool = False,
) -> BallisticTrajectoryResult:
    """
    RK4 3D projectile integrator with quadratic humid-air drag and 3D wind vector.
    - `wind_Azimuth_rel_deg`: 0 = pure tailwind (+x), 90 = pure right-to-left crosswind (+y),
      180 = pure headwind (-x).
    - `is_indoor=True` overrides ambient temp/wind to neutral 22.2C (72F), 45% RH, 0 mph wind
      while preserving stadium elevation pressure (e.g., indoor domes at elevation).
    """
    v0_mph = _require_finite("launch_speed_mph", launch_speed_mph, 15.0, 95.0)
    theta_deg = _require_finite("launch_angle_deg", launch_angle_deg, 5.0, 75.0)
    tc = 22.2 if is_indoor else _require_finite("temp_c", temp_c, -40.0, 55.0)
    elev = _require_finite("elevation_m", elevation_m, -50.0, 3500.0)
    rh = 45.0 if is_indoor else _require_finite("rel_humidity_pct", rel_humidity_pct, 0.0, 100.0)
    w_mph = 0.0 if is_indoor else _require_finite("wind_speed_mph", wind_speed_mph, 0.0, 65.0)
    w_deg = _require_finite("wind_Azimuth_rel_deg", wind_Azimuth_rel_deg, -360.0, 360.0)
    target_yd = _require_finite("target_distance_yards", target_distance_yards, 10.0, 85.0)

    p_hpa = barometric_pressure_at_altitude_hpa(elev)
    rho = humid_air_density_kg_m3(tc, p_hpa, rh)
    drag_red_pct = 100.0 * (1.0 - rho / ISO_SEA_LEVEL_RHO_KG_M3)

    # Tumbling end-over-end FG kick has higher drag C_d (~0.36) than tight gyro-spiral pass (~0.20)
    cd = 0.36 if mode == "field_goal" else 0.20
    cl_lift = 0.025 if mode == "field_goal" else 0.015

    v0 = v0_mph * MPH_TO_M_S
    theta = math.radians(theta_deg)
    w_rad = math.radians(w_deg)
    wx = (w_mph * MPH_TO_M_S) * math.cos(w_rad)
    wy = (w_mph * MPH_TO_M_S) * math.sin(w_rad)

    x, y, z = 0.0, 0.0, (0.05 if mode == "field_goal" else 1.95)
    vx = v0 * math.cos(theta)
    vy = 0.0
    vz = v0 * math.sin(theta)

    k_drag = 0.5 * rho * cd * NFL_BALL_AREA_M2 / NFL_BALL_MASS_KG
    k_lift = 0.5 * rho * cl_lift * NFL_BALL_AREA_M2 / NFL_BALL_MASS_KG

    def accel(vx_: float, vy_: float, vz_: float) -> tuple[float, float, float]:
        rvx = vx_ - wx
        rvy = vy_ - wy
        rvz = vz_
        speed_rel = math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz)
        if speed_rel < 1e-8:
            return 0.0, 0.0, -GRAVITY_M_S2
        ax_ = -k_drag * speed_rel * rvx
        ay_ = -k_drag * speed_rel * rvy
        horiz_rel = math.hypot(rvx, rvy)
        az_ = -GRAVITY_M_S2 - k_drag * speed_rel * rvz + k_lift * speed_rel * horiz_rel
        return ax_, ay_, az_

    dt = 0.005
    t = 0.0
    apex_m = z
    target_x_m = target_yd * YARDS_TO_METERS
    z_at_target: float | None = None
    y_at_target: float | None = None

    for _ in range(2400):
        prev_x, prev_y, prev_z, prev_t = x, y, z, t
        ax1, ay1, az1 = accel(vx, vy, vz)

        vx2, vy2, vz2 = vx + 0.5 * dt * ax1, vy + 0.5 * dt * ay1, vz + 0.5 * dt * az1
        ax2, ay2, az2 = accel(vx2, vy2, vz2)

        vx3, vy3, vz3 = vx + 0.5 * dt * ax2, vy + 0.5 * dt * ay2, vz + 0.5 * dt * az2
        ax3, ay3, az3 = accel(vx3, vy3, vz3)

        vx4, vy4, vz4 = vx + dt * ax3, vy + dt * ay3, vz + dt * az3
        ax4, ay4, az4 = accel(vx4, vy4, vz4)

        x += (dt / 6.0) * (vx + 2.0 * vx2 + 2.0 * vx3 + vx4)
        y += (dt / 6.0) * (vy + 2.0 * vy2 + 2.0 * vy3 + vy4)
        z += (dt / 6.0) * (vz + 2.0 * vz2 + 2.0 * vz3 + vz4)
        vx += (dt / 6.0) * (ax1 + 2.0 * ax2 + 2.0 * ax3 + ax4)
        vy += (dt / 6.0) * (ay1 + 2.0 * ay2 + 2.0 * ay3 + ay4)
        vz += (dt / 6.0) * (az1 + 2.0 * az2 + 2.0 * az3 + az4)
        t += dt
        if z > apex_m:
            apex_m = z

        if z_at_target is None and prev_x <= target_x_m <= x and x > prev_x:
            frac = (target_x_m - prev_x) / (x - prev_x)
            z_at_target = prev_z + frac * (z - prev_z)
            y_at_target = prev_y + frac * (y - prev_y)

        if t > 0.15 and z <= 0.0:
            frac = prev_z / (prev_z - z) if (prev_z - z) > 1e-9 else 0.0
            x = prev_x + frac * (x - prev_x)
            y = prev_y + frac * (y - prev_y)
            t = prev_t + frac * dt
            break

    carry_yd = x / YARDS_TO_METERS
    drift_yd = (y_at_target if y_at_target is not None else y) / YARDS_TO_METERS
    clears = bool(z_at_target is not None and z_at_target >= NFL_CROSSBAR_HEIGHT_M)
    uprights = bool(clears and abs(drift_yd) <= NFL_GOALPOST_HALF_WIDTH_YD)

    return BallisticTrajectoryResult(
        carry_yards=carry_yd,
        lateral_drift_yards=drift_yd,
        hang_time_s=t,
        apex_height_m=apex_m,
        air_density_kg_m3=rho,
        drag_reduction_pct_vs_iso=drag_red_pct,
        clears_crossbar=clears,
        within_uprights=uprights,
    )


def wet_bulb_cold_grip_fumble_and_fg_adjustment(
    kick_distance_yards: float,
    temp_f: float,
    rel_humidity_pct: float,
    wind_speed_mph: float,
    crosswind_angle_deg: float = 90.0,
    precip_in_hr: float = 0.0,
    elevation_m: float = 0.0,
    is_indoor: bool = False,
    home_kicker_dome_specialist: bool = False,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Couples psychrometric air density, Stull wet-bulb temperature, cold leather compliance
    (<40F), surface moisture film, and 3D crosswind drift into:
      1) `fg_make_prob`: calibrated NFL FG make probability (incorporating M2 Splits+ dome
         85.4% vs outdoor 84.4% baseline + altitude carry bonus + crosswind angular penalty),
      2) `fumble_rate_multiplier`: cold/wet leather grip hazard multiplier (>= 1.0).
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    dist_yd = _require_finite("kick_distance_yards", kick_distance_yards, 18.0, 72.0)
    tf = 72.0 if is_indoor else _require_finite("temp_f", temp_f, -25.0, 120.0)
    rh = 45.0 if is_indoor else _require_finite("rel_humidity_pct", rel_humidity_pct, 1.0, 100.0)
    w_mph = 0.0 if is_indoor else _require_finite("wind_speed_mph", wind_speed_mph, 0.0, 65.0)
    cw_deg = _require_finite("crosswind_angle_deg", crosswind_angle_deg, -360.0, 360.0)
    precip = 0.0 if is_indoor else _require_finite("precip_in_hr", precip_in_hr, 0.0, 5.0)
    elev = _require_finite("elevation_m", elevation_m, -50.0, 3500.0)

    tc = (tf - 32.0) * (5.0 / 9.0)
    p_hpa = barometric_pressure_at_altitude_hpa(elev)
    rho = humid_air_density_kg_m3(tc, p_hpa, rh)
    twb_c = stull_wet_bulb_temp_c(tc, rh)

    traj = simulate_3d_ballistics(
        launch_speed_mph=67.0,
        launch_angle_deg=44.0,
        temp_c=tc,
        elevation_m=elev,
        rel_humidity_pct=rh,
        wind_speed_mph=w_mph,
        wind_Azimuth_rel_deg=cw_deg,
        mode="field_goal",
        target_distance_yards=dist_yd,
        is_indoor=is_indoor,
    )
    iso_traj = simulate_3d_ballistics(
        launch_speed_mph=67.0,
        launch_angle_deg=44.0,
        temp_c=15.0,
        elevation_m=0.0,
        rel_humidity_pct=0.0,
        wind_speed_mph=0.0,
        wind_Azimuth_rel_deg=0.0,
        mode="field_goal",
        target_distance_yards=dist_yd,
        is_indoor=False,
    )
    carry_bonus_yd = traj.carry_yards - iso_traj.carry_yards

    cold_deg_below_40 = max(0.0, 40.0 - tf)
    cold_distance_tax_yd = 0.11 * cold_deg_below_40
    wet_plant_foot_tax_yd = 2.8 * min(1.0, precip / 0.25)

    effective_dist_yd = dist_yd - 0.65 * carry_bonus_yd + cold_distance_tax_yd + wet_plant_foot_tax_yd
    crosswind_drift_ratio = abs(traj.lateral_drift_yards) / NFL_GOALPOST_HALF_WIDTH_YD
    dome_logit_bonus = 0.14 if is_indoor else 0.0
    if is_indoor and home_kicker_dome_specialist:
        dome_logit_bonus += 0.12

    fg_logit = 4.65 - 0.072 * effective_dist_yd - 0.85 * (crosswind_drift_ratio ** 1.35) + dome_logit_bonus
    fg_make_prob = _sigmoid(fg_logit)
    neutral_fg_prob = _sigmoid(4.65 - 0.072 * dist_yd)

    cold_grip_term = 0.012 * max(0.0, 2.0 - twb_c)
    moisture_grip_term = 0.42 * (1.0 - math.exp(-3.0 * precip))
    fumble_mult = 1.0 + cold_grip_term + moisture_grip_term

    fg_epa_delta = 3.0 * (fg_make_prob - neutral_fg_prob)
    fumble_epa_penalty = -4.2 * 0.011 * (fumble_mult - 1.0)
    net_epa_per_play = (fg_epa_delta * 3.6 / 128.0) + fumble_epa_penalty
    delta_pts = net_epa_per_play * 64.0
    delta_lo = _clamp_log_odds(delta_pts * 0.055)

    return SignalOutput(
        signal_id="nfl_psychrometric_ballistics_and_grip_Composite",
        domain="physics_psychrometrics_ballistics",
        value=fg_make_prob,
        home_sign=_resolve_home_sign(delta_pts),
        delta_epa_per_play=net_epa_per_play,
        delta_points_game=delta_pts,
        delta_log_odds=delta_lo,
        gate="LIVE",
        target_monorepo_package="packages/prediction-engine",
        source_drive_file_id="1K9PWaAfqBmPVgClXg_rFrHXRoJPafwmS",
        metadata={
            "air_density_kg_m3": round(rho, 6),
            "wet_bulb_c": round(twb_c, 3),
            "carry_bonus_yards": round(carry_bonus_yd, 3),
            "lateral_drift_yards": round(traj.lateral_drift_yards, 3),
            "effective_fg_distance_yards": round(effective_dist_yd, 3),
            "fg_make_prob": round(fg_make_prob, 5),
            "neutral_fg_prob": round(neutral_fg_prob, 5),
            "fumble_rate_multiplier": round(fumble_mult, 4),
            "drag_reduction_pct_vs_iso": round(traj.drag_reduction_pct_vs_iso, 3),
        },
    )


# ===========================================================================
# 2. TRENCH & POCKET PHYSICS (Ben 2025 CLIPP, Seth 2023 Expected Sack, Lee 2026 La Pausa)
# ===========================================================================

ProtectionScheme = Literal[
    "5_0_bob",
    "full_slide_left",
    "full_slide_right",
    "half_slide_left",
    "half_slide_right",
    "play_action_max",
]


@dataclass(frozen=True)
class PocketSurvivalResult:
    eval_time_s: float
    joint_weak_link_survival: float
    strong_link_parallel_survival: float
    per_blocker_survival: tuple[float, float, float, float, float]
    weakest_lineman_index: int
    weak_link_nonlinear_penalty: float
    expected_pocket_time_s: float


def ol_pass_block_survival_hazard(
    ol_pass_block_grades: Sequence[float],
    rusher_prwr_rates: Sequence[float],
    protection_scheme: ProtectionScheme = "half_slide_left",
    eval_time_s: float = 2.70,
    stunt_twist_active: bool = False,
) -> PocketSurvivalResult:
    """
    Weak-link series Weibull pass-block pocket survival S_pocket(t) = prod_{i=1}^5 S_i(t).
    Positions ordered: [0: LT, 1: LG, 2: C, 3: RG, 4: RT].
    Calibrated so a ~75-grade NFL OL yields ~89%-91% per-lineman PBWR at 2.5s (~58%-63%
    clean 5-man pocket at 2.5s), while a single <45-grade weak link collapses S_pocket(t) nonlinearly!
    """
    if len(ol_pass_block_grades) != 5 or len(rusher_prwr_rates) != 5:
        raise DataGapError("Exactly 5 OL pass-block grades and 5 rusher PRWR rates [LT, LG, C, RG, RT] are required")
    t = _require_finite("eval_time_s", eval_time_s, 0.25, 8.0)

    grades = [_require_finite(f"ol_grade[{i}]", g, 1.0, 100.0) for i, g in enumerate(ol_pass_block_grades)]
    prwrs = [_require_finite(f"rusher_prwr[{i}]", r, 0.0, 0.75) for i, r in enumerate(rusher_prwr_rates)]

    # Per-lineman Weibull scale calibrated to NFL NGS ~90% individual PBWR at 2.5s; interior A/B gaps shorter than OT arcs
    base_scale_s = [6.15, 5.65, 5.85, 5.65, 6.15]
    weibull_shape_k = 2.75

    slide_help = [0.0, 0.0, 0.0, 0.0, 0.0]
    if protection_scheme == "half_slide_left":
        slide_help = [0.18, 0.24, 0.22, -0.04, -0.06]
    elif protection_scheme == "half_slide_right":
        slide_help = [-0.06, -0.04, 0.22, 0.24, 0.18]
    elif protection_scheme == "full_slide_left":
        slide_help = [0.22, 0.22, 0.20, 0.16, -0.18]
    elif protection_scheme == "full_slide_right":
        slide_help = [-0.18, 0.16, 0.20, 0.22, 0.22]
    elif protection_scheme == "play_action_max":
        slide_help = [0.25, 0.24, 0.24, 0.24, 0.25]
    elif protection_scheme != "5_0_bob":
        raise DataGapError(f"Unsupported protection_scheme: {protection_scheme!r}")

    stunt_mult = 1.0
    if stunt_twist_active:
        stunt_mult = 1.42 if protection_scheme == "5_0_bob" else 1.10

    indiv_survivals: list[float] = []
    cum_hazards: list[float] = []
    for i in range(5):
        skill_z = (grades[i] - 72.0) / 13.0
        rusher_z = (prwrs[i] - 0.14) / 0.08
        hazard_mult = math.exp(-0.58 * skill_z + 0.40 * rusher_z - slide_help[i]) * stunt_mult
        h_i = ((t / base_scale_s[i]) ** weibull_shape_k) * hazard_mult
        cum_hazards.append(h_i)
        indiv_survivals.append(math.exp(-h_i))

    joint_weak = 1.0
    unbeaten_comp = 1.0
    for s_i in indiv_survivals:
        joint_weak *= s_i
        unbeaten_comp *= (1.0 - s_i)
    strong_link = 1.0 - unbeaten_comp

    mean_grade = sum(grades) / 5.0
    homog_hazard = 0.0
    for i in range(5):
        skill_z_m = (mean_grade - 72.0) / 13.0
        rusher_z = (prwrs[i] - 0.14) / 0.08
        hm = math.exp(-0.58 * skill_z_m + 0.40 * rusher_z - slide_help[i]) * stunt_mult
        homog_hazard += ((t / base_scale_s[i]) ** weibull_shape_k) * hm
    homog_surv = math.exp(-homog_hazard)
    weak_link_penalty = homog_surv - joint_weak

    c_coeff = sum(cum_hazards) / (t ** weibull_shape_k)
    expected_t = (c_coeff ** (-1.0 / weibull_shape_k)) * math.gamma(1.0 + 1.0 / weibull_shape_k)
    weakest_idx = min(range(5), key=lambda idx: indiv_survivals[idx])

    return PocketSurvivalResult(
        eval_time_s=t,
        joint_weak_link_survival=joint_weak,
        strong_link_parallel_survival=strong_link,
        per_blocker_survival=(
            indiv_survivals[0],
            indiv_survivals[1],
            indiv_survivals[2],
            indiv_survivals[3],
            indiv_survivals[4],
        ),
        weakest_lineman_index=weakest_idx,
        weak_link_nonlinear_penalty=weak_link_penalty,
        expected_pocket_time_s=expected_t,
    )


def clipp_doubly_robust_cate(
    treatments_pressure_allowed: Sequence[int],
    outcomes_completed_pass: Sequence[int],
    propensity_scores: Sequence[float],
    mu1_hat_completion_under_pressure: Sequence[float],
    mu0_hat_completion_clean: Sequence[float],
    positivity_eps: float = 0.02,
) -> dict[str, float]:
    """
    Doubly Robust CATE estimator from `Ben 2025 - CLIPP: CausaL Impact of Offensive Linemen on Pass Plays`
    (`1QbEhB9XEInJm-I13IuUX8NpbY-fYLTtg`).
    """
    n = len(treatments_pressure_allowed)
    if n == 0 or not (
        len(outcomes_completed_pass) == len(propensity_scores) == len(mu1_hat_completion_under_pressure) == len(mu0_hat_completion_clean) == n
    ):
        raise DataGapError("CLIPP DR inputs must be non-empty sequences of equal length")
    eps = _require_finite("positivity_eps", positivity_eps, 1e-4, 0.25)

    pseudo_outcomes: list[float] = []
    for i in range(n):
        t_i = int(_require_finite(f"T[{i}]", treatments_pressure_allowed[i], 0.0, 1.0))
        y_i = _require_finite(f"Y[{i}]", outcomes_completed_pass[i], 0.0, 1.0)
        e_i = _require_finite(f"e[{i}]", propensity_scores[i], eps, 1.0 - eps)
        m1 = _require_finite(f"mu1[{i}]", mu1_hat_completion_under_pressure[i], 0.0, 1.0)
        m0 = _require_finite(f"mu0[{i}]", mu0_hat_completion_clean[i], 0.0, 1.0)
        if t_i not in (0, 1):
            raise DataGapError(f"Binary treatment required at index {i}, got {treatments_pressure_allowed[i]}")
        psi_i = (m1 - m0) + (t_i * (y_i - m1)) / e_i - ((1 - t_i) * (y_i - m0)) / (1.0 - e_i)
        pseudo_outcomes.append(psi_i)

    cate = sum(pseudo_outcomes) / n
    variance = sum((p - cate) ** 2 for p in pseudo_outcomes) / max(1, n - 1)
    se = math.sqrt(variance / n)
    return {
        "cate_completion_prob_delta": cate,
        "std_error": se,
        "ci95_low": cate - 1.96 * se,
        "ci95_high": cate + 1.96 * se,
        "sample_count": float(n),
    }


DefenderAlignmentRole = Literal[
    "EDGE_34_OLB",
    "DE_43",
    "IDL_3T",
    "MUGGED_ILB",
    "SAFETY_CREEPER",
    "CORNER_BLITZ",
]


def seth_expected_sack_probability(
    pre_snap_distance_to_qb_yd: float,
    lateral_offset_yd: float,
    alignment_role: DefenderAlignmentRole,
    yards_to_go: float = 8.0,
    extra_rushers_over_blockers: int = 0,
) -> float:
    """
    Pre-snap Expected Sack Probability per rusher operationalizing `Seth 2023`
    (`1DrwKA1Npcng_ZHMZX9p77yfXZ5gYBItU`).
    """
    dist = _require_finite("pre_snap_distance_to_qb_yd", pre_snap_distance_to_qb_yd, 1.0, 25.0)
    lat = _require_finite("lateral_offset_yd", lateral_offset_yd, 0.0, 26.7)
    ytg = _require_finite("yards_to_go", yards_to_go, 0.5, 40.0)
    overload = _require_finite("extra_rushers_over_blockers", extra_rushers_over_blockers, -3.0, 4.0)

    role_logits: dict[str, float] = {
        "EDGE_34_OLB": 0.42,
        "DE_43": 0.31,
        "IDL_3T": 0.15,
        "MUGGED_ILB": 0.08,
        "SAFETY_CREEPER": -0.18,
        "CORNER_BLITZ": -0.62,
    }
    if alignment_role not in role_logits:
        raise DataGapError(f"Unknown alignment_role: {alignment_role!r}")

    logit = (
        -2.55
        - 0.24 * (dist - 5.5)
        - 0.045 * max(0.0, lat - 4.5)
        + role_logits[alignment_role]
        + 0.045 * min(12.0, ytg - 5.0)
        + 0.48 * max(0.0, overload)
    )
    return _sigmoid(logit)


RouteTimingProfile = Literal["quick_stick", "shanahan_levels_pa", "deep_dagger", "scramble_extend"]


def la_pausa_optimal_release_timing(
    ol_pass_block_grades: Sequence[float],
    rusher_prwr_rates: Sequence[float],
    actual_release_time_s: float,
    route_profile: RouteTimingProfile = "shanahan_levels_pa",
    protection_scheme: ProtectionScheme = "half_slide_left",
    spatial_target_efficiency: float = 0.92,
    qb_pocket_climb_iq: float = 0.70,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Operationalizes `2026 - Valuing La Pausa: Quantifying Optimal Pass Timing Beyond Speed - Lee et al.`
    (`1MbnVOLZfc5ajmKV2gs5VPFVdyB3dE78T`) fused with NFL pocket survival & sack cliff physics.
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    t_rel = _require_finite("actual_release_time_s", actual_release_time_s, 1.30, 5.50)
    spat_eff = _require_finite("spatial_target_efficiency", spatial_target_efficiency, 0.0, 1.0)
    climb_iq = _require_finite("qb_pocket_climb_iq", qb_pocket_climb_iq, 0.0, 1.0)

    route_params: dict[str, tuple[float, float, float]] = {
        "quick_stick": (0.20, 1.85, 3.8),
        "shanahan_levels_pa": (0.52, 2.50, 3.4),
        "deep_dagger": (0.66, 2.85, 3.0),
        "scramble_extend": (0.56, 3.05, 2.5),
    }
    if route_profile not in route_params:
        raise DataGapError(f"Unsupported route_profile: {route_profile!r}")
    v_ceil, t_inflect, k_steep = route_params[route_profile]

    def expected_epa_at(t_cand: float, eff: float = 1.0) -> tuple[float, float]:
        surv = ol_pass_block_survival_hazard(
            ol_pass_block_grades, rusher_prwr_rates, protection_scheme=protection_scheme, eval_time_s=t_cand
        ).joint_weak_link_survival
        surv_adj = min(0.995, surv ** (1.0 - 0.22 * climb_iq))
        late_window_decay = math.exp(-0.22 * max(0.0, t_cand - (t_inflect + 0.75)) ** 2)
        v_clean = (-0.08 + (v_ceil + 0.08) * _sigmoid(k_steep * (t_cand - t_inflect))) * late_window_decay * eff

        p_sack_given_pressure = _sigmoid(-1.35 + 1.65 * (t_cand - 2.95) - 0.65 * climb_iq)
        epa_sack = -1.85
        epa_pressured_throw = -0.28 + 0.22 * climb_iq
        v_pressured = p_sack_given_pressure * epa_sack + (1.0 - p_sack_given_pressure) * epa_pressured_throw
        total_j = surv_adj * v_clean + (1.0 - surv_adj) * v_pressured
        return total_j, surv_adj

    best_t = 1.50
    best_j = -999.0
    cliff_t = 3.25
    max_marginal_drop = 0.0
    prev_j, _ = expected_epa_at(1.50, 1.0)
    for step in range(1, 151):
        tc = 1.50 + 0.02 * step
        jc, _ = expected_epa_at(tc, 1.0)
        if jc > best_j:
            best_j = jc
            best_t = tc
        drop_rate = (prev_j - jc) / 0.02
        if tc > best_t and drop_rate > max_marginal_drop:
            max_marginal_drop = drop_rate
            cliff_t = tc
        prev_j = jc

    j_fast_speed_heuristic, _ = expected_epa_at(2.05, 1.0)
    j_actual_ideal_target, surv_at_rel = expected_epa_at(t_rel, 1.0)
    j_actual_realized, _ = expected_epa_at(t_rel, spat_eff)

    temporal_judgment_epa = j_actual_ideal_target - j_fast_speed_heuristic
    temporal_regret_vs_opt = best_j - j_actual_ideal_target
    spatial_selection_epa = j_actual_realized - j_actual_ideal_target

    if t_rel > cliff_t and j_actual_ideal_target < j_fast_speed_heuristic:
        archetype = "PANIC_SACK_CLIFF"
    elif t_rel >= 2.35 and temporal_judgment_epa > 0.015:
        archetype = "STRATEGIC_LA_PAUSA"
    elif t_rel < 2.20 and route_profile != "quick_stick" and temporal_regret_vs_opt > 0.05:
        archetype = "PREMATURE_CHECKDOWN"
    else:
        archetype = "RAPID_RHYTHM"

    delta_pts = j_actual_realized * 34.0
    return SignalOutput(
        signal_id="nfl_la_pausa_optimal_release_vs_sack_cliff",
        domain="trench_pocket_biomechanics",
        value=j_actual_realized,
        home_sign=_resolve_home_sign(j_actual_realized),
        delta_epa_per_play=j_actual_realized,
        delta_points_game=delta_pts,
        delta_log_odds=_clamp_log_odds(delta_pts * 0.055),
        gate="LIVE",
        target_monorepo_package="packages/stats-api",
        source_drive_file_id="1MbnVOLZfc5ajmKV2gs5VPFVdyB3dE78T",
        metadata={
            "optimal_release_time_s": round(best_t, 3),
            "panic_sack_cliff_s": round(cliff_t, 3),
            "pocket_survival_at_release": round(surv_at_rel, 4),
            "temporal_judgment_epa_vs_fast": round(temporal_judgment_epa, 4),
            "temporal_regret_vs_optimal": round(temporal_regret_vs_opt, 4),
            "spatial_selection_epa": round(spatial_selection_epa, 4),
            "archetype": archetype,
        },
    )


# ===========================================================================
# 3. SCHEME & COVERAGE GEOMETRY (NFL Schemes, Essential Smart Football, Hidden Game)
# ===========================================================================

MofoCoverage = Literal["COVER_4_QUARTERS", "COVER_6_QQH", "COVER_9_HQQ", "COVER_2_TAMPA", "COVER_3_MOFC"]
OffensiveConcept = Literal[
    "outside_zone_run",
    "counter_gap_run",
    "pa_levels_y_cross",
    "pa_boot_flood",
    "four_verticals",
    "quick_flat_access",
]


def fangio_mofo_vs_shanahan_mcvay_conflict(
    coverage_shell: MofoCoverage,
    offensive_concept: OffensiveConcept,
    personnel_code: Literal["11", "12", "21", "22"] = "21",
    pre_snap_motion: Literal["none", "jet_orbit", "short_return_rat_lab", "trade_shift"] = "jet_orbit",
    under_center: bool = True,
    safety_run_fit_iq: float = 0.72,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Operationalizes `NFL Schemes` (`1T_X1TAlkAtWOiDSueNqik-gwF7HdbvgG670gsIKW3VQ`) +
    `The Essential Smart Football` (`1QKTGX4wW92qgci1x732pVRiWIT4jBFaL`).
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    saf_iq = _require_finite("safety_run_fit_iq", safety_run_fit_iq, 0.0, 1.0)

    is_mofo = coverage_shell in ("COVER_4_QUARTERS", "COVER_6_QQH", "COVER_9_HQQ", "COVER_2_TAMPA")
    extra_blockers = {"11": 1, "12": 2, "21": 2, "22": 3}.get(personnel_code)
    if extra_blockers is None:
        raise DataGapError(f"Unsupported personnel_code: {personnel_code!r}")

    base_box_defenders = 6 if is_mofo else 7
    surface_blockers = 5 + extra_blockers
    late_safety_insert = 0.0
    if coverage_shell == "COVER_4_QUARTERS":
        late_safety_insert = 1.35 * saf_iq
    elif coverage_shell in ("COVER_6_QQH", "COVER_9_HQQ"):
        late_safety_insert = 0.85 * saf_iq

    effective_box_advantage = surface_blockers - (base_box_defenders + late_safety_insert)

    epa = 0.0
    if offensive_concept == "four_verticals":
        if coverage_shell in ("COVER_4_QUARTERS", "COVER_6_QQH", "COVER_9_HQQ"):
            epa = -0.19
        elif coverage_shell == "COVER_3_MOFC":
            epa = +0.21
        else:
            epa = +0.11
    elif offensive_concept == "counter_gap_run":
        epa = (0.14 if is_mofo else -0.05) + 0.06 * effective_box_advantage
    elif offensive_concept == "outside_zone_run":
        epa = (0.07 if is_mofo else -0.06) + 0.05 * effective_box_advantage
    elif offensive_concept == "pa_levels_y_cross":
        uc_bonus = 0.09 if under_center else -0.03
        if coverage_shell == "COVER_9_HQQ":
            epa = 0.06 + uc_bonus - 0.08 * saf_iq
        elif is_mofo:
            epa = 0.22 + uc_bonus
        else:
            epa = 0.16 + uc_bonus
    elif offensive_concept == "pa_boot_flood":
        if coverage_shell in ("COVER_3_MOFC", "COVER_4_QUARTERS"):
            epa = 0.20 + (0.06 if under_center else 0.0)
        else:
            epa = 0.02
    elif offensive_concept == "quick_flat_access":
        epa = 0.09 if is_mofo or coverage_shell == "COVER_3_MOFC" else -0.04
    else:
        raise DataGapError(f"Unsupported offensive_concept: {offensive_concept!r}")

    motion_bonus = {
        "none": 0.0,
        "jet_orbit": 0.065 if is_mofo else 0.035,
        "short_return_rat_lab": 0.050,
        "trade_shift": 0.075 if coverage_shell in ("COVER_6_QQH", "COVER_9_HQQ") else 0.030,
    }[pre_snap_motion]
    epa += motion_bonus

    delta_pts = epa * 63.0
    return SignalOutput(
        signal_id="nfl_fangio_mofo_vs_shanahan_mcvay_scheme_conflict",
        domain="football_strategy_scheme",
        value=epa,
        home_sign=_resolve_home_sign(epa),
        delta_epa_per_play=epa,
        delta_points_game=delta_pts,
        delta_log_odds=_clamp_log_odds(delta_pts * 0.055),
        gate="LIVE",
        target_monorepo_package="packages/prediction-engine",
        source_drive_file_id="1T_X1TAlkAtWOiDSueNqik-gwF7HdbvgG670gsIKW3VQ",
        metadata={
            "coverage_shell": coverage_shell,
            "offensive_concept": offensive_concept,
            "effective_box_advantage": round(effective_box_advantage, 3),
            "motion_epa_bonus": round(motion_bonus, 4),
            "is_mofo_split_field": is_mofo,
        },
    )


def spags_simulated_pressure_and_cover0_matrix(
    pressure_type: Literal["COVER_0_ALL_OUT", "SIM_PRESSURE_CREEPER_4", "DROP_8_TAMPA2_RAT", "STANDARD_4_MAN"],
    protection_call: Literal["half_slide", "5_0_bob", "full_slide", "max_protect_7"],
    qb_hot_sight_adjust_iq: float,
    wr_hot_win_rate: float,
    overload_four_weak: bool = False,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Operationalizes Spagnuolo / Brian Flores Cover-0 & Simulated-Pressure ("Creeper" / Drop-8 Rat)
    game-theory matrix from `NFL Schemes` (`1T_X1TAlkAtWOiDSueNqik-gwF7HdbvgG670gsIKW3VQ`).
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    hot_iq = _require_finite("qb_hot_sight_adjust_iq", qb_hot_sight_adjust_iq, 0.0, 1.0)
    wr_win = _require_finite("wr_hot_win_rate", wr_hot_win_rate, 0.0, 1.0)

    protect_count = {"half_slide": 6, "5_0_bob": 5, "full_slide": 6, "max_protect_7": 7}.get(protection_call)
    if protect_count is None:
        raise DataGapError(f"Unsupported protection_call: {protection_call!r}")

    if pressure_type == "COVER_0_ALL_OUT":
        rushers = 6 if protect_count == 5 else 7
        unblocked = max(0, rushers - protect_count) + (1 if overload_four_weak and protection_call == "half_slide" else 0)
        p_beat_free_rusher = _sigmoid(3.4 * (0.60 * hot_iq + 0.40 * wr_win - 0.54) - 0.35 * (unblocked - 1))
        epa = p_beat_free_rusher * 0.68 + (1.0 - p_beat_free_rusher) * (-0.72)
    elif pressure_type == "SIM_PRESSURE_CREEPER_4":
        overload_penalty = -0.18 if (overload_four_weak and protection_call == "half_slide") else -0.07
        epa = overload_penalty + 0.24 * (hot_iq - 0.55)
    elif pressure_type == "DROP_8_TAMPA2_RAT":
        bluff_trap = -0.26 * (1.0 - hot_iq) + 0.14 * hot_iq
        epa = bluff_trap
    elif pressure_type == "STANDARD_4_MAN":
        epa = 0.08 + 0.12 * (wr_win - 0.50)
    else:
        raise DataGapError(f"Unsupported pressure_type: {pressure_type!r}")

    delta_pts = epa * 24.0
    return SignalOutput(
        signal_id="nfl_spags_flores_sim_pressure_cover0_hot_matrix",
        domain="football_strategy_scheme",
        value=epa,
        home_sign=_resolve_home_sign(epa),
        delta_epa_per_play=epa,
        delta_points_game=delta_pts,
        delta_log_odds=_clamp_log_odds(delta_pts * 0.055),
        gate="LIVE",
        target_monorepo_package="packages/prediction-engine",
        source_drive_file_id="1T_X1TAlkAtWOiDSueNqik-gwF7HdbvgG670gsIKW3VQ",
        metadata={
            "pressure_type": pressure_type,
            "protection_call": protection_call,
            "overload_four_weak": overload_four_weak,
            "expected_epa_per_dropback": round(epa, 4),
        },
    )


def red_zone_compressed_field_efficiency(
    yardline_100: float,
    concept_family: Literal["vertical_go_post", "horizontal_mesh_china_stick", "heavy_gap_jumbo_run"],
    def_zone_delta_epa: float = 0.0,
    te_redzone_dominance: float = 0.50,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Red-Zone Compressed-Field Horizontal vs Vertical Stretch Efficiency (`NFL Schemes` Double China /
    Stick / Jumbo + `Hidden Game of Football` + Q52 `defensive-field-zone-split.ts`).
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    yl = _require_finite("yardline_100", yardline_100, 1.0, 20.0)
    z_delta = _require_finite("def_zone_delta_epa", def_zone_delta_epa, -1.0, 1.0)
    te_dom = _require_finite("te_redzone_dominance", te_redzone_dominance, 0.0, 1.0)

    avail_depth_yd = yl + 10.0
    area_per_zone_defender_yd2 = (53.333 * avail_depth_yd) / 7.0
    compression_ratio = area_per_zone_defender_yd2 / 266.67

    if concept_family == "vertical_go_post":
        base_epa = -0.34 * (1.0 - compression_ratio) + 0.10 * (te_dom - 0.5)
    elif concept_family == "horizontal_mesh_china_stick":
        base_epa = 0.16 * (1.15 - compression_ratio) + 0.18 * (te_dom - 0.5)
    elif concept_family == "heavy_gap_jumbo_run":
        goal_line_boost = 0.28 * math.exp(-(yl - 1.0) / 4.5)
        base_epa = -0.05 + goal_line_boost
    else:
        raise DataGapError(f"Unsupported concept_family: {concept_family!r}")

    net_epa = base_epa + 0.55 * z_delta
    delta_pts = net_epa * 11.0
    return SignalOutput(
        signal_id="nfl_redzone_compressed_field_stretch_efficiency",
        domain="football_strategy_scheme",
        value=net_epa,
        home_sign=_resolve_home_sign(net_epa),
        delta_epa_per_play=net_epa,
        delta_points_game=delta_pts,
        delta_log_odds=_clamp_log_odds(delta_pts * 0.055),
        gate="LIVE",
        target_monorepo_package="packages/stats-api",
        source_drive_file_id="17AFyC1EgMtMm2DJU92zLbFFNHQ6q3oGc",
        metadata={
            "yardline_100": yl,
            "avail_vertical_depth_yd": avail_depth_yd,
            "area_per_zone_defender_yd2": round(area_per_zone_defender_yd2, 2),
            "compression_ratio": round(compression_ratio, 4),
            "concept_family": concept_family,
        },
    )


def zaidi_vivit_whim_tackling_biomechanics(
    vivit_satt3_risky_prob: float,
    linear_accel_g: float,
    rotational_vel_rad_s: float,
    seconds_since_prior_hit: float | None = None,
    prior_residual_strain: float = 0.0,
) -> SignalOutput:
    """
    Bridges `2026 - Revisiting Risky Tackle Detection with Vision Transformers - Zaidi et al.`
    (`1z8mk2-jK9jx-bZ6pa7xAb9X5SBMBKVSq`) with GSI's 3-Mode Prony/Ogden Sulcal Waveguide CTE Kernel
    (`gsi_cte_viscoelastic_waveguide_kernel.hpp`: tau_1 = 0.05s, tau_2 = 2.5s, tau_3 = 65.0s).
    """
    p_risky = _require_finite("vivit_satt3_risky_prob", vivit_satt3_risky_prob, 0.0, 1.0)
    lin_g = _require_finite("linear_accel_g", linear_accel_g, 0.0, 250.0)
    rot_w = _require_finite("rotational_vel_rad_s", rotational_vel_rad_s, 0.0, 80.0)
    prior_s = _require_finite("prior_residual_strain", prior_residual_strain, 0.0, 2.0)

    carried_strain = 0.0
    if seconds_since_prior_hit is not None:
        dt_hit = _require_finite("seconds_since_prior_hit", seconds_since_prior_hit, 0.01, 7200.0)
        relax_kernel = (
            0.45 * math.exp(-dt_hit / 0.05)
            + 0.30 * math.exp(-dt_hit / 2.5)
            + 0.25 * math.exp(-dt_hit / 65.0)
        )
        carried_strain = prior_s * relax_kernel

    impulse_strain = (0.0022 * lin_g + 0.0068 * rot_w) * (1.0 + 0.45 * p_risky)
    braiding_amp = 1.0 + 0.65 * min(1.0, carried_strain / 0.15)
    total_sulcal_strain = carried_strain + impulse_strain * braiding_amp
    cavitation_alert = total_sulcal_strain >= 0.26

    def_epa_penalty = -0.14 * p_risky - (0.18 if cavitation_alert else 0.0)
    delta_pts = def_epa_penalty * 15.0
    return SignalOutput(
        signal_id="gsi_whim_vivit_sulcal_strain_and_tackle_risk",
        domain="gsi_biophysical_phase_transition",
        value=total_sulcal_strain,
        home_sign=_resolve_home_sign(def_epa_penalty),
        delta_epa_per_play=def_epa_penalty,
        delta_points_game=delta_pts,
        delta_log_odds=_clamp_log_odds(delta_pts * 0.055),
        gate="LIVE",
        target_monorepo_package="packages/mcp-equations-server",
        source_drive_file_id="1z8mk2-jK9jx-bZ6pa7xAb9X5SBMBKVSq",
        metadata={
            "total_sulcal_strain": round(total_sulcal_strain, 5),
            "carried_viscoelastic_strain": round(carried_strain, 5),
            "cavitation_alert": cavitation_alert,
            "vivit_satt3_risky_prob": round(p_risky, 4),
        },
    )


# ===========================================================================
# 4. MARKET MICROSTRUCTURE & EXECUTION (Ed Miller, Kissell 2017, Severini, Egidi, Polymarket)
# ===========================================================================

def american_to_decimal_odds(american_odds: float) -> float:
    am = _require_finite("american_odds", american_odds, -100000.0, 100000.0)
    if -100.0 < am < 100.0:
        raise DataGapError(f"Invalid American odds in (-100, 100): {am}")
    if am >= 100.0:
        return 1.0 + (am / 100.0)
    return 1.0 + (100.0 / abs(am))


def shin_devig_probabilities(american_home: float, american_away: float) -> tuple[float, float, float]:
    """
    Closed-form two-outcome Shin (1991, 1993) de-vigging returning (p_home, p_away, shin_z).
    On -110 / -110: sum_q = 1.047619, shin_z = 0.047619.
    """
    d_home = american_to_decimal_odds(american_home)
    d_away = american_to_decimal_odds(american_away)
    q1 = 1.0 / d_home
    q2 = 1.0 / d_away
    sum_q = q1 + q2
    if sum_q < 0.999999:
        raise DataGapError(f"Arbitrage/crossed market cannot be Shin de-vigged (sum implied = {sum_q:.5f} < 1.0)")
    if abs(sum_q - 1.0) < 1e-12:
        return q1, q2, 0.0

    z = max(0.0, min(0.45, sum_q - 1.0))
    for _ in range(30):
        denom = 2.0 * (1.0 - z)
        s1 = math.sqrt(z * z + 4.0 * (1.0 - z) * (q1 * q1) / sum_q)
        s2 = math.sqrt(z * z + 4.0 * (1.0 - z) * (q2 * q2) / sum_q)
        f_val = (s1 + s2 - 2.0 * z) / denom - 1.0
        if abs(f_val) < 1e-13:
            break
        ds1 = (2.0 * z - 4.0 * (q1 * q1) / sum_q) / (2.0 * s1)
        ds2 = (2.0 * z - 4.0 * (q2 * q2) / sum_q) / (2.0 * s2)
        df = ((ds1 + ds2 - 2.0) * denom + 2.0 * (s1 + s2 - 2.0 * z)) / (denom * denom)
        z = max(0.0, min(0.49, z - f_val / df))

    p1 = (math.sqrt(z * z + 4.0 * (1.0 - z) * (q1 * q1) / sum_q) - z) / (2.0 * (1.0 - z))
    p2 = 1.0 - p1
    return p1, p2, z


def dmochowski_profit_bias_identity(
    true_home_win_prob: float,
    book_implied_home_prob_raw: float,
    book_hold: float,
    expected_public_home_handle_share: float,
    cov_home_share_home_win: float = 0.0,
) -> dict[str, float]:
    """
    Operationalizes `Dmochowski 2026 — The profit-bias identity in sports betting`
    (`15lNrMlifWxIUsLAU36oPtiga2rSsF6g5`).
    """
    p_true = _require_finite("true_home_win_prob", true_home_win_prob, 0.001, 0.999)
    p_book_fair = _require_finite("book_implied_home_prob_raw", book_implied_home_prob_raw, 0.001, 0.999)
    hold = _require_finite("book_hold", book_hold, 0.0, 0.30)
    f_pub = _require_finite("expected_public_home_handle_share", expected_public_home_handle_share, 0.0, 1.0)
    cov_so = _require_finite("cov_home_share_home_win", cov_home_share_home_win, -0.25, 0.25)

    shading = p_book_fair - p_true
    lean = f_pub - p_book_fair
    expected_losing_handle = f_pub * (1.0 - p_true) + (1.0 - f_pub) * p_true - 2.0 * cov_so
    shading_lean_channel = 2.0 * shading * lean
    informed_flow_channel = -2.0 * cov_so
    expected_book_margin = hold + shading_lean_channel + informed_flow_channel

    return {
        "hold_channel": hold,
        "shading_times_lean_channel": shading_lean_channel,
        "covariance_channel": informed_flow_channel,
        "expected_book_margin": expected_book_margin,
        "expected_losing_handle_share": expected_losing_handle,
    }


def steam_vs_stale_book_lag_detector(
    sharp_prev_american_home: float,
    sharp_curr_american_home: float,
    sharp_curr_american_away: float,
    rec_stale_american_home: float,
    rec_stale_american_away: float,
    move_elapsed_seconds: float,
    synchronized_sharp_books_count: int = 2,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Detects sharp steam velocity vs stale recreational book quote lag (`Ed Miller` + `Kissell 2017`).
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    dt_s = _require_finite("move_elapsed_seconds", move_elapsed_seconds, 0.5, 86400.0)
    n_sharp = int(_require_finite("synchronized_sharp_books_count", synchronized_sharp_books_count, 1.0, 20.0))

    p_sharp_curr, p_sharp_away, shin_z = shin_devig_probabilities(sharp_curr_american_home, sharp_curr_american_away)
    d_sharp_prev = american_to_decimal_odds(sharp_prev_american_home)
    p_sharp_prev = max(0.01, min(0.99, (1.0 / d_sharp_prev) / (1.0 + shin_z)))

    d_rec_home = american_to_decimal_odds(rec_stale_american_home)
    d_rec_away = american_to_decimal_odds(rec_stale_american_away)

    steam_delta_prob = p_sharp_curr - p_sharp_prev
    steam_velocity_prob_per_min = abs(steam_delta_prob) / (dt_s / 60.0)

    ev_home_at_rec = p_sharp_curr * d_rec_home - 1.0
    ev_away_at_rec = p_sharp_away * d_rec_away - 1.0
    best_ev = max(ev_home_at_rec, ev_away_at_rec)
    home_is_target = ev_home_at_rec >= ev_away_at_rec

    is_confirmed_steam = abs(steam_delta_prob) >= 0.015 and n_sharp >= 2 and dt_s <= 600.0
    est_remaining_window_s = max(0.0, 180.0 / math.sqrt(n_sharp) - 0.35 * dt_s) if best_ev > 0 else 0.0

    signed_edge = ev_home_at_rec if home_is_target else -ev_away_at_rec
    return SignalOutput(
        signal_id="market_steam_vs_stale_recreational_lag",
        domain="market_microstructure_execution",
        value=best_ev,
        home_sign=1 if home_is_target else -1,
        delta_epa_per_play=0.0,
        delta_points_game=signed_edge * 12.0,
        delta_log_odds=_clamp_log_odds(signed_edge * 2.2),
        gate="LIVE",
        target_monorepo_package="packages/quote-plane",
        source_drive_file_id="1QU-IrROgk7LKTOF5KaddAQKnUhfeutf7",
        metadata={
            "sharp_fair_home_prob": round(p_sharp_curr, 5),
            "shin_z": round(shin_z, 5),
            "steam_delta_prob": round(steam_delta_prob, 5),
            "steam_velocity_prob_per_min": round(steam_velocity_prob_per_min, 5),
            "ev_home_at_rec": round(ev_home_at_rec, 5),
            "ev_away_at_rec": round(ev_away_at_rec, 5),
            "is_confirmed_steam": is_confirmed_steam,
            "est_remaining_window_s": round(est_remaining_window_s, 1),
        },
    )


def key_number_derivative_pricer(
    fair_fav_spread_margin: float,
    game_total: float,
) -> dict[str, Any]:
    """
    Total-conditional Discrete-Continuous Hybrid NFL Margin PMF & Key-Number Derivative Pricer
    (`Ed Miller` + `Severini 3rd Ed` + GSE `EDGE#1b` & `EDGE#2`).
    """
    mu_fav = _require_finite("fair_fav_spread_margin", fair_fav_spread_margin, 0.0, 28.0)
    total = _require_finite("game_total", game_total, 26.0, 72.0)

    sigma_cond = max(
        10.0,
        min(
            13.7,
            11.85
            + 0.075 * (total - 44.5)
            + 0.11 * max(0.0, mu_fav - 4.0)
            - 0.05 * max(0.0, 50.0 - total) * (1.0 if mu_fav < 3.0 else 0.0),
        ),
    )
    laplace_b = sigma_cond / math.sqrt(2.0)

    low_total_z = (44.5 - total) / 7.5
    fg_spike = math.exp(0.32 * low_total_z)
    td_spike = math.exp(-0.24 * low_total_z)

    key_multipliers: dict[int, float] = {
        3: 2.95 * fg_spike,
        7: 2.35 * td_spike,
        10: 1.55 * (0.55 * fg_spike + 0.45 * td_spike),
        14: 1.48 * td_spike,
        6: 1.42 * fg_spike,
        4: 1.28,
        1: 1.18,
        17: 1.25,
        21: 1.20 * td_spike,
    }

    raw_pmf: dict[int, float] = {}
    for m in range(-60, 61):
        if m == 0:
            continue
        diff = abs(m - mu_fav)
        dens_lap = (1.0 / (2.0 * laplace_b)) * math.exp(-diff / laplace_b)
        dens_gau = (1.0 / (sigma_cond * math.sqrt(2.0 * math.pi))) * math.exp(-0.5 * ((m - mu_fav) / sigma_cond) ** 2)
        base_mass = 0.65 * dens_lap + 0.35 * dens_gau
        mult = key_multipliers.get(abs(m), 1.0)
        raw_pmf[m] = base_mass * mult

    norm = sum(raw_pmf.values())
    pmf = {m: w / norm for m, w in raw_pmf.items()}

    def cover_prob(line_spread_fav_minus: float) -> tuple[float, float, float]:
        p_win = sum(p for m, p in pmf.items() if m > line_spread_fav_minus)
        p_push = sum(p for m, p in pmf.items() if abs(m - line_spread_fav_minus) < 1e-9)
        p_loss = 1.0 - p_win - p_push
        return p_win, p_push, p_loss

    def no_push_cover_prob(line_spread_fav_minus: float) -> float:
        pw, pp, _ = cover_prob(line_spread_fav_minus)
        return pw / (1.0 - pp) if pp < 0.999 else 0.5

    p_abs_3 = pmf[3] + pmf[-3]
    p_abs_7 = pmf[7] + pmf[-7]
    p_abs_10 = pmf[10] + pmf[-10]
    p_abs_14 = pmf[14] + pmf[-14]

    half_pt_val_onto_3 = no_push_cover_prob(3.0) - no_push_cover_prob(3.5)
    half_pt_val_off_3 = no_push_cover_prob(2.5) - no_push_cover_prob(3.0)
    half_pt_val_onto_7 = no_push_cover_prob(7.0) - no_push_cover_prob(7.5)
    half_pt_val_off_7 = no_push_cover_prob(6.5) - no_push_cover_prob(7.0)

    wong_fav_7_5_to_1_5 = no_push_cover_prob(1.5)
    wong_dog_2_5_to_8_5 = 1.0 - no_push_cover_prob(8.5)

    p_ot = 0.074 if mu_fav <= 2.5 else (0.056 if mu_fav <= 5.0 else 0.045)
    ot_expected_total_inflation = p_ot * 5.2

    return {
        "sigma_conditional": round(sigma_cond, 4),
        "p_abs_margin_3": round(p_abs_3, 5),
        "p_abs_margin_7": round(p_abs_7, 5),
        "p_abs_margin_10": round(p_abs_10, 5),
        "p_abs_margin_14": round(p_abs_14, 5),
        "p_fav_3_exact": round(pmf[3], 5),
        "p_fav_7_exact": round(pmf[7], 5),
        "half_pt_prob_gain_3_5_to_3_0": round(half_pt_val_onto_3, 5),
        "half_pt_prob_gain_3_0_to_2_5": round(half_pt_val_off_3, 5),
        "half_pt_prob_gain_7_5_to_7_0": round(half_pt_val_onto_7, 5),
        "half_pt_prob_gain_7_0_to_6_5": round(half_pt_val_off_7, 5),
        "wong_teaser_fav_7_5_to_1_5_win_prob": round(wong_fav_7_5_to_1_5, 5),
        "wong_teaser_dog_2_5_to_8_5_win_prob": round(wong_dog_2_5_to_8_5, 5),
        "p_overtime": round(p_ot, 4),
        "ot_expected_total_points_added": round(ot_expected_total_inflation, 4),
    }


def clv_alpha_decay_curve(
    hours_since_tuesday_0400_ct: float,
    initial_edge_points: float,
    market_tier: Literal["nfl_side", "nfl_total", "nfl_player_prop"] = "nfl_side",
) -> dict[str, float]:
    """
    Closing-Line Value (CLV) Alpha Decay Curve from Tuesday 04:00 CT `TuesdayMasterLock` (t = 0h)
    to Sunday T-90m Inactives (t = 126.5h) and Kickoff (t = 128.0h).
    """
    h = _require_finite("hours_since_tuesday_0400_ct", hours_since_tuesday_0400_ct, 0.0, 128.0)
    edge0 = _require_finite("initial_edge_points", initial_edge_points, -10.0, 10.0)

    half_life_h = {"nfl_side": 28.0, "nfl_total": 34.0, "nfl_player_prop": 58.0}.get(market_tier)
    if half_life_h is None:
        raise DataGapError(f"Unsupported market_tier: {market_tier!r}")

    lam = math.log(2.0) / half_life_h
    continuous_retention = math.exp(-lam * h)

    shock_factor = 1.0
    if h >= 36.0:
        shock_factor *= 0.88
    if h >= 84.0:
        shock_factor *= 0.84
    if h >= 126.5:
        shock_factor *= 0.65

    alpha_retained_fraction = continuous_retention * shock_factor
    remaining_clv_points = edge0 * alpha_retained_fraction
    captured_by_market_pct = 100.0 * (1.0 - alpha_retained_fraction)

    return {
        "hours_since_tuesday_lock": h,
        "alpha_retained_fraction": round(alpha_retained_fraction, 5),
        "remaining_expected_clv_points": round(remaining_clv_points, 4),
        "market_price_discovery_complete_pct": round(captured_by_market_pct, 2),
    }


def cross_venue_polymarket_divergence_detector(
    polymarket_yes_ask: float,
    polymarket_no_ask: float,
    polymarket_depth_usd: float,
    sharp_book_american_home: float,
    sharp_book_american_away: float,
    rec_book_american_home: float | None = None,
    rec_book_american_away: float | None = None,
    polymarket_fee_slippage_bps: float = 35.0,
    min_depth_usd: float = 2500.0,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> SignalOutput:
    """
    Cross-venue implied-probability divergence & structural arbitrage detector bridging
    `packages/polymarket-sdks` event-contract CLOB asks against Shin de-vigged sharp sportsbooks.
    """
    enforce_bitemporal_asof(observed_at_epoch_ms, decision_timestamp_epoch_ms)
    pm_yes = _require_finite("polymarket_yes_ask", polymarket_yes_ask, 0.01, 0.99)
    pm_no = _require_finite("polymarket_no_ask", polymarket_no_ask, 0.01, 0.99)
    depth = _require_finite("polymarket_depth_usd", polymarket_depth_usd, 0.0, 1e9)
    fee_bps = _require_finite("polymarket_fee_slippage_bps", polymarket_fee_slippage_bps, 0.0, 500.0)
    min_d = _require_finite("min_depth_usd", min_depth_usd, 100.0, 1e7)

    if depth < min_d:
        raise DataGapError(
            f"Polymarket CLOB liquidity cavitation: depth ${depth:.2f} below minimum ${min_d:.2f}"
        )

    fee = fee_bps / 10000.0
    eff_pm_yes_cost = min(0.999, pm_yes + fee)
    eff_pm_no_cost = min(0.999, pm_no + fee)
    pm_mid_home_prob = pm_yes / (pm_yes + pm_no)

    p_sharp_home, p_sharp_away, shin_z = shin_devig_probabilities(sharp_book_american_home, sharp_book_american_away)

    best_home_dec = american_to_decimal_odds(
        rec_book_american_home if rec_book_american_home is not None else sharp_book_american_home
    )
    best_away_dec = american_to_decimal_odds(
        rec_book_american_away if rec_book_american_away is not None else sharp_book_american_away
    )

    arb_cost_pm_home_sb_away = eff_pm_yes_cost + (1.0 / best_away_dec)
    arb_cost_pm_away_sb_home = eff_pm_no_cost + (1.0 / best_home_dec)
    min_arb_cost = min(arb_cost_pm_home_sb_away, arb_cost_pm_away_sb_home)
    has_structural_arb = min_arb_cost < 1.0

    ev_buy_pm_yes = (p_sharp_home / eff_pm_yes_cost) - 1.0
    ev_buy_pm_no = (p_sharp_away / eff_pm_no_cost) - 1.0
    prob_divergence = p_sharp_home - pm_mid_home_prob

    if has_structural_arb:
        regime = "STRUCTURAL_ARB"
        home_dir: HomeSign = 1 if arb_cost_pm_home_sb_away <= arb_cost_pm_away_sb_home else -1
        best_ev = (1.0 / min_arb_cost) - 1.0
    elif ev_buy_pm_yes > 0.02:
        regime = "POLYMARKET_STALE_HOME_CHEAP"
        home_dir = 1
        best_ev = ev_buy_pm_yes
    elif ev_buy_pm_no > 0.02:
        regime = "POLYMARKET_STALE_AWAY_CHEAP"
        home_dir = -1
        best_ev = ev_buy_pm_no
    elif rec_book_american_home is not None and (p_sharp_home * best_home_dec - 1.0) > 0.02:
        regime = "SPORTSBOOK_STALE_HOME_CHEAP"
        home_dir = 1
        best_ev = p_sharp_home * best_home_dec - 1.0
    elif rec_book_american_away is not None and (p_sharp_away * best_away_dec - 1.0) > 0.02:
        regime = "SPORTSBOOK_STALE_AWAY_CHEAP"
        home_dir = -1
        best_ev = p_sharp_away * best_away_dec - 1.0
    else:
        regime = "NO_EDGE_WITHIN_FRICTION"
        home_dir = _resolve_home_sign(prob_divergence)
        best_ev = max(ev_buy_pm_yes, ev_buy_pm_no)

    b_net = (1.0 / eff_pm_yes_cost - 1.0) if home_dir == 1 else (1.0 / eff_pm_no_cost - 1.0)
    p_win = p_sharp_home if home_dir == 1 else p_sharp_away
    full_kelly = max(0.0, (p_win * (b_net + 1.0) - 1.0) / max(1e-6, b_net))
    half_kelly_capped = min(0.05, 0.50 * full_kelly)

    return SignalOutput(
        signal_id="cross_venue_polymarket_vs_sportsbook_divergence",
        domain="market_microstructure_execution",
        value=prob_divergence,
        home_sign=home_dir,
        delta_epa_per_play=0.0,
        delta_points_game=prob_divergence * 24.0,
        delta_log_odds=_clamp_log_odds(prob_divergence * 2.5),
        gate="LIVE",
        target_monorepo_package="packages/polymarket-sdks",
        source_drive_file_id="1DvetVYorhx5Z1m35cOqJ8rf1jXHCuVEY",
        metadata={
            "regime": regime,
            "has_structural_arb": has_structural_arb,
            "min_cross_venue_arb_cost": round(min_arb_cost, 5),
            "sharp_home_prob": round(p_sharp_home, 5),
            "polymarket_mid_home_prob": round(pm_mid_home_prob, 5),
            "prob_divergence_sharp_minus_pm": round(prob_divergence, 5),
            "best_actionable_ev": round(best_ev, 5),
            "half_kelly_stake_fraction": round(half_kelly_capped, 5),
            "shin_z": round(shin_z, 5),
        },
    )


def produce_matchup_signal_bundle(
    venue_code: str,
    temp_f: float,
    rel_humidity_pct: float,
    wind_speed_mph: float,
    precip_in_hr: float,
    ol_pass_block_grades: Sequence[float],
    rusher_prwr_rates: Sequence[float],
    actual_release_time_s: float,
    coverage_shell: MofoCoverage,
    offensive_concept: OffensiveConcept,
    polymarket_yes_ask: float,
    polymarket_no_ask: float,
    polymarket_depth_usd: float,
    sharp_american_home: float,
    sharp_american_away: float,
    observed_at_epoch_ms: int | float | None = None,
    decision_timestamp_epoch_ms: int | float | None = None,
) -> list[SignalOutput]:
    """End-to-end fleet aggregator returning verified SignalOutputs across physics, trench, scheme & market."""
    if venue_code not in STADIUM_PSYCHROMETRICS_REGISTRY:
        raise DataGapError(f"Unknown venue_code {venue_code!r} in STADIUM_PSYCHROMETRICS_REGISTRY")
    venue = STADIUM_PSYCHROMETRICS_REGISTRY[venue_code]

    s_weather = wet_bulb_cold_grip_fumble_and_fg_adjustment(
        kick_distance_yards=50.0,
        temp_f=temp_f,
        rel_humidity_pct=rel_humidity_pct,
        wind_speed_mph=wind_speed_mph,
        precip_in_hr=precip_in_hr,
        elevation_m=venue.elevation_m,
        is_indoor=venue.is_indoor,
        observed_at_epoch_ms=observed_at_epoch_ms,
        decision_timestamp_epoch_ms=decision_timestamp_epoch_ms,
    )
    s_trench = la_pausa_optimal_release_timing(
        ol_pass_block_grades=ol_pass_block_grades,
        rusher_prwr_rates=rusher_prwr_rates,
        actual_release_time_s=actual_release_time_s,
        observed_at_epoch_ms=observed_at_epoch_ms,
        decision_timestamp_epoch_ms=decision_timestamp_epoch_ms,
    )
    s_scheme = fangio_mofo_vs_shanahan_mcvay_conflict(
        coverage_shell=coverage_shell,
        offensive_concept=offensive_concept,
        observed_at_epoch_ms=observed_at_epoch_ms,
        decision_timestamp_epoch_ms=decision_timestamp_epoch_ms,
    )
    s_market = cross_venue_polymarket_divergence_detector(
        polymarket_yes_ask=polymarket_yes_ask,
        polymarket_no_ask=polymarket_no_ask,
        polymarket_depth_usd=polymarket_depth_usd,
        sharp_book_american_home=sharp_american_home,
        sharp_book_american_away=sharp_american_away,
        observed_at_epoch_ms=observed_at_epoch_ms,
        decision_timestamp_epoch_ms=decision_timestamp_epoch_ms,
    )
    return [s_weather, s_trench, s_scheme, s_market]
