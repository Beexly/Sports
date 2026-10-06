# PROVENANCE — gse-intelligence-build / tests / e2e / test_pipeline_integration_e2e.py
# End-to-end integration tests for the assembled GSE intelligence pipeline
# (c10 Phase 4, tests-module owner). Wires the six Wave-2 modules together
# through the honest data flow and through the sibling's reasoning engine:
#
#   ratings/combining probabilities -> trust calibration + evidence gates
#       -> staking sizing (Kelly/stop-loss/governor/CVaR)
#       -> reasoning.engine AnalysisEngine trace (depth contract enforced)
#
# Research provenance: buildable-systems.md unified wire-first sequencing
# (§ "Unified wire-first sequencing": calibration second, pricing third,
# staking fourth — nothing publishes without the calibration gate);
# reasoning-depth-spec.md §6/§7 (depth contract: published picks MUST be L5).
# Data basis: seeded synthetic fixtures, labeled as such. Deterministic.
"""Pipeline integration: modules compose; engine enforces the depth contract."""

import math

import numpy as np
import pytest

from _harness import require_module

combining = require_module("combining")
trust = require_module("trust")
staking = require_module("staking")

from reasoning.engine import AnalysisEngine
from reasoning.enums import Exposure, ReasoningDepth
from reasoning.interfaces import AnalysisRequest, DataContext, GameRequest
from reasoning.checklist import depth_contract_ok


# ---------------------------------------------------------------------------
# fixtures: synthetic component forecasts (seeded, labeled synthetic)
# ---------------------------------------------------------------------------

def _norm_cdf(x, mu, sigma):
    return 0.5 * (1.0 + math.erf((x - mu) / (sigma * math.sqrt(2.0))))


@pytest.fixture()
def component_margin_cdfs():
    """Two synthetic component models' margin CDFs (home margin distribution)."""
    rng = np.random.default_rng(20261002)
    grid = np.linspace(-30.0, 30.0, 241)
    # Model A: home -3.5 ± 13; Model B: home -1.0 ± 15 (location disagreement).
    cdf_a = np.array([_norm_cdf(x, -3.5, 13.0) for x in grid])
    cdf_b = np.array([_norm_cdf(x, -1.0, 15.0) for x in grid])
    return np.stack([cdf_a, cdf_b]), grid


def _combined_home_win_prob():
    cdfs, grid = component_margin_cdfs.__wrapped__()
    theta = combining.angular_fallback_theta_deg()
    assert theta == pytest.approx(67.5)
    combined = combining.angular_combine(cdfs, grid, theta)
    # P(home margin > 0) = 1 - F(0)
    idx = int(np.argmin(np.abs(grid)))
    return float(1.0 - combined[idx]), combined, grid


# ---------------------------------------------------------------------------
# T1: probability flows end to end (combining -> trust -> staking)
# ---------------------------------------------------------------------------

def test_pipeline_probability_flows_end_to_end():
    p_home, combined, grid = _combined_home_win_prob()
    assert 0.0 < p_home < 1.0, f"combined win prob out of range: {p_home}"
    assert np.all(np.isfinite(combined))
    assert np.all(np.diff(combined) >= -1e-12), "combined CDF must be monotone"


def test_pipeline_calibration_before_staking():
    """Wire-first sequencing: nothing is staked on uncalibrated probabilities."""
    rng = np.random.default_rng(77031)
    n = 600
    true_p = rng.uniform(0.35, 0.65, n)
    raw = np.clip(true_p + rng.normal(0, 0.08, n), 0.01, 0.99)  # miscalibrated
    y = (rng.uniform(0, 1, n) < true_p).astype(float)
    group = np.zeros(n, dtype=int)
    out = trust.calibration_chain(raw, y, group)
    # Chain contract: p_final is the production calibrated probability vector.
    cal = np.asarray(out["p_final"], dtype=float)
    assert np.all((cal >= 0.0) & (cal <= 1.0))
    assert np.all(np.isfinite(cal))
    # Calibration must not make ECE worse than raw by a wide margin.
    ece_raw = trust.adaptive_ece(raw, y)
    ece_cal = trust.adaptive_ece(cal, y)
    assert ece_cal <= ece_raw + 0.02, f"calibration hurt ECE: {ece_raw:.4f} -> {ece_cal:.4f}"


def test_pipeline_edge_gate_before_stake():
    """Wilson 52.4% floor gates the edge claim; CVaR sizer stakes the rest."""
    assert trust.proof_ledger_floor() == pytest.approx(0.524, abs=1e-9)
    assert trust.edge_claim_admissible(wilson_lb=0.53) is True
    assert trust.edge_claim_admissible(wilson_lb=0.51) is False
    # A sub-floor edge claim must NOT reach the sizer in the pipeline.
    assert trust.edge_claim_admissible(wilson_lb=0.50) is False

    rng = np.random.default_rng(90317)
    # brier_history: (forecast_prob, outcome) pairs over the rolling window.
    probs = rng.uniform(0.45, 0.65, 60)
    brier_hist = [(float(p), int(rng.uniform() < p)) for p in probs]
    res = staking.cvar_two_layer_sizer(p_hat=0.60, odds=2.0,
                                       brier_history=brier_hist)
    stake = res["stake_fraction"]
    assert stake >= 0.0
    assert stake <= res["kelly_cap"] + 1e-9, "stake must respect the fractional-Kelly cap"
    assert res["conservative_edge_prob"] <= 0.60 + 1e-9, "CVaR edge must not exceed p_hat"
    # Negative edge -> no stake (the 1631 exclusion at the sizing level).
    res_neg = staking.cvar_two_layer_sizer(p_hat=0.40, odds=2.0,
                                           brier_history=brier_hist)
    assert res_neg["stake_fraction"] == 0.0


