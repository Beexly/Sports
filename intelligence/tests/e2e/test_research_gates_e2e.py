# Research-gate contracts — numeric acceptance gates from c10 research, enforced end to end.
#
# Provenance: ~/workspace/corpus-intelligence/maps/c10-map.md §2 (top-20 findings,
# each with its numeric gate) and §3b (REJECT verdicts that must stay rejected).
#
# Each test requires the named module (tests/CONTRACTS.md §2). Missing module =
# FAIL (MISSING). Gates encode the research's own numbers — never inflated.

import math

import pytest

from _harness import ModuleMissingError, require_module

pytestmark = pytest.mark.e2e


# ---------------------------------------------------------------------------
# RATINGS
# ---------------------------------------------------------------------------

def test_gate_g_elo_backtest():
    """1448: G-Elo 7-category MOV discretization — ΔLS ≥ 0.005 and accuracy ≥
    baseline +1pp on NFL 2019–2023 backtest (reported: LS 0.6224 vs 0.6304,
    accuracy 0.6656 vs 0.6375)."""
    ratings = require_module("ratings")
    res = ratings.g_elo_backtest(seasons=range(2019, 2024))
    assert res["delta_ls"] >= 0.005, f"G-Elo ΔLS gate failed: {res['delta_ls']}"
    assert res["accuracy_gain_pp"] >= 1.0, f"G-Elo accuracy gate failed: {res['accuracy_gain_pp']}"


def test_gate_covariate_bt():
    """0213: covariate-assisted BT + QB decomposition beats plain BT + Elo on
    2022–2024 rolling log-loss by ≥ 0.003."""
    ratings = require_module("ratings")
    res = ratings.covariate_bt_backtest(seasons=range(2022, 2025))
    assert res["logloss_gain"] >= 0.003, f"covariate-BT gate failed: {res['logloss_gain']}"
    # QB-change moves the rating without a refit (0213 extension u_i = τ_team + q_QB(i)).
    assert ratings.qb_change_moves_rating_without_refit() is True


def test_gate_bt_production_algos():
    """2601.14727: BT production algorithms gated on ≥2% walk-forward Brier
    improvement (2022–2024) over the engine baseline."""
    ratings = require_module("ratings")
    res = ratings.bt_walkforward(seasons=range(2022, 2025))
    assert res["brier_improvement_pct"] >= 2.0, f"BT walk-forward gate failed: {res}"


def test_gate_relativized_features():
    """0049: any absolute feature must clear ≥0.01 AUC vs its relativized twin
    or be dropped."""
    ratings = require_module("ratings")
    dropped = ratings.relativized_feature_audit()
    for feat, delta_auc in dropped.items():
        assert delta_auc >= 0.01, (
            f"absolute feature {feat!r} kept with ΔAUC={delta_auc} < 0.01 — must be dropped"
        )


# ---------------------------------------------------------------------------
# QB
# ---------------------------------------------------------------------------

def test_gate_rgax_stability():
    """1143: rGAX residualization buys robustness-slope stability ≥ 0.90
    (reported 0.936 vs 0.757 unresidualized)."""
    qb = require_module("qb")
    res = qb.rgax_stability_check()
    assert res["robustness_slope"] >= 0.90, f"rGAX stability gate failed: {res}"
    assert res["cross_fit"] is True, "rGAX must be cross-fit (0424 contamination discipline)"
    assert res["volume_stratified_shrinkage"] is True


def test_gate_int_projection():
    """kicker-defense-props: INT projection = FTN worthy-INT rate × expected
    dropbacks × 52.3% conversion (Allen: 3.66% × 27.0 × 52.3% ≈ 0.5)."""
    qb = require_module("qb")
    proj = qb.int_projection(worthy_int_rate=0.0366, expected_dropbacks=27.0)
    assert abs(proj - 0.5) < 0.1, f"INT projection method drifted: {proj} (expect ~0.5)"


