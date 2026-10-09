"""Glicko-2, period-parallel, Illinois volatility. Stdlib only.

Scale 173.7178, tau 0.5. Calls use math.exp, math.sqrt, math.pi, math.log.
No bare exp/sqrt/pi/log names. Newton is not the solver.
"""

import math


SCALE = 173.7178
TAU = 0.5


def g(phi):
    return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi * math.pi))


def expected(mu, mu_j, phi_j):
    return 1.0 / (1.0 + math.exp(-g(phi_j) * (mu - mu_j)))


def f_volatility(x, delta, phi, v, a, tau):
    """f(x) = 0 at x = ln(sigma'^2)."""
    ex = math.exp(x)
    return (
        ex * (delta * delta - phi * phi - v - ex) / (2.0 * (phi * phi + v + ex) ** 2)
        - (x - a) / (tau * tau)
    )


def illinois_volatility(delta, phi, v, sigma, tau=TAU):
    """Illinois regula falsi. Not Newton. Not plain false position.

    Chord: C = A + (A - B) * fA / (fB - fA).
    If f(C) and f(B) have opposite signs, set A = B. Else halve fA.
    Always set B = C. Stop at |A - B| < 1e-6. sigma' = exp(A / 2).
    """
    a = math.log(sigma * sigma)
    big_a = a
    f_a = f_volatility(big_a, delta, phi, v, a, tau)
    if delta * delta > phi * phi + v:
        big_b = math.log(delta * delta - phi * phi - v)
    else:
        k = 1
        while True:
            big_b = a - k * tau
            f_b = f_volatility(big_b, delta, phi, v, a, tau)
            if f_b * f_a <= 0.0:
                break
            k += 1
            if k > 200:
                raise RuntimeError("Illinois bracket failed")
    f_b = f_volatility(big_b, delta, phi, v, a, tau)
    first = None
    for _ in range(100):
        if abs(big_a - big_b) < 1e-6:
            break
        c = big_a + (big_a - big_b) * f_a / (f_b - f_a)
        f_c = f_volatility(c, delta, phi, v, a, tau)
        if first is None:
            first = (c, f_c)
        if f_c * f_b < 0.0:
            big_a = big_b
            f_a = f_b
        else:
            f_a = f_a / 2.0
        big_b = c
        f_b = f_c
    sigma_prime = math.exp(big_a / 2.0)
    return sigma_prime, first, big_a


def glicko2_parallel(rating, rd, sigma, games, tau=TAU):
    """One period. Every game uses the pre-period rating, RD, and sigma.

    games: (opponent_rating, opponent_rd, score) with score in {0, 1}.
    Order does not change the result.
    """
    mu = (rating - 1500.0) / SCALE
    phi = rd / SCALE
    opps = []
    for opp_r, opp_rd, score in games:
        opps.append(((opp_r - 1500.0) / SCALE, opp_rd / SCALE, float(score)))
    gs = []
    es = []
    for mu_j, phi_j, _score in opps:
        gs.append(g(phi_j))
        es.append(expected(mu, mu_j, phi_j))
    v = 1.0 / sum(gj * gj * ej * (1.0 - ej) for gj, ej in zip(gs, es))
    acc = sum(gj * (score - ej) for gj, ej, (_mj, _pj, score) in zip(gs, es, opps))
    delta = v * acc
    sigma_p, first, root = illinois_volatility(delta, phi, v, sigma, tau)
    phi_star = math.sqrt(phi * phi + sigma_p * sigma_p)
    phi_p = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + 1.0 / v)
    mu_p = mu + phi_p * phi_p * acc
    return {
        "rating": mu_p * SCALE + 1500.0,
        "rd": phi_p * SCALE,
        "sigma": sigma_p,
        "first_chord": first,
        "root": root,
    }


def glicko2_sequential(rating, rd, sigma, games, tau=TAU):
    """One game per period. RD shrinks between games, so the path is not parallel."""
    for game in games:
        step = glicko2_parallel(rating, rd, sigma, [game], tau)
        rating, rd, sigma = step["rating"], step["rd"], step["sigma"]
    return {"rating": rating, "rd": rd, "sigma": sigma}


