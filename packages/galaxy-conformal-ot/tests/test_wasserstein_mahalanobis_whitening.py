import numpy as np
import pytest

from galaxy_conformal_ot.wasserstein_mahalanobis_whitening import (
    CounterfactualTransportEngine,
    RFFMahalanobis,
    conformal_rank,
    hourly_state_matrix,
    multi_frame_features,
    split_conformal_threshold,
)


def _obs(n_hours=20, seed=0):
    rng = np.random.default_rng(seed)
    t0 = np.datetime64("2026-01-01T00:00:00", "ns")
    times = t0 + np.arange(n_hours) * np.timedelta64(1, "h")
    mk = lambda mu, sd: (times, mu + sd * rng.standard_normal(n_hours))  # noqa: E731
    return t0, {
        "hr": mk(85, 8), "sbp": mk(115, 10), "dbp": mk(65, 6), "map": mk(80, 6),
        "rr": mk(18, 2), "spo2": mk(96, 1.5),
    }


def test_state_matrix_is_causal_prefix_consistent():
    t0, obs = _obs(24)
    full = hourly_state_matrix(obs, t0, None)
    pref = hourly_state_matrix(obs, t0, 11.0)
    assert len(pref) < len(full)
    np.testing.assert_allclose(pref, full[: len(pref)])  # truncating the horizon never changes the past


def test_features_do_not_depend_on_future_samples():
    t0, obs = _obs(24)
    full = hourly_state_matrix(obs, t0, None)
    f_prefix_of_full = multi_frame_features(full[:12])
    f_prefix_direct = multi_frame_features(hourly_state_matrix(obs, t0, 11.0))
    for k, v in f_prefix_direct.items():
        assert v == pytest.approx(f_prefix_of_full[k], rel=1e-9, abs=1e-9)


def test_rank_deficient_window_survives():
    # perfectly collinear + constant channels: covariance is singular, features must stay finite
    T = 15
    base = np.linspace(70, 90, T)
    M = np.column_stack([base, base * 1.2, base * 0.9, np.full(T, 18.0), np.full(T, 97.0), np.full(T, 45.0)])
    f = multi_frame_features(M)
    assert f and all(np.isfinite(v) for v in f.values())


def test_surge_flags_a_sudden_collapse():
    t0, obs = _obs(30, seed=1)
    stable = multi_frame_features(hourly_state_matrix(obs, t0, None))["K8_surge_max"]
    M = hourly_state_matrix(obs, t0, None).copy()
    M[-3:, 1] -= 55.0  # abrupt SBP drop
    M[-3:, 0] += 40.0  # tachycardia
    collapsed = multi_frame_features(M)["K8_surge_max"]
    assert collapsed > stable


def test_conformal_rank_and_vacuous_case():
    assert conformal_rank(99, 0.10) == 90
    assert split_conformal_threshold(np.arange(5.0), 0.01) == float("inf")


def test_split_conformal_finite_sample_coverage():
    rng = np.random.default_rng(3)
    hits = []
    for _ in range(400):
        cal = rng.standard_normal(60)
        tau = split_conformal_threshold(cal, 0.10)
        hits.append(rng.standard_normal() <= tau)
    assert np.mean(hits) >= 0.88  # guarantee 0.90; allow Monte-Carlo slack on 400 draws


def test_rff_mahalanobis_fit_on_reference_only_and_ranks_outliers():
    rng = np.random.default_rng(4)
    ref = rng.standard_normal((200, 5))
    m = RFFMahalanobis(n_features=32, seed=1).fit(ref)
    inlier = m.score(rng.standard_normal((100, 5))).mean()
    outlier = m.score(rng.standard_normal((100, 5)) * 1.0 + 4.0).mean()
    assert outlier > 2 * inlier


def test_sinkhorn_plan_marginals_and_projection():
    rng = np.random.default_rng(5)
    X, Y = rng.standard_normal((6, 3)), rng.standard_normal((9, 3)) + 0.5
    P = CounterfactualTransportEngine.sinkhorn_plan(X, Y, eps=0.5, iters=2000)
    np.testing.assert_allclose(P.sum(axis=1), np.full(6, 1 / 6), atol=1e-6)
    np.testing.assert_allclose(P.sum(axis=0), np.full(9, 1 / 9), atol=1e-6)
    eng = CounterfactualTransportEngine(Y, eps=0.5)
    y_star, delta = eng.project(X[0])
    np.testing.assert_allclose(X[0] - y_star, delta)
    lo, hi = Y.min(axis=0), Y.max(axis=0)
    assert np.all(y_star >= lo - 1e-9) and np.all(y_star <= hi + 1e-9)  # barycenter stays in the reference hull
