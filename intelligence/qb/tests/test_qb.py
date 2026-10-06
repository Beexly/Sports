# PROVENANCE — gse-intelligence-build / qb / tests / test_qb.py
# Own tests for the qb module (Wave-2 build, Phase 4).
# Conventions (tests/README.md): provenance headers; expected values pinned by
# the research's reported numbers or independent derivation (no vacuous
# tests); seeded-RNG determinism; missing module = FAIL, never skip.
#
# Research gates mirrored here (canonical: tests/e2e/test_research_gates_e2e.py
# lines 61-120): rGAX stability (1143), INT projection (SYS-23), sack-prop veto
# (SYS-23), edge-sheet luck layer (SYS-24), efficiency blend
# (week3-engine-readings), xFP/FPOE negative gate.
"""Module tests for the qb package (SYS-09 / SYS-23 / SYS-24 / blend)."""

import math
import os
import sys

import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BUILD_ROOT)

import qb  # noqa: E402


# ---------------------------------------------------------------------------
# Shared fixtures — the full DGP run happens once per session (~4s).
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def full_res():
    return qb.rgax_stability_check()


@pytest.fixture(scope="module")
def small_res_a():
    return qb.rgax_stability_check(n_players=600, seed=7)


@pytest.fixture(scope="module")
def small_res_b():
    return qb.rgax_stability_check(n_players=600, seed=8)


@pytest.fixture(scope="module")
def small_res_a_repeat():
    return qb.rgax_stability_check(n_players=600, seed=7)


# ---------------------------------------------------------------------------
# SYS-09 — rGAX stability gate (mirrors test_gate_rgax_stability)
# ---------------------------------------------------------------------------

class TestRgaxStabilityGate:
    def test_robustness_slope_clears_gate(self, full_res):
        # 1143: rGAX robustness slope >= 0.90 (reported 0.936 (SE 0.005))
        assert full_res["robustness_slope"] >= 0.90, (
            f"rGAX stability gate failed: {full_res['robustness_slope']}")

    def test_cross_fit_is_true(self, full_res):
        # 0424 contamination discipline: residuals must be honest (K-fold)
        assert full_res["cross_fit"] is True
        assert full_res["n_folds"] >= 2

    def test_volume_stratified_shrinkage_is_true(self, full_res):
        assert full_res["volume_stratified_shrinkage"] is True
        assert len(full_res["volume_bins"]) >= 2  # actually stratified

    def test_reproduces_paper_raw_slope(self, full_res):
        # unresidualized GAX slope must reproduce the paper's 0.757 structure
        assert abs(full_res["raw_robustness_slope"] - 0.757) < 0.03, (
            f"DGP drifted from paper structure: {full_res['raw_robustness_slope']}")
        # residualization must improve robustness (the whole point of 1143)
        assert full_res["robustness_slope"] > full_res["raw_robustness_slope"]

    def test_slope_standard_errors(self, full_res):
        # paper reports SE 0.005 on both slopes; SYS-09 ledger gate: SE <= 0.01
        assert full_res["robustness_slope_se"] <= 0.01
        assert full_res["raw_robustness_slope_se"] <= 0.01

    def test_outputs_are_computed_not_hardcoded(self, small_res_a, small_res_b):
        # different seeds -> different computed slopes (fails if hard-coded)
        assert small_res_a["robustness_slope"] != small_res_b["robustness_slope"]
        assert small_res_a["raw_robustness_slope"] != small_res_b["raw_robustness_slope"]

    def test_deterministic_given_seed(self, small_res_a, small_res_a_repeat):
        # same seed -> bit-identical (first run is the validation run)
        assert small_res_a["robustness_slope"] == small_res_a_repeat["robustness_slope"]
        assert small_res_a["raw_robustness_slope"] == small_res_a_repeat["raw_robustness_slope"]

    def test_shrinkage_improves_mse_vs_latent(self, full_res):
        # volume-stratified EB shrinkage must earn its keep vs the latent estimand
        assert full_res["shrinkage_improves_mse"] is True
        assert full_res["shrinkage_mse_shrunk"] < full_res["shrinkage_mse_raw"]

    def test_multiplicity_correction_changes_decisions(self, full_res):
        # challenges.md §A.6: paper's figures are uncorrected; decision use
        # requires Bonferroni-Holm/BH/BY — demonstrate a decision changes
        assert full_res["decisions_changed_under_correction"] >= 1, (
            "no decision changed under multiplicity correction")
        assert full_res["n_significant_holm"] <= full_res["n_significant_uncorrected"]
        assert full_res["n_significant_bh"] <= full_res["n_significant_uncorrected"]

    def test_bh_by_corrections_available(self):
        # BH and BY must also run (ship with BH/BY as options, not just Holm)
        res_bh = qb.rgax_stability_check(n_players=600, seed=11, correction="bh")
        res_by = qb.rgax_stability_check(n_players=600, seed=11, correction="by")
        assert res_bh["ci_correction"] == "bh"
        assert res_by["ci_correction"] == "by"
        assert res_bh["n_significant_bh"] <= res_bh["n_significant_uncorrected"]

    def test_bad_correction_rejected(self):
        with pytest.raises(ValueError):
            qb.rgax_stability_check(n_players=300, seed=1, correction="bonferroni-lite")