def _false_position_cubic(iters=20):
    """Plain false position, no halving. Right endpoint of [2, 3] stays at 3."""

    def f(x):
        return x * x * x - 2.0 * x - 5.0

    a, b = 2.0, 3.0
    fa, fb = f(a), f(b)
    for _ in range(iters):
        c = a + (a - b) * fa / (fb - fa)
        fc = f(c)
        if fa * fc < 0.0:
            b, fb = c, fc
        else:
            a, fa = c, fc
    return a, b


def _illinois_cubic(iters=40):
    """Same chord as Illinois. Halving lets the stuck end move. Root ~ 2.094551."""

    def f(x):
        return x * x * x - 2.0 * x - 5.0

    a, b = 2.0, 3.0
    fa, fb = f(a), f(b)
    for _ in range(iters):
        if abs(a - b) < 1e-10:
            break
        c = a + (a - b) * fa / (fb - fa)
        fc = f(c)
        if fc * fb < 0.0:
            a, fa = b, fb
        else:
            fa = fa / 2.0
        b, fb = c, fc
    return a, b, f


def self_check():
    games = [(1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)]
    par = glicko2_parallel(1500.0, 200.0, 0.06, games)
    rev = glicko2_parallel(1500.0, 200.0, 0.06, list(reversed(games)))
    seq = glicko2_sequential(1500.0, 200.0, 0.06, games)
    chord, f_chord = par["first_chord"]
    print(
        "parallel %.2f / %.2f / %.6f   paper 1464.06 / 151.52 / 0.05999"
        % (par["rating"], par["rd"], par["sigma"])
    )
    print("first chord C=%.6f f=%.3e sigma'=%.6f" % (chord, f_chord, par["sigma"]))
    print(
        "sequential %.2f / %.2f / %.5f   (near 1463.79 / 151.87 / 0.06000, sigma is not 2)"
        % (seq["rating"], seq["rd"], seq["sigma"])
    )
    assert abs(par["rating"] - 1464.05) < 0.02
    assert abs(par["rd"] - 151.52) < 0.02
    assert abs(par["sigma"] - 0.059996) < 1e-5
    # Five-decimal rounding of 0.059996 prints 0.06000. That hide is not the value.
    assert abs(par["sigma"] - 0.06) > 1e-6
    assert f"{par['sigma']:.6f}" == "0.059996"
    assert abs(chord - (-5.626955)) < 1e-5
    assert abs(f_chord) < 1e-6
    assert abs(par["rating"] - rev["rating"]) < 1e-8
    assert abs(par["rd"] - rev["rd"]) < 1e-8
    assert abs(par["sigma"] - rev["sigma"]) < 1e-12
    assert abs(seq["rating"] - 1463.79) < 0.02
    assert abs(seq["rd"] - 151.87) < 0.02
    assert abs(seq["sigma"] - 0.06000) < 1e-4
    assert seq["sigma"] < 0.2

    dozen = [(1900.0, 30.0, 1.0)] * 12
    par12 = glicko2_parallel(1500.0, 200.0, 0.06, dozen)
    seq12 = glicko2_sequential(1500.0, 200.0, 0.06, dozen)
    print(
        "12 wins vs 1900 RD 30: parallel %.1f sequential %.1f (about 2577 / about 2143)"
        % (par12["rating"], seq12["rating"])
    )
    print(
        "sequential sigma %.5f (not 2). Gap is RD shrinkage between games, not a formula error."
        % seq12["sigma"]
    )
    assert abs(par12["rating"] - 2577.0) < 15.0
    assert abs(seq12["rating"] - 2143.0) < 2.0
    assert seq12["sigma"] < 0.2
    shuffled = list(reversed(dozen))
    par12b = glicko2_parallel(1500.0, 200.0, 0.06, shuffled)
    assert abs(par12["rating"] - par12b["rating"]) < 1e-6

    _a, b_stuck = _false_position_cubic(15)
    a_i, b_i, f_cube = _illinois_cubic()
    root = 0.5 * (a_i + b_i)
    print(
        "false position x^3-2x-5 right endpoint %.1f (stuck). Illinois root %.6f f=%.2e"
        % (b_stuck, root, f_cube(root))
    )
    assert b_stuck == 3.0
    assert abs(root - 2.0945514815) < 1e-6
    print("glicko2 self_check ok")


if __name__ == "__main__":
    self_check()
