"""GSE & GSI Revenue Ladder, 30-Day Positive-CLV Pledge, 4-Plane Cloud & W11 TNF Readiness.

Encodes deterministic, fail-closed operational and unit-economics models aligned with the
executive launch roadmap:
1. 6-Rung Whop MoR Value Ladder (biz_jzvuDvevsatKWi, 30%/40% affiliate split) + Texas
   Comptroller 80% information-services taxable base (8.25% * 0.80 = 6.60% Houston effective tax).
2. Binomial proof showing single-slate losing-card credits at p=0.55 on -110 lines trigger on
   49.56% of 10-play slates (slashing realized price to 66.86%), versus 1.07% trigger probability
   on a 30-day Positive-CLV next-month extension pledge (98.94% retained revenue).
3. GSI stealth-skeleton OpenRouter reseller quarantine (PUBLIC_TOKEN_RESELLER_ENABLED = False
   eliminating -898.7% to -7,340.0% gross margin drain) + Four-Plane 24/7 Hybrid Cloud Stack
   economics (80/730 active GPU hours -> 89.04% idle silicon avoided; $94.60/mo pre-credit
   or $9.26/mo net after startup cloud credits).
4. Fail-closed Week 11 TNF (IND @ HOU) Wednesday 1:30 PM CST final injury Sinkhorn readiness
   overlay: raises OperatorSimulationHoldError on unapproved calls unless explicit
   GSE_OPERATOR_APPROVED_SIM_WEEKS=11 authorization is supplied by the operator.
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Any

from gse_engine.governance.simulation_hold_gate import (
    OperatorSimulationHoldError,
    assert_operator_simulation_week_approved,
)
from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
)

PUBLIC_TOKEN_RESELLER_ENABLED: bool = False
WHOP_ACCOUNT_ID: str = "biz_jzvuDvevsatKWi"


def evaluate_gse_6rung_whop_value_ladder_and_tx_tax() -> dict[str, Any]:
    """Verify Whop MoR 6-rung pricing, 30%/40% splits & 6.60% TX Sec.151.351 effective tax."""
    tx_houston_rate = 0.0825
    tx_dp_taxable_fraction = 0.80
    effective_tx_tax = tx_houston_rate * tx_dp_taxable_fraction

    rungs: tuple[dict[str, Any], ...] = (
        {
            "rung": "tier_0_open_field",
            "sku": "free_proof_room_and_calculators",
            "price_usd": 0.0,
            "whop_net_direct_usd": 0.0,
            "whop_net_30pct_aff_usd": 0.0,
            "billing": "free_lead_funnel",
        },
        {
            "rung": "tier_1_tnf_impulse",
            "sku": "week11_ind_at_hou_tnf_pass",
            "price_usd": 9.0,
            "whop_net_direct_usd": 8.01,
            "whop_net_30pct_aff_usd": 5.31,
            "whop_net_40pct_local_aff_usd": 4.41,
            "billing": "one_time_with_72h_pro_credit",
        },
        {
            "rung": "tier_1b_thanksgiving_5game",
            "sku": "week12_thanksgiving_5game_feast",
            "price_usd": 14.0,
            "whop_net_direct_usd": 12.62,
            "whop_net_30pct_aff_usd": 8.42,
            "billing": "one_time_with_pro_credit",
        },
        {
            "rung": "tier_2a_quant_workbook",
            "sku": "conformal_quant_and_pass_playbook",
            "price_usd": 19.0,
            "whop_net_direct_usd": 17.24,
            "whop_net_30pct_aff_usd": 11.54,
            "billing": "one_time_order_bump",
        },
        {
            "rung": "tier_2b_weekly_vip",
            "sku": "weekly_core_19_or_vip_29_pack",
            "price_usd": 29.0,
            "whop_net_direct_usd": 26.47,
            "whop_net_30pct_aff_usd": 17.77,
            "billing": "one_time_weekly_decoy",
        },
        {
            "rung": "tier_3_gse_pro_monthly",
            "sku": "gse_pro_all_sports_monthly",
            "price_usd": 39.0,
            "seasonal_price_usd": 149.0,
            "whop_net_direct_usd": 35.32,
            "whop_net_30pct_aff_usd": 23.74,
            "seasonal_net_direct_usd": 137.23,
            "billing": "monthly_or_seasonal_30d_clv_pledge",
        },
        {
            "rung": "tier_4_gse_elite_mme",
            "sku": "gse_elite_150_cpsat_optimizer",
            "price_usd": 79.0,
            "whop_net_direct_usd": 71.85,
            "whop_net_30pct_aff_usd": 48.40,
            "billing": "monthly_30d_clv_pledge",
        },
        {
            "rung": "tier_5_whitelabel_edge_bot",
            "sku": "discord_telegram_edge_bot_and_b2b",
            "price_usd": 149.0,
            "b2b_anchor_usd": 1499.0,
            "whop_net_direct_usd": 137.23,
            "whop_net_30pct_aff_usd": 92.53,
            "pro_30pct_aff_referrals_to_breakeven": 13,
            "elite_30pct_aff_referrals_to_breakeven": 7,
            "elite_70pct_postfee_referrals_to_breakeven": 3,
            "billing": "monthly_b2b2c_server_license",
        },
    )
    two_week_vip_cost = 2 * 29.0
    pro_monthly_cost = 39.0
    pro_30pct_aff_comm = 39.0 * 0.30
    elite_30pct_aff_comm = 79.0 * 0.30
    bot_breakeven_ok = (
        (13 * pro_30pct_aff_comm >= 149.0)
        and (7 * elite_30pct_aff_comm >= 149.0)
        and (3 * 50.50 >= 149.0)
    )

    return {
        "schema": "gse_6rung_whop_value_ladder_v1",
        "whop_account_id": WHOP_ACCOUNT_ID,
        "tx_effective_tax_rate": round(effective_tx_tax, 6),
        "rung_count": len(rungs),
        "rungs": list(rungs),
        "decoy_anchor_verified": bool(two_week_vip_cost > pro_monthly_cost),
        "bot_breakeven_verified": bool(bot_breakeven_ok),
    }


def _binom_cdf(k_max: int, n: int, p: float) -> float:
    return sum(math.comb(n, k) * (p**k) * ((1.0 - p) ** (n - k)) for k in range(k_max + 1))


def evaluate_single_slate_credit_trap_vs_30day_clv_pledge() -> dict[str, Any]:
    """Compare binomial 49.56% single-slate credit trigger vs 1.07% 30-day Positive-CLV pledge."""
    p_win = 0.55
    p_trigger_k8 = _binom_cdf(int(math.floor(0.5238 * 8)), 8, p_win)
    p_trigger_k10 = _binom_cdf(int(math.floor(0.5238 * 10)), 10, p_win)
    p_trigger_k12 = _binom_cdf(int(math.floor(0.5238 * 12)), 12, p_win)
    single_slate_retention_k10 = 1.0 / (1.0 + p_trigger_k10)

    n_monthly = 45
    mean_clv = 0.012
    sd_clv = 0.035
    se_clv = sd_clv / math.sqrt(float(n_monthly))
    z_zero = (0.0 - mean_clv) / se_clv
    p_trigger_30d_clv = 0.5 * math.erfc(-z_zero / math.sqrt(2.0))
    clv_pledge_retention = 1.0 / (1.0 + p_trigger_30d_clv)

    return {
        "schema": "gse_single_slate_trap_vs_30day_clv_pledge_v1",
        "single_slate_trigger_k8": round(p_trigger_k8, 4),
        "single_slate_trigger_k10": round(p_trigger_k10, 4),
        "single_slate_trigger_k12": round(p_trigger_k12, 4),
        "single_slate_realized_price_ratio_k10": round(single_slate_retention_k10, 4),
        "monthly_clv_se": round(se_clv, 5),
        "clv_30day_pledge_trigger_prob": round(p_trigger_30d_clv, 4),
        "clv_30day_pledge_revenue_retention": round(clv_pledge_retention, 4),
        "clv_pledge_strictly_dominates": bool(
            clv_pledge_retention > 0.98 and single_slate_retention_k10 < 0.70
        ),
    }


def evaluate_gsi_reseller_quarantine_and_4plane_24x7_cloud_economics() -> dict[str, Any]:
    """Verify negative-margin token reseller quarantine & 4-plane serverless vs 24/7 GPU VM."""
    reseller_rev_per_1m = 3.00
    reseller_cost_low = 29.96
    reseller_cost_high = 223.20
    margin_low_pct = 100.0 * (reseller_rev_per_1m - reseller_cost_low) / reseller_rev_per_1m
    margin_high_pct = 100.0 * (reseller_rev_per_1m - reseller_cost_high) / reseller_rev_per_1m

    hours_per_month = 730.0
    active_gpu_hours = 80.0
    active_util_pct = 100.0 * active_gpu_hours / hours_per_month
    idle_pct = 100.0 - active_util_pct

    gcp_l4_24x7 = 549.96
    aws_g6_24x7 = 607.15
    h100_24x7 = 2401.70

    plane1_cf_mo = 5.60
    plane2_modal_trigger_mo = 74.00
    plane3_antigravity_jules_nim_mo = 0.00
    plane4_neon_single_branch_mo = 15.00
    four_plane_pre_credit_mo = (
        plane1_cf_mo
        + plane2_modal_trigger_mo
        + plane3_antigravity_jules_nim_mo
        + plane4_neon_single_branch_mo
    )
    neon_branch_prune_savings_mo = 102.49
    idle_gpu_avoided_low = round(gcp_l4_24x7 - 60.27, 2)

    return {
        "schema": "gsi_reseller_quarantine_and_4plane_cloud_v1",
        "public_token_reseller_enabled": PUBLIC_TOKEN_RESELLER_ENABLED,
        "reseller_margin_low_pct": round(margin_low_pct, 1),
        "reseller_margin_high_pct": round(margin_high_pct, 1),
        "gpu_active_hours_mo": active_gpu_hours,
        "gpu_utilization_pct": round(active_util_pct, 2),
        "gpu_idle_waste_pct": round(idle_pct, 2),
        "gcp_l4_24x7_mo_usd": gcp_l4_24x7,
        "aws_g6_24x7_mo_usd": aws_g6_24x7,
        "h100_24x7_mo_usd": h100_24x7,
        "four_plane_pre_credit_mo_usd": round(four_plane_pre_credit_mo, 2),
        "four_plane_post_credit_mo_usd": 9.26,
        "neon_branch_prune_savings_mo_usd": neon_branch_prune_savings_mo,
        "idle_gpu_waste_avoided_min_usd": idle_gpu_avoided_low,
        "reseller_quarantined_and_4plane_cheaper": bool(
            (not PUBLIC_TOKEN_RESELLER_ENABLED) and four_plane_pre_credit_mo < 0.20 * gcp_l4_24x7
        ),
    }


def evaluate_w11_ind_at_hou_tnf_injury_and_sinkhorn_readiness(
    *,
    env_override: str | None = None,
) -> dict[str, Any]:
    """Run fail-closed W11 IND @ HOU Wednesday 1:30 PM CST Sinkhorn injury overlay when approved.

    Raises OperatorSimulationHoldError unless GSE_OPERATOR_APPROVED_SIM_WEEKS includes 11
    (or explicit env_override="11" is supplied by the operator / test harness).
    """
    gate_receipt = assert_operator_simulation_week_approved(
        11,
        caller="w11_ind_at_hou_tnf_readiness",
        env_override=env_override,
    )

    # Colts Wednesday 1:30 PM CST confirmed OUT + IR impact: LT Raimann & RT Travis both OUT ->
    # high edge-pressure spike facing Will Anderson Jr. (10.5 sacks); shift mix toward Taylor/Warren
    ind_base_shares = {
        "jonathan_taylor": 0.34,
        "tyler_warren": 0.22,
        "michael_pittman": 0.20,
        "josh_downs": 0.14,
        "will_mallory_out": 0.05,
        "depth_flex": 0.05,
    }
    ind_mult = {
        "jonathan_taylor": 1.18,
        "tyler_warren": 1.24,
        "michael_pittman": 0.96,
        "josh_downs": 1.04,
        "will_mallory_out": 0.0,
        "depth_flex": 0.90,
    }
    ind_raw = {k: ind_base_shares[k] * ind_mult[k] for k in ind_base_shares}
    ind_tot = sum(ind_raw.values())
    ind_reallocated = {k: round(v / ind_tot, 6) for k, v in ind_raw.items()}
    ind_kkt_resid = abs(sum(ind_reallocated.values()) - 1.0)

    # Texans Wednesday injury impact: RBs Marks/Mixon/Jordan/Whittington OUT, Montgomery active;
    # Harrison Jr. DNP likely OUT, Dell FP -> condense passing tree on Collins, Dell, Schultz, Hutch
    hou_base_shares = {
        "nico_collins": 0.28,
        "tank_dell": 0.22,
        "marvin_harrison_jr_dnp": 0.16,
        "dalton_schultz": 0.15,
        "xavier_hutchinson": 0.09,
        "david_montgomery_backfield": 0.10,
    }
    hou_mult = {
        "nico_collins": 1.22,
        "tank_dell": 1.20,
        "marvin_harrison_jr_dnp": 0.10,
        "dalton_schultz": 1.16,
        "xavier_hutchinson": 1.25,
        "david_montgomery_backfield": 1.35,
    }
    hou_raw = {k: hou_base_shares[k] * hou_mult[k] for k in hou_base_shares}
    hou_tot = sum(hou_raw.values())
    hou_reallocated = {k: round(v / hou_tot, 6) for k, v in hou_raw.items()}
    hou_kkt_resid = abs(sum(hou_reallocated.values()) - 1.0)

    return {
        "schema": "w11_ind_at_hou_tnf_sinkhorn_readiness_v1",
        "gate_receipt": gate_receipt,
        "matchup": "IND @ HOU",
        "kickoff_cst": "2026-11-19T19:15:00-06:00",
        "venue": "NRG Stadium (Retractable Roof)",
        "spread_market_hou": -12.5,
        "total_market": 44.5,
        "spread_decision": "TRANSPARENT_PASS",
        "publish_spread_bet": False,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "ind_out_key_players": [
            "Bernhard Raimann (LT, Concussion)",
            "Jalen Travis (RT, Knee)",
            "Charvarius Ward Sr. (CB, Knee)",
            "Jerry Tillery (DT, Calf)",
            "Will Mallory (TE, Hamstring)",
            "Jaylon Carlies (WILL LB, IR)",
        ],
        "hou_key_statuses": [
            "Woody Marks (RB, Concussion, OUT)",
            "Azeez Al-Shaair (LB, Groin, IR)",
            "David Montgomery (RB, Groin, FP/Active)",
            "Tank Dell (WR, Hand/Shoulder, FP)",
            "Marvin Harrison Jr. (WR, Hamstring, DNP)",
        ],
        "ind_sinkhorn_shares": ind_reallocated,
        "hou_sinkhorn_shares": hou_reallocated,
        "max_kkt_residual": round(max(ind_kkt_resid, hou_kkt_resid), 8),
    }


def evaluate_revenue_and_4plane_orchestration_readiness_suite() -> dict[str, Any]:
    """Run fail-safe pre-sim verification across GSE revenue ladder, CLV pledge & 4-plane stack."""
    ladder = evaluate_gse_6rung_whop_value_ladder_and_tx_tax()
    clv = evaluate_single_slate_credit_trap_vs_30day_clv_pledge()
    cloud = evaluate_gsi_reseller_quarantine_and_4plane_24x7_cloud_economics()
    w11_held_without_approval = False
    try:
        evaluate_w11_ind_at_hou_tnf_injury_and_sinkhorn_readiness(env_override="")
    except OperatorSimulationHoldError:
        w11_held_without_approval = True

    out: dict[str, Any] = {
        "schema": "gse_revenue_and_4plane_orchestration_suite_v1",
        "wired": True,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
        "clinical_ruo_sports_weight": 0.0,
        "public_token_reseller_enabled": PUBLIC_TOKEN_RESELLER_ENABLED,
        "w11_default_hold_enforced": w11_held_without_approval,
        "whop_6rung_ladder_and_tx_tax": ladder,
        "single_slate_trap_vs_30day_clv_pledge": clv,
        "gsi_reseller_quarantine_and_4plane_cloud": cloud,
    }
    blob = json.dumps(out, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    out["suite_sha256"] = hashlib.sha256(blob.encode("ascii")).hexdigest()
    return out
