#!/usr/bin/env python3
"""Unit tests for Institutional DFS v2 Portfolio Optimizer (`institutional_dfs_v2_portfolio.py`)."""
from __future__ import annotations

import pytest

from intelligence.dfs.institutional_dfs_v2_portfolio import (
    CLASSIC_SALARY_CAP,
    PlayerPoolEntry,
    SlateHygieneConfig,
    apply_dynamic_slate_hygiene,
    compute_liu_pom_utility,
    compute_yahoo_salary_lag_bonus,
    dirichlet_multinomial_expected_duplicates,
    newell_stochastic_ip_recourse_score,
    optimize_classic_portfolio_v2,
    optimize_showdown_portfolio_v2,
)


def _sample_classic_pool() -> list[PlayerPoolEntry]:
    pool: list[PlayerPoolEntry] = []
    matchups = [("BUF", "KC"), ("DET", "SF"), ("PHI", "DAL")]
    for g_idx, (aw, hm) in enumerate(matchups):
        for tm, opp in ((aw, hm), (hm, aw)):
            base_id = f"g{g_idx}_{tm}"
            pool.append(PlayerPoolEntry(f"{base_id}_qb", f"{tm} QB", tm, opp, ("QB",), 6500 - g_idx * 200, 21.5 + g_idx, 0.12))
            pool.append(PlayerPoolEntry(f"{base_id}_rb1", f"{tm} RB1", tm, opp, ("RB",), 6400 - g_idx * 150, 17.5, 0.16))
            pool.append(PlayerPoolEntry(f"{base_id}_rb2", f"{tm} RB2", tm, opp, ("RB",), 4700, 11.8, 0.06))
            pool.append(PlayerPoolEntry(f"{base_id}_wr1", f"{tm} WR1", tm, opp, ("WR",), 6800 - g_idx * 200, 18.8, 0.18))
            pool.append(PlayerPoolEntry(f"{base_id}_wr2", f"{tm} WR2", tm, opp, ("WR",), 5100, 13.4, 0.09))
            pool.append(PlayerPoolEntry(f"{base_id}_wr3", f"{tm} WR3", tm, opp, ("WR",), 3900, 9.6, 0.04))
            pool.append(PlayerPoolEntry(f"{base_id}_te", f"{tm} TE1", tm, opp, ("TE",), 4500, 11.2, 0.07))
            pool.append(PlayerPoolEntry(f"{base_id}_dst", f"{tm} DST", tm, opp, ("DST",), 3100, 7.8, 0.05))
    return pool


def test_dynamic_hygiene_strips_byes_out_and_duplicates() -> None:
    pool = _sample_classic_pool()
    dup = PlayerPoolEntry(pool[0].player_id, pool[0].name, pool[0].team, pool[0].opponent, ("QB",), 6500, 21.5, 0.12)
    ir_p = PlayerPoolEntry("ir_1", "Injured Star", "BUF", "KC", ("WR",), 7000, 19.0, 0.10, injury_status="IR")
    hygiene = SlateHygieneConfig(bye_teams=frozenset({"PHI"}), out_or_ir_player_names=frozenset({"KC WR2"}))
    rpt = apply_dynamic_slate_hygiene([*pool, dup, ir_p], hygiene)
    reasons = rpt.blocked_by_reason
    assert reasons["BYE_TEAM"] > 0
    assert reasons["IR_OR_OUT"] >= 2
    assert reasons["DUPLICATE"] == 1
    assert all(p.team != "PHI" and p.opponent != "PHI" for p in rpt.eligible_pool)


def test_classic_portfolio_v2_enforces_salary_hvz_diversity_and_objectives() -> None:
    pool = _sample_classic_pool()
    lineups, _ = optimize_classic_portfolio_v2(pool, num_lineups=3)
    assert len(lineups) == 3
    for idx, lu in enumerate(lineups):
        assert lu.total_salary <= CLASSIC_SALARY_CAP
        assert len(lu.slots) == 9
        assert lu.distinct_games_count >= 2
        assert lu.expected_duplicates_per_10k >= 0.0
        assert lu.liu_pom_utility > 0.0
        assert lu.newell_stochastic_recourse_score > 0.0
        if idx > 0:
            overlap = len(set(lu.player_ids) & set(lineups[idx - 1].player_ids))
            assert overlap <= 6


