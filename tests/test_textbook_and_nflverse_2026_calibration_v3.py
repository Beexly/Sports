#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.calibration.gse_master_compendium_2026_loader import (
    ALL_32_TEAMS,
    assert_gcp_cost_guardrails_clean,
    compute_hardy_catastrophe_blitz_penalty,
    get_week11_plus_compendium_matchup_context,
    load_compendium_cached,
)
from intelligence.calibration.textbook_and_nflverse_2026_feature_engine import (
    build_causal_multi_dataset_index,
    compute_eager_poisson_gamma_td_prob,
    compute_eager_split_pass_and_binomial_completions,
    compute_exact_order_statistic_longest_prob,
    compute_hurdle_gamma_quarter_window_prob,
    compute_pipping_gamon_sack_prob,
    compute_severini_compound_gamma_tail_prob,
    get_causal_player_priors,
)
from scripts.calibration.calibrate_360_prop_families_walkforward import (
    SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS,
    _market_centered_bounds,
)


def test_strict_temporal_causality_and_compendium_week11_gate() -> None:
    idx_orig = build_causal_multi_dataset_index()
    idx_mut = copy.deepcopy(idx_orig)

    base = get_causal_player_priors(idx_orig, "00-0039163", "C.J. Stroud", "HOU", "TEN", target_week=6)
    # Inject synthetic future-week distortions at weeks >= 6
    idx_mut.spw_weekly[("00-0039163", 6)] = {k: 999.0 for k in base if isinstance(k, str)}
    idx_mut.team_week_stats[("HOU", 7)] = {"sack_rate": 0.99, "attempts": 99.0}
    idx_mut.pbp_opp_def_weekly[("TEN", 6)] = {
        "def_cmp_pct": 0.99,
        "def_sack_rate": 0.01,
        "def_pass_ypa": 15.0,
        "def_rush_ypc": 9.0,
        "def_rz_td_rate": 0.90,
    }
    after = get_causal_player_priors(idx_mut, "00-0039163", "C.J. Stroud", "HOU", "TEN", target_week=6)
    assert after == base

    # Compendium Week 1-10 cumulative tables MUST remain neutral before Week 11
    pre_w11 = get_week11_plus_compendium_matchup_context("TB", "DET", "TE", "receiving_yards", target_week=10)
    assert pre_w11["causal_eligible"] is False
    assert pre_w11["matchup_mult"] == 1.0
    assert pre_w11["logit_adj"] == 0.0
    assert pre_w11["hardy_blitz_mult"] == 1.0

    # Week 11+ activates empirical-Bayes Defense vs TE (DET 23.2 DK/G vs MIN 8.6 DK/G)
    det_w11 = get_week11_plus_compendium_matchup_context("TB", "DET", "TE", "receiving_yards", target_week=11)
    min_w11 = get_week11_plus_compendium_matchup_context("TB", "MIN", "TE", "receiving_yards", target_week=11)
    assert det_w11["causal_eligible"] is True
    assert min_w11["causal_eligible"] is True
    assert det_w11["opp_dk_pt_per_game"] > min_w11["opp_dk_pt_per_game"]
    assert det_w11["eb_dvp_mult"] > min_w11["eb_dvp_mult"]
    assert det_w11["matchup_mult"] > min_w11["matchup_mult"]


def test_market_centered_bounds_preserves_symmetric_and_fixes_rare_event_props() -> None:
    lo_sym, hi_sym = _market_centered_bounds(0.50, 0.66)
    assert lo_sym == pytest.approx(0.34, abs=1e-9)
    assert hi_sym == pytest.approx(0.66, abs=1e-9)

    lo_rare, hi_rare = _market_centered_bounds(0.12, 0.62)
    assert 0.02 <= lo_rare < 0.12 < hi_rare <= 0.24


