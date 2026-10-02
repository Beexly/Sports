# PROVENANCE — gse-intelligence-build / coaching / proe.py
# Implements: buildable-systems.md M01 (LOYO PROE), syntheses.md Thread 2
#   (n>=25 publication gate), reasoning-depth-spec.md T1 breaking-condition layer.
# Research basis: 1575 (τ estimand; 200-bootstrap uncertainty ritual — 2000 draws
#   was the A6 cost note, 200 is the paper's ritual; publish only n>=25);
#   base pipeline compute_tendencies.py (neutral-script 0.35-0.65 convention).
"""M01 — Pass Rate Over Expected (neutral-script early-down pass rate over
leave-one-year-out league expectation).

PROE = actual − expected, where expected is the plays-weighted LOYO cell rate
over (down_group, ydstogo_bin) cells. Shrunk toward 0 by empirical-Bayes with
k = league-median cell n. Never combined with τ (c04 owns τ); PROE is the
tendency-formation module, τ is the decision-quality module (A5 resolution).
"""
from __future__ import annotations

import math
from typing import Any, Iterable, Mapping, Optional

import numpy as np

from . import common as C
from . import load as L


def compute_proe_from_cells(
    season: int,
    team: str,
    team_cells: Mapping[tuple[str, str], tuple[float, float]],
    league_cells: Mapping[tuple[str, str], tuple[float, float]],
    k: Optional[float] = None,
) -> dict[str, Any]:
    """PROE from (down_group, ydstogo_bin) cell counts.

    team_cells[(dg, yb)] = (n_pass, n_rush); league_cells[(dg, yb)] = league totals.
    LOYO: league minus the team itself. Returns raw/shrunk PROE, SE, n, publish flag.
    """
    n_pass = n_rush = 0.0
    exp_num = exp_den = 0.0
    for key, (tp, tr) in team_cells.items():
        lp, lr = league_cells.get(key, (0.0, 0.0))
        n_pass += tp
        n_rush += tr
        loyo = C.safe_div(lp - tp, (lp - tp) + (lr - tr))
        w = tp + tr
        if not math.isnan(loyo) and w > 0:
            exp_num += loyo * w
            exp_den += w
    n = n_pass + n_rush
    actual = C.pass_rate(n_pass, n_rush)
    expected = C.safe_div(exp_num, exp_den)
    raw = (actual - expected) if not (math.isnan(actual) or math.isnan(expected)) else math.nan
    if k is None:
        k = 290.0  # league-median neutral-early-down n (build_tables.py 2022-2026)
    return {
        "season": season,
        "team": team,
        "n_plays": n,
        "pass_rate_actual": actual,
        "pass_rate_expected": expected,
        "proe_raw": raw,
        "proe": C.empbayes_shrink(raw, n, k),
        "proe_se": C.rate_se(actual, n),
        "publishable": C.publishable(n),
    }


def compute_proe_from_plays(
    plays: Iterable[Mapping[str, Any]],
    season: int,
    team: str,
    league_cells: Mapping[tuple[str, str], tuple[float, float]],
    k: Optional[float] = None,
) -> dict[str, Any]:
    """PROE from raw play dicts (live path — same filters as build-time)."""
    team_cells: dict[tuple[str, str], list[float]] = {}
    for p in plays:
        if not (C.is_scrimmage_play(p) and C.is_early_down(p) and C.is_neutral_script(p)):
            continue
        if p.get("posteam") != team:
            continue
        yb = C.ydstogo_bin(p.get("ydstogo"))
        if yb is None:
            continue
        c = team_cells.setdefault(("early", yb), [0.0, 0.0])
        c[0] += 0.0 if p.get("pass_attempt") is None else float(p.get("pass_attempt") or 0)
        c[1] += 0.0 if p.get("rush_attempt") is None else float(p.get("rush_attempt") or 0)
    return compute_proe_from_cells(
        season, team,
        {kk: (vv[0], vv[1]) for kk, vv in team_cells.items()},
        league_cells, k)


def league_cells_from_table(season: Optional[int] = None) -> dict[tuple[str, str], tuple[float, float]]:
    """League (down_group, ydstogo_bin) cell totals from pass_rate_cells.csv."""
    out: dict[tuple[str, str], list[float]] = {}
    for r in L.load_table("pass_rate_cells.csv"):
        if season is not None and r["season"] != season:
            continue
        key = (r["down_group"], r["ydstogo_bin"])
        c = out.setdefault(key, [0.0, 0.0])
        c[0] += r["n_pass"] or 0.0
        c[1] += r["n_rush"] or 0.0
    return {kk: (vv[0], vv[1]) for kk, vv in out.items()}


def team_cells_from_table(season: int, team: str) -> dict[tuple[str, str], tuple[float, float]]:
    out: dict[tuple[str, str], tuple[float, float]] = {}
    for r in L.load_table("pass_rate_cells.csv"):
        if r["season"] == season and r["team"] == team:
            out[(r["down_group"], r["ydstogo_bin"])] = (r["n_pass"] or 0.0, r["n_rush"] or 0.0)
    return out


def bootstrap_proe_ci(
    team_cells: Mapping[tuple[str, str], tuple[float, float]],
    league_cells: Mapping[tuple[str, str], tuple[float, float]],
    n_resamples: int = 200,
    seed: int = 20261002,
) -> tuple[float, float]:
    """1575's uncertainty ritual: 200 bootstrap resamples of the team's plays.

    Resamples team cell counts as multinomial draws around the observed cell
    distribution (the paper's 200-draw ritual; deterministic given seed).
    Returns (ci_lo, ci_hi) of the SHRUNK proe at 95%.
    """
    keys = list(team_cells.keys())
    counts = np.array([team_cells[k][0] + team_cells[k][1] for k in keys])
    total = counts.sum()
    if total == 0:
        return math.nan, math.nan
    probs = counts / total
    cell_rates = np.array([
        C.safe_div(team_cells[k][0], team_cells[k][0] + team_cells[k][1]) for k in keys])
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(n_resamples):
        sample = rng.multinomial(int(total), probs)
        tc = {k: (float(cell_rates[i] * sample[i]), float((1 - cell_rates[i]) * sample[i]))
              for i, k in enumerate(keys)}
        r = compute_proe_from_cells(0, "", tc, league_cells)
        if not math.isnan(r["proe"]):
            draws.append(r["proe"])
    if not draws:
        return math.nan, math.nan
    return float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))


def season_zscores(season: int) -> dict[str, float]:
    """League z-scores of shrunk PROE within a season (reasoning-depth T1 layer)."""
    rows = [r for r in L.load_table("proe_early_neutral.csv") if r["season"] == season]
    vals = [r["proe"] if r["proe"] is not None else math.nan for r in rows]
    zs = C.zscore_within_season(vals)
    return {r["team"]: z for r, z in zip(rows, zs)}


def get_proe(season: int, team: str) -> Optional[dict[str, Any]]:
    """Precomputed PROE row (build-time)."""
    return L.index_by("proe_early_neutral.csv", "season", "team").get((season, team))
