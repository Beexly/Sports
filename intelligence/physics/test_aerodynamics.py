"""Unit tests for NASA/Physics-grade Aerodynamics Engine."""

import math
import numpy as np
import pytest

from intelligence.physics.aerodynamics import (
    AtmosphericCondition,
    AerodynamicsEngine,
    compute_air_density,
    evaluate_field_goal_prob,
    stadium_wind_boundary_layer,
)


def test_air_density_thermodynamics():
    # Standard sea level at 20°C
    sea_level = AtmosphericCondition(temperature_c=20.0, pressure_hpa=1013.25, relative_humidity=0.5)
    rho_std = compute_air_density(sea_level)
    assert 1.18 < rho_std < 1.22, f"Expected standard sea level ~1.20 kg/m^3, got {rho_std}"

    # Cold air is denser
    cold = AtmosphericCondition(temperature_c=-5.0, pressure_hpa=1013.25, relative_humidity=0.5)
    rho_cold = compute_air_density(cold)
    assert rho_cold > rho_std, "Cold air must be denser than standard air"

    # Denver altitude (1609m) has significantly thinner air
    denver = AtmosphericCondition(temperature_c=20.0, altitude_m=1609.0, relative_humidity=0.3)
    rho_denver = compute_air_density(denver)
    assert rho_denver < 1.05, f"Expected Denver air density < 1.05 kg/m^3, got {rho_denver}"
    assert rho_denver < rho_std * 0.88, "Denver air must be at least ~15% thinner than sea level"


def test_stadium_wind_boundary_layer():
    wind = np.array([5.0, 2.0, 0.0])  # 5 m/s downfield, 2 m/s crosswind
    open_field = AtmosphericCondition(wind_vector_ms=wind, stadium_type="open")
    w_ground = stadium_wind_boundary_layer(0.2, open_field)
    assert np.all(w_ground == 0.0), "Ground surface roughness must bring wind to 0"

    w_aloft = stadium_wind_boundary_layer(15.0, open_field)
    assert w_aloft[0] > 0.0, "Wind aloft must be non-zero"

    # Dome must completely eliminate wind
    dome = AtmosphericCondition(wind_vector_ms=wind, stadium_type="dome")
    w_dome = stadium_wind_boundary_layer(15.0, dome)
    assert np.all(w_dome == 0.0), "Dome must have 0.0 wind velocity everywhere"


def test_trajectory_rk4_drag_and_magnus():
    env = AtmosphericCondition(temperature_c=20.0)
    engine = AerodynamicsEngine(env)

    # Launch ball at 30 m/s (~67 mph) at 35 degrees
    # Vacuum range formula: R = v0^2 * sin(2*theta) / g
    v0 = 30.0
    theta_deg = 35.0
    r_vacuum = (v0 ** 2) * math.sin(math.radians(2.0 * theta_deg)) / 9.80665

    traj_drag = engine.simulate_trajectory(
        v0_ms=v0,
        launch_angle_deg=theta_deg,
        spin_rpm=0.0,
        flight_type="spiral",
    )

    # Drag must reduce range compared to frictionless vacuum
    assert traj_drag.final_distance_m < r_vacuum, "Aerodynamic drag must reduce total downfield distance"
    assert traj_drag.final_distance_m > 40.0, f"Realistic spiral must travel > 40m, got {traj_drag.final_distance_m}"

    # Backspin Magnus lift must keep ball in flight longer
    traj_backspin = engine.simulate_trajectory(
        v0_ms=v0,
        launch_angle_deg=theta_deg,
        spin_rpm=500.0,
        spin_axis="backspin",
        flight_type="spiral",
    )
    assert traj_backspin.flight_time_s >= traj_drag.flight_time_s, "Magnus backspin lift must extend flight time"


def test_field_goal_evaluation_short_vs_long():
    env = AtmosphericCondition(temperature_c=20.0)

    # 30-yard field goal (routine chip shot)
    res_30 = evaluate_field_goal_prob(distance_yards=30.0, env=env, n_sims=100)
    assert res_30["success_probability"] >= 0.90, "30-yard FG should be high percentage"
    assert res_30["mean_crossbar_clearance_m"] > 3.0, "30-yarder should clear crossbar by several meters"

    # 65-yard field goal (extreme distance)
    res_65_sea_level = evaluate_field_goal_prob(
        distance_yards=65.0,
        env=AtmosphericCondition(temperature_c=0.0, altitude_m=0.0),  # Cold sea level
        n_sims=100,
    )
    res_65_denver = evaluate_field_goal_prob(
        distance_yards=65.0,
        env=AtmosphericCondition(temperature_c=20.0, altitude_m=1609.0),  # Thin Denver air
        n_sims=100,
    )

    # Thin air should give superior clearance / success on extreme kicks
    assert res_65_denver["mean_crossbar_clearance_m"] > res_65_sea_level["mean_crossbar_clearance_m"], (
        "Denver altitude must give higher clearance than cold sea-level"
    )
