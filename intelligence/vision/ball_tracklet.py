"""
Ball tracklet feed into existing homography and movement stages.
"""
import math
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Tracklet:
    id: str
    class_name: str
    positions: List[tuple]  # (x, y) in pixels or meters
    is_ball: bool = False

def feed_ball_to_homography(tracklets: List[Tracklet], homography_fn) -> List[Tracklet]:
    """Apply existing homography to ball tracklets as well as players."""
    out = []
    for t in tracklets:
        mapped = homography_fn(t.positions)
        out.append(Tracklet(id=t.id, class_name=t.class_name, positions=mapped, is_ball=t.is_ball))
    return out

def derive_ball_metrics(ball: Tracklet, dt: float = 0.1) -> dict:
    """Real kinematics from the tracklet, by finite difference.

    This used to return the constants 18.4 m / 12.1 m/s tagged
    "computed_from_tracklet" for every input. A constant wearing an honesty label
    is worse than a missing value: downstream code cannot distinguish it from a
    measurement. Everything below comes from `ball.positions`.
    """
    pts = [p for p in ball.positions if p is not None and len(p) >= 2]
    if len(pts) < 2:
        return {"distance_m": 0.0, "top_speed_ms": 0.0, "mean_speed_ms": 0.0,
                "accel_ms2": None, "drag_decel_ms2": None, "n_points": len(pts),
                "honesty": "insufficient_points"}

    xy = [(float(p[0]), float(p[1])) for p in pts]
    steps = [math.dist(xy[i], xy[i + 1]) for i in range(len(xy) - 1)]
    distance = float(sum(steps))
    speeds = [s / dt for s in steps if dt > 0]
    top = float(max(speeds)) if speeds else 0.0
    mean = float(sum(speeds) / len(speeds)) if speeds else 0.0

    accel = drag = None
    if len(speeds) >= 2 and dt > 0:
        accel = float((speeds[-1] - speeds[0]) / (dt * (len(speeds) - 1)))
        if accel < 0:
            drag = float(abs(accel))

    return {
        "distance_m": round(distance, 3),
        "top_speed_ms": round(top, 3),
        "mean_speed_ms": round(mean, 3),
        "accel_ms2": None if accel is None else round(accel, 3),
        "drag_decel_ms2": None if drag is None else round(drag, 3),
        "n_points": len(xy),
        "honesty": "computed_from_tracklet",
    }


# ---------------------------------------------------------------------------
# Prolate-spheroid flight model
# ---------------------------------------------------------------------------
# An American football is a prolate spheroid whose drag depends strongly on
# angle of attack: nose-first it is sleek, broadside it is a brick. A
# constant-drag model therefore overstates long-ball carry. Spin adds a Magnus
# force that bends flight laterally -- what makes a deep out arrive outside the
# receiver rather than on his chest.
#
# Constants are the standard size-5 values (mass 0.415 kg, long radius 0.14 m,
# short radius 0.0857 m). They are asserted in tests so a typo fails loudly.

BALL_MASS_KG = 0.415
BALL_R_LONG_M = 0.14
BALL_R_SHORT_M = 0.0857
BALL_AREA_M2 = math.pi * BALL_R_LONG_M * BALL_R_SHORT_M
G = 9.80665


