#!/usr/bin/env python3
"""
Multi-Sport Strict Sniper Calibration Gate, Daily Content & Whop Membership Funnel
(`intelligence/calibration/multi_sport_readiness_and_quarantine_gate.py`)
===================================================================================

Enforces the founder's anti-randomness doctrine across ALL sports (`NFL`, `NBA`,
`NHL`, `MLB`, `NCAAB`, `NCAAF`):
  - Extra sports MUST pass even stricter walk-forward out-of-sample thresholds
    than NFL (`n_oos >= 150`, `walkforward_brier < market_baseline_brier`,
    `walkforward_accuracy >= 0.555`, Wilson lower-bound edge `>= +0.040`, verified
    starting goalie/pitcher/injury gate, max 3 A+ plays per non-NFL slate, max 1
    prop per athlete, `sgp_publish_enabled=False`) before a SINGLE official paid
    pick can publish.
  - Any sport/market that has not yet earned `TIER_A_CALIBRATED_SNIPER` runs in
    `TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING`: producing daily plain-English
    matchup environment intel & audio drops for community/Whop retention while
    logging paper predictions every night until its causal head clears OOS gates.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Optional

from scripts.ops.week8_forensic_kernels import wilson_lower_bound


SPORT_CALIBRATION_POLICIES: dict[str, dict[str, Any]] = {
    "NFL": {
        "min_oos_samples": 120,
        "min_walkforward_accuracy": 0.535,
        "min_wilson_edge": 0.025,
        "max_straight_plays_per_game": 6,
        "max_straight_plays_per_slate": 18,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["nflverse", "ftn_charting", "espn_injuries", "nws_weather"],
    },
    "NBA": {
        "min_oos_samples": 150,
        "min_walkforward_accuracy": 0.555,
        "min_wilson_edge": 0.040,
        "max_straight_plays_per_game": 2,
        "max_straight_plays_per_slate": 3,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["balldontlie_nba", "fatigue_priors_nba", "nba_rest_travel"],
    },
    "NHL": {
        "min_oos_samples": 150,
        "min_walkforward_accuracy": 0.555,
        "min_wilson_edge": 0.040,
        "max_straight_plays_per_game": 2,
        "max_straight_plays_per_slate": 3,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["nhl_web_api", "moneypuck_xg_gsax"],
    },
    "MLB": {
        "min_oos_samples": 150,
        "min_walkforward_accuracy": 0.555,
        "min_wilson_edge": 0.040,
        "max_straight_plays_per_game": 2,
        "max_straight_plays_per_slate": 3,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["mlb_statsapi", "mlb_platoon_splits", "mlb_strikeout_shrinkage", "park_weather"],
    },
    "NCAAB": {
        "min_oos_samples": 150,
        "min_walkforward_accuracy": 0.560,
        "min_wilson_edge": 0.045,
        "max_straight_plays_per_game": 2,
        "max_straight_plays_per_slate": 3,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["henrygd_ncaa_api", "efficiency_tempo_ratings"],
    },
    "NCAAF": {
        "min_oos_samples": 150,
        "min_walkforward_accuracy": 0.555,
        "min_wilson_edge": 0.040,
        "max_straight_plays_per_game": 2,
        "max_straight_plays_per_slate": 3,
        "max_per_athlete": 1,
        "requires_starter_confirmation": True,
        "sgp_publish_enabled": False,
        "legal_spine_adapters": ["cfbd_api", "sp_plus_efficiency", "nws_weather"],
    },
}


def get_sport_policy(sport: str) -> dict[str, Any]:
    s = (sport or "NFL").strip().upper()
    if s in SPORT_CALIBRATION_POLICIES:
        return dict(SPORT_CALIBRATION_POLICIES[s])
    # Fail closed to strict non-NFL policy for unknown/emerging sports
    return dict(SPORT_CALIBRATION_POLICIES["NCAAB"])


def evaluate_sport_market_readiness(
    sport: str,
    market_family: str,
    calibration_metrics: Optional[Mapping[str, Any]],
    spine_status: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Classify a sport x market family into TIER_A (sniper live), TIER_B (environment + paper), or TIER_C (quarantined)."""
    sport_u = (sport or "").strip().upper() or "UNKNOWN"
    policy = get_sport_policy(sport_u)
    spine = dict(spine_status or {})
    spine_age_hours = float(spine.get("spine_age_hours", 999.0))
    starter_confirmed = bool(spine.get("starter_or_lineup_confirmed", False))
    spine_healthy = bool(spine.get("spine_healthy", False)) and spine_age_hours <= 18.0

    if not spine_healthy:
        return {
            "sport": sport_u,
            "market_family": market_family,
            "readiness_tier": "TIER_C_QUARANTINED",
            "publish_official_picks_allowed": False,
            "daily_environment_content_allowed": False,
            "paper_learning_enabled": False,
            "policy": policy,
            "reasons": [
                f"Spine stale or unhealthy (spine_healthy={spine.get('spine_healthy')}, age_hours={spine_age_hours:.1f} > 18.0)"
            ],
        }

    cal = dict(calibration_metrics or {})
    n_oos = int(cal.get("n_oos") or 0)
    wf_brier = float(cal.get("walkforward_brier") if cal.get("walkforward_brier") is not None else 1.0)
    mkt_brier = float(cal.get("market_baseline_brier") if cal.get("market_baseline_brier") is not None else 0.25)
    wf_acc = float(cal.get("walkforward_accuracy") or 0.0)
    strictly_causal = bool(cal.get("strictly_causal", False))
    eligible_flag = cal.get("eligible_for_play")

    reasons: list[str] = []
    if not strictly_causal:
        reasons.append("Calibration head lacks strictly_causal walk-forward verification.")
    if n_oos < int(policy["min_oos_samples"]):
        reasons.append(f"OOS sample {n_oos} < required {policy['min_oos_samples']} for {sport_u}.")
    if wf_brier >= mkt_brier:
        reasons.append(f"Walk-forward Brier {wf_brier:.5f} >= market baseline {mkt_brier:.5f}.")
    if wf_acc < float(policy["min_walkforward_accuracy"]):
        reasons.append(f"OOS accuracy {wf_acc:.4f} < {sport_u} floor {policy['min_walkforward_accuracy']:.3f}.")
    if eligible_flag is False:
        reasons.append("Market family explicitly quarantined by causal calibration head (`eligible_for_play=False`).")
    if policy["requires_starter_confirmation"] and not starter_confirmed:
        reasons.append(f"Starter / lineup / injury confirmation pending for {sport_u}.")

    passes_tier_a = len(reasons) == 0
    tier = "TIER_A_CALIBRATED_SNIPER" if passes_tier_a else "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"

    return {
        "sport": sport_u,
        "market_family": market_family,
        "readiness_tier": tier,
        "publish_official_picks_allowed": passes_tier_a,
        "daily_environment_content_allowed": True,
        "paper_learning_enabled": True,
        "policy": policy,
        "observed": {
            "n_oos": n_oos,
            "walkforward_brier": wf_brier,
            "market_baseline_brier": mkt_brier,
            "walkforward_accuracy": wf_acc,
            "strictly_causal": strictly_causal,
            "spine_age_hours": spine_age_hours,
        },
        "reasons": reasons if reasons else ["Cleared causal walk-forward Brier, OOS accuracy, sample floor, and healthy spine gate."],
    }