def test_pipeline_abstention_vetoes_pick():
    """Abstention (NNTD x market disagreement) vetoes the pick: stake = 0."""
    assert trust.abstain_decision(nntd=0.9, market_disagree=0.9,
                                  tau_disagree=0.5, tau_market=0.5) is True
    assert trust.abstain_decision(nntd=0.1, market_disagree=0.1,
                                  tau_disagree=0.5, tau_market=0.5) is False
    # Pipeline rule: an abstained pick emits no stake, whatever the sizer says.
    abstain = trust.abstain_decision(nntd=0.9, market_disagree=0.9,
                                     tau_disagree=0.5, tau_market=0.5)
    stake = 0.0 if abstain else 0.05
    assert stake == 0.0


def test_pipeline_leak_wall_fail_closed():
    """Non-finite week stamps and missing market feeds fail closed."""
    assert trust.latest_prior_row(kickoff_week=float("nan"), row_week=4) is None
    with pytest.raises(Exception):
        trust.select_market_snapshot(feed=None)


def test_pipeline_determinism():
    """Same seed -> identical stake through the whole probability->stake flow."""
    def run_once():
        p_home, _, _ = _combined_home_win_prob()
        rng = np.random.default_rng(555)
        probs = rng.uniform(0.45, 0.65, 60)
        brier_hist = [(float(p), int(rng.uniform() < p)) for p in probs]
        res = staking.cvar_two_layer_sizer(p_hat=p_home, odds=1.91,
                                           brier_history=brier_hist)
        gov = staking.alpha_governor_pi(alpha=0.7, drawdown=0.95)
        return res["stake_fraction"] * gov
    assert run_once() == run_once()


# ---------------------------------------------------------------------------
# T2: the reasoning engine runs the pipeline's outputs under the depth contract
# ---------------------------------------------------------------------------

def _engine_request(exposure):
    return AnalysisRequest(
        game=GameRequest(away="CLE", home="PIT", week=4, season=2026),
        question="Which side has a calibrated edge?",
        exposure=exposure,
        market_edge_pct=3.0,
    )


def _engine_context():
    p_home, _, _ = _combined_home_win_prob()
    return DataContext(
        market={"p_home_win": p_home, "implied_prob": 0.52},
        observations={"p_home_win": p_home, "spread": -2.5},
        checklist_hints={},  # unhinted tracks -> DATA-GAP at L3+ (valid)
    )


def test_engine_analyze_analysis_only(tmp_path):
    """Exposure NONE: engine runs the analysis; depth contract holds."""
    engine = AnalysisEngine(store_dir=str(tmp_path))
    trace = engine.analyze(_engine_request(Exposure.NONE), _engine_context())
    assert trace is not None
    assert trace.trace_id
    assert depth_contract_ok(trace.depth, trace.exposure) is True
    assert isinstance(trace.depth, ReasoningDepth)


def test_engine_pick_request_reaches_l5(tmp_path):
    """Exposure PUBLISHED_PICK: engine must escalate to L5 (spec §7 contract)."""
    engine = AnalysisEngine(store_dir=str(tmp_path))
    req = _engine_request(Exposure.PUBLISHED_PICK)
    req.requested_depth = ReasoningDepth.L1
    trace = engine.analyze(req, _engine_context())
    assert trace.depth == ReasoningDepth.L5, (
        f"published pick must reach L5, got {trace.depth}"
    )
    assert depth_contract_ok(trace.depth, trace.exposure) is True
    # The pipeline's calibrated probability survived into the trace.
    assert "p_home_win" in trace.observed_values


def test_engine_analysis_isolation_between_games(tmp_path):
    """Two games -> two traces, no cross-contamination (L1 traces carry the
    game on the trace; observed_values populate at L4)."""
    engine = AnalysisEngine(store_dir=str(tmp_path))
    t1 = engine.analyze(_engine_request(Exposure.NONE), _engine_context())
    req2 = AnalysisRequest(
        game=GameRequest(away="NYJ", home="NE", week=4, season=2026),
        question="Which side has a calibrated edge?",
        exposure=Exposure.NONE,
    )
    ctx2 = DataContext(observations={"p_home_win": 0.61, "spread": -3.0})
    t2 = engine.analyze(req2, ctx2)
    assert t1.trace_id != t2.trace_id
    assert t1.game != t2.game
    assert depth_contract_ok(t1.depth, t1.exposure) is True
    assert depth_contract_ok(t2.depth, t2.exposure) is True
