"""Unit tests for the 365-Day Multi-Sport BC-ACI + CopulaCPTS Daily Slate Engine."""

from __future__ import annotations

import math
import re
import urllib.error
from pathlib import Path

import numpy as np
import pytest

from gse_engine.compute.corpus_situational_integrator import (
    build_bigquery_ai_and_observability_sql_bundle,
    evaluate_books_pdfs_and_situational_conformal_bridge,
)
from gse_engine.multisport import (
    BcAciState,
    CopulaLegSpec,
    build_dixon_coles_pmf,
    fetch_live_multisport_slate,
    main,
    predict_bc_aci_band,
    price_copula_conformal_sgp,
    simulate_multisport_matchup_10k,
    update_bc_aci_interval,
)


def test_bc_aci_adaptive_convergence_under_distribution_shift() -> None:
    """BC-ACI tracks shifted residual bias and adapts half-width to target coverage."""
    rng = np.random.default_rng(42)
    state = BcAciState(alpha=0.10, gamma=0.05, q_halfwidth=3.5, bias_center=0.0, beta=0.12)

    # Phase 1: stationary zero-bias regime
    for _ in range(150):
        pred = 100.0
        obs = float(100.0 + rng.normal(0.0, 2.0))
        state = update_bc_aci_interval(state, pred, obs)

    assert abs(state.bias_center) < 1.0

    # Phase 2: abrupt +8.0 bias shift and doubled dispersion (std=5.0)
    post_adapt_hits: list[float] = []
    for step in range(450):
        pred = 100.0
        obs = float(108.0 + rng.normal(0.0, 5.0))
        center, lower, upper = predict_bc_aci_band(state, pred)
        assert abs(center - (pred + state.bias_center)) < 1e-12
        assert abs((upper - center) - state.q_halfwidth) < 1e-12
        assert abs((center - lower) - state.q_halfwidth) < 1e-12
        if step >= 150:
            post_adapt_hits.append(1.0 if lower <= obs <= upper else 0.0)
        state = update_bc_aci_interval(state, pred, obs)

    empirical_coverage = float(np.mean(post_adapt_hits))
    assert state.updates == 600
    assert 6.5 <= state.bias_center <= 9.5
    assert state.q_halfwidth > 5.0
    assert 0.84 <= empirical_coverage <= 0.96


def test_copula_cpts_correlation_lift_and_psd_bounds() -> None:
    """CopulaCPTS yields lift > 1 under positive rho, < 1 under negative rho, and clamps PSD."""
    legs = [
        CopulaLegSpec(athlete_or_side="BOS ML", market="Moneyline", prob=0.55),
        CopulaLegSpec(athlete_or_side="Jayson Tatum 25+ Pts", market="Points", prob=0.52),
        CopulaLegSpec(athlete_or_side="OVER 224.5", market="Total", prob=0.50),
    ]
    pos_rho = [
        [1.0, 0.65, 0.55],
        [0.65, 1.0, 0.60],
        [0.55, 0.60, 1.0],
    ]
    pos_res = price_copula_conformal_sgp(
        legs,
        pos_rho,
        book_decimal_odds=5.50,
        n_worlds=10000,
        seed=20261116,
    )
    assert 0.0 <= pos_res["joint_sim_prob"] <= 1.0
    assert 0.0 <= pos_res["indep_prob"] <= 1.0
    assert pos_res["joint_sim_prob"] > pos_res["indep_prob"]
    assert pos_res["correlation_lift"] > 1.25
    assert isinstance(pos_res["fair_american_odds"], int)
    expected_edge = pos_res["joint_sim_prob"] - (1.0 / 5.50)
    assert abs(pos_res["net_edge"] - expected_edge) < 1e-12

    # Negative correlation reduces joint hit rate below independence
    neg_legs = legs[:2]
    neg_rho = [[1.0, -0.60], [-0.60, 1.0]]
    neg_res = price_copula_conformal_sgp(neg_legs, neg_rho, n_worlds=10000, seed=77)
    assert neg_res["joint_sim_prob"] < neg_res["indep_prob"]
    assert neg_res["correlation_lift"] < 1.0

    # Non-PSD matrix must clamp gracefully without raising LinAlgError
    non_psd = [
        [1.0, 0.9, 0.9],
        [0.9, 1.0, -0.9],
        [0.9, -0.9, 1.0],
    ]
    clamped = price_copula_conformal_sgp(legs, non_psd, n_worlds=10000, seed=99)
    assert 0.0 <= clamped["joint_sim_prob"] <= 1.0
    assert clamped["u_shape"] == (10000, 3)