def evaluate_extra_sport_candidate_ticket(
    candidate: Mapping[str, Any],
    sport_readiness: Mapping[str, Any],
) -> dict[str, Any]:
    """Fail-closed ticket gate for any candidate pick across NFL and non-NFL sports."""
    sport_u = str(sport_readiness.get("sport") or candidate.get("sport") or "UNKNOWN").upper()
    policy = dict(sport_readiness.get("policy") or get_sport_policy(sport_u))
    tier = str(sport_readiness.get("readiness_tier") or "TIER_C_QUARANTINED")

    if tier != "TIER_A_CALIBRATED_SNIPER" or not sport_readiness.get("publish_official_picks_allowed"):
        return {
            "sport": sport_u,
            "athlete_or_side": candidate.get("athlete") or candidate.get("selection") or "unknown",
            "market": candidate.get("market") or sport_readiness.get("market_family"),
            "publishAllowed": False,
            "decision": "PASS_EXTRA_SPORT_CALIBRATION_QUARANTINE",
            "paperLearningLogged": bool(sport_readiness.get("paper_learning_enabled", False)),
            "net_edge": 0.0,
            "reason": (
                f"Quarantined ({tier}): {sport_u} official paid pick blocked to prevent uncalibrated volume. "
                + "; ".join(str(r) for r in sport_readiness.get("reasons", []))
            ),
        }

    over_odds = candidate.get("over_odds", candidate.get("side_a_odds"))
    under_odds = candidate.get("under_odds", candidate.get("side_b_odds"))
    mkt_fair = candidate.get("market_fair_prob")
    cal_prob = candidate.get("calibrated_prob", candidate.get("model_prob"))
    n_oos = int(candidate.get("n_oos", sport_readiness.get("observed", {}).get("n_oos", policy["min_oos_samples"])))

    if over_odds is None or under_odds is None or mkt_fair is None or cal_prob is None:
        return {
            "sport": sport_u,
            "athlete_or_side": candidate.get("athlete") or candidate.get("selection") or "unknown",
            "market": candidate.get("market"),
            "publishAllowed": False,
            "decision": "PASS_UNPRICED_TWO_SIDED_ODDS",
            "paperLearningLogged": False,
            "net_edge": 0.0,
            "reason": "Missing two-sided de-vigged American odds (`INV-5`).",
        }

    cal_p = float(cal_prob)
    mkt_p = float(mkt_fair)
    min_wilson_edge = float(policy["min_wilson_edge"])
    w_lb = float(wilson_lower_bound(cal_p * max(1, n_oos), max(1, n_oos)))
    net_edge = cal_p - mkt_p
    wilson_edge = w_lb - mkt_p
    passes = bool(net_edge >= min_wilson_edge and wilson_edge >= min_wilson_edge)

    return {
        "sport": sport_u,
        "athlete_or_side": candidate.get("athlete") or candidate.get("selection") or "unknown",
        "market": candidate.get("market"),
        "publishAllowed": passes,
        "decision": "PLAY" if passes else "PASS_INSUFFICIENT_WILSON_EDGE",
        "paperLearningLogged": True,
        "calibrated_prob": round(cal_p, 4),
        "market_fair_prob": round(mkt_p, 4),
        "wilson_lower_90": round(w_lb, 4),
        "net_edge": round(net_edge, 4),
        "wilson_edge": round(wilson_edge, 4),
        "required_wilson_edge": min_wilson_edge,
        "reason": (
            f"CLEARED_SNIPER_GATE: cal={cal_p:.4f} (Wilson LB {w_lb:.4f}) vs mkt={mkt_p:.4f} (+{wilson_edge:.4f} >= +{min_wilson_edge:.4f})"
            if passes
            else f"PASS_INSUFFICIENT_WILSON_EDGE: Wilson edge {wilson_edge:+.4f} < required +{min_wilson_edge:.4f}"
        ),
    }