class TestContaminationAudit:
    def test_contamination_hurts_reference_finisher(self, full_res):
        # 0424: Messi 127.6 -> 120.8 — contamination must move GAX the same way
        audit = full_res["contamination_audit"]
        assert audit["pct_shift"] < 0, (
            f"contamination should depress the reference GAX: {audit['pct_shift']}")

    def test_contamination_is_second_order_vs_noise(self, full_res):
        # 0424 honest delta: bias real but second-order vs single-season noise
        audit = full_res["contamination_audit"]
        assert audit["second_order_vs_noise"] is True
        assert audit["shift_vs_noise_ratio"] < 1.0

    def test_single_season_noise_dominates(self, full_res):
        # paper: SD 3.73 around mean 3.70 at 150 shots — noise ~ signal size
        audit = full_res["contamination_audit"]
        assert audit["single_season_sd"] > 0
        # noise SD must exceed the contamination shift (the honest ordering)
        assert audit["single_season_sd"] > abs(
            audit["reference_gax_contaminated"] - audit["reference_gax_clean"])


# ---------------------------------------------------------------------------
# SYS-23 — INT projection (mirrors test_gate_int_projection)
# ---------------------------------------------------------------------------

class TestIntProjection:
    def test_allen_worked_example(self):
        # gate: FTN worthy-INT rate × expected dropbacks × 52.3% ≈ 0.5
        proj = qb.int_projection(worthy_int_rate=0.0366, expected_dropbacks=27.0)
        assert abs(proj - 0.5) < 0.1, f"INT projection drifted: {proj}"

    def test_formula_is_exact(self):
        assert qb.int_projection(0.0366, 27.0) == 0.0366 * 27.0 * 0.523
        assert qb.int_projection(0.0144, 34.2, 0.523) == 0.0144 * 34.2 * 0.523

    def test_goff_example_documents_file_rounding(self):
        # file reports Goff as 0.3; the arithmetic gives 0.2576 — one-decimal
        # rounding, documented in the docstring rather than silently altered
        raw = qb.int_projection(0.0144, 34.2)
        assert abs(raw - 0.2576) < 0.001
        assert round(raw, 1) == 0.3

    def test_detail_poisson_tails(self):
        d = qb.int_projection_detail(0.0366, 27.0)
        lam = d["expected_ints"]
        assert abs(d["p_at_least_1"] - (1 - math.exp(-lam))) < 1e-12
        assert d["p_at_least_1"] > d["p_at_least_2"] > d["p_at_least_3"] > 0


# ---------------------------------------------------------------------------
# SYS-23 — sack-prop veto (mirrors test_gate_sack_prop_veto)
# ---------------------------------------------------------------------------

class TestSackPropVeto:
    def test_individual_sack_projection_raises(self):
        with pytest.raises(Exception):
            qb.individual_sack_projection("T.J. Watt")

    def test_veto_names_the_research_finding(self):
        with pytest.raises(qb.IndividualSackPropVeto) as excinfo:
            qb.individual_sack_projection("T.J. Watt")
        assert "0.005" in str(excinfo.value)  # pressure→sack R² < 0.005

    def test_veto_applies_to_any_player(self):
        with pytest.raises(Exception):
            qb.individual_sack_projection("Some Rookie")

    def test_team_sack_uses_forced_rates(self):
        team = qb.team_sack_projection("PIT")
        assert team["method"] == "forced_rates", f"must use forced-rates: {team}"
        assert team["expected_sacks"] == (
            team["expected_dropbacks"] * team["pressure_rate"]
            * team["forced_sack_per_pressure"])

    def test_team_sack_accepts_explicit_inputs(self):
        team = qb.team_sack_projection("PIT", expected_dropbacks=40.0,
                                       pressure_rate=0.25,
                                       forced_sack_per_pressure=0.30)
        assert team["expected_sacks"] == pytest.approx(40.0 * 0.25 * 0.30)


