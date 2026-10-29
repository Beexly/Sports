"""Reverse-engineer the pricing kernel from a book's own alternate ladder.

A book does not price 40 rungs by hand. It prices a distribution and reads the
ladder off the CDF. If that is true the ladder is recoverable: devig each rung,
fit a distribution to (line, probability), and the residuals tell you whether the
kernel is the one you guessed.

Recovers, per game: mu (fair line), sigma (their uncertainty), residual structure.
A tight fit = the kernel is identified and the book can be rebuilt.
"""
import json
import math
import statistics as st
import sys
from typing import Dict, List, Tuple

try:
    from scipy.special import erf, erfinv
except ImportError:
    def erf(x: float) -> float:
        return math.erf(x)

    def erfinv(x: float) -> float:
        # Winitzki approximation for inverse error function
        a = 0.147
        x_clamped = max(-0.999999, min(0.999999, x))
        log_term = math.log(1.0 - x_clamped * x_clamped)
        term1 = 2.0 / (math.pi * a) + log_term / 2.0
        inner = term1 * term1 - log_term / a
        sign = 1.0 if x >= 0 else -1.0
        return sign * math.sqrt(max(0.0, math.sqrt(max(0.0, inner)) - term1))

FEED = sys.argv[1] if len(sys.argv) > 1 else "/opt/model/data/pin_markets.json"


def prob(a: float) -> float:
    return 100.0 / (a + 100.0) if a > 0 else (-a) / (-a + 100.0)


def phi(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2)))


def fit_local(points: List[Tuple[float, float]]):
    """Narrow ladders cannot identify curvature, so identify the SLOPE:
    at the fair line dP/dline = -phi(0)/sigma, hence sigma = 1/(sqrt(2pi)|slope|).
    Returns (slope, fair_line, sigma, rmse)."""
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    mx, my = st.mean(xs), st.mean(ys)
    den = sum((x - mx) ** 2 for x in xs) or 1e-12
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den
    if slope <= 0:
        return slope, float("nan"), float("nan"), float("nan")
    mu = mx + (0.5 - my) / slope
    sigma = 1.0 / (math.sqrt(2 * math.pi) * slope)
    rmse = math.sqrt(sum((y - (my + slope * (x - mx))) ** 2 for x, y in zip(xs, ys)) / len(xs))
    return slope, mu, sigma, rmse


def fit_book_pricing_kernel(alt_rungs: List[Tuple[float, int, int]]) -> Dict[str, float]:
    """Fit a normal CDF pricing kernel to alternate market rungs.

    Takes a list of (line, over_or_home_american_odds, under_or_away_american_odds) rungs,
    de-vigs each rung multiplicatively, fits the normal CDF pricing kernel,
    and returns {"mu": float, "sigma": float, "rmse": float}.
    """
    if not alt_rungs:
        return {"mu": float("nan"), "sigma": float("nan"), "rmse": float("nan")}

    pts: List[Tuple[float, float]] = []
    for line, o_odds, u_odds in alt_rungs:
        po = prob(float(o_odds))
        pu = prob(float(u_odds))
        s = po + pu
        if s > 0:
            y = max(1e-6, min(1.0 - 1e-6, po / s))
            pts.append((float(line), float(y)))

    if len(pts) < 2:
        return {"mu": float("nan"), "sigma": float("nan"), "rmse": float("nan")}

    xs = [x for x, _ in pts]
    ys = [y for _, y in pts]
    zs = [math.sqrt(2) * erfinv(2.0 * y - 1.0) for y in ys]

    mx = st.mean(xs)
    mz = st.mean(zs)
    den = sum((x - mx) ** 2 for x in xs) or 1e-12
    slope = sum((x - mx) * (z - mz) for x, z in zip(xs, zs)) / den

    if abs(slope) < 1e-9:
        return {"mu": float(mx), "sigma": 100.0, "rmse": 0.0}

    sigma = 1.0 / abs(slope)
    mu = mx - mz / slope

    y_preds = [0.5 * (1.0 + erf((mz + slope * (x - mx)) / math.sqrt(2))) for x in xs]
    rmse = math.sqrt(sum((yp - y) ** 2 for yp, y in zip(y_preds, ys)) / len(ys))

    return {
        "mu": float(round(mu, 4)),
        "sigma": float(round(sigma, 4)),
        "rmse": float(round(rmse, 6)),
    }


def main():
    d = json.load(open(FEED))
    by_game = {}
    for m in d:
        if m["type"] != "spread" or not m.get("isAlternate"):
            continue
        if m["key"].split(";")[1] != "0":
            continue
        by_game.setdefault(m["matchupId"], []).append(m)

    print(f"{'game':>12s} {'rungs':>5s} {'fair':>6s} {'sigma':>6s} {'rmse':>7s}  span")
    rows = []
    for gid, ms in by_game.items():
        pts = []
        for m in ms:
            pr = [p for p in m.get("prices", []) if p.get("price") is not None]
            if len(pr) != 2:
                continue
            home = [p for p in pr if p.get("designation") == "home"]
            if not home or home[0].get("points") is None:
                continue
            raw = [prob(p["price"]) for p in pr]
            s = sum(raw)
            if s <= 1:
                continue
            pts.append((home[0]["points"], raw[0] / s))
        if len(pts) < 8:
            continue
        slope, mu, sigma, rmse = fit_local(pts)
        rows.append((gid, len(pts), mu, sigma, rmse))
        print(f"{gid:12d} {len(pts):5d} {mu:6.2f} {sigma:6.2f} {rmse:7.4f}  span={min(x for x,_ in pts):+.1f}..{max(x for x,_ in pts):+.1f}")

    if rows:
        print(f"\nmean sigma={st.mean([r[3] for r in rows]):.2f} pts  (sd of margin implied by the ladder slope)")


if __name__ == "__main__":
    main()
