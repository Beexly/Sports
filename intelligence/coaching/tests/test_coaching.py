# PROVENANCE — gse-intelligence-build / coaching / tests / test_coaching.py
# Test suite for the coaching tendency engine (c03).
# Conventions (tests/README.md): provenance headers; expected values pinned by
# independent derivation or published research numbers (no vacuous tests);
# seeded RNG determinism; missing module = FAIL, never skip.
"""Unit + integration tests for the coaching tendency engine."""
import math
import os
import sys

import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BUILD_ROOT)

from coaching import common as C
from coaching import load as L
from coaching import proe as PROE
from coaching import fingerprint as FP
from coaching import tenures as TN
from coaching import regime as RG
from coaching import sequencing as SQ
from coaching import script_elasticity as SE_
from coaching import redzone as RZ
from coaching import tempo as TM
from coaching import adjustments as ADJ
from coaching import dc_pressure as DCP
from coaching import ingame as IG
from coaching.provider import CoachingEngineProvider
from integration.providers import CoachingProvider, DataGapError
from integration.types import Verification


# ---------------------------------------------------------------------------
# common: predicates + math
# ---------------------------------------------------------------------------

class TestCommon:
    def test_neutral_script_bounds(self):
        assert C.is_neutral_script({"wp": 0.35})
        assert C.is_neutral_script({"wp": 0.65})
        assert not C.is_neutral_script({"wp": 0.34})
        assert not C.is_neutral_script({"wp": 0.66})
        assert not C.is_neutral_script({"wp": None})

    def test_scrimmage_filter(self):
        base = {"play_type": "pass", "qb_kneel": 0, "qb_spike": 0,
                "aborted_play": 0, "posteam": "CLE"}
        assert C.is_scrimmage_play(base)
        assert not C.is_scrimmage_play({**base, "qb_kneel": 1})
        assert not C.is_scrimmage_play({**base, "play_type": "punt"})
        assert not C.is_scrimmage_play({**base, "posteam": None})

    def test_ydstogo_bins(self):
        assert C.ydstogo_bin(1) == "short"
        assert C.ydstogo_bin(3) == "short"
        assert C.ydstogo_bin(4) == "mid"
        assert C.ydstogo_bin(7) == "mid"
        assert C.ydstogo_bin(8) == "long"
        assert C.ydstogo_bin(None) is None

    def test_empbayes_shrink_direction(self):
        # small n -> heavy shrink toward 0; large n -> ~raw
        assert abs(C.empbayes_shrink(0.10, 10, 290.0)) < 0.01
        assert abs(C.empbayes_shrink(0.10, 1e7, 290.0) - 0.10) < 1e-4

    def test_zscore_nan_safe(self):
        zs = C.zscore_within_season([1.0, 2.0, float("nan"), 3.0])
        assert math.isnan(zs[2])
        assert abs(sum(z for z in zs if not math.isnan(z))) < 1e-9

    def test_publishable_gate(self):
        assert C.publishable(25)
        assert not C.publishable(24)

    def test_permutation_gate_deterministic(self):
        pre = [0.50] * 10
        post = [0.62] * 10
        p1, e1 = C.permutation_two_sample_p(pre, post, n_permutations=2000, seed=7)
        p2, e2 = C.permutation_two_sample_p(pre, post, n_permutations=2000, seed=7)
        assert p1 == p2 and e1 == e2
        assert abs(e1 - 0.12) < 1e-9

    def test_permutation_null_not_significant(self):
        rng_vals = [0.5 + 0.01 * ((i * 37) % 11 - 5) for i in range(20)]
        p, _ = C.permutation_two_sample_p(rng_vals[:10], rng_vals[10:],
                                          n_permutations=2000, seed=7)
        assert p > 0.05


# ---------------------------------------------------------------------------
# M01 PROE
# ---------------------------------------------------------------------------

