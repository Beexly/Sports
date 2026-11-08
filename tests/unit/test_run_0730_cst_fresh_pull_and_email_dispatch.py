#!/usr/bin/env python3
"""
Unit tests for `scripts/ops/run_0730_cst_fresh_pull_and_email_dispatch.py`:
  1. Hard time-gate blocking live publish and email dispatch at `23:50 CST`,
     `03:00 CST`, and `07:29:59 CST`, and unlocking at `07:30:00 CST`.
  2. Fresh data pull manifest & SHA-256 verification across NFL injuries,
     stadium weather, DraftKings salaries/ownership/propBets, and sportsbook lines
     under the Odds API credit governor.
  3. Full from-scratch execution of the 9/9 armed workflows, 21,419 AST equations
     across 279 families, 22 proprietary GSE metrics, 360-degree projections,
     `-300` Heavy-Juice Firewall, Two-Wave `200+` Pt DraftKings DFS lineup generator
     (`QB + 2 Pass Catchers + 1 Opp Bring-Back`, `<= 35%` exposure, `Hamming >= 3`,
     `P(>=200 Pts)`, `Top-0.1% Win Rate`), 9-model worker fleet (`inkling/inkling-2`,
     `inkling/inkling-small-2`), and `10/10 PASS` charge regression suite.
  4. Morning email composition & outbox receipt generation
     (`docs/engine/research/2026-11-07/0730-cst-fresh-pull-and-email-dispatch-receipt.json`).
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict

import pytest

from scripts.ops.run_0730_cst_fresh_pull_and_email_dispatch import (
    DEFAULT_OUTBOX_EML_PATH,
    DEFAULT_RECEIPT_PATH,
    _parse_to_chicago_datetime,
    _try_send_via_cloudflare_email,
    _try_send_via_resend,
    _try_send_via_smtp,
    check_not_before_0730_cst_gate,
    compose_and_dispatch_0730_morning_email,
    execute_0730_cst_orchestrator,
    pull_fresh_0730_cst_data,
    run_entire_process_from_scratch_on_fresh_data,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
CST_TZ = timezone(timedelta(hours=-6), name="CST")


@pytest.fixture(scope="module")
def fresh_manifest_fixture() -> Dict[str, Any]:
    return pull_fresh_0730_cst_data()


@pytest.fixture(scope="module")
def pipeline_bundle_fixture(fresh_manifest_fixture: Dict[str, Any]) -> Dict[str, Any]:
    return run_entire_process_from_scratch_on_fresh_data(fresh_manifest_fixture)


def test_not_before_0730_cst_gate_blocks_before_0730_and_unlocks_at_0730() -> None:
    """
    Verify hard time-gate blocks live publish and email dispatch at `23:50 CST`,
    `03:00 CST`, and `07:29:59 CST`, and unlocks at `07:30:00 CST`.
    """
    blocked_cases = [
        ("23:50 CST", datetime(2026, 11, 7, 23, 50, 0, tzinfo=CST_TZ)),
        ("03:00 CST", datetime(2026, 11, 8, 3, 0, 0, tzinfo=CST_TZ)),
        ("07:29:59 CST", datetime(2026, 11, 8, 7, 29, 59, tzinfo=CST_TZ)),
    ]

    for shorthand_str, dt_obj in blocked_cases:
        # Strict mode (allow_overnight_dry_run=False)
        res_strict = check_not_before_0730_cst_gate(now_utc_or_cst=dt_obj, allow_overnight_dry_run=False)
        assert res_strict["timezone"] == "America/Chicago"
        assert res_strict["live_execution_allowed"] is False
        assert res_strict["make_live"] is False
        assert res_strict["make_live_allowed"] is False
        assert res_strict["send_morning_email"] is False
        assert res_strict["send_morning_email_allowed"] is False
        assert res_strict["live_publish_blocked_until_0730_cst"] is True
        assert res_strict["email_dispatch_blocked_until_0730_cst"] is True
        assert res_strict["overnight_dry_run_permitted"] is False
        assert res_strict["seconds_until_0730_cst"] >= 1.0
        assert res_strict["gate_status"] == "BLOCKED_BEFORE_0730_CST"

        # Shorthand string + allow_overnight_dry_run=True
        res_dry = check_not_before_0730_cst_gate(now_utc_or_cst=shorthand_str, allow_overnight_dry_run=True)
        assert res_dry["live_execution_allowed"] is False
        assert res_dry["live_publish_blocked_until_0730_cst"] is True
        assert res_dry["email_dispatch_blocked_until_0730_cst"] is True
        assert res_dry["overnight_dry_run_permitted"] is True
        assert res_dry["gate_status"] == "DRY_RUN_ONLY_BEFORE_0730_CST"

    # Exact boundary: 07:29:59 CST is 1.0 second before unlock
    res_072959 = check_not_before_0730_cst_gate("2026-11-08T07:29:59-06:00", allow_overnight_dry_run=False)
    assert res_072959["seconds_until_0730_cst"] == 1.0
    assert res_072959["live_execution_allowed"] is False

    # Unlock at 07:30:00 CST (both CST string/datetime and equivalent UTC 13:30:00Z)
    for unlock_input in (
        "07:30:00 CST",
        "2026-11-08T07:30:00-06:00",
        "2026-11-08T13:30:00Z",
        datetime(2026, 11, 8, 7, 30, 0, tzinfo=CST_TZ),
        datetime(2026, 11, 8, 7, 45, 0, tzinfo=CST_TZ),
    ):
        res_open = check_not_before_0730_cst_gate(now_utc_or_cst=unlock_input, allow_overnight_dry_run=False)
        assert res_open["live_execution_allowed"] is True
        assert res_open["make_live"] is True
        assert res_open["make_live_allowed"] is True
        assert res_open["send_morning_email"] is True
        assert res_open["send_morning_email_allowed"] is True
        assert res_open["live_publish_blocked_until_0730_cst"] is False
        assert res_open["email_dispatch_blocked_until_0730_cst"] is False
        assert res_open["seconds_until_0730_cst"] == 0.0
        assert res_open["gate_status"] == "UNLOCKED_LIVE_ALLOWED"


def test_not_before_0730_cst_gate_edge_cases_and_blocked_orchestrator() -> None:
    """Verify invalid timestamp inputs fail closed, fractional/CDT/lowercase-z timestamps parse accurately, and strict orchestrator blocks before 07:30 CST."""
    with pytest.raises(TypeError):
        check_not_before_0730_cst_gate(now_utc_or_cst=["invalid"])

    # Sub-second boundary: 07:29:59.999 CST is 0.001s before 07:30:00 CST and must block
    res_subsec = check_not_before_0730_cst_gate("07:29:59.999 CST", allow_overnight_dry_run=False)
    assert res_subsec["live_execution_allowed"] is False
    assert res_subsec["seconds_until_0730_cst"] == 0.001

    # Lowercase 'z' UTC string 1 second before unlock
    res_lower_z = check_not_before_0730_cst_gate("2026-11-08T13:29:59z", allow_overnight_dry_run=False)
    assert res_lower_z["live_execution_allowed"] is False
    assert res_lower_z["seconds_until_0730_cst"] == 1.0

    # CDT pre-fallback timestamp with " America/Chicago" suffix preserves hour (00:30 CDT -05:00)
    dt_cdt = _parse_to_chicago_datetime("2026-11-01T00:30:00 America/Chicago")
    assert dt_cdt.hour == 0 and dt_cdt.minute == 30

    blocked_run = execute_0730_cst_orchestrator(
        now_utc_or_cst="2026-11-08T03:00:00-06:00",
        allow_overnight_dry_run=False,
    )
    assert blocked_run["status"] == "BLOCKED_BEFORE_0730_CST"
    assert blocked_run["fresh_data_manifest"] is None
    assert blocked_run["pipeline_bundle"] is None
    assert blocked_run["email_dispatch"] is None


def test_pull_fresh_0730_cst_data_manifest_and_sha256_verification(
    fresh_manifest_fixture: Dict[str, Any],
) -> None:
    """
    Verify `pull_fresh_0730_cst_data()` validates NFL injuries, stadium weather,
    DraftKings salaries/ownership/propBets, and sportsbook lines under the Odds API
    credit governor with 64-char SHA-256 checksums.
    """
    manifest = fresh_manifest_fixture
    assert manifest["status"] == "VERIFIED_FRESH"
    assert isinstance(manifest["fresh_pull_completed_at_cst"], str) and "-06:00" in manifest["fresh_pull_completed_at_cst"]
    assert manifest["all_sha256_checksums_verified"] is True
    assert len(manifest["manifest_sha256"]) == 64

    rc = manifest["row_counts"]
    assert rc["injuries_2026_rows"] >= 2000
    assert rc["week9_official_games_count"] == 15
    assert rc["stadium_weather_games_verified"] == 15
    assert rc["dk_main_slate_salary_rows"] == 570
    assert rc["dk_post_sim_projection_rows"] == 225
    assert rc["dk_full_board_prop_files_count"] >= 14
    assert rc["dk_prop_bets_items_indexed"] >= 1000

    for rel_path, sha_val in manifest["sha256_checksums"].items():
        assert isinstance(sha_val, str) and len(sha_val) == 64, f"Invalid SHA-256 for {rel_path}"

    sources = manifest["sources"]
    assert sources["nfl_injuries"]["verified"] is True
    assert sources["stadium_weather"]["verified"] is True
    assert sources["draftkings_salaries_ownership_propbets"]["verified"] is True
    assert sources["sportsbook_lines_and_odds_governor"]["verified"] is True

    gov = manifest["odds_api_credit_governor"]
    assert gov["governor_enforced"] is True
    assert gov["daily_ceiling_free_requests"] == 16
    assert gov["daily_ceiling_paid_requests"] == 600
    assert gov["circuit_breaker_status"] == "CLOSED_HEALTHY"

    sched_gate = manifest["schedule_integrity_gate"]
    assert sched_gate["status"] == "VERIFIED_ZERO_DUPLICATES"
    assert sched_gate["games_count"] == 15
    assert sched_gate["unique_teams_count"] == 30
    assert sched_gate["duplicate_teams_count"] == 0


def test_run_entire_process_from_scratch_on_fresh_data(
    pipeline_bundle_fixture: Dict[str, Any],
) -> None:
    """
    Verify full from-scratch execution of all 6 pipeline stages:
      1. `9/9 ARMED` workflows
      2. `21,419` compiled AST equations across `279` families
      3. `22` proprietary GSE metrics (`M-GSE-01..M-GSE-22`) with 4-fold OOS JS+Ridge weights
      4. 360-degree projections, `-300` Heavy-Juice Firewall, and Two-Wave `200+` Pt DFS lineups
      5. `9`-model worker fleet (`inkling/inkling-2` & `inkling/inkling-small-2`)
      6. `10/10 PASS` charge regression suite.
    """
    with pytest.raises(ValueError):
        run_entire_process_from_scratch_on_fresh_data({})

    bundle = pipeline_bundle_fixture
    assert bundle["status"] == "PASS"
    assert bundle["executed_from_scratch"] is True
    assert len(bundle["pipeline_bundle_sha256"]) == 64

    # 1. 9/9 ARMED
    s1 = bundle["step_1_armed_workflows"]
    assert s1["status"] == "ARMED"
    assert s1["armed_stages_count"] == 9
    assert s1["total_stages_count"] == 9
    assert s1["summary_badge"] == "9/9 ARMED"
    assert s1["all_9_of_9_armed"] is True

    # 2. 21,419 AST equations across 279 families
    s2 = bundle["step_2_equation_executor_21419_ast"]
    assert s2["total_equations_cataloged"] == 21419
    assert s2["total_equations_evaluated"] == 21419
    assert s2["placeholder_formula_specs"] == 0
    assert s2["families_consumed"] == 279
    assert s2["all_21419_equations_and_279_families_executed"] is True

    # 3. 22 proprietary GSE metrics (M-GSE-01..M-GSE-22)
    s3 = bundle["step_3_proprietary_gse_metrics_22"]
    assert s3["total_proprietary_metrics_cataloged"] == 22
    assert len(s3["metric_ids"]) == 22
    assert s3["metric_ids"][0] == "M-GSE-01"
    assert s3["metric_ids"][-1] == "M-GSE-22"
    assert s3["all_22_metrics_wired_and_tested"] is True
    assert s3["out_of_sample_4fold_optimization_benchmark"]["optimized_beats_unoptimized_equal"] is True
    assert s3["out_of_sample_4fold_optimization_benchmark"]["optimized_beats_market_baseline"] is True

    # 4. 360-degree projections, -300 Heavy-Juice Firewall, and Two-Wave 200+ Pt DFS
    s4 = bundle["step_4_360_projections_and_two_wave_200pt_dfs"]
    assert s4["heavy_juice_minus_300_trap_blocked"] is True
    assert s4["heavy_juice_minus_250_firewall_enforced"] is True
    assert s4["pass_discipline_verified"] is True

    proj_360 = s4["projections_360"]
    assert proj_360["proprietary_22_metrics_optimal_weights_applied"] is True
    assert proj_360["proprietary_22_metrics_weight_sum"] > 0.99
    assert proj_360["market_categories_covered_count"] == 7
    assert proj_360["published_tickets_count"] == 7
    assert proj_360["passed_tickets_count"] == 3
    for pub_tkt in proj_360["published_tickets"]:
        assert pub_tkt["publishAllowed"] is True
        assert int(pub_tkt["american_odds"]) > -250

    dfs_200pt = s4["two_wave_200pt_dfs"]
    w2_summary = dfs_200pt["wave2_lineup_vs_field_contest_simulation_summary"]
    assert w2_summary["candidate_lineups_simulated"] == 120
    assert w2_summary["opponent_field_lineups_simulated"] == 500
    assert w2_summary["correlated_slate_worlds_simulated"] == 10000
    assert w2_summary["total_lineup_world_evaluations"] == 6_200_000

    guards = dfs_200pt["tournament_portfolio_guards"]
    assert guards["all_lineups_have_qb_plus_2_pass_catchers_plus_1_bring_back"] is True
    assert guards["exposure_cap_35pct_satisfied"] is True
    assert guards["realized_max_player_exposure"] <= 0.35
    assert guards["hamming_ge_3_satisfied"] is True
    assert guards["realized_min_pairwise_hamming_distance"] >= 3

    curated_pool_path = REPO_ROOT / "data" / "dfs" / "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json"
    curated_pool_names = {
        str(r.get("player"))
        for r in json.loads(curated_pool_path.read_text(encoding="utf-8")).get("curated_dfs_player_pool", [])
        if str(r.get("pool_status")) == "ACCEPTED_INTO_DEDICATED_GSE_DFS_POOL"
    }

    for lu in dfs_200pt["two_wave_tournament_lineups"]:
        assert lu["valid_dk_9_slot_roster"] is True
        assert 0 < int(lu["total_salary"]) <= 50000
        assert int(lu["stacked_pass_catchers_count"]) >= 2
        assert int(lu["opposing_bring_backs_count"]) >= 1
        assert float(lu["max_player_exposure"]) <= 0.35
        assert int(lu["min_hamming_distance"]) >= 3
        assert float(lu["p_ge_200_pts"]) > 0.0
        assert float(lu["top_0_1pct_win_rate"]) > 0.0
        assert float(lu["joint_p99_shootout_dk_pts"]) >= 200.0
        assert float(lu["cvar_099_championship_dk_pts"]) >= 200.0
        for p_row in lu["roster"]:
            assert p_row["player"] in curated_pool_names, f"Non-curated player in lineup: {p_row['player']}"

    # 5. 9-model worker fleet including inkling/inkling-2 and inkling/inkling-small-2
    s5 = bundle["step_5_zero_waste_9model_router"]
    assert s5["fleet_size"] == 9
    assert "inkling/inkling-2" in s5["fleet_model_ids"]
    assert "inkling/inkling-small-2" in s5["fleet_model_ids"]
    assert s5["inkling_2_verified"] is True
    assert s5["inkling_small_2_verified"] is True
    assert s5["santa_method_converged"] is True

    # 6. 10/10 PASS charge regression suite
    s6 = bundle["step_6_charge_regression_suite"]
    assert s6["passed_count"] == 10
    assert s6["total_charges"] == 10
    assert s6["all_10_charges_passed"] is True
    assert s6["summary_badge"] == "10/10 PASS"


def test_compose_and_dispatch_0730_morning_email_and_receipt(
    pipeline_bundle_fixture: Dict[str, Any],
) -> None:
    """
    Verify morning email composition & outbox receipt generation:
      - Before 07:30 CST (`23:50 CST`), live email send is blocked while local `.eml`
        and JSON receipt (`docs/engine/research/2026-11-07/0730-cst-fresh-pull-and-email-dispatch-receipt.json`)
        are written and verified.
      - At `07:30:00 CST` with `dry_run=False`, gate unlocks and multi-channel delivery
        gracefully falls back to local `.eml` + JSON outbox receipt when SMTP/Resend keys
        are not set in the local test environment.
    """
    # 1. Pre-07:30 CST dry-run check
    pre_gate_receipt = compose_and_dispatch_0730_morning_email(
        pipeline_bundle=pipeline_bundle_fixture,
        dry_run=True,
        now_utc_or_cst="2026-11-07T23:50:00-06:00",
    )
    assert pre_gate_receipt["gate_state"]["live_execution_allowed"] is False
    assert pre_gate_receipt["gate_state"]["email_dispatch_blocked_until_0730_cst"] is True
    assert pre_gate_receipt["live_send_attempted"] is False
    assert pre_gate_receipt["live_email_sent"] is False
    assert pre_gate_receipt["delivery_channel_used"] == "LOCAL_OUTBOX_EML_AND_JSON_RECEIPT"

    # 2. 07:30:00 CST unlocked dispatch check (writes canonical receipt to DEFAULT_RECEIPT_PATH)
    unlocked_receipt = compose_and_dispatch_0730_morning_email(
        pipeline_bundle=pipeline_bundle_fixture,
        dry_run=False,
        now_utc_or_cst="2026-11-08T07:30:00-06:00",
    )
    assert unlocked_receipt["gate_state"]["live_execution_allowed"] is True
    assert unlocked_receipt["gate_state"]["send_morning_email_allowed"] is True
    assert unlocked_receipt["gate_state"]["email_dispatch_blocked_until_0730_cst"] is False
    assert unlocked_receipt["live_send_attempted"] is True
    assert set(unlocked_receipt["supported_delivery_channels"]) == {
        "resend_http_api",
        "cloudflare_email",
        "smtp",
        "local_eml_outbox",
    }

    # Check HTML + plaintext report contents
    for body_text in (unlocked_receipt["plaintext_body"], unlocked_receipt["html_body"]):
        assert "9/9 ARMED" in body_text
        assert "10/10 PASS" in body_text
        assert "21419" in body_text
        assert "279" in body_text
        assert "QB" in body_text and "Pass Catchers" in body_text and "Opp Bring-Back" in body_text
        assert "35%" in body_text
        assert "Hamming" in body_text
        assert "200" in body_text
        assert "Top-0.1% Win Rate" in body_text
        assert "-300" in body_text

    # Verify canonical receipt file on disk at docs/engine/research/2026-11-07/0730-cst-fresh-pull-and-email-dispatch-receipt.json
    assert DEFAULT_RECEIPT_PATH.is_file()
    assert DEFAULT_OUTBOX_EML_PATH.is_file()
    disk_receipt = json.loads(DEFAULT_RECEIPT_PATH.read_text(encoding="utf-8"))
    assert len(disk_receipt["receipt_sha256"]) == 64
    assert disk_receipt["pipeline_summary"]["armed_workflows"] == "9/9 ARMED"
    assert disk_receipt["pipeline_summary"]["charge_regression"] == "10/10 PASS"
    assert disk_receipt["pipeline_summary"]["equations_evaluated"] == 21419
    assert disk_receipt["pipeline_summary"]["proprietary_metrics_cataloged"] == 22
    assert disk_receipt["pipeline_summary"]["two_wave_tournament_lineups_count"] == 3


def test_multi_channel_email_transports_and_error_fallbacks(
    pipeline_bundle_fixture: Dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """
    Verify `_try_send_via_resend`, `_try_send_via_cloudflare_email`, and `_try_send_via_smtp`:
      - When Resend HTTP API succeeds (200 OK), `delivery_channel_used` is `RESEND_HTTP_API`.
      - When Resend, Cloudflare Email, and SMTP all raise network/SMTP errors, `compose_and_dispatch_0730_morning_email`
        gracefully falls back to `LOCAL_OUTBOX_EML_AND_JSON_RECEIPT` and records `FAILED_FALLBACK:*`
        without losing the morning report.
    """
    import smtplib
    import urllib.error
    import urllib.request
    from email.message import EmailMessage

    # Direct helper checks for unconfigured vs error vs success
    assert _try_send_via_resend("", "a@b.com", "c@d.com", "sub", "txt", "<p>h</p>") == (False, "NOT_CONFIGURED")
    assert _try_send_via_cloudflare_email("", "a@b.com", "c@d.com", "sub", "txt", "<p>h</p>") == (False, "NOT_CONFIGURED")
    dummy_msg = EmailMessage()
    assert _try_send_via_smtp("", 587, "", "", dummy_msg) == (False, "NOT_CONFIGURED")

    # Case 1: All 3 network channels configured, all 3 fail with network/SMTP exceptions -> graceful outbox fallback
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_123")
    monkeypatch.setenv("CLOUDFLARE_EMAIL_WEBHOOK_URL", "https://email-worker.example.com/send")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")

    def _raise_url_error(req: Any, timeout: int = 10) -> Any:
        raise urllib.error.URLError("simulated_network_timeout")

    class _FailingSMTP:
        def __init__(self, host: str, port: int, timeout: int = 10) -> None:
            raise smtplib.SMTPConnectError(421, b"Service not available")

    monkeypatch.setattr(urllib.request, "urlopen", _raise_url_error)
    monkeypatch.setattr(smtplib, "SMTP", _FailingSMTP)

    fallback_receipt_path = tmp_path / "fallback_receipt.json"
    fallback_eml_path = tmp_path / "fallback_outbox.eml"
    res_fallback = compose_and_dispatch_0730_morning_email(
        pipeline_bundle=pipeline_bundle_fixture,
        dry_run=False,
        now_utc_or_cst="2026-11-08T07:30:05-06:00",
        receipt_path=fallback_receipt_path,
        outbox_eml_path=fallback_eml_path,
    )
    assert res_fallback["live_send_attempted"] is True
    assert res_fallback["live_email_sent"] is False
    assert res_fallback["delivery_channel_used"] == "LOCAL_OUTBOX_EML_AND_JSON_RECEIPT"
    assert res_fallback["channel_attempts"]["resend_http_api"].startswith("FAILED_FALLBACK:")
    assert res_fallback["channel_attempts"]["cloudflare_email"].startswith("FAILED_FALLBACK:")
    assert res_fallback["channel_attempts"]["smtp"].startswith("FAILED_FALLBACK:")
    assert fallback_receipt_path.is_file()
    assert fallback_eml_path.is_file()

    # Case 2: Resend HTTP API returns 200 OK (and verifies custom User-Agent & List-Unsubscribe header)
    captured_requests: list[Any] = []

    class _DummyResponse:
        status = 200

        def __enter__(self) -> "_DummyResponse":
            return self

        def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            return None

    def _mock_urlopen_ok(req: Any, timeout: int = 10) -> _DummyResponse:
        captured_requests.append(req)
        return _DummyResponse()

    monkeypatch.setattr(urllib.request, "urlopen", _mock_urlopen_ok)
    sent_receipt_path = tmp_path / "sent_receipt.json"
    sent_eml_path = tmp_path / "sent_outbox.eml"
    res_sent = compose_and_dispatch_0730_morning_email(
        pipeline_bundle=pipeline_bundle_fixture,
        dry_run=False,
        now_utc_or_cst="2026-11-08T07:30:10-06:00",
        receipt_path=sent_receipt_path,
        outbox_eml_path=sent_eml_path,
    )
    assert res_sent["live_send_attempted"] is True
    assert res_sent["live_email_sent"] is True
    assert res_sent["delivery_channel_used"] == "RESEND_HTTP_API"
    assert res_sent["channel_attempts"]["resend_http_api"] == "SENT"
    assert len(captured_requests) == 1
    assert captured_requests[0].get_header("User-agent") == "GalaxySportsEdge-MorningDispatcher/1.0"
    payload_sent = json.loads(captured_requests[0].data.decode("utf-8"))
    assert "List-Unsubscribe" in payload_sent.get("headers", {})
