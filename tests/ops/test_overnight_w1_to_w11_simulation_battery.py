from __future__ import annotations

from scripts.ops.run_overnight_w1_to_w11_simulation_battery import (
    run_overnight_battery,
)


def test_overnight_battery_fast_mode_produces_sealed_w1_10_matrix_and_w11_slate() -> None:
    report = run_overnight_battery(
        fast_smoke=True,
        w11_worlds_per_game=250,
        approved_sim_weeks="11",
        write_artifacts=False,
    )
    assert report["schema"] == "gse.overnight.w1_to_w11.simulation_battery.v1"
    assert report["w1_to_w10_oos"]["games_evaluated"] == 147
    assert float(report["w1_to_w10_oos"]["baseline"]["norm_crps"]) <= 7.0063
    assert float(report["w1_to_w10_oos"]["baseline"]["ece"]) <= 0.0705
    assert len(report["theory_ablation_leaderboard"]) >= 12
    assert all(
        row["verdict"] in ("KEEP", "CUT", "WATCH")
        for row in report["theory_ablation_leaderboard"]
    )
    assert len(report["dark_intelligence_bakeoff"]["modules"]) >= 12
    assert all(
        row["verdict"] in ("PROMOTE", "HOLD_RD", "CUT")
        for row in report["dark_intelligence_bakeoff"]["modules"]
    )
    assert int(report["week11_slate"]["games_simulated"]) >= 13
    assert "IND @ HOU" in report["week11_slate"]["matchups"]
    assert len(str(report["week11_slate"]["projection_source_sha256"])) == 64
    assert float(report["gsi_ruo_audit"]["clinical_ruo_sports_weight"]) == 0.0
    assert int(report["gsi_ruo_audit"]["zero_odds_rlvr_count"]) >= 412
    assert report["governance"]["real_money_stake_cleared"] is False
    assert float(report["governance"]["live_stake_fraction"]) == 0.0