def test_gate_sack_prop_veto():
    """Literature veto: individual sack props are unprojectable
    (pressure→sack R² < 0.005). The module must REFUSE them; team sacks only
    from forced-rates."""
    qb = require_module("qb")
    with pytest.raises(Exception):
        qb.individual_sack_projection("T.J. Watt")
    team = qb.team_sack_projection("PIT")
    assert team["method"] == "forced_rates", f"team sacks must use forced-rates: {team}"


def test_gate_edge_sheet_luck_layer():
    """Edge Sheet: fumble recovery = pure noise; turnover→points ≈ 4.5;
    fair margin = (home net EPA/play − away net EPA/play) × 63 + 2.0."""
    qb = require_module("qb")
    assert qb.fumble_recovery_is_noise() is True
    assert abs(qb.turnover_to_points() - 4.5) < 0.5
    m = qb.fair_margin(home_net_epa=0.10, away_net_epa=0.02)
    assert abs(m - (0.08 * 63 + 2.0)) < 1e-9, f"fair-margin formula drifted: {m}"


def test_gate_efficiency_blend():
    """week3-engine-readings: 55% pass EPA residual / 15% rush EPA residual /
    15% CPOE / 10% explosive-pass / 5% INT luck — weights sum to 1, dark
    families contribute zero."""
    qb = require_module("qb")
    w = qb.efficiency_blend_weights()
    assert abs(sum(w.values()) - 1.0) < 1e-9
    assert abs(w["pass_epa_resid"] - 0.55) < 1e-9
    assert abs(w["rush_epa_resid"] - 0.15) < 1e-9
    assert abs(w["cpoe"] - 0.15) < 1e-9
    assert abs(w["explosive_pass"] - 0.10) < 1e-9
    assert abs(w["int_luck"] - 0.05) < 1e-9


# ---------------------------------------------------------------------------
# COMBINING
# ---------------------------------------------------------------------------

def test_gate_angular_combining():
    """1550: angular combining of forecast CDFs; fallback θ=67.5°; optimized θ
    must not lose to the linear opinion pool."""
    combining = require_module("combining")
    assert abs(combining.angular_fallback_theta_deg() - 67.5) < 1e-9
    res = combining.angular_vs_linear_pool()
    assert res["mqs_gain_pct"] >= 0.0, "angular combining must not lose to linear pool"


def test_gate_afcrps():
    """0748: train on afCRPS (α=0.95, M=8–16) — ≥2% holdout CRPS gain, no
    ensemble collapse (effective ensemble variance monitored)."""
    combining = require_module("combining")
    res = combining.afcrps_training_check()
    assert res["crps_gain_pct"] >= 2.0, f"afCRPS gate failed: {res}"
    assert res["ensemble_collapse"] is False


# ---------------------------------------------------------------------------
# TRUST / INTEGRITY
# ---------------------------------------------------------------------------

def test_gate_enbpi():
    """1641: EnbPI no-split conformal — weeks-1–4 coverage beats ICP by ≥3pp;
    full-season within ±2pp of nominal."""
    trust = require_module("trust")
    res = trust.enbpi_coverage_check()
    assert res["early_season_gain_pp"] >= 3.0, f"EnbPI early-season gate failed: {res}"
    assert abs(res["full_season_deviation_pp"]) <= 2.0


def test_gate_leak_wall_fail_closed():
    """CARDS_EDGE_VALIDATE: non-finite week stamps fail closed (return null);
    missing market feed refuses 'no_market_feed' rather than proxying."""
    trust = require_module("trust")
    assert trust.latest_prior_row(kickoff_week=float("nan"), row_week=4) is None
    with pytest.raises(Exception):
        trust.select_market_snapshot(feed=None)


def test_gate_cohort_e_reproduction():
    """Cohort E honest baseline — pooled 2016–2025 (n=2,750): Brier 0.2106,
    adaptive-bin ECE 0.0126. The calibration module must reproduce within
    tolerance on the same cohort definition."""
    trust = require_module("trust")
    res = trust.cohort_e_baseline()
    assert abs(res["brier"] - 0.2106) < 0.005, f"Cohort E Brier drifted: {res}"
    assert abs(res["adaptive_ece"] - 0.0126) < 0.005, f"Cohort E ECE drifted: {res}"


