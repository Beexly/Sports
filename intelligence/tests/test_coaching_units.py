"""Unit tests for the coaching module — synthetic fixtures, fast.

Covers: ShrunkLookup math, TauFitter inverse-problem recovery on synthetic
data with known tau, fallback chain, serve(), evaluate_4th action-set logic,
two_pt_edge, behavior-hook identity.
"""
import numpy as np
import pandas as pd
import pytest

from coaching.coach_risk import TauFitter, TAU_GRID, WP_BINS
from coaching.situational_wp import ShrunkLookup, SituationalEngine, add_state_bands
from coaching import behavior as behavior_mod


# ---------- ShrunkLookup ----------

def _synth_rates(n_fine=200, n_coarse_extra=0, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    rows += [("a", "x", 1)] * 160 + [("a", "x", 0)] * 40      # fine cell: 0.80
    rows += [("a", "y", 1)] * 30 + [("a", "y", 0)] * 70       # same coarse: 0.30
    rows += [("b", "x", 1)] * 50 + [("b", "x", 0)] * 50        # other coarse: 0.50
    df = pd.DataFrame(rows, columns=["k1", "k2", "v"])
    return df


def test_shrink_blend_math():
    df = _synth_rates()
    lu = ShrunkLookup(df, "v", [["k1", "k2"], ["k1"]], n0=50)
    # fine cell (a,x): n=200, mean .8 ; coarse (a): n=300, mean (160+30)/300=.6333
    p = lu.predict({"k1": "a", "k2": "x"})
    coarse_mean = 190 / 300
    w_fine = 200 / 250
    # hierarchical: backoff starts global, then coarse, then fine
    glob = df["v"].mean()
    w_c = 300 / 350
    backoff_c = w_c * coarse_mean + (1 - w_c) * glob
    expect = w_fine * 0.8 + (1 - w_fine) * backoff_c
    assert p == pytest.approx(expect, abs=1e-9)


def test_shrink_sparse_cell_falls_back():
    df = _synth_rates()
    lu = ShrunkLookup(df, "v", [["k1", "k2"], ["k1"]], n0=50)
    p = lu.predict({"k1": "zzz", "k2": "zzz"})  # unseen -> global mean
    assert p == pytest.approx(df["v"].mean(), abs=1e-9)


def test_shrink_monotone_in_n0():
    df = _synth_rates()
    lo = ShrunkLookup(df, "v", [["k1", "k2"], ["k1"]], n0=1).predict({"k1": "a", "k2": "x"})
    hi = ShrunkLookup(df, "v", [["k1", "k2"], ["k1"]], n0=10**6).predict({"k1": "a", "k2": "x"})
    assert lo > hi  # less shrinkage -> closer to fine-cell 0.80


# ---------- TauFitter on synthetic known-tau data ----------

def _synth_fourth_downs(tau_true=0.35, n_per_action=400, n_decisions=300, seed=1):
    """Value-distribution rows keep their generating action; separate decision
    rows follow the tau_true-optimal policy exactly."""
    rng = np.random.default_rng(seed)
    dists = {"GO": lambda n: rng.normal(0.5, 0.25, n),
             "PUNT": lambda n: rng.normal(0.42, 0.03, n),
             "FGA": lambda n: rng.normal(0.45, 0.05, n)}
    rows = []
    for action, dist in dists.items():
        for x in np.clip(dist(n_per_action), 0.01, 0.99):
            rows.append(("TM", 2024, "opp", "40-60", "4-7", "21-35", action, 0.5, float(x)))
    q = {a: np.quantile(np.clip(dists[a](5000), 0.01, 0.99), tau_true) for a in dists}
    a_star = max(q, key=q.get)
    for x in np.clip(dists[a_star](n_decisions), 0.01, 0.99):
        rows.append(("TM", 2024, "opp", "40-60", "4-7", "21-35", a_star, 0.5, float(x)))
    df = pd.DataFrame(rows, columns=["posteam", "season", "region", "wp_bin",
                                     "dist_band", "yard_band", "action", "wp", "value"])
    decisions = df.tail(n_decisions).copy()
    return df, decisions, a_star


def _fit_synth(tau_true=0.35, **kw):
    df, decisions, a_star = _synth_fourth_downs(tau_true, **kw)
    f = TauFitter(df, min_cell_n=10, min_unit_n=10)
    return f, decisions, a_star


def test_tau_recovery():
    f, decisions, a_star = _fit_synth(tau_true=0.35)
    r = f.fit_unit(decisions)
    assert not r["fallback"]
    assert r["n"] == len(decisions)
    # recovered tau must make a_star optimal -> tau_hat within grid of 0.35
    assert abs(r["tau_hat"] - 0.35) <= 0.05 + 1e-9


def test_tau_low_tau_avoids_go():
    # at tau=0.2 the wide GO left tail loses to tight PUNT/FGA
    f, decisions, _ = _fit_synth(tau_true=0.35)
    row = decisions.iloc[0]
    assert f.tau_optimal_action(row, 0.2) in ("PUNT", "FGA")
    assert f.tau_optimal_action(row, 0.8) == "GO"


def test_fallback_chain():
    f, decisions, _ = _fit_synth()
    small = decisions.head(5)  # below min_unit_n
    r = f.fit_unit(small)
    assert r["fallback"] and np.isnan(r["tau_hat"])
    # fitter trained only on the tiny unit: every unit falls back, and with
    # no estimable pooled/league data the chain bottoms out at the prior
    f2 = TauFitter(small, min_cell_n=10, min_unit_n=10)
    tab = f2.fit(seasons=[2024])
    assert tab["fallback"].all()
    assert tab["tau_hat_served"].notna().all(), "chain must never serve NaN"
    tau, level = f2.serve("TM", 2024, "opp", 0.5)
    assert level in ("pooled", "league", "league_region", "prior")
    assert 0.2 <= tau <= 0.8


def test_serve_unknown_team_returns_prior():
    f, _, _ = _fit_synth()
    f.fit(seasons=[2024])
    tau, level = f.serve("NOBODY", 1999, "own", 0.1)
    assert level in ("league", "prior")
    assert 0.2 <= tau <= 0.8


# ---------- SituationalEngine on synthetic pbp ----------

def _synth_pbp(n_games=30, seed=3):
    rng = np.random.default_rng(seed)
    rows = []
    gid = 0
    for _ in range(n_games):
        gid += 1
        for play in range(60):
            down = int(rng.integers(1, 5))
            pt = rng.choice(["pass", "run", "punt", "field_goal", "kickoff"],
                            p=[0.4, 0.35, 0.1, 0.08, 0.07])
            yl = float(rng.integers(1, 100))
            rows.append({
                "game_id": f"g{gid}", "drive": play // 8 + 1,
                "posteam": "TM", "defteam": "OP", "down": down, "play_type": pt,
                "wp": float(rng.uniform(0.05, 0.95)),
                "wpa": float(rng.normal(0, 0.05)),
                "yardline_100": yl, "ydstogo": float(rng.integers(1, 15)),
                "qtr": int(rng.integers(1, 5)),
                "game_seconds_remaining": float(rng.uniform(0, 3600)),
                "score_differential": float(rng.integers(-21, 22)),
                "fourth_down_converted": int(rng.random() < 0.5),
                "fourth_down_failed": 0, "first_down": int(rng.random() < 0.6),
                "field_goal_result": rng.choice(["made", "missed"]),
                "interception": 0, "fumble_lost": 0, "touchdown": 0,
                "two_point_conv_result": "no_attempt",
                "posteam_timeouts_remaining": 3,
            })
    return pd.DataFrame(rows)


@pytest.fixture(scope="module")
def synth_engine():
    return SituationalEngine(_synth_pbp())


def test_evaluate_4th_action_set(synth_engine):
    ev = synth_engine.evaluate_4th(40, 2, 0, 900, 4)
    assert set(ev.keys()) == {"GO", "FGA", "PUNT"}
    assert all(np.isfinite(v) or v == -np.inf for v in ev.values())
    ev2 = synth_engine.evaluate_4th(90, 10, 0, 900, 1)  # out of FG range
    assert ev2["FGA"] == -np.inf


def test_optimal_4th_returns_member(synth_engine):
    a, ev = synth_engine.optimal_4th(40, 2, 0, 900, 4)
    assert a in ev and a == max(ev, key=ev.get)


def test_two_pt_edge_sign(synth_engine):
    e = synth_engine.two_pt_edge()
    assert isinstance(e, float) and np.isfinite(e)


def test_add_state_bands_no_nans():
    df = add_state_bands(_synth_pbp(n_games=5).head(200))
    for c in ["dist_band", "yard_band", "score_band", "time_band"]:
        assert df[c].isna().sum() == 0


# ---------- behavior hook ----------

def test_behavior_identity_when_tau_agrees_with_optimal():
    f, decisions, _ = _fit_synth(tau_true=0.8)  # tau high -> predicts GO
    f.fit(seasons=[2024])
    eng = SituationalEngine(_synth_pbp(n_games=10, seed=9))
    out = behavior_mod.expected_wp_given_coach(
        eng, f, "TM", 2024, 30, 2, 0, 900, 4, wp=0.5)
    assert out["action_predicted"] in ("GO", "FGA", "PUNT")
    assert 0.0 <= out["wp_behavior"] <= 1.0
    assert out["wp_gap"] >= -1e-9  # behavior never beats optimal
    ev = eng.evaluate_4th(30, 2, 0, 900, 4)
    if out["action_predicted"] == max(ev, key=ev.get):
        assert out["wp_behavior"] == pytest.approx(out["wp_optimal"])
