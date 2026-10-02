"""iWinRNFL team ratings. The paper's least-squares equation, not its win probability.

Source: Pelechrinis, arXiv:1704.00197v3, appendix. For matchup m, home margin
mu_m, home edge h, and team ratings R:

    minimize_{h, R}  sum_m (mu_m - (h + R_home - R_away))^2
    subject to       sum_i R_i = 0

Ratings for week w use only games before that week. Pre-season win totals
are not in this repo, so the paper's gamma blend is not applied. The logistic
in Table 1 still refuses: its inputs are standardized and the means were not
printed. sigma=14 is the paper's stated approximation for a pre-game normal,
not a value fitted here. It is not a published pick.
"""
from __future__ import annotations

import math
from typing import Iterable, Mapping, Sequence

PAPER = "1704.00197v3"
SIGMA_POINTS = 14.0
SIGMA_SOURCE = "paper stated approximation, citation [16], not fitted on this book"


class RatingGap(Exception):
    """The equation cannot be evaluated. Do not fill the gap with a prior."""


def _solve(games: Sequence[Mapping[str, object]]) -> dict[str, float]:
    teams = sorted({str(g["home"]) for g in games} | {str(g["away"]) for g in games})
    if len(teams) < 2 or not games:
        raise RatingGap(f"{PAPER}: not enough games to solve the rating equation")
    last = len(teams) - 1
    index = {team: i for i, team in enumerate(teams)}
    width = len(teams)  # intercept + free ratings; last rating is minus their sum
    # Build the normal equations directly. n is a few thousand, p is 33.
    ata = [[0.0] * width for _ in range(width)]
    aty = [0.0] * width
    for game in games:
        margin = float(game["margin"])
        row = [0.0] * width
        row[0] = 1.0
        home_i = index[str(game["home"])]
        away_i = index[str(game["away"])]
        if home_i == last:
            for j in range(1, width):
                row[j] -= 1.0
        else:
            row[1 + home_i] += 1.0
        if away_i == last:
            for j in range(1, width):
                row[j] += 1.0
        else:
            row[1 + away_i] -= 1.0
        for a in range(width):
            aty[a] += row[a] * margin
            for b in range(width):
                ata[a][b] += row[a] * row[b]
    beta = _solve_linear(ata, aty)
    ratings = {team: 0.0 for team in teams}
    for i, team in enumerate(teams[:-1]):
        ratings[team] = beta[1 + i]
    ratings[teams[-1]] = -sum(ratings[team] for team in teams[:-1])
    return {"home_edge": beta[0], "ratings": ratings, "n_games": float(len(games)), "paper": PAPER}


def _solve_linear(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    n = len(rhs)
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-12:
            raise RatingGap(f"{PAPER}: rating system is singular")
        a[col], a[pivot] = a[pivot], a[col]
        scale = a[col][col]
        for j in range(col, n + 1):
            a[col][j] /= scale
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col]
            if factor == 0.0:
                continue
            for j in range(col, n + 1):
                a[r][j] -= factor * a[col][j]
    return [a[i][n] for i in range(n)]


def before(games: Iterable[Mapping[str, object]], season: int, week: int) -> list[dict[str, object]]:
    """Games the paper is allowed to see: every matchup strictly before week w."""
    kept = []
    for game in games:
        g_season = int(game["season"])
        g_week = int(game["week"])
        if g_season < season or (g_season == season and g_week < week):
            kept.append(dict(game))
    return kept


def expected_margin(fit: Mapping[str, object], home: str, away: str) -> dict[str, object]:
    ratings = fit["ratings"]
    if not isinstance(ratings, dict):
        raise RatingGap(f"{PAPER}: fit has no ratings")
    if home not in ratings or away not in ratings:
        raise RatingGap(f"{PAPER}: {home} or {away} has no rating in this window")
    margin = float(fit["home_edge"]) + float(ratings[home]) - float(ratings[away])
    return {
        "paper": PAPER,
        "equation": "h + R_home - R_away",
        "home": home,
        "away": away,
        "home_edge": fit["home_edge"],
        "home_rating": ratings[home],
        "away_rating": ratings[away],
        "expected_margin": margin,
        "n_games": fit["n_games"],
        "weight": None,
        "weight_status": "withheld",
        "publishes_pick": False,
    }


def paper_normal_approx(expected_home_margin: float) -> dict[str, object]:
    """Phi(margin / 14). The 14 is the paper's statement, not a fitted sigma."""
    z = expected_home_margin / SIGMA_POINTS
    # Abramowitz-style erf via math.erf. Standard normal CDF.
    probability = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return {
        "paper": PAPER,
        "equation": "Phi((h + R_home - R_away) / 14)",
        "sigma_points": SIGMA_POINTS,
        "sigma_source": SIGMA_SOURCE,
        "probability": probability,
        "weight": None,
        "weight_status": "withheld",
        "publishes_pick": False,
        "note": "Paper approximation for a pre-game normal. Not Table 1. Not a published pick.",
    }


def fit(games: Sequence[Mapping[str, object]]) -> dict[str, object]:
    return _solve(games)