# ---------------------------------------------------------------------------
# SYS-24 — edge-sheet luck layer (mirrors test_gate_edge_sheet_luck_layer)
# ---------------------------------------------------------------------------

class TestLuckLayer:
    def test_fumble_recovery_is_noise(self):
        assert qb.fumble_recovery_is_noise() is True

    def test_turnover_to_points(self):
        assert abs(qb.turnover_to_points() - 4.5) < 0.5

    def test_fair_margin_formula(self):
        m = qb.fair_margin(home_net_epa=0.10, away_net_epa=0.02)
        assert abs(m - (0.08 * 63 + 2.0)) < 1e-9, f"formula drifted: {m}"

    def test_fair_margin_home_field_constant(self):
        # even EPA -> the +2.0 home constant alone
        assert qb.fair_margin(0.05, 0.05) == pytest.approx(2.0)

    def test_neutral_band_gate(self):
        assert qb.luck_band(7.0, 7.04) == "neutral"     # |diff| < 1.5
        assert qb.luck_band(10.0, 7.04) == "publish"    # |diff| > 1.5
        assert qb.luck_band(7.04 + 1.49, 7.04) == "neutral"
        assert qb.luck_band(7.04 + 1.51, 7.04) == "publish"

    def test_luck_adjusted_margin(self):
        res = qb.luck_adjusted_margin(
            home_net_epa=0.10, away_net_epa=0.02,
            home_takeaways=3, away_takeaways=1,
            expected_home_takeaways=1.5, expected_away_takeaways=1.5)
        # home was lucky (+1.5 takeaways × 4.5 = +6.75 pts flattered them);
        # away was unlucky (-0.5 × 4.5 = -2.25: away lost 2.25 pts to bad
        # luck, which flattered home's margin by +2.25 — also removed)
        assert res["fair_margin"] == pytest.approx(7.04)
        assert res["home_turnover_luck_pts"] == pytest.approx(6.75)
        assert res["away_turnover_luck_pts"] == pytest.approx(-2.25)
        assert res["luck_adjusted_margin"] == pytest.approx(7.04 - 6.75 - 2.25)
        assert res["band"] == "publish"

    def test_no_luck_differential_stays_neutral(self):
        res = qb.luck_adjusted_margin(
            0.10, 0.02, 1.5, 1.5, 1.5, 1.5)
        assert res["luck_adjusted_margin"] == pytest.approx(res["fair_margin"])
        assert res["band"] == "neutral"


# ---------------------------------------------------------------------------
# week3-engine-readings — efficiency blend (mirrors test_gate_efficiency_blend)
# ---------------------------------------------------------------------------

class TestEfficiencyBlend:
    def test_weights_sum_to_one(self):
        w = qb.efficiency_blend_weights()
        assert abs(sum(w.values()) - 1.0) < 1e-9

    def test_exact_weights(self):
        w = qb.efficiency_blend_weights()
        assert abs(w["pass_epa_resid"] - 0.55) < 1e-9
        assert abs(w["rush_epa_resid"] - 0.15) < 1e-9
        assert abs(w["cpoe"] - 0.15) < 1e-9
        assert abs(w["explosive_pass"] - 0.10) < 1e-9
        assert abs(w["int_luck"] - 0.05) < 1e-9

    def test_dark_families_contribute_zero(self):
        assert qb.dark_family_weight() == 0.0

    def test_weights_are_a_copy(self):
        # callers must not mutate the module's canonical weights
        w = qb.efficiency_blend_weights()
        w["pass_epa_resid"] = 0.0
        assert qb.efficiency_blend_weights()["pass_epa_resid"] == 0.55

    def test_apply_blend(self):
        score = qb.apply_efficiency_blend(
            pass_epa_resid=0.10, rush_epa_resid=0.02, cpoe=0.05,
            explosive_pass=0.08, int_luck=-0.01)
        expected = 0.55 * 0.10 + 0.15 * 0.02 + 0.15 * 0.05 + 0.10 * 0.08 + 0.05 * -0.01
        assert score == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Negative gate — xFP/FPOE stays rejected (mirrors test_negative_xfp_fpoe_rejected)
# ---------------------------------------------------------------------------

class TestNegativeGates:
    def test_xfpoe_not_wired(self):
        feats = [f.lower() for f in qb.ranking_features()]
        assert "xfpoe" not in feats, "qb wires rejected xFP/FPOE"
        assert len(feats) > 0  # non-vacuous: the list is real

    def test_ranking_features_cover_the_module(self):
        feats = qb.ranking_features()
        for required in ("rgax", "int_projection", "team_sack_rate",
                         "fair_margin_luck_adj"):
            assert required in feats
