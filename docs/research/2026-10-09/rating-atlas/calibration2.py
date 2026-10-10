"""Platt, temperature, beta calibration, split conformal, ECE. Stdlib only.

Do not claim a coverage of 0.908 unless this seed prints 0.908.
Dossier 0.908 is a different draw.
"""

import math
import random


def expit(x):
    if x >= 0.0:
        return 1.0 / (1.0 + math.exp(-x))
    z = math.exp(x)
    return z / (1.0 + z)


def logit(p):
    p = min(max(p, 1e-8), 1.0 - 1e-8)
    return math.log(p / (1.0 - p))


def clip(p):
    return min(max(p, 1e-8), 1.0 - 1e-8)


def brier(probs, outcomes):
    n = len(probs)
    return sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / n


def nll(probs, outcomes):
    total = 0.0
    for p, o in zip(probs, outcomes):
        p = clip(p)
        total -= o * math.log(p) + (1.0 - o) * math.log(1.0 - p)
    return total / len(probs)


def platt_fit(scores, outcomes, iters=25):
    """sigmoid(a * score + b). Newton, tiny ridge so separation does not explode."""
    a, b = 1.0, 0.0
    for _ in range(iters):
        g_a = 0.0
        g_b = 0.0
        h_aa = 1e-6
        h_ab = 0.0
        h_bb = 1e-6
        for score, y in zip(scores, outcomes):
            s = expit(a * score + b)
            err = s - y
            w = s * (1.0 - s)
            g_a += err * score
            g_b += err
            h_aa += w * score * score
            h_ab += w * score
            h_bb += w
        det = h_aa * h_bb - h_ab * h_ab
        if abs(det) < 1e-18:
            break
        a -= (h_bb * g_a - h_ab * g_b) / det
        b -= (h_aa * g_b - h_ab * g_a) / det
    return a, b


def platt_apply(score, a, b):
    return expit(a * score + b)


def temperature_nll(probs, outcomes, temperature):
    total = 0.0
    for p, y in zip(probs, outcomes):
        s = expit(logit(p) / temperature)
        s = clip(s)
        total -= y * math.log(s) + (1.0 - y) * math.log(1.0 - s)
    return total / len(probs)


def temperature_fit(probs, outcomes):
    """Golden section on T > 0."""
    lo, hi = 0.05, 8.0
    phi = (math.sqrt(5.0) - 1.0) / 2.0
    x1 = hi - phi * (hi - lo)
    x2 = lo + phi * (hi - lo)
    f1 = temperature_nll(probs, outcomes, x1)
    f2 = temperature_nll(probs, outcomes, x2)
    for _ in range(40):
        if f1 < f2:
            hi = x2
            x2, f2 = x1, f1
            x1 = hi - phi * (hi - lo)
            f1 = temperature_nll(probs, outcomes, x1)
        else:
            lo = x1
            x1, f1 = x2, f2
            x2 = lo + phi * (hi - lo)
            f2 = temperature_nll(probs, outcomes, x2)
    return 0.5 * (lo + hi)


def temperature_apply(p, temperature):
    return expit(logit(p) / temperature)


def research_wire_temperature(pairs):
    """RESEARCH PATH ONLY. Not published. No MODEL_VERSION bump. No gate flip.

    The 3-line application of the existing fit, per the 2026-10-10 pack:
        T = temperature_fit(probs, outcomes)
        calibrated = [temperature_apply(p, T) for p in probs]
        before/after ECE and Brier reported, never wired anywhere else.
    Founder gate unchanged: n >= 100, Brier <= 0.22, ECE <= 0.05, three
    consecutive green runs. This helper only measures the drop.
    """
    probs = [p for p, _ in pairs]
    outcomes = [float(o) for _, o in pairs]
    T = temperature_fit(probs, outcomes)
    calibrated = [temperature_apply(p, T) for p in probs]
    b_before = sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / len(pairs)
    b_after = sum((p - o) ** 2 for p, o in zip(calibrated, outcomes)) / len(pairs)
    return {
        "T": T,
        "n": len(pairs),
        "ece_before": ece(probs, outcomes),
        "ece_after": ece(calibrated, outcomes),
        "brier_before": b_before,
        "brier_after": b_after,
    }


def beta_map(p, a, b, c):
    """logit(p') = c + a log p + b log(1-p). Identity is a=1, b=-1, c=0."""
    p = clip(p)
    return expit(c + a * math.log(p) + b * math.log(1.0 - p))


def beta_fit(probs, outcomes, steps=80, step=0.15):
    """Coordinate descent on log loss. a, b, c."""
    a, b, c = 1.0, -1.0, 0.0
    base = nll([beta_map(p, a, b, c) for p in probs], outcomes)
    for _ in range(steps):
        improved = False
        for di, name in ((0, "a"), (1, "b"), (2, "c")):
            for delta in (step, -step):
                trial = [a, b, c]
                trial[di] += delta
                loss = nll([beta_map(p, trial[0], trial[1], trial[2]) for p in probs], outcomes)
                if loss < base - 1e-12:
                    a, b, c = trial
                    base = loss
                    improved = True
                    break
        if not improved:
            step *= 0.5
            if step < 1e-3:
                break
    return a, b, c, base


