"""Paired-flip leverage: the synthetic demonstration.

Asserts the *mechanism* @Timo_NFL documented (dossier D1): on a
dynamic-rating sim, the naive outcome filter inflates leverage into
his measured 1.3-1.6x band, while the paired-flip construction stays
at the single-game effect — including near zero for a near-dead team.
"""
from gse_signal_pack.leverage import demo_configs, leverage_estimates


def test_contender_inflation_inside_timo_band():
    r = leverage_estimates(**demo_configs()["contender"],
                           n_sims=8000, seed=7, k_update=1.75)
    assert r["paired_flip"] > 0.15            # a real swing game
    assert r["naive_filter_dynamic"] > r["paired_flip"]
    assert 1.25 <= r["inflation_ratio"] <= 1.75   # Timo: 1.3-1.6x
    # The frozen-rating filter (his other sanctioned construction)
    # must not show the dynamic filter's inflation.
    assert r["frozen_filter_control"] < r["naive_filter_dynamic"]


def test_longshot_filter_manufactures_leverage():
    r = leverage_estimates(**demo_configs()["longshot"],
                           n_sims=8000, seed=7, k_update=1.75)
    assert r["paired_flip"] < 0.03            # the game barely matters
    assert r["naive_filter_dynamic"] > 1.4 * r["paired_flip"]