@pytest.mark.parametrize("league", ["NBA", "NCAAB"])
def test_basketball_10k_simulators_conserve_marginals_and_b2b_fatigue(league: str) -> None:
    """NBA and NCAAB 10,000-world sims conserve marginals and reflect B2B fatigue."""
    rested = simulate_multisport_matchup_10k(
        league,
        home_team="HOME",
        away_team="AWAY",
        home_b2b=False,
        away_b2b=False,
        n_worlds=10000,
        seed=1234,
    )
    fatigued = simulate_multisport_matchup_10k(
        league,
        home_team="HOME",
        away_team="AWAY",
        home_b2b=True,
        away_b2b=False,
        bc_aci_state=BcAciState(q_halfwidth=15.0, bias_center=1.0),
        n_worlds=10000,
        seed=1234,
    )

    assert rested["n_worlds"] == 10000
    assert abs(rested["mean_total"] - (rested["mean_away"] + rested["mean_home"])) < 1e-6
    assert abs(fatigued["mean_total"] - (fatigued["mean_away"] + fatigued["mean_home"])) < 1e-6
    assert abs((rested["home_win_prob"] + rested["away_win_prob"]) - 1.0) < 1e-12
    assert rested["draw_prob"] == 0.0
    assert fatigued["fatigue_delta_home"] < rested["fatigue_delta_home"]


def test_nhl_10k_simulator_ot_resolution_and_marginal_conservation() -> None:
    """NHL simulator resolves regulation ties via OT/SO and conserves total goals."""
    nhl = simulate_multisport_matchup_10k(
        "NHL",
        home_team="FLA",
        away_team="TOR",
        home_rating=3.25,
        away_rating=2.85,
        total_line=6.0,
        n_worlds=10000,
        seed=5678,
    )
    assert nhl["n_worlds"] == 10000
    assert abs(nhl["mean_total"] - (nhl["mean_away"] + nhl["mean_home"])) < 1e-6
    assert abs((nhl["home_win_prob"] + nhl["away_win_prob"]) - 1.0) < 1e-12
    assert nhl["draw_prob"] == 0.0
    assert 0.0 <= nhl["puckline_home_cover_prob"] <= nhl["home_win_prob"]
    assert 0.0 <= nhl["over_prob"] <= 1.0


def test_soccer_dixon_coles_normalization_and_10k_sim() -> None:
    """Dixon-Coles PMF normalizes to 1.0 and soccer 10k sim preserves 1X2 and marginals."""
    pmf_indep = build_dixon_coles_pmf(1.50, 1.20, rho_dc=0.0, max_goals=10)
    pmf_dc = build_dixon_coles_pmf(1.50, 1.20, rho_dc=-0.12, max_goals=10)

    assert np.all(pmf_dc >= 0.0)
    assert abs(float(np.sum(pmf_indep)) - 1.0) < 1e-12
    assert abs(float(np.sum(pmf_dc)) - 1.0) < 1e-12
    # Negative rho_dc inflates (0, 0) and (1, 1) draw mass in Dixon-Coles
    assert pmf_dc[0, 0] > pmf_indep[0, 0]
    assert pmf_dc[1, 1] > pmf_indep[1, 1]

    soccer = simulate_multisport_matchup_10k(
        "SOCCER",
        home_team="ARS",
        away_team="CHE",
        home_rating=1.68,
        away_rating=1.12,
        rho_dc=-0.12,
        n_worlds=10000,
        seed=9012,
    )
    assert soccer["n_worlds"] == 10000
    assert abs(soccer["dixon_coles_pmf_sum"] - 1.0) < 1e-12
    assert abs(soccer["mean_total"] - (soccer["mean_away"] + soccer["mean_home"])) < 1e-6
    prob_sum = soccer["home_win_prob"] + soccer["draw_prob"] + soccer["away_win_prob"]
    assert abs(prob_sum - 1.0) < 1e-12
    assert soccer["draw_prob"] > 0.15


