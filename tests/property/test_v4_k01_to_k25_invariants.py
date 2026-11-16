"""Hypothesis property-based invariant checks across K01-K25 v4.0 mathematical kernels."""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from gse_engine.compute.biomech_and_ballistics import (
    compute_humid_air_density,
    evaluate_shared_frailty_pocket_survival,
)
from gse_engine.compute.market_surface_and_filtration import (
    compute_lien_shrestha_vecm_is,
    devig_shin_or_power,
    evaluate_non_commutative_filtration_bridge,
)
from gse_engine.compute.rqmc_tilting_and_regimes import (
    evaluate_2026_dynamic_kickoff_start,
    evaluate_catalytic_ep_wp,
    sample_hurdle_zinb_and_tpg_play,
)
from gse_engine.compute.rvine_sgp_copula import (
    evaluate_5regime_rvine_sgp,
    higham_nearest_correlation,
)
from gse_engine.compute.volume_conservation import reallocate_12cell_kantorovich_vmls_roles
from gse_engine.fabric import compute_shapley_sobol_4block_attribution
from gse_engine.gates.conjunction import compute_baker_mchale_conformal_kelly
from gse_engine.ingestion.multimodal_vlm_and_provenance import deflate_cherry_pick_z_and_exposure
from gse_engine.state_space.etkf_dma_bus import EtkfDmaLatentBus