def build_daily_whop_and_community_content_plan(
    date_str: str,
    sports_readiness: list[dict[str, Any]],
    whop_catalog_path: Optional[Path] = None,
) -> dict[str, Any]:
    """Compile daily multi-sport content cadence + Whop pack-to-membership cohort unit economics."""
    repo_root = Path(__file__).resolve().parents[2]
    catalog_path = whop_catalog_path or (repo_root / "apps" / "web" / "lib" / "integrations" / "whop-live-catalog.json")
    catalog: dict[str, Any] = {}
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    products = catalog.get("products", [])
    recurring_plans = [p for p in products if p.get("billingType") == "renewal"]
    one_time_packs = [p for p in products if p.get("billingType") == "one_time"]

    tier_a_sports = sorted({r["sport"] for r in sports_readiness if r.get("readiness_tier") == "TIER_A_CALIBRATED_SNIPER"})
    tier_b_sports = sorted({r["sport"] for r in sports_readiness if r.get("readiness_tier") == "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"})

    daily_cadence = [
        {
            "slot_ct": "08:30 CT",
            "surface": "Telegram @GalaxySportsEdge_bot + Whop Free Proof Room + Podcast RSS",
            "output": "Daily 3-Minute Multi-Sport Matchup Environment Audio Briefing (ElevenLabs -> Fish Audio)",
            "guardrail": "Plain-English tempo/fatigue/GSAx/platoon intel ONLY; zero math jargon; zero uncalibrated picks",
        },
        {
            "slot_ct": "12:15 CT",
            "surface": "Private Overnight Learning Loop",
            "output": f"Shadow Paper Predictions & Brier Audits for TIER_B sports ({', '.join(tier_b_sports) or 'None'})",
            "guardrail": "Logs predictions strictly for causal walk-forward validation; publishAllowed=False",
        },
        {
            "slot_ct": "T-75m Pre-Lock",
            "surface": "Whop Paid Tiers + Member Web/iOS Portal",
            "output": f"Official Calibrated Sniper Card for TIER_A sports ({', '.join(tier_a_sports) or 'Hold/Pass'}) after injury/starter gate",
            "guardrail": "Two-sided de-vigged odds + Baker-McHale Kelly cap + SGP quarantine default",
        },
        {
            "slot_ct": "Post-Game + 02:00 CT",
            "surface": "Public Proof Room + Telegram Recap + Calibration Head",
            "output": "Honest Settled Receipt (CLV + Pass Discipline wins) + Nightly Residual Learning Feed",
            "guardrail": "Never retroactively alter committed hashes or conceal losses",
        },
    ]

    # Cohort financial projection scenarios anchored on actual Whop pricing ($39 / $79 / $149 renewals + $9-$49 packs)
    cohort_scenarios = {
        "conservative": {
            "month_3": {"recurring_members": 35, "blended_arpu_usd": 55.0, "mrr_usd": 1925.0, "pack_addon_usd": 650.0, "total_monthly_rev_usd": 2575.0},
            "month_6": {"recurring_members": 110, "blended_arpu_usd": 60.0, "mrr_usd": 6600.0, "pack_addon_usd": 1400.0, "total_monthly_rev_usd": 8000.0},
            "month_12": {"recurring_members": 260, "blended_arpu_usd": 65.0, "mrr_usd": 16900.0, "pack_addon_usd": 2400.0, "total_monthly_rev_usd": 19300.0, "arr_run_rate_usd": 231600.0},
        },
        "base": {
            "month_3": {"recurring_members": 65, "blended_arpu_usd": 63.46, "mrr_usd": 4125.0, "pack_addon_usd": 1250.0, "total_monthly_rev_usd": 5375.0},
            "month_6": {"recurring_members": 220, "blended_arpu_usd": 67.45, "mrr_usd": 14840.0, "pack_addon_usd": 2800.0, "total_monthly_rev_usd": 17640.0},
            "month_12": {"recurring_members": 540, "blended_arpu_usd": 72.00, "mrr_usd": 38880.0, "pack_addon_usd": 4900.0, "total_monthly_rev_usd": 43780.0, "arr_run_rate_usd": 525360.0},
            "year_2": {"recurring_members": 1350, "blended_arpu_usd": 75.00, "mrr_usd": 101250.0, "pack_addon_usd": 8500.0, "total_monthly_rev_usd": 109750.0, "arr_run_rate_usd": 1317000.0},
            "year_3": {"recurring_members": 2900, "blended_arpu_usd": 78.00, "mrr_usd": 226200.0, "pack_addon_usd": 14000.0, "total_monthly_rev_usd": 240200.0, "arr_run_rate_usd": 2882400.0},
        },
        "optimistic": {
            "month_12": {"recurring_members": 950, "blended_arpu_usd": 79.00, "mrr_usd": 75050.0, "pack_addon_usd": 9200.0, "total_monthly_rev_usd": 84250.0, "arr_run_rate_usd": 1011000.0},
            "year_3": {"recurring_members": 5500, "blended_arpu_usd": 86.00, "mrr_usd": 473000.0, "pack_addon_usd": 28000.0, "total_monthly_rev_usd": 501000.0, "arr_run_rate_usd": 6012000.0},
        },
    }

    return {
        "schema": "gse_multisport_whop_community_plan_v1",
        "date": date_str,
        "whop_account_id": catalog.get("accountId", "biz_jzvuDvevsatKWi"),
        "storefront_url": catalog.get("storefrontUrl", "https://galaxy-sports-edge.whop.site"),
        "recurring_membership_count": len(recurring_plans),
        "one_time_pack_count": len(one_time_packs),
        "recurring_plans_summary": [
            {"key": p.get("key"), "priceUsd": p.get("priceUsd"), "variantId": p.get("variantId")}
            for p in recurring_plans
        ],
        "affiliate_flywheel": {"global_pct": 30, "member_pct": 40},
        "tier_a_calibrated_sports": tier_a_sports,
        "tier_b_environment_and_paper_sports": tier_b_sports,
        "daily_cadence": daily_cadence,
        "financial_cohort_projections": cohort_scenarios,
    }