def split_conformal_q(residuals, alpha):
    """q = residuals[ceil((n+1)(1-alpha)) - 1] on the sorted absolute residuals."""
    ordered = sorted(residuals)
    n = len(ordered)
    idx = math.ceil((n + 1) * (1.0 - alpha)) - 1
    if idx >= n:
        return float("inf")
    if idx < 0:
        idx = 0
    return ordered[idx]


def gaussian_coverage(seed, n_cal=1000, n_test=1000, alpha=0.1):
    """Exchangeable N(0,1), model predicts 0. Coverage should clear 1 - alpha."""
    rng = random.Random(seed)
    cal = [abs(rng.gauss(0.0, 1.0)) for _ in range(n_cal)]
    q = split_conformal_q(cal, alpha)
    test = [rng.gauss(0.0, 1.0) for _ in range(n_test)]
    hit = sum(1 for y in test if abs(y) <= q)
    return {"coverage": hit / n_test, "q": q, "seed": seed, "alpha": alpha}


def ece(probs, outcomes, n_bins=10):
    n = len(probs)
    buckets = [[] for _ in range(n_bins)]
    for p, o in zip(probs, outcomes):
        k = min(n_bins - 1, max(0, int(p * n_bins)))
        if p >= 1.0:
            k = n_bins - 1
        buckets[k].append((p, o))
    err = 0.0
    for bucket in buckets:
        if not bucket:
            continue
        conf = sum(p for p, _ in bucket) / len(bucket)
        acc = sum(o for _, o in bucket) / len(bucket)
        err += (len(bucket) / n) * abs(acc - conf)
    return err


def overconfident_demo(seed=21, n=500):
    """Forecasts sharpened with T=0.5. Refit may drop Brier. Seed is printed."""
    rng = random.Random(seed)
    probs = []
    outcomes = []
    latents = []
    for _ in range(n):
        latent = rng.uniform(-1.5, 1.5)
        p_true = expit(latent)
        p_hat = expit(latent / 0.5)
        y = 1.0 if rng.random() < p_true else 0.0
        latents.append(latent)
        probs.append(p_hat)
        outcomes.append(y)
    before = brier(probs, outcomes)
    temperature = temperature_fit(probs, outcomes)
    after_p = [temperature_apply(p, temperature) for p in probs]
    after = brier(after_p, outcomes)
    return {
        "seed": seed,
        "brier_before": before,
        "brier_after": after,
        "temperature": temperature,
        "probs": probs,
        "outcomes": outcomes,
        "latents": latents,
    }


def self_check():
    rng = random.Random(4)
    scores = []
    outcomes = []
    for _ in range(300):
        score = rng.uniform(-2.0, 2.0)
        p = expit(0.8 * score - 0.2)
        scores.append(score)
        outcomes.append(1.0 if rng.random() < p else 0.0)
    a, b = platt_fit(scores, outcomes)
    fitted = [platt_apply(s, a, b) for s in scores]
    assert nll(fitted, outcomes) <= nll([clip(expit(s)) for s in scores], outcomes) + 1e-6
    print("platt a=%.3f b=%.3f" % (a, b))

    demo = overconfident_demo(seed=21, n=500)
    print(
        "overconfident seed %d T=%.3f brier %.4f -> %.4f"
        % (demo["seed"], demo["temperature"], demo["brier_before"], demo["brier_after"])
    )
    assert demo["brier_after"] < demo["brier_before"]

    beta_probs = []
    beta_y = []
    rng = random.Random(5)
    for _ in range(250):
        p = clip(rng.random())
        # Distort with a known beta map, then refit should not raise NLL.
        p_bad = beta_map(p, 1.4, -0.6, 0.1)
        beta_probs.append(p_bad)
        beta_y.append(1.0 if rng.random() < p else 0.0)
    raw = nll(beta_probs, beta_y)
    ba, bb, bc, fitted_nll = beta_fit(beta_probs, beta_y)
    print("beta a=%.3f b=%.3f c=%.3f nll %.4f -> %.4f" % (ba, bb, bc, raw, fitted_nll))
    assert fitted_nll <= raw + 1e-9

    # Index check: n=4, alpha=0.25 -> (5)*0.75 = 3.75, ceil 4, index 3 (last).
    q = split_conformal_q([0.1, 0.4, 0.2, 0.3], 0.25)
    assert abs(q - 0.4) < 1e-12

    cover = gaussian_coverage(seed=2, n_cal=1000, n_test=1000, alpha=0.1)
    print(
        "split conformal seed %d alpha %.2f q=%.3f coverage %.4f (floor %.2f)"
        % (cover["seed"], cover["alpha"], cover["q"], cover["coverage"], 1.0 - cover["alpha"])
    )
    assert cover["coverage"] + 1e-12 >= 1.0 - cover["alpha"]
    if abs(cover["coverage"] - 0.908) < 1e-9:
        print("this seed printed 0.908; dossier 0.908 is still a different draw")
    else:
        print("coverage is not 0.908; dossier 0.908 is a different draw and is not cited as this one")

    perfect = ece([1.0, 1.0, 0.0, 0.0], [1.0, 1.0, 0.0, 0.0])
    assert perfect < 1e-12
    print("ece perfect %.3f overconfident %.3f" % (perfect, ece(demo["probs"], demo["outcomes"])))
    print("calibration2 self_check ok")


if __name__ == "__main__":
    self_check()
