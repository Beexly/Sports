"""Drop-in replacement for analyze_nfl.ci.

The shipped function divides by sqrt(n). That is a CI of the posterior mean.
On n=2025 and posterior sd 0.30 it prints about [1.54, 1.59].
The posterior interval is the 2.5 and 97.5 percentiles of the draws.
Research only. Not a pick. Do not retune production.
"""

import math


def mean_ci(xs, z=1.96):
    """CI of the mean. Do not cite as the posterior interval."""
    n = len(xs)
    if n < 2:
        raise ValueError("need at least 2 draws")
    m = sum(xs) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1))
    half = z * sd / math.sqrt(n)
    return {
        "mean": m,
        "sd": sd,
        "interval": (m - half, m + half),
        "object": "ci of the posterior mean — do not cite",
    }


def draws_interval(xs):
    """95% posterior interval from the draws. This is the one to print."""
    ys = sorted(float(x) for x in xs)
    n = len(ys)
    if n < 2:
        raise ValueError("need at least 2 draws")

    def q(p):
        x = p * (n - 1)
        lo = int(math.floor(x))
        hi = min(lo + 1, n - 1)
        w = x - lo
        return ys[lo] * (1.0 - w) + ys[hi] * w

    m = sum(ys) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in ys) / (n - 1))
    return {
        "mean": m,
        "sd": sd,
        "interval": (q(0.025), q(0.975)),
        "object": "draw percentiles",
    }


def report(name, xs):
    narrow = mean_ci(xs)
    wide = draws_interval(xs)
    return (
        "%s mean %.3f sd %.3f | DO NOT CITE mean-CI %s | draws interval %s"
        % (name, wide["mean"], wide["sd"],
           tuple(round(v, 3) for v in narrow["interval"]),
           tuple(round(v, 3) for v in wide["interval"]))
    )


def self_check():
    # sd about 0.30, n=400. Mean-CI is much narrower than the draws interval.
    xs = [1.56 + 0.30 * math.sin(i * 0.17) for i in range(400)]
    narrow = mean_ci(xs)
    wide = draws_interval(xs)
    narrow_w = narrow["interval"][1] - narrow["interval"][0]
    wide_w = wide["interval"][1] - wide["interval"][0]
    print(report("hfa", xs))
    assert wide_w > 5.0 * narrow_w
    assert narrow["object"].startswith("ci of the posterior mean")
    assert wide["object"] == "draw percentiles"
    print("interval_fix self_check ok")


if __name__ == "__main__":
    self_check()
