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

FEED = sys.argv[1] if len(sys.argv) > 1 else "/opt/model/data/pin_markets.json"


def prob(a):
    return 100 / (a + 100) if a > 0 else (-a) / (-a + 100)


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def fit_local(points):
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