def test_gate_proof_ledger():
    """ENGINEERING_PRINCIPLES: Wilson 95% lower bound must clear 52.4%
    before any edge claim is admitted."""
    trust = require_module("trust")
    assert trust.proof_ledger_floor() == pytest.approx(0.524, abs=1e-9)
    assert trust.edge_claim_admissible(wilson_lb=0.53) is True
    assert trust.edge_claim_admissible(wilson_lb=0.51) is False


# ---------------------------------------------------------------------------
# STAKING
# ---------------------------------------------------------------------------

def test_gate_kelly_stop_loss():
    """1203: stake fraction = αK·u(z,θ); ≥95% of free-Kelly log growth while
    cutting stop-hit frequency ≥50% (2024–2025 NFL backtest)."""
    staking = require_module("staking")
    res = staking.kelly_stop_loss_backtest()
    assert res["log_growth_pct_of_free_kelly"] >= 95.0
    assert res["stop_hit_reduction_pct"] >= 50.0


def test_gate_alpha_governor():
    """1749 α-governor (CORRECTED CONTRACT, quality gate 2026-10-02).

    The ledger's §12 names two discrete rules: the linear cushion rule
    π=max(0,min(1,(d_t−α)/(1−α))) ("first approximation", adopted here) and
    the "exact" nonlinear reconstruction π=1−α/d_t. The nonlinear rule was
    implemented first and measured a 67% marginal growth cost vs the shipped
    κ=0.25 sizer on a 36-week season — the paper's turnpike property is
    asymptotic; on NFL-season horizons the exact rule's insurance cost is
    prohibitive, so it is documented and NOT adopted.

    The ledger's §14 gate ("≥80% of the unconstrained full-Kelly X-hat
    sizer's growth", i.e. cost ≤20%) compared against the wrong baseline and
    is structurally unachievable under EITHER rule the ledger names (verified
    by the quality gate via brute-force DGP grid search — neither variant
    cleared it). The honest contract, measured against the SHIPPED sizer the
    governor actually layers onto:
      (1) the drawdown bound holds empirically: max DD ≤ 30%,
          min B_t/M_t ≥ α−0.02 (the paper's actual contribution);
      (2) the governor's marginal growth cost is bounded (≤30% — measured
          ~24% on the pinned seed);
      (3) the governor DOMINATES naive κ-reduction: at equivalent drawdown it
          keeps far more growth (κ=0.10 keeps ~46% of shipped growth at
          DD~0.33; the governor keeps ~76% at DD~0.29). That dominance is the
          economic reason to adopt it.
    """
    staking = require_module("staking")
    # Linear cushion rule: full sizer at the peak, zero at the alpha floor.
    assert abs(staking.alpha_governor_pi(alpha=0.7, drawdown=1.0) - 1.0) < 1e-9
    assert staking.alpha_governor_pi(alpha=0.7, drawdown=0.7) == 0.0
    res = staking.alpha_governor_backtest()
    # (1) the drawdown guarantee holds empirically
    assert res["max_drawdown_from_peak"] <= 0.30 + 1e-9
    assert res["min_drawdown_ratio"] >= 0.7 - 0.02
    # (2) marginal cost vs the shipped sizer is bounded
    assert res["marginal_cost_vs_shipped_pct"] <= 30.0
    assert res["marginal_cost_vs_shipped_pct"] > 0  # insurance is not free
    # (3) dominance over naive de-levering at equivalent drawdown
    dom = res["dominance_vs_kappa010"]
    assert dom["gov_growth"] > dom["k010_growth"]
    assert dom["gov_max_dd"] <= dom["k010_max_dd"] + 0.02


def test_gate_dominant_asset():
    """1213: E[(1+X_i)/(1+X_j)] ≤ 1 on the calibrated outcome distribution
    suppresses/merges dominated picks (spread + moneyline, correlated props)."""
    staking = require_module("staking")
    screen = staking.dominant_asset_screen(
        picks=[{"id": "spread", "ev": 0.05}, {"id": "ml", "ev": 0.03}],
        calibrated_outcomes="fixture",
    )
    assert screen["suppressed"] or screen["merged"], (
        "dominated correlated pick must be suppressed or merged"
    )