def test_offline_daily_card_governance_ascii_and_network_fallback(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Offline and network-failure fallback produce pure ASCII XX/100 card with zero stake."""

    def _fail_urlopen(*_args: object, **_kwargs: object) -> object:
        raise urllib.error.URLError("offline test environment")

    monkeypatch.setattr("urllib.request.urlopen", _fail_urlopen)

    slate = fetch_live_multisport_slate(date_str="2026-11-16", offline=False)
    assert slate["source"] == "offline_fallback"
    assert slate["real_money_stake_cleared"] is False
    assert slate["live_stake_fraction"] == 0.0
    assert {play["league"] for play in slate["plays"]} == {"NBA", "NHL", "NCAAB", "SOCCER"}

    card = str(slate["card_markdown"])
    assert card.isascii()
    assert "%" not in card
    assert "real_money_stake_cleared: False" in card
    assert "live_stake_fraction: 0.0" in card
    assert re.search(r"\b\d{2}/100\b", card) is not None

    for forbidden in ("guaranteed", "can't lose", "free money", "lock of the"):
        assert forbidden not in card.lower()

    out_file = tmp_path / "multisport_daily_card_2026_11_16.md"
    exit_code = main(["--offline", "--out", str(out_file), "--date", "2026-11-16"])
    assert exit_code == 0
    assert out_file.exists()
    written = out_file.read_text(encoding="ascii")
    assert written.isascii()
    assert "live_stake_fraction: 0.0" in written


def test_books_pdfs_situational_conformal_bridge_and_bq_sql_readonly() -> None:
    """Corpus conformal bridge indexes 81k+ artifacts and emits read-only BigQuery SQL."""
    res = evaluate_books_pdfs_and_situational_conformal_bridge(
        away_team="IND",
        home_team="HOU",
        residual_history=((21.0, 24.5), (17.0, 20.0), (24.0, 23.0)),
    )
    assert res["matchup"] == "IND @ HOU"
    assert res["corpus_total_artifacts_indexed"] >= 80000
    assert res["sovereign_books_primitives"] >= 50000
    assert res["manifest_pdfs_indexed"] >= 877
    assert res["foundry_files_swept"] >= 12000
    assert res["equations_9875_indexed"] >= 9000
    assert res["bc_aci_updates"] == 3
    assert math.isfinite(float(res["bc_aci_center_shift"]))
    assert 0.01 <= float(res["bc_aci_alpha_next"]) <= 0.99

    bq = build_bigquery_ai_and_observability_sql_bundle()
    assert bq["read_only"] is True
    assert bq["dry_run_required"] is True
    tpls = bq["templates"]
    assert "AI.FORECAST" in tpls["ai_forecast_closing_line"]
    assert "AI.KEY_DRIVERS" in tpls["ai_key_drivers_prop_variance"]
    assert "ML.DETECT_CHANGE_POINTS" in tpls["ml_detect_change_points_regime"]
    assert "GRAPH_TABLE" in tpls["graph_table_coaching_spillover"]
    assert "INFORMATION_SCHEMA.JOBS" in tpls["information_schema_jobs_golden_cte"]
    assert "statement_type != 'SCRIPT'" in tpls["information_schema_jobs_golden_cte"]
    for sql_txt in tpls.values():
        upper_sql = sql_txt.upper()
        for forbidden_kw in ("DROP ", "DELETE ", "TRUNCATE ", "ALTER ", "UPDATE ", "MERGE "):
            assert forbidden_kw not in upper_sql