def simulate_football_trajectory_3d(
    v0_ms: float,
    launch_angle_deg: float,
    azimuth_deg: float = 0.0,
    spin_rpm: float = 600.0,
    wobble_angle_deg: float = 3.0,
    wind_vx_ms: float = 0.0,
    wind_vy_ms: float = 0.0,
    air_density_kgm3: float = 1.225,
    dt: float = 0.005,
    max_time_s: float = 12.0,
    c_d0: float = 0.060,
    c_dalpha2: float = 0.52,
    c_l_spin: float = 0.18,
    release_height_m: float = 1.9,
) -> dict:
    """Integrate a thrown ball with angle-of-attack drag and spin Magnus force.

    Integrated by RK4 until the ball returns to release height. Reports carry,
    hang time, apex, lateral drift from spin, and the aerodynamic loss versus a
    vacuum trajectory -- the quantity a constant-drag model cannot produce.
    """
    if v0_ms <= 0:
        raise ValueError("v0_ms must be positive")
    if not (0 < launch_angle_deg < 90):
        raise ValueError("launch_angle_deg must be in (0, 90)")

    th = math.radians(launch_angle_deg)
    az = math.radians(azimuth_deg)
    vx = v0_ms * math.cos(th) * math.cos(az)
    vy = v0_ms * math.cos(th) * math.sin(az)
    vz = v0_ms * math.sin(th)

    x = y = 0.0
    z = release_height_m
    spin_param = min(1.0, (spin_rpm / 60.0) / 30.0)  # SP in [0, 1]

    def accel(vx, vy, vz):
        relx, rely, relz = vx - wind_vx_ms, vy - wind_vy_ms, vz
        speed = math.sqrt(relx * relx + rely * rely + relz * relz)
        if speed < 1e-9:
            return 0.0, 0.0, -G
        cos_alpha = max(-1.0, min(1.0, relz / speed))
        alpha = math.acos(cos_alpha) + math.radians(wobble_angle_deg)
        c_d = c_d0 + c_dalpha2 * math.sin(alpha) ** 2
        q = 0.5 * air_density_kgm3 * speed ** 2 * BALL_AREA_M2 / BALL_MASS_KG
        ax_d = -q * c_d * relx / speed
        ay_d = -q * c_d * rely / speed
        az_d = -q * c_d * relz / speed

        c_l = c_l_spin * spin_param
        lift = q * c_l
        horiz = math.hypot(relx, rely)
        if horiz > 1e-9:
            px, py = -rely / horiz, relx / horiz
        else:
            px, py = 1.0, 0.0
        ax_m = lift * px * (relz / speed)
        ay_m = lift * py * (relz / speed)
        az_m = -lift * (horiz / speed)
        return ax_d + ax_m, ay_d + ay_m, az_d + az_m - G

    apex = z
    t = 0.0
    for _ in range(int(max_time_s / dt)):
        a1 = accel(vx, vy, vz)
        a2 = accel(vx + 0.5 * dt * a1[0], vy + 0.5 * dt * a1[1], vz + 0.5 * dt * a1[2])
        a3 = accel(vx + 0.5 * dt * a2[0], vy + 0.5 * dt * a2[1], vz + 0.5 * dt * a2[2])
        a4 = accel(vx + dt * a3[0], vy + dt * a3[1], vz + dt * a3[2])
        vx += dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0])
        vy += dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1])
        vz += dt / 6 * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2])
        x += vx * dt
        y += vy * dt
        z += vz * dt
        t += dt
        apex = max(apex, z)
        if z <= release_height_m and t > 0.2:
            break

    vz0 = v0_ms * math.sin(th)
    vx0 = v0_ms * math.cos(th)
    vacuum_carry = vx0 * (2 * vz0 / G)
    carry = math.hypot(x, y)
    loss = max(0.0, vacuum_carry - carry)
    return {
        "carry_distance_m": round(carry, 2),
        "carry_distance_yds": round(carry / 0.9144, 2),
        "hang_time_s": round(t, 3),
        "apex_height_m": round(apex, 2),
        "lateral_drift_m": round(y, 3),
        "vacuum_carry_m": round(vacuum_carry, 2),
        "aerodynamic_drag_loss_m": round(loss, 2),
        "drag_loss_pct": round(100 * loss / vacuum_carry, 2) if vacuum_carry else None,
        "constants": {"mass_kg": BALL_MASS_KG, "area_m2": round(BALL_AREA_M2, 6),
                      "c_d0": c_d0, "c_dalpha2": c_dalpha2},
    }