class TestPROE:
    def test_loyo_math_by_hand(self):
        # team: 60 pass / 40 rush in early-short; league (incl team): 600/400.
        # LOYO rate = 540/900 = 0.6; actual = 0.6 -> raw PROE = 0.
        team_cells = {("early", "short"): (60.0, 40.0)}
        league_cells = {("early", "short"): (600.0, 400.0)}
        r = PROE.compute_proe_from_cells(2025, "TST", team_cells, league_cells, k=1e9)
        assert abs(r["proe_raw"]) < 1e-9
        assert r["n_plays"] == 100.0
        # now team passes more: 70/30 -> raw = 0.7 - 530/890 (LOYO cells)
        team_cells2 = {("early", "short"): (70.0, 40.0)}
        r2 = PROE.compute_proe_from_cells(2025, "TST", team_cells2, league_cells, k=1e9)
        expected = 70 / 110 - 530 / 890
        assert abs(r2["proe_raw"] - expected) < 1e-9

    def test_proe_table_shape(self):
        rows = L.load_table("proe_early_neutral.csv")
        assert len(rows) == 160  # 32 teams x 5 seasons
        r2026 = [r for r in rows if r["season"] == 2026]
        assert len(r2026) == 32

    def test_proe_eb_shrinks_small_samples(self):
        # 2026 rows have small n (weeks 1-3): |proe| must be << |proe_raw|
        for r in L.load_table("proe_early_neutral.csv"):
            if r["season"] == 2026 and r["proe"] is not None and r["proe_raw"]:
                assert abs(r["proe"]) <= abs(r["proe_raw"]) + 1e-9

    def test_bootstrap_ci_deterministic(self):
        team_cells = {("early", "short"): (60.0, 40.0), ("early", "mid"): (30.0, 30.0)}
        league_cells = {("early", "short"): (600.0, 400.0), ("early", "mid"): (300.0, 300.0)}
        lo1, hi1 = PROE.bootstrap_proe_ci(team_cells, league_cells, seed=11)
        lo2, hi2 = PROE.bootstrap_proe_ci(team_cells, league_cells, seed=11)
        assert (lo1, hi1) == (lo2, hi2)
        assert lo1 <= hi1

    def test_proe_2026_cle_positive(self):
        # Monken 2026 CLE passed more than expected in neutral script (raw>0)
        r = PROE.get_proe(2026, "CLE")
        assert r is not None and r["proe_raw"] > 0


# ---------------------------------------------------------------------------
# M02 fingerprint + T1 fixture
# ---------------------------------------------------------------------------

class TestFingerprint:
    def test_t1_fixture(self):
        res = FP.t1_fixture_check()
        assert res["status"] == "PASS", res["detail"]
        assert res["ttt_seconds"] is None  # honest gap

    def test_t1_fixture_values(self):
        res = FP.t1_fixture_check()
        d = res["detail"]
        assert abs(d["quick_game_rate"]["actual"] - 0.639) <= 0.005
        assert abs(d["avg_air_yards"]["actual"] - 6.12) <= 0.05
        assert abs(d["pass_rate_early"]["actual"] - 0.562) <= 0.005

    def test_weekly_fingerprint_shape(self):
        row = FP.weekly_fingerprint(2026, "CLE", 1)
        assert row is not None and row["n_plays"] == 49

    def test_team_fingerprint_zscores(self):
        fp = FP.team_fingerprint(2025, "KC")
        assert fp is not None
        assert set(fp["zscores"]) >= {"pass_rate_early", "quick_game_rate"}


# ---------------------------------------------------------------------------
# M03 tenures
# ---------------------------------------------------------------------------