def test_showdown_portfolio_v2_generates_diverse_captains_and_utilities() -> None:
    pool = [p for p in _sample_classic_pool() if p.game_id == "BUF@KC"]
    lineups, _ = optimize_showdown_portfolio_v2(pool, num_lineups=3)
    assert len(lineups) == 3
    for lu in lineups:
        assert lu.total_salary <= CLASSIC_SALARY_CAP
        assert len(lu.slots) == 6
        assert lu.slots[0].slot == "CPT"
        assert len(lu.team_counts) == 2

    dups = dirichlet_multinomial_expected_duplicates([0.22, 0.18, 0.12])
    pom = compute_liu_pom_utility(145.0, 185.0, dups, 320.0)
    lag = compute_yahoo_salary_lag_bonus(pool[0])
    rec = newell_stochastic_ip_recourse_score(lineups[0].slots)
    assert dups >= 0.0 and pom > 0.0 and isinstance(lag, float) and rec > 0.0


def test_institutional_dfs_v2_stream_15p_positional_vuln_bridge() -> None:
    from intelligence.dfs.institutional_dfs_v2_portfolio import (
        ClassicOptimizerConfig,
        PlayerPoolEntry,
        optimize_classic_portfolio_v2,
    )

    pool = [
        PlayerPoolEntry("qb1", "Alpha QB", "BUF", "MIA", ("QB",), 6500, 22.0, 0.12, game_id="BUF@MIA", ceiling_points=29.0),
        PlayerPoolEntry("qb2", "Beta QB", "KC", "LAC", ("QB",), 6500, 20.5, 0.12, game_id="KC@LAC", ceiling_points=29.0),
        PlayerPoolEntry("rb1", "Alpha RB", "BUF", "MIA", ("RB",), 5500, 14.0, 0.10, game_id="BUF@MIA", ceiling_points=20.0),
        PlayerPoolEntry("rb2", "Beta RB", "KC", "LAC", ("RB",), 5500, 14.0, 0.10, game_id="KC@LAC", ceiling_points=20.0),
        PlayerPoolEntry("rb3", "Gamma RB", "DET", "CHI", ("RB",), 5000, 12.0, 0.08, game_id="DET@CHI", ceiling_points=18.0),
        PlayerPoolEntry("wr1", "Alpha WR1", "BUF", "MIA", ("WR",), 5500, 15.0, 0.12, game_id="BUF@MIA", ceiling_points=23.0),
        PlayerPoolEntry("wr2", "Alpha WR2", "KC", "LAC", ("WR",), 5500, 15.0, 0.12, game_id="KC@LAC", ceiling_points=23.0),
        PlayerPoolEntry("wr3", "Gamma WR3", "DET", "CHI", ("WR",), 4800, 13.0, 0.08, game_id="DET@CHI", ceiling_points=20.0),
        PlayerPoolEntry("wr4", "Delta WR4", "MIA", "BUF", ("WR",), 4400, 12.0, 0.06, game_id="BUF@MIA", ceiling_points=18.0),
        PlayerPoolEntry("te1", "Alpha TE", "DET", "CHI", ("TE",), 4200, 11.0, 0.08, game_id="DET@CHI", ceiling_points=17.0),
        PlayerPoolEntry("dst1", "Gamma DST", "DET", "CHI", ("DST",), 2800, 7.0, 0.05, game_id="DET@CHI", ceiling_points=11.0),
    ]
    vuln_map = {"qb1": -1.5, "qb2": 2.5, "rb1": 0.2, "rb2": 0.2}
    lineups_default, _ = optimize_classic_portfolio_v2(
        pool,
        num_lineups=1,
        config=ClassicOptimizerConfig(min_qb_stack=1, min_bringback=0),
        positional_vuln_map=vuln_map,
    )
    lineups_15p, _ = optimize_classic_portfolio_v2(
        pool,
        num_lineups=1,
        config=ClassicOptimizerConfig(min_qb_stack=1, min_bringback=0, positional_vuln_weight=1.5),
        positional_vuln_map=vuln_map,
    )
    qb_default = next(s.player.player_id for s in lineups_default[0].slots if s.slot == "QB")
    qb_15p = next(s.player.player_id for s in lineups_15p[0].slots if s.slot == "QB")
    assert qb_default == "qb1"
    assert qb_15p == "qb2"
    assert len(lineups_15p[0].slots) == 9
