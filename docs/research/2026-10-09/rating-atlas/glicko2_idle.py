"""Idle and draw rules for Glicko-2. Research only. Not a pick.

Paper: if a player does not compete, only step 6 applies.
Rating and sigma stay. RD grows by phi* = sqrt(phi^2 + sigma^2).
A draw is a score of 0.5. The packet file has no draw special case.
Week-as-period for NFL is one game, so a season is sequential.
That is a period decision, not a bug in the parallel function.
"""

import math

SCALE = 173.7178


def idle_rd(rd, sigma, periods=1):
    if periods < 0:
        raise ValueError("periods")
    phi = rd / SCALE
    phi_star = math.sqrt(phi * phi + periods * sigma * sigma)
    return phi_star * SCALE


def score_or_draw(score):
    s = float(score)
    if s not in (0.0, 0.5, 1.0):
        raise ValueError("score must be 0, 0.5, or 1")
    return s


def self_check():
    one = idle_rd(200.0, 0.06, 1)
    four = idle_rd(200.0, 0.06, 4)
    seventeen = idle_rd(200.0, 0.06, 17)
    print("idle RD from 200/0.06: 1w %.2f  4w %.2f  17w %.2f" % (one, four, seventeen))
    assert abs(one - 200.27) < 0.02
    assert abs(four - 201.08) < 0.02
    assert abs(seventeen - 204.57) < 0.05
    assert score_or_draw(0.5) == 0.5
    print("glicko2_idle self_check ok")


if __name__ == "__main__":
    self_check()
