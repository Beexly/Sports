"""Posterior interval from draws. Replaces analyze_nfl.ci().

ci() returns mean +/- 1.96 * sd / sqrt(n). That is a CI of the posterior
mean. It is what printed HFA [1.54, 1.59] and sigma [13.34, 13.37].
Do not use it as the posterior interval.
"""

import math


def ci_of_mean(xs, z=1.96):
    """The object that must not be cited as the posterior interval."""
    n = len(xs)
    m = sum(xs) / n
    sd = (sum((x - m) ** 2 for x in xs) / max(n - 1, 1)) ** 0.5
    half = z * sd / math.sqrt(n)
    return m, sd, (m - half, m + half)


def interval_from_draws(xs):
    ys = sorted(xs)
    n = len(ys)
    m = sum(ys) / n
    sd = (sum((x - m) ** 2 for x in ys) / max(n - 1, 1)) ** 0.5

    def q(p):
        x = p * (n - 1)
        lo = int(math.floor(x))
        hi = min(lo + 1, n - 1)
        w = x - lo
        return ys[lo] * (1.0 - w) + ys[hi] * w

    return {
        "mean": m,
        "sd": sd,
        "p2_5": q(0.025),
        "p97_5": q(0.975),
        "label": "posterior draws interval, not a CI of the mean",
    }


def self_check():
    # 2025 draws, mean 1.56, sd 0.30. The mean-CI is about +/- 0.013.
    xs = [1.56 + 0.30 * math.sin(i) for i in range(2025)]
    mean, sd, narrow = ci_of_mean(xs)
    wide = interval_from_draws(xs)
    print("mean-CI %.3f..%.3f (do not cite)" % narrow)
    print("draws %.3f..%.3f sd %.3f" % (wide["p2_5"], wide["p97_5"], wide["sd"]))
    assert (narrow[1] - narrow[0]) < 0.05
    assert (wide["p97_5"] - wide["p2_5"]) > 0.5
    print("interval_from_draws ok")


if __name__ == "__main__":
    self_check()
