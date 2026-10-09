"""Team-total sign and posterior intervals. Research only. Not a pick.

Listed spread is the book home number. Favorite is negative.
mu_margin = -listed_spread.
Home total = (T - listed) / 2. Away total = (T + listed) / 2.
Listed -3 on 48.5 is home 25.75, away 22.75.

Do not use analyze_nfl.ci(). That function divides by sqrt(n) and reprints
[1.54, 1.59]. Report the 2.5 and 97.5 percentiles of the draws.
"""

import math


def team_total_split(total, listed_spread):
    listed = float(listed_spread)
    total = float(total)
    home = (total - listed) / 2.0
    away = (total + listed) / 2.0
    return home, away


def team_total_dist(total, listed_spread, sigma_team=11.5):
    home, away = team_total_split(total, listed_spread)
    return home, away, sigma_team


def mean_ci(xs, z=1.96):
    """CI of the posterior mean. Do not print this as the posterior interval."""
    n = len(xs)
    m = sum(xs) / n
    var = sum((x - m) ** 2 for x in xs) / max(n - 1, 1)
    half = z * math.sqrt(var) / math.sqrt(n)
    return m, (m - half, m + half)


def draws_interval(xs):
    ys = sorted(xs)
    n = len(ys)

    def q(p):
        x = p * (n - 1)
        lo = int(math.floor(x))
        hi = min(lo + 1, n - 1)
        w = x - lo
        return ys[lo] * (1.0 - w) + ys[hi] * w

    return q(0.025), q(0.975)


def self_check():
    home, away = team_total_split(48.5, -3.0)
    wrong_home = (48.5 + (-3.0)) / 2.0
    assert abs(home - 25.75) < 1e-12
    assert abs(away - 22.75) < 1e-12
    assert abs(home - wrong_home) > 1.0
    assert abs((home + away) - 48.5) < 1e-12
    assert abs((home - away) - 3.0) < 1e-12
    draws = [1.0 + 0.3 * math.sin(i) for i in range(400)]
    mean, narrow = mean_ci(draws)
    wide = draws_interval(draws)
    assert (narrow[1] - narrow[0]) < (wide[1] - wide[0]) / 5.0
    print("team totals -3 on 48.5 -> %.2f / %.2f (wrong home %.2f)" % (home, away, wrong_home))
    print("mean CI half-width %.4f; draws interval %.3f..%.3f" % ((narrow[1] - narrow[0]) / 2, wide[0], wide[1]))
    print("sign_and_interval self_check ok")


if __name__ == "__main__":
    self_check()
