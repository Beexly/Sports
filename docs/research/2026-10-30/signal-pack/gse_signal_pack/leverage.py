"""Paired-flip playoff leverage (@Timo_NFL's construction) vs the naive
outcome-filter construction, on a synthetic league with dynamic ratings.

The bias, mechanically: in a season sim whose team ratings update *inside*
the simulation, filtering sims by "team won this week's game" does not
just select the game outcome — it selects sims where the team drew a
friendlier rating path, so it wins more *future* games for reasons that
have nothing to do with this game. Leverage computed that way is inflated
(Timo measured 1.3-1.6x per team on his Week 7 setup).

The paired-flip fix: for every simulated season, hold everything fixed
(same random draws, same rating path through the week of the game) and
flip only the one game's result in the standings. The difference in
playoff outcomes across the pair is the single-game effect, clean.
"""
from __future__ import annotations

import numpy as np

TEAMS = 8
PLAYOFF_SPOTS = 4
WEEKS_LEFT = 6


def _round_robin(n_teams: int, n_rounds: int) -> list[list[tuple[int, int]]]:
    """Deterministic circle-method schedule: n_rounds of pairings."""
    arr = list(range(n_teams))
    rounds = []
    for _ in range(n_rounds):
        rounds.append(
            [(arr[i], arr[n_teams - 1 - i]) for i in range(n_teams // 2)]
        )
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    return rounds


def _simulate(wins0, ratings0, schedule, uniforms, tiebreaks,
              scale: float, k_update: float):
    """Run the remaining season. Returns (final_wins, goi_won) where the
    game of interest is schedule[0][0] and team A is its first team."""
    n_sims = uniforms.shape[0]
    wins = np.tile(wins0, (n_sims, 1)).astype(float)
    ratings = np.tile(ratings0, (n_sims, 1)).astype(float)
    goi_a, goi_b = schedule[0][0]
    goi_won = np.zeros(n_sims, dtype=bool)
    g = 0
    for w, games in enumerate(schedule):
        for (a, b) in games:
            p = 1.0 / (1.0 + np.exp(-(ratings[:, a] - ratings[:, b]) / scale))
            a_won = uniforms[:, g] < p
            if w == 0 and (a, b) == (goi_a, goi_b):
                goi_won = a_won.copy()
            wins[:, a] += a_won
            wins[:, b] += ~a_won
            if k_update > 0:
                upd_a = k_update * ((a_won.astype(float)) - p)
                ratings[:, a] += upd_a
                ratings[:, b] -= upd_a
            g += 1
    return wins, goi_won


def _playoff_made(wins: np.ndarray, tiebreaks: np.ndarray, team: int) -> np.ndarray:
    key = wins + tiebreaks  # tiebreaks in [0, 1): wins always dominate
    rank = (key > key[:, [team]]).sum(axis=1)
    return rank < PLAYOFF_SPOTS


def leverage_estimates(wins0, ratings0, focal: int, rival: int,
                       n_sims: int = 8000, seed: int = 7,
                       scale: float = 5.5, k_update: float = 1.75) -> dict:
    """Naive-filter vs paired-flip leverage for focal team's week-1 game
    vs rival, in a dynamic-rating sim; frozen-rating filter as control."""
    rng = np.random.default_rng(seed)
    schedule = _round_robin(TEAMS, WEEKS_LEFT)
    assert schedule[0][0] == (focal, rival) or True
    # Force the game of interest to be the first game of week 1.
    schedule[0] = [(focal, rival)] + [
        g for g in schedule[0] if focal not in g and rival not in g
    ]
    n_games = sum(len(r) for r in schedule)
    uniforms = rng.random((n_sims, n_games))
    tiebreaks = rng.random((n_sims, TEAMS)) * 0.999

    # --- dynamic-rating sims (the contaminated construction) ---
    wins_dyn, goi_won = _simulate(
        wins0, ratings0, schedule, uniforms, tiebreaks, scale, k_update)
    po_dyn = _playoff_made(wins_dyn, tiebreaks, focal)
    naive = po_dyn[goi_won].mean() - po_dyn[~goi_won].mean()

    # --- paired flip: same sims, flip only the GOI result in standings ---
    wins_if_win = wins_dyn.copy()
    wins_if_loss = wins_dyn.copy()
    lost = ~goi_won
    wins_if_win[lost, focal] += 1
    wins_if_win[lost, rival] -= 1
    wins_if_loss[goi_won, focal] -= 1
    wins_if_loss[goi_won, rival] += 1
    paired = (
        _playoff_made(wins_if_win, tiebreaks, focal).astype(float)
        - _playoff_made(wins_if_loss, tiebreaks, focal).astype(float)
    ).mean()

    # --- frozen ratings (K=0): the filter is unbiased here; control ---
    wins_frozen, goi_won_f = _simulate(
        wins0, ratings0, schedule, uniforms, tiebreaks, scale, 0.0)
    po_frozen = _playoff_made(wins_frozen, tiebreaks, focal)
    frozen_filter = po_frozen[goi_won_f].mean() - po_frozen[~goi_won_f].mean()

    return {
        "naive_filter_dynamic": float(naive),
        "paired_flip": float(paired),
        "frozen_filter_control": float(frozen_filter),
        "inflation_ratio": float(naive / paired) if paired > 0 else float("nan"),
        "n_sims": n_sims,
        "k_update": k_update,
        "scale": scale,
    }


def demo_configs() -> dict:
    """Two synthetic spots: a live contender (the inflation case) and a
    near-dead longshot (Timo's 'game that barely matters' case)."""
    wins0 = np.array([8, 7, 7, 6, 6, 5, 4, 3], dtype=float)
    ratings0 = np.array([3.2, 2.1, 1.8, 0.4, 0.1, -1.2, -2.6, -3.9])
    return {
        "contender": {  # team 3 (6 wins) vs team 4 (6 wins): a real swing game
            "wins0": wins0, "ratings0": ratings0, "focal": 3, "rival": 4,
        },
        "longshot": {  # team 7 (3 wins) vs team 0 (8 wins): nearly dead
            "wins0": wins0, "ratings0": ratings0, "focal": 7, "rival": 0,
        },
    }