def test_textbook_arxiv_psychology_and_gcp_guardrail_kernels() -> None:
    idx = build_causal_multi_dataset_index()
    priors = get_causal_player_priors(idx, "00-0039163", "C.J. Stroud", "HOU", "IND", target_week=11)
    assert priors["compendium_causal_active"] == 1.0

    p_comp_low = compute_eager_split_pass_and_binomial_completions(34.0, 28.0, priors, line=20.5)
    p_comp_high = compute_eager_split_pass_and_binomial_completions(34.0, 28.0, priors, line=25.5)
    assert 0.05 <= p_comp_high < p_comp_low <= 0.95

    p_sev_low = compute_severini_compound_gamma_tail_prob(20.0, 14.0, 4.4, 32.0, line=68.5)
    p_sev_high = compute_severini_compound_gamma_tail_prob(20.0, 14.0, 4.4, 32.0, line=92.5)
    assert 0.04 <= p_sev_high < p_sev_low <= 0.96

    p_q1_low = compute_hurdle_gamma_quarter_window_prob(7.5, 0.25, 11.2, 7.5, line=8.5)
    p_q1_high = compute_hurdle_gamma_quarter_window_prob(7.5, 0.25, 11.2, 7.5, line=24.5)
    assert 0.03 <= p_q1_high < p_q1_low <= 0.95

    p_lng_low = compute_exact_order_statistic_longest_prob(6.0, 10.5, 0.80, line=16.5)
    p_lng_high = compute_exact_order_statistic_longest_prob(6.0, 10.5, 0.80, line=28.5)
    assert 0.04 <= p_lng_high < p_lng_low <= 0.95

    p_td_low = compute_eager_poisson_gamma_td_prob(22.0, 0.14, 0.22)
    p_td_high = compute_eager_poisson_gamma_td_prob(28.0, 0.28, 0.28)
    assert 0.04 <= p_td_low < p_td_high <= 0.85

    rush_priors = dict(priors, is_front_seven_rusher=1.0, def_disruption_qa=1.1, opp_off_sack_suffered=0.09)
    p_sk = compute_pipping_gamon_sack_prob(rush_priors, hist_sack_rate_pg=0.65, line=0.25)
    assert 0.03 <= p_sk <= 0.78

    calm = compute_hardy_catastrophe_blitz_penalty(0.10, 0.22, pocket_time_s=2.6, is_hostile_road=False)
    cusp = compute_hardy_catastrophe_blitz_penalty(0.21, 0.35, pocket_time_s=2.1, is_hostile_road=True)
    assert calm >= 1.0
    assert 0.88 <= cusp < 0.94

    ok = assert_gcp_cost_guardrails_clean({"cloud_run": True, "neon_postgres": True, "bigquery_ml": True})
    assert ok["ok"] is True
    with pytest.raises(ValueError):
        assert_gcp_cost_guardrails_clean({"gke_enabled": True})
    with pytest.raises(ValueError):
        assert_gcp_cost_guardrails_clean({"migrate_off_neon": True})


def test_compendium_32_team_completeness_v3_heads_and_fanduel_benchmark() -> None:
    comp = load_compendium_cached()
    assert comp["teams_count"] == 32
    assert set(comp["standings_srs"].keys()) == set(ALL_32_TEAMS)
    assert len(comp["advanced_team_passing"]) == 32
    assert len(comp["conversions"]) == 32
    for pos in ("QB", "RB", "WR", "TE"):
        assert set(comp["defense_vs_position"][pos].keys()) == set(ALL_32_TEAMS)
    assert len(comp["arxiv_papers"]) == 4
    assert len(comp["gcp_architecture"]["backlog_items"]) == 17

    heads_path = REPO_ROOT / "data" / "calibration" / "prop_family_calibration_heads_2026.json"
    heads = json.loads(heads_path.read_text(encoding="utf-8"))
    assert heads["strictly_causal"] is True
    fams = heads["families"]
    expected_eligible = {
        "pass_completions",
        "carries",
        "rushing_yards",
        "passing_tds",
        "longest_rush",
        "sacks",
        "solo_tackles",
        "tackles_plus_assists",
    }
    observed_eligible = {k for k, v in fams.items() if v.get("eligible_for_play")}
    assert observed_eligible == expected_eligible
    for fam_k, hd in fams.items():
        assert "walkforward_log_loss" in hd and "walkforward_ece" in hd
        if hd.get("eligible_for_play"):
            assert float(hd["walkforward_brier"]) < float(hd["market_baseline_brier"])
            assert float(hd["walkforward_accuracy"]) >= 0.535
    for fam_k in SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS:
        assert fams[fam_k]["eligible_for_play"] is False

    bench_path = REPO_ROOT / "data" / "calibration" / "textbook_and_real_sportsbook_prop_benchmark_2026.json"
    bench = json.loads(bench_path.read_text(encoding="utf-8"))
    rec_fd = bench["fanduel_historical_props"]["receptions"]
    assert rec_fd["n_oos"] >= 1400
    assert rec_fd["model_brier"] < rec_fd["fanduel_brier"]
    assert rec_fd["directional_acc"] >= 0.545