@given(
    dec_a=st.floats(min_value=1.25, max_value=4.5, allow_nan=False, allow_infinity=False),
    dec_b=st.floats(min_value=1.25, max_value=4.5, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=30, deadline=None)
def test_prop_k01_devig_and_hasbrouck_simplex(dec_a: float, dec_b: float) -> None:
    """K01 devigging and Hasbrouck VECM IS weights always lie on the simplex."""
    p_a, p_b = devig_shin_or_power((dec_a, dec_b))
    assert abs(p_a + p_b - 1.0) < 1e-10
    assert 0.0 < p_a < 1.0 and 0.0 < p_b < 1.0
    is_res = compute_lien_shrestha_vecm_is(
        ["Pinnacle", "Circa"],
        alpha_perp=[0.6, 0.4],
        omega_cov=[[0.04, 0.01], [0.01, 0.05]],
    )
    assert abs(sum(is_res.weights.values()) - 1.0) < 1e-10


@given(
    v3=st.floats(min_value=0.0, max_value=0.25, allow_nan=False, allow_infinity=False),
    v7=st.floats(min_value=0.0, max_value=0.25, allow_nan=False, allow_infinity=False),
    boarded=st.booleans(),
)
@settings(max_examples=25, deadline=None)
def test_prop_k04_12cell_sinkhorn_zero_band_nan_safe(
    v3: float, v7: float, boarded: bool
) -> None:
    """K04 12-cell Kantorovich reallocation conserves total share with zero NaNs."""
    vac = [0.0] * 12
    vac[3] = v3
    vac[7] = v7
    res = reallocate_12cell_kantorovich_vmls_roles(
        vacated_band_shares_v=vac,
        active_player_profiles=[
            (0.8, 0.2, 0.0, 0.0, 12.0, 0.0, 0.1),
            (0.1, 0.7, 0.2, 0.0, 8.5, 0.1, 0.0),
            (0.0, 0.1, 0.5, 0.4, 5.0, 0.2, 0.0),
        ],
        base_shares_r0=(0.35, 0.30, 0.20),
        max_share_add_u=(0.15, 0.15, 0.12),
        has_liquid_two_sided_prop=(boarded, False, False),
    )
    assert res["all_finite"] is True
    assert res["orphan_bucket_share"] == 0.0
    assert float(res["simplex_error"]) < 1e-12


@given(
    p1=st.floats(min_value=0.15, max_value=0.85, allow_nan=False, allow_infinity=False),
    p2=st.floats(min_value=0.15, max_value=0.85, allow_nan=False, allow_infinity=False),
    p3=st.floats(min_value=0.15, max_value=0.85, allow_nan=False, allow_infinity=False),
    off_corr=st.floats(min_value=-0.95, max_value=0.95, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=25, deadline=None)
def test_prop_k13_higham_and_frechet_bounds(
    p1: float, p2: float, p3: float, off_corr: float
) -> None:
    """K13 Higham projection and 5-regime R-Vine SGP preserve Frechet bounds."""
    raw = [[1.0, off_corr, 0.8], [off_corr, 1.0, -0.7], [0.8, -0.7, 1.0]]
    psd = higham_nearest_correlation(raw, eig_floor=1e-5)
    assert psd.min_eigenvalue >= 1e-5 - 1e-9
    rv = evaluate_5regime_rvine_sgp(
        leg_exceedance_probs=(p1, p2, p3),
        raw_corr_matrix=raw,
    )
    assert rv.frechet_lower - 1e-12 <= rv.joint_prob <= rv.frechet_upper + 1e-12


@given(
    los=st.integers(min_value=5, max_value=95),
    i_scat=st.floats(min_value=0.05, max_value=0.85, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=25, deadline=None)
def test_prop_k09_field_boundary_exactness(los: int, i_scat: float) -> None:
    """K09 Hurdle-ZINB & truncated-GPD draws remain bounded by 100 - b."""
    res = sample_hurdle_zinb_and_tpg_play(
        zero_hurdle_pi0=0.05,
        mean_opportunities_mu=5.0,
        nb_dispersion_r=2.0,
        i_scat=i_scat,
        line_of_scrimmage_b=los,
        n_draws=64,
    )
    assert res["all_bounded_le_remaining"] is True


@given(
    temp_c=st.floats(min_value=-12.0, max_value=36.0, allow_nan=False, allow_infinity=False),
    rh_lo=st.floats(min_value=0.05, max_value=0.45, allow_nan=False, allow_infinity=False),
    rh_hi=st.floats(min_value=0.55, max_value=0.98, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=25, deadline=None)
def test_prop_k16_humidity_buoyancy_and_k08_amgm(
    temp_c: float, rh_lo: float, rh_hi: float
) -> None:
    """K16 humid air density decreases monotonically with RH; K08 satisfies AM-GM."""
    r_lo = compute_humid_air_density(temp_celsius=temp_c, rel_humidity=rh_lo, elevation_m=200.0)
    r_hi = compute_humid_air_density(temp_celsius=temp_c, rel_humidity=rh_hi, elevation_m=200.0)
    assert r_hi <= r_lo + 1e-12
    dome_rho = compute_humid_air_density(
        temp_celsius=temp_c,
        rel_humidity=rh_hi,
        elevation_m=1500.0,
        roof_closed=True,
    )
    assert dome_rho == 1.1923

    k08 = evaluate_shared_frailty_pocket_survival(
        rusher_strain=[0.1, 0.3, 0.2, 0.4, 0.8],
        blocker_clipp_eps=[0.2, 0.1, 0.2, 0.0, -0.3],
        chip_indicators=[0.0, 0.0, 0.0, 0.0, 0.5],
    )
    assert k08.am_gm_inequality_holds


@given(
    p_l=st.floats(min_value=0.25, max_value=0.50, allow_nan=False, allow_infinity=False),
    p_mkt=st.floats(min_value=0.51, max_value=0.80, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=20, deadline=None)
def test_prop_k21_humility_lock_and_k25_shapley_exact(p_l: float, p_mkt: float) -> None:
    """K21 enforces fail-closed Kelly lock; K25 preserves Shapley efficiency."""
    res = compute_baker_mchale_conformal_kelly(
        prob_hat=0.65,
        prob_epistemic_var=0.002,
        ta_cqr_lower=p_l,
        ta_cqr_upper=0.72,
        decimal_odds=1.95,
        fair_market_prob=p_mkt,
        real_money_stake_cleared=False,
    )
    assert res["decision"] == "NO_BET"
    assert res["shadow_kelly_fraction"] == 0.0
    assert res["live_stake_fraction"] == 0.0

    rng = np.random.default_rng(123)
    coal = rng.normal(0.0, 3.0, size=16).tolist()
    shap = compute_shapley_sobol_4block_attribution(coal, y_proj=coal[0], y_actual=coal[15])
    assert float(shap["efficiency_residual"]) < 1e-9
    assert shap["luck_learning_weight"] == 0.0


def test_prop_misc_quick_contracts() -> None:
    """Additional non-random invariants across K05/K06/K10/K19/K20."""
    bus = EtkfDmaLatentBus(initial_spread=0.2)
    step = bus.assimilate(
        obs_indices=[0, 16, 17],
        obs_values=[0.5, 45.0, 35.0],
        obs_variances=[0.5, 9.0, 9.0],
    )
    assert min(step.min_subspace_eigenvalues) >= 1.0 and step.split_brain_gap == 0.0
    ep_1 = evaluate_catalytic_ep_wp(down=1, ydstogo=10, yardline_100=25)["ep_0"]
    ep_3 = evaluate_catalytic_ep_wp(down=3, ydstogo=10, yardline_100=25)["ep_0"]
    assert ep_1 >= ep_3
    k10 = evaluate_2026_dynamic_kickoff_start(kick_line_yard=50, zone_override="OOB")
    assert k10.starting_yardline_own == 40
    z_out, n_out, _ = deflate_cherry_pick_z_and_exposure(2.5, 120.0, ())
    assert z_out == 2.5 and n_out == 120.0
    f1 = evaluate_non_commutative_filtration_bridge(
        eta_noon=-2.5,
        delta_line_sharp=-1.0,
        delta_inj_causal=-1.0,
        t_steam_utc=10,
        t_inact_utc=20,
    )
    f2 = evaluate_non_commutative_filtration_bridge(
        eta_noon=-2.5,
        delta_line_sharp=-1.0,
        delta_inj_causal=-1.0,
        t_steam_utc=20,
        t_inact_utc=10,
    )
    assert f1.alpha_priced != f2.alpha_priced