class TestTenures:
    def test_monken_verified(self):
        rec = TN.lookup_coach("Todd Monken", 2026)
        assert rec is not None
        assert rec["team"] == "CLE" and rec["confidence"] == 1

    def test_unknown_coach_is_none(self):
        assert TN.lookup_coach("Nobody McNobody", 2026) is None

    def test_yoy_delta_same_context(self):
        d = TN.yoy_delta("Todd Monken", 2024, "pass_rate_early")
        assert d is not None  # BAL 2023 -> BAL 2024, same role
        assert d["team"] == "BAL"
        # independent check: 0.4256465517 - 0.4695837780
        assert abs(d["delta"] - (0.4256465517 - 0.4695837780)) < 1e-6

    def test_yoy_delta_team_change_is_none(self):
        # Monken 2025 BAL -> 2026 CLE: context changed -> None, never a fake delta
        assert TN.yoy_delta("Todd Monken", 2026, "pass_rate_early") is None

    def test_registry_coverage_honest(self):
        cov = TN.registry_coverage()
        assert cov["verified_rows"] == 27  # 19 offense + 8 defense seed rows
        assert "manual tenure registry" in cov["queued_research"]


# ---------------------------------------------------------------------------
# M04 regime gate
# ---------------------------------------------------------------------------

class TestRegime:
    def test_gate_passes_on_real_shift(self):
        pre = [0.50] * 8
        post = [0.58] * 8  # +8pp shift
        g = RG.regime_gate(pre, post, n_permutations=2000, seed=3)
        assert g["passed"]
        assert g["p_value"] < 0.05

    def test_gate_rejects_small_shift(self):
        pre = [0.50] * 8
        post = [0.53] * 8  # +3pp < 5pp gate
        g = RG.regime_gate(pre, post, n_permutations=2000, seed=3)
        assert not g["passed"]

    def test_changepoint_trigger_finds_split(self):
        series = [0.5] * 6 + [0.65] * 6
        t = RG.changepoint_trigger(series)
        assert t is not None and t["split_after"] == 6

    def test_quarantine_weights_inverted(self):
        w = RG.quarantine_weights(6, 2)
        assert w == [0.25, 0.25, 1.0, 1.0, 1.0, 1.0]
        assert RG.quarantine_weights(4, None) == [1.0] * 4

    def test_detect_regime_shift_end_to_end(self):
        series = [0.52, 0.50, 0.53, 0.51, 0.62, 0.64, 0.61, 0.63]
        r = RG.detect_regime_shift(series)
        assert r["confirmed"] and r["quarantine"]["stale_weight"] == 0.25
        assert r["n_weeks_used"] == 8 and r["n_weeks_dropped_nan"] == 0

    def test_detect_regime_shift_nan_safe(self):
        # NaN in the middle must not misalign the pre/post split
        series = [0.52, 0.50, float("nan"), 0.53, 0.51, 0.62, 0.64, 0.61, 0.63]
        r = RG.detect_regime_shift(series)
        assert r["n_weeks_used"] == 8 and r["n_weeks_dropped_nan"] == 1
        assert r["confirmed"]


# ---------------------------------------------------------------------------
# Tables: M05/M06/M08/M09/M10/M11/M12
# ---------------------------------------------------------------------------

