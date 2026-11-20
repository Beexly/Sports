from __future__ import annotations

import numpy as np

from scripts.ops.evaluate_slate_360_full_markets import sample_discrete_window_yards


def test_sample_discrete_window_yards_has_exact_zero_catch_mass():
    rng = np.random.default_rng(20261119)
    n_sims = 6000
    full_events = rng.poisson(3.5, size=n_sims).astype(np.float64)
    full_yds = np.where(full_events > 0, full_events * rng.gamma(2.0, 5.7, size=n_sims), 0.0)

    q1 = sample_discrete_window_yards(
        rng=rng,
        full_events_vec=full_events,
        full_yards_vec=full_yds,
        window_share=0.24,
        ype_prior=11.4,
    )
    zero_mass = float(np.mean(q1 == 0.0))
    assert 0.25 <= zero_mass <= 0.60, f"1Q zero-catch mass={zero_mass:.3f} must be non-trivial"
    assert float(np.mean(q1 > 4.5)) <= 0.56
    assert np.all(q1 <= full_yds + 1e-6)
    expected = 0.24 * float(np.mean(full_yds))
    assert abs(float(np.mean(q1)) - expected) <= max(2.5, 0.20 * expected)
