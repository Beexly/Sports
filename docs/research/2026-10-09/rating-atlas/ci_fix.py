"""Replacement for analyze_nfl.ci().

The shipped function returns mean +/- 1.96 * sd / sqrt(n).
That is a confidence interval of the posterior mean.
It is what printed HFA [1.54, 1.59] and sigma [13.34, 13.37].

Report the 2.5 and 97.5 percentiles of the draws.
For sigma and tau, take the percentiles of the standard deviations,
not the square root of a variance mean-CI.
"""

import math


def ci_of_mean(xs, z=1.96):
    """Do not cite this as the posterior interval."""
    n = len(xs)
    m = sum(xs) / n
    var = sum((x - m) ** 2 for x in xs) / max(n - 1, 1)
    sd = math.sqrt(var)
    half = z * sd / math.sqrt(n)
    return m, sd, (m - half, m + half)


def quantile(xs, p):
    ys = sorted(xs)
    if not ys:
        raise ValueError("empty draws")
    x = p * (len(ys) - 1)
    lo = int(math.floor(x))
    hi = min(lo + 1, len(ys) - 1)
    w = x - lo
    return ys[lo] * (1.0 - w) + ys[hi] * w


def interval_from_draws(xs):
    n = len(xs)
    m = sum(xs) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / max(n - 1, 1))
    return {
        "mean": m,
        "sd": sd,
        "lo": quantile(xs, 0.025),
        "hi": quantile(xs, 0.975),
        "label": "2.5/97.5 of the draws, not a CI of the mean",
    }


def report_gibbs(draws):
    """draws keys: hfa (points), sigma2, tau2."""
    hfa = interval_from_draws(draws["hfa"])
    sigma = interval_from_draws([math.sqrt(v) for v in draws["sigma2"]])
    tau = interval_from_draws([math.sqrt(v) for v in draws["tau2"]])
    return {"hfa": hfa, "sigma": sigma, "tau": tau}


def format_report(rep):
    lines = []
    for name in ("hfa", "sigma", "tau"):
        row = rep[name]
        lines.append(
            "%s mean %.2f draws %.2f..%.2f (%s)"
            % (name, row["mean"], row["lo"], row["hi"], row["label"])
        )
    return lines


# Exact replacement for the three call sites in analyze_nfl.py.
# OLD:
#   tau_m, tau_sd, tau_ci = ci(draws["tau2"])
#   sig_m, sig_sd, sig_ci = ci(draws["sigma2"])
#   hfa_m, hfa_sd, hfa_ci = ci(draws["hfa"])
#   print(... math.sqrt(tau_ci[0]) ...)
# NEW:
#   rep = report_gibbs(draws)
#   print("\n".join(format_report(rep)))


def self_check():
    import random
    rng = random.Random(7)
    hfa = [rng.gauss(1.56, 0.30) for _ in range(500)]
    sigma = [abs(rng.gauss(13.36, 0.40)) for _ in range(500)]
    _, _, narrow_h = ci_of_mean(hfa)
    _, _, narrow_s = ci_of_mean(sigma)
    wide_h = interval_from_draws(hfa)
    wide_s = interval_from_draws(sigma)
    print("hfa mean-CI %.3f..%.3f (do not cite)" % narrow_h)
    print("hfa draws %.3f..%.3f" % (wide_h["lo"], wide_h["hi"]))
    print("sigma mean-CI %.3f..%.3f (do not cite)" % narrow_s)
    print("sigma draws %.3f..%.3f" % (wide_s["lo"], wide_s["hi"]))
    assert (narrow_h[1] - narrow_h[0]) < 0.08
    assert (wide_h["hi"] - wide_h["lo"]) > 0.8
    assert (narrow_s[1] - narrow_s[0]) < 0.12
    assert (wide_s["hi"] - wide_s["lo"]) > 1.0
    print("ci_fix ok")


if __name__ == "__main__":
    self_check()
