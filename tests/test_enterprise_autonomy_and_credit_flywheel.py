#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.calibration.multi_sport_readiness_and_quarantine_gate import (
    build_daily_whop_and_community_content_plan,
    evaluate_extra_sport_candidate_ticket,
    evaluate_sport_market_readiness,
)
from intelligence.routing.zero_waste_model_router import get_cloud_credit_lanes_summary
from scripts.ops.gse_telegram_whop_broadcaster import (
    format_daily_multisport_environment_teaser,
    resolve_telegram_bot_token,
    verify_telegram_bot_identity,
)
from scripts.ops.run_enterprise_autonomy_and_credit_flywheel import (
    probe_all_enterprise_credit_lanes,
    run_flywheel,
)


def test_enterprise_credit_lanes_and_aws_spend_trap_blocking(monkeypatch) -> None:
    monkeypatch.setenv("ALIBABA_API_KEY", "ali-test")
    monkeypatch.setenv("MONGODB_URI", "mongodb+srv://cluster.mongodb.net/gse")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "el-test")
    monkeypatch.setenv("FISH_AUDIO_API_KEY", "fish-test")
    monkeypatch.setenv("DEEPGRAM_API_KEY", "dg-test")

    summary = get_cloud_credit_lanes_summary()
    assert summary["alibaba_cloud_model_studio"]["primary_key_configured"] is True
    assert summary["aws_hold_my_coffee_and_bedrock"]["free_and_explore_pool_usd"] == 199.94
    assert summary["aws_hold_my_coffee_and_bedrock"]["zero_spend_budget_include_credit"] is False
    assert "NAT_Gateway" in summary["aws_hold_my_coffee_and_bedrock"]["banned_spend_traps"]
    assert summary["mongodb_atlas_bitemporal_store"]["ttl_days"] == 30
    assert summary["mongodb_atlas_bitemporal_store"]["configured"] is True
    assert summary["audio_and_voice_intelligence"]["deepgram_grant_usd"] == 200.0
    assert summary["google_cloud_full_stack"]["gear_monthly_credit_usd"] == 100.0

    probe = probe_all_enterprise_credit_lanes(
        env={
            "ALIBABA_API_KEY": "ali-test",
            "DEEPINFRA_API_KEY": "di-test",
            "MONGODB_URI": "mongodb+srv://cluster.mongodb.net/gse",
            "ELEVENLABS_API_KEY": "el-test",
            "FISH_AUDIO_API_KEY": "fish-test",
            "DEEPGRAM_API_KEY": "dg-test",
            "TELEGRAM_BOT_TOKEN": "12345:fake-tok",
        },
        now_utc=datetime(2026, 11, 20, 20, 0, 0, tzinfo=timezone.utc),
    )
    assert probe["total_platforms_audited"] >= 18
    assert probe["aws_spend_traps_blocked"] is True
    assert probe["nous_cliff_failover_ready"] is True
    assert probe["lanes_configured"]["alibaba_cloud_dashscope"] is True
    assert probe["lanes_configured"]["deepinfra_10b_pool"] is True
    assert probe["lanes_configured"]["telegram_gsn_bot"] is True


