from __future__ import annotations

import numpy as np

from scripts.ops.evaluate_slate_360_full_markets import sample_exact_n_trial_longest_play


def test_exact_n_trial_longest_play_invariants_and_tnf_cases():
    rng = np.random.default_rng(20261119)

    zero_n = np.zeros(1000, dtype=np.float64)
    out_zero = sample_exact_n_trial_longest_play(rng, zero_n, play_mean=12.0, play_cv=0.85)
    assert np.all(out_zero == 0.0)

    s_3 = sample_exact_n_trial_longest_play(rng, np.full(4000, 3.0), play_mean=12.0, play_cv=0.85)
    s_10 = sample_exact_n_trial_longest_play(rng, np.full(4000, 10.0), play_mean=12.0, play_cv=0.85)
    s_24 = sample_exact_n_trial_longest_play(rng, np.full(4000, 24.0), play_mean=12.0, play_cv=0.85)
    assert float(np.mean(s_24)) > float(np.mean(s_10)) > float(np.mean(s_3))

    # David Montgomery (~24 carries, ~4.1 YPC, cv=1.15) must never mean 6.79 / 73% under 13.5
    mont = sample_exact_n_trial_longest_play(rng, np.full(5000, 24.0), play_mean=4.1, play_cv=1.15)
    assert float(np.mean(mont)) >= 14.0
    assert float(np.mean(mont < 13.5)) < 0.55

    # Tank Dell (~2.45 catches, ~13.0 YPR, cv=0.75) must not exceed 52% over 20.5
    dell = sample_exact_n_trial_longest_play(rng, rng.poisson(2.45, size=5000).astype(np.float64), play_mean=13.0, play_cv=0.75)
    assert float(np.mean(dell > 20.5)) < 0.52

    # C.J. Stroud (22 completions, ~12.6 YPC vs injured CBs) must mean >= 36 yds
    stroud = sample_exact_n_trial_longest_play(rng, np.full(5000, 22.0), play_mean=12.6, play_cv=0.82)
    assert float(np.mean(stroud)) >= 36.0
