"""Tests for Week 10 entity truth and 64-CSV morning-sweep errata firewall."""

from intelligence.foundry_bridge.week10_reasoning_mind_bridge import (
    AUTHORITATIVE_WEEK10_TRUTH_2026_11_13,
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