def test_multisport_strict_sniper_quarantine_blocks_uncalibrated_extra_sports() -> None:
    # Uncalibrated NBA stays strictly in TIER_B (environment intel + paper learning only)
    nba_readiness = evaluate_sport_market_readiness(
        "NBA",
        "spread",
        {
            "strictly_causal": False,
            "n_oos": 40,
            "walkforward_brier": 0.252,
            "market_baseline_brier": 0.25,
            "walkforward_accuracy": 0.51,
            "eligible_for_play": False,
        },
        {"spine_healthy": True, "spine_age_hours": 1.0, "starter_or_lineup_confirmed": True},
    )
    assert nba_readiness["readiness_tier"] == "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"
    assert nba_readiness["publish_official_picks_allowed"] is False
    assert nba_readiness["daily_environment_content_allowed"] is True

    blocked_ticket = evaluate_extra_sport_candidate_ticket(
        {
            "sport": "NBA",
            "athlete": "BOS -4.5",
            "market": "spread",
            "over_odds": -110,
            "under_odds": -110,
            "market_fair_prob": 0.50,
            "calibrated_prob": 0.64,
        },
        nba_readiness,
    )
    assert blocked_ticket["publishAllowed"] is False
    assert blocked_ticket["decision"] == "PASS_EXTRA_SPORT_CALIBRATION_QUARANTINE"
    assert blocked_ticket["paperLearningLogged"] is True

    # Stale spine hard-quarantines to TIER_C
    stale_nhl = evaluate_sport_market_readiness(
        "NHL",
        "moneyline",
        {"strictly_causal": True, "n_oos": 220, "walkforward_brier": 0.23, "market_baseline_brier": 0.25, "walkforward_accuracy": 0.58},
        {"spine_healthy": True, "spine_age_hours": 24.0, "starter_or_lineup_confirmed": True},
    )
    assert stale_nhl["readiness_tier"] == "TIER_C_QUARANTINED"
    assert stale_nhl["daily_environment_content_allowed"] is False

    # Fully proven causal non-NFL sniper clears TIER_A only above strict >= 55.5% OOS and +4% Wilson edge
    proven_nhl = evaluate_sport_market_readiness(
        "NHL",
        "moneypuck_xg_moneyline",
        {"strictly_causal": True, "n_oos": 240, "walkforward_brier": 0.229, "market_baseline_brier": 0.25, "walkforward_accuracy": 0.578, "eligible_for_play": True},
        {"spine_healthy": True, "spine_age_hours": 0.8, "starter_or_lineup_confirmed": True},
    )
    assert proven_nhl["readiness_tier"] == "TIER_A_CALIBRATED_SNIPER"
    assert proven_nhl["publish_official_picks_allowed"] is True

    sniper_play = evaluate_extra_sport_candidate_ticket(
        {
            "sport": "NHL",
            "athlete": "CAR ML",
            "market": "moneypuck_xg_moneyline",
            "over_odds": -110,
            "under_odds": -110,
            "market_fair_prob": 0.50,
            "calibrated_prob": 0.61,
            "n_oos": 240,
        },
        proven_nhl,
    )
    assert sniper_play["publishAllowed"] is True
    assert sniper_play["decision"] == "PLAY"


def test_telegram_and_whop_formatting_and_token_safety() -> None:
    teaser = format_daily_multisport_environment_teaser(
        [
            {"sport": "NFL", "readiness_tier": "TIER_A_CALIBRATED_SNIPER", "confidence_score": 68, "environment_summary": "50% early-down pass balance"},
            {"sport": "NBA", "readiness_tier": "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING", "environment_summary": "3-in-4 fatigue monitoring"},
        ]
    )
    assert "%" not in teaser
    assert "Index 68/100" in teaser
    assert "PAPER LEARNING / ENVIRONMENT INTEL ONLY" in teaser
    assert "https://galaxy-sports-edge.whop.site" in teaser

    assert resolve_telegram_bot_token({"TELEGRAM_BOT_TOKEN": "999:abc"}) == "999:abc"
    empty_check = verify_telegram_bot_identity("")
    assert empty_check["ok"] is False
    assert empty_check["configured"] is False

    whop_plan = build_daily_whop_and_community_content_plan("2026-11-20", [])
    assert whop_plan["whop_account_id"] == "biz_jzvuDvevsatKWi"
    assert whop_plan["recurring_membership_count"] >= 3
    assert whop_plan["financial_cohort_projections"]["base"]["year_3"]["arr_run_rate_usd"] > 2_000_000


def test_flywheel_end_to_end_offline() -> None:
    report = run_flywheel(verify_telegram_network=False)
    assert report["stage1_credit_lanes"]["total_platforms_audited"] >= 18
    assert report["stage2_multisport_calibration"]["extra_sport_quarantine_verified"] is True
    assert report["stage2_multisport_calibration"]["sgp_quarantine_decision"] == "PASS_SGP_QUARANTINED_BY_DEFAULT"
    assert Path(REPO_ROOT / "data" / "ops" / "enterprise_credit_and_autonomy_status_2026.json").is_file()
    assert Path(REPO_ROOT / "brain" / "feeds" / "2026-11-20" / "enterprise_credit_and_autonomy_flywheel.jsonl").is_file()