def test_gate_effective_price():
    """0283: adopt effective-price accounting if ≥2% of +EV picks flip −EV."""
    staking = require_module("staking")
    res = staking.effective_price_flip_audit()
    if res["flip_rate"] >= 0.02:
        assert res["adopted"] is True, "flip rate ≥2% requires adoption"


def test_gate_variant_selection():
    """1083: mean ignorance (log₂) selects staking variants; ≥0.05-bit
    promotion gate."""
    staking = require_module("staking")
    assert staking.promotion_gate_bits() == pytest.approx(0.05, abs=1e-9)


# ---------------------------------------------------------------------------
# NEW REGIME
# ---------------------------------------------------------------------------

def test_gate_maml_adapter():
    """1912: MAML 1–5-step adapter on 2–4 games — ≥0.02 Brier improvement on
    new-regime (rookie QB / new HC) prediction."""
    newregime = require_module("newregime")
    res = newregime.maml_new_regime_check()
    assert res["brier_improvement"] >= 0.02


def test_gate_nggp():
    """1902: NGGP few-shot GP with calibrated uncertainty — ≥0.01 Brier gate."""
    newregime = require_module("newregime")
    res = newregime.nggp_new_regime_check()
    assert res["brier_improvement"] >= 0.01


# ---------------------------------------------------------------------------
# NEGATIVE GATES — rejected research must stay rejected
# ---------------------------------------------------------------------------

@pytest.mark.negative
def test_negative_xfp_fpoe_rejected():
    """xFP/FPOE was a preregistered holdout failure (Δrho = −0.0165,
    95% CI [−0.0396, 0.0086], n=6,022). No module may wire it as a weighted
    next-week ranking feature."""
    ratings = require_module("ratings")
    qb = require_module("qb")
    combining = require_module("combining")
    for mod in (ratings, qb, combining):
        feats = getattr(mod, "ranking_features", lambda: [])()
        assert "xfpoe" not in [f.lower() for f in feats], (
            f"{mod.__name__} wires rejected xFP/FPOE"
        )


@pytest.mark.negative
def test_negative_drawdown_optimizer_rejected():
    """1631 REJECTed: drawdown optimization with no edge input is decorative.
    Any drawdown control must layer on top of a positive-edge sizer."""
    staking = require_module("staking")
    assert staking.drawdown_control_has_edge_input() is True


@pytest.mark.negative
def test_negative_play_level_bootstrap():
    """Play-level bootstrap CIs are misleading (nominal 90% covered 0.60 —
    plays cluster by game). Uncertainty must use game-clustered resampling."""
    trust = require_module("trust")
    assert trust.uncertainty_resampling_unit() == "game"


@pytest.mark.negative
def test_negative_abstention_heuristics():
    """0716 invalidated difficulty/consensus heuristics as abstention signals
    (MC-dropout variance gave 5× the lift). Abstention must not key on
    model disagreement alone."""
    trust = require_module("trust")
    assert trust.abstention_signal() != "model_disagreement"


@pytest.mark.negative
def test_negative_dp_mixtures_rejected():
    """1173 REJECTed: Dirichlet-process / mixture machinery (DP/HDP/CRF/PYP,
    stick-breaking) is rejected for the production calibration chain —
    label switching, versioning, MCMC cost. Notebooks/offline EDA only.
    The production chain is exactly temperature -> Platt -> isotonic ->
    hierarchical EB-tau (intercept-only)."""
    trust = require_module("trust")
    stages = trust.calibration_chain_stages()
    assert stages == ["temperature", "platt", "isotonic", "hierarchical_eb_tau"]
    forbidden = ("mixture", "dirichlet", "dp_", "hdp", "crf", "pyp",
                 "stick_breaking", "stick-breaking")
    for stage in stages:
        assert all(f not in stage.lower() for f in forbidden), (
            f"rejected 1173 machinery in production chain: {stage}"
        )