class TestTables:
    def test_second_and_1_direction(self):
        # Paganetti direction: 2026 >> 2025 (level anchor 20.6% UNREPRODUCED — see redzone.py)
        def league(season):
            tot_p = tot_n = 0.0
            for r in L.load_table("second_and_short.csv"):
                if r["season"] == season and r["situation"] == "2n1":
                    tot_p += (r["pass_rate"] or 0) * (r["n_plays"] or 0)
                    tot_n += r["n_plays"] or 0
            return tot_p / tot_n
        r25, r26 = league(2025), league(2026)
        assert r26 - r25 >= 0.05, (r25, r26)
        assert abs(r26 - 0.327) <= 0.03  # 2026 level reproduces within 3pp

    def test_sequencing_has_cis(self):
        row = SQ.get_sequencing(2025, "KC", 2)
        assert row is not None
        lo, hi = row["contrast_ci95"]
        assert lo <= row["contrast"] <= hi

    def test_script_elasticity_sign(self):
        # most teams: negative slope (run more when ahead)
        rows = [r for r in L.load_table("script_elasticity.csv")
                if r["season"] == 2025 and r["beta_script"] is not None]
        neg = sum(1 for r in rows if r["beta_script"] < 0)
        assert neg >= len(rows) * 0.7

    def test_tempo_pace_sane(self):
        row = TM.get_tempo(2025, "KC")
        assert row is not None
        assert 4 < row["pace_p25"] <= row["pace_med"] <= row["pace_p75"] < 120

    def test_adjustments_percentiles(self):
        rows = [r for r in L.load_table("adjustments.csv") if r["season"] == 2025]
        assert rows
        assert all(0.0 <= r["pct_rank"] <= 1.0 for r in rows if r["pct_rank"] is not None)

    def test_monken_wk4_gate_pending_not_fake(self):
        st = ADJ.monken_wk4_gate_status()
        assert st["status"] == "PENDING-DATA"

    def test_dc_pressure_labels(self):
        row = DCP.get_pressure(2025, "PIT", 3, "long")
        assert row is not None
        assert row["proxy_label"] == "outcome-not-frequency"
        assert set(DCP.honest_gaps()) == {"blitz_rate", "man_coverage_rate", "two_high_rate"}

    def test_timeouts_shape(self):
        rows = L.load_table("timeouts.csv")
        assert len(rows) > 100
        assert all("challenge" in r["challenge_note"] for r in rows)


# ---------------------------------------------------------------------------
# Provider integration
# ---------------------------------------------------------------------------

class TestProvider:
    def setup_method(self):
        self.p = CoachingEngineProvider()

    def test_implements_abc(self):
        assert isinstance(self.p, CoachingProvider)

    def test_coach_profile_monken(self):
        prof = self.p.get_coach_profile("todd-monken", 2026)
        assert prof.name == "Todd Monken"
        assert prof.team == "CLE" and prof.role == "HC"  # verified seed row: first HC job 2026
        assert prof.verification == Verification.CORPUS
        assert prof.early_down_pass_rate is not None
        assert prof.blitz_rate is None  # charting-gapped, never zero
        assert prof.fourth_down_go_rate is None  # c04's lane
        assert "c04" in (prof.data_gap or "")

    def test_coach_profile_unknown_raises(self):
        with pytest.raises(DataGapError):
            self.p.get_coach_profile("nobody-mcnobody", 2026)

    def test_scheme_fingerprint_cle_wk1(self):
        fp = self.p.get_scheme_fingerprint("CLE", 1, 2026)
        assert fp.team == "CLE" and fp.week == 1
        assert fp.verification == Verification.COMPUTED
        assert fp.ttt_seconds is None
        assert fp.motion_rate is None and fp.play_action_rate is None and fp.rpo_rate is None
        assert abs(fp.quickgame_rate - 0.5909) < 1e-4
        assert "DATA_GAPS" in (fp.data_gap or "") or "nflverse" in (fp.data_gap or "")

    def test_scheme_fingerprint_missing_week_raises(self):
        with pytest.raises(DataGapError):
            self.p.get_scheme_fingerprint("CLE", 9, 2026)  # 2026 has weeks 1-3 only

    def test_coach_profile_yoy_note(self):
        prof = self.p.get_coach_profile("todd-monken", 2024)
        assert prof.yoy_delta_note is not None and "BAL" in prof.yoy_delta_note
        prof26 = self.p.get_coach_profile("todd-monken", 2026)
        assert prof26.yoy_delta_note is None  # team changed: no fake delta

    def test_real_registry_wires_coaching(self):
        from coaching.provider import real_registry
        reg = real_registry()
        assert isinstance(reg.coaching, CoachingEngineProvider)
        assert reg.qb is None and reg.trust is None and reg.ol is None
        # the real provider serves through the registry without disturbing stubs
        fp = reg.coaching.get_scheme_fingerprint("CLE", 1, 2026)
        assert fp.team == "CLE"
