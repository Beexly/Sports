"""Tests for Week 10 entity truth and 64-CSV morning-sweep errata firewall."""

from intelligence.foundry_bridge.week10_reasoning_mind_bridge import (
    AUTHORITATIVE_WEEK10_TRUTH_2026_11_13,
    RLVR_VETO_BITEMPORAL_LEAK,
    RLVR_VETO_OVERFIT_ELEPHANT,
    RLVR_VETO_SATURATED_CONFIDENCE,
    RLVR_VETO_SINGLE_SIDED_MARKET,
    RLVR_VETO_STAGE0_ROSTER_CONTAMINATION,
    RLVR_VETO_VANISHING_CREDIT,
    evaluate_candidate_ticket_with_rlvr_bridge,
    resolve_week10_csv_entity_row,
)


def test_sfdata_four_qb_stale_team_remaps() -> None:
    murray = resolve_week10_csv_entity_row("sfdata-qb-ryoe-2026.csv", "K.Murray", "ARI")
    assert murray["canonical_player"] == "Kyler Murray"
    assert murray["week10_active_team"] == "MIN"
    assert murray["season_stat_prior_team_remapped"] is True
    assert murray["quarantined_anomaly"] is False

    cousins = resolve_week10_csv_entity_row("sfdata-quick-pressure-rate-2026.csv", "K.Cousins", "LV")
    assert cousins["canonical_player"] == "Kirk Cousins"
    assert cousins["week10_active_team"] == "MIN"
    assert cousins["season_stat_prior_team_remapped"] is True

    brissett = resolve_week10_csv_entity_row("sfdata-throwaway-rate-2026.csv", "J.Brissett", "ARI")
    assert brissett["canonical_player"] == "Jacoby Brissett"
    assert brissett["week10_active_team"] == "BAL"
    assert brissett["season_stat_prior_team_remapped"] is True

    mccarthy = resolve_week10_csv_entity_row("sfdata-qb-ryoe-2026.csv", "J.McCarthy", "MIN")
    assert mccarthy["canonical_player"] == "J.J. McCarthy"
    assert mccarthy["week10_active_team"] == "NYG"
    assert mccarthy["season_stat_prior_team_remapped"] is True


def test_trade_deadline_and_quarantined_anomalies() -> None:
    downs = resolve_week10_csv_entity_row("gridiron-receiving-2026.csv", "Josh Downs", "IND")
    assert downs["week10_active_team"] == "KC"
    assert downs["season_stat_prior_team_remapped"] is True

    daniels_tb = resolve_week10_csv_entity_row("sfdata-qb-ryoe-2026.csv", "J. Daniels", "TB")
    assert daniels_tb["quarantined_anomaly"] is True
    assert daniels_tb["week10_active_team"] is None

    daniels_was = resolve_week10_csv_entity_row("sfdata-qb-ryoe-2026.csv", "J. Daniels", "WAS")
    assert daniels_was["quarantined_anomaly"] is False
    assert daniels_was["week10_active_team"] == "WAS"


def test_week10_unavailable_and_first_career_starts() -> None:
    unavail = set(AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["unavailable_players"])
    assert "Jaxson Dart" in unavail
    watchlist = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["practice_watchlist"]
    assert watchlist["Kirk Cousins"] == "expected_to_start_not_formally_announced"
    assert watchlist["Kyle McCord"] == "first_career_start_mia"
    assert watchlist["Carson Beck"] == "first_career_start_ari"


def _valid_week10_ticket(**overrides):
    ticket = {
        "matchup": "MIN @ CHI",
        "player": "Kyler Murray",
        "team": "MIN",
        "raw_logit_z": 1.45,
        "train_acc": 0.62,
        "val_acc": 0.58,
        "tuned_on_test_data": False,
        "depth_gradient_product": 0.25,
        "both_sides_evaluated": True,
        "as_of_utc": "2026-11-14T13:00:00Z",
        "feature_max_timestamp_utc": "2026-11-14T12:30:00Z",
    }
    ticket.update(overrides)
    return ticket


def test_rlvr_bridge_approves_well_behaved_week10_ticket() -> None:
    res = evaluate_candidate_ticket_with_rlvr_bridge(_valid_week10_ticket())
    assert res["approved"] is True
    assert res["veto_codes"] == []


def test_rlvr_bridge_fails_closed_on_nan_inf_omitted_sides_and_invalid_timestamps() -> None:
    nan_z = evaluate_candidate_ticket_with_rlvr_bridge(_valid_week10_ticket(raw_logit_z=float("nan")))
    assert nan_z["approved"] is False
    assert RLVR_VETO_SATURATED_CONFIDENCE in nan_z["veto_codes"]

    nan_overfit = evaluate_candidate_ticket_with_rlvr_bridge(
        _valid_week10_ticket(train_acc=float("nan"), val_acc=0.55)
    )
    assert nan_overfit["approved"] is False
    assert RLVR_VETO_OVERFIT_ELEPHANT in nan_overfit["veto_codes"]

    nan_dgp = evaluate_candidate_ticket_with_rlvr_bridge(
        _valid_week10_ticket(depth_gradient_product=float("nan"))
    )
    assert nan_dgp["approved"] is False
    assert RLVR_VETO_VANISHING_CREDIT in nan_dgp["veto_codes"]

    omitted_sides = evaluate_candidate_ticket_with_rlvr_bridge(_valid_week10_ticket(both_sides_evaluated=None))
    assert omitted_sides["approved"] is False
    assert RLVR_VETO_SINGLE_SIDED_MARKET in omitted_sides["veto_codes"]

    missing_ts = evaluate_candidate_ticket_with_rlvr_bridge(
        _valid_week10_ticket(as_of_utc=None, feature_max_timestamp_utc="not-a-timestamp")
    )
    assert missing_ts["approved"] is False
    assert RLVR_VETO_BITEMPORAL_LEAK in missing_ts["veto_codes"]

    stale_roster = evaluate_candidate_ticket_with_rlvr_bridge(
        _valid_week10_ticket(player="Kyler Murray", team="ARI")
    )
    assert stale_roster["approved"] is False
    assert RLVR_VETO_STAGE0_ROSTER_CONTAMINATION in stale_roster["veto_codes"]
