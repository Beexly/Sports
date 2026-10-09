"""Idle period and draw score for Glicko-2. Research only.

Idle: rating and sigma unchanged. RD grows by sqrt(phi^2 + sigma^2).
No volatility solve. A bye is this step, not a skipped team.

Draw: score 0.5 is a legal Glickman outcome. The Bernoulli variance
term still uses E(1-E). A draw is not a win and not a loss.
"""

import math

SCALE = 173.7178


def glicko2_idle(rating, rd, sigma):
    phi = rd / SCALE
    phi_star = math.sqrt(phi * phi + sigma * sigma)
    return {
        "rating": rating,
        "rd": phi_star * SCALE,
        "sigma": sigma,
        "label": "idle period, no volatility solve",
    }


def draw_score(score):
    s = float(score)
    if s < 0.0 or s > 1.0:
        raise ValueError("score must be in [0, 1]")
    return s


def self_check():
    one = glicko2_idle(1500.0, 200.0, 0.06)
    rd = 200.0
    for _ in range(4):
        rd = glicko2_idle(1500.0, rd, 0.06)["rd"]
    rd17 = 200.0
    for _ in range(17):
        rd17 = glicko2_idle(1500.0, rd17, 0.06)["rd"]
    print("idle 1: RD %.2f (200.27)" % one["rd"])
    print("idle 4: RD %.2f (201.08)" % rd)
    print("idle 17: RD %.2f (204.57)" % rd17)
    assert abs(one["rd"] - 200.2714) < 1e-3
    assert abs(rd - 201.0835) < 1e-3
    assert abs(rd17 - 204.5651) < 1e-3
    assert one["rating"] == 1500.0 and one["sigma"] == 0.06
    assert draw_score(0.5) == 0.5
    print("glicko2_idle ok")


if __name__ == "__main__":
    self_check()
