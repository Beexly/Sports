#!/usr/bin/env python3
"""
Correlated Card Optimizer & Hard SGP Quarantine (`correlated_card_optimizer.py`)
===============================================================================
Prevents multi-prop same-QB/team correlation disasters and blocks unpriced/negative-EV SGPs:
  1. Max 1 straight prop per athlete per game.
  2. Max pairwise correlation |rho| <= 0.45 using 10,000-world hit vectors.
  3. Max 6 standard-tier plays per game, with explicit uncorrelated A+ exception
     (calibrated_prob >= 0.68 AND wilson_lower_90 >= market_fair_prob + 0.06,
      different athlete, |rho| <= 0.45).
  4. Baker-McHale Kelly sizing: <= 2.0% single ticket, <= 8.0% game cap (<= 10.0%
     only when uncorrelated A+ conviction plays extend past standard cap).
  5. Hard SGP quarantine by default (`sgp_publish_enabled=False`); even when enabled,
     requires actual posted book SGP American odds, 0 recycled straight-card legs,
     calibrated leg approval, and exact 10k-world joint hit prob beating book >= +5.0%.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np

from scripts.ops.week8_forensic_kernels import wilson_lower_bound


def _american_to_implied(american: Any) -> float | None:
    if american is None or isinstance(american, bool):
        return None
    try:
        a = float(american)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(a) or a == 0.0 or (-99.0 < a < 100.0):
        return None
    if a < 0:
        return (-a) / ((-a) + 100.0)
    return 100.0 / (a + 100.0)


def _american_to_profit(american: Any) -> float:
    if american is None or isinstance(american, bool):
        return 100.0 / 115.0
    try:
        a = float(american)
    except (TypeError, ValueError):
        return 100.0 / 115.0
    if not math.isfinite(a) or a == 0.0:
        return 100.0 / 115.0
    return (100.0 / (-a)) if a < 0 else (a / 100.0)


def _candidate_key(cand: dict[str, Any], idx: int) -> str:
    if cand.get("id"):
        return str(cand["id"])
    ath = str(cand.get("athlete") or "")
    mkt = str(cand.get("market") or "")
    line = str(cand.get("line") or "")
    return f"{ath}|{mkt}|{line}|{idx}"


def _pearson_corr(v1: np.ndarray, v2: np.ndarray) -> float:
    a = np.asarray(v1, dtype=np.float64)
    b = np.asarray(v2, dtype=np.float64)
    n = min(len(a), len(b))
    if n < 10:
        return 0.0
    a = a[:n]
    b = b[:n]
    sa = float(np.std(a))
    sb = float(np.std(b))
    if sa <= 1e-9 or sb <= 1e-9:
        return 0.0
    num = float(np.mean((a - np.mean(a)) * (b - np.mean(b))))
    return float(np.clip(num / (sa * sb), -1.0, 1.0))


def _baker_mchale_kelly_pct(
    cal_prob: float,
    american_odds: Any,
    max_single_bet_pct: float,
) -> float:
    b = max(0.20, _american_to_profit(american_odds))
    p = min(0.95, max(0.05, float(cal_prob)))
    q = 1.0 - p
    f_full = max(0.0, (b * p - q) / b)
    # Quarter-Kelly with Baker-McHale variance shrinkage
    shrink = min(1.0, max(0.35, (p - 0.50) / max(0.08, p * q)))
    raw = 0.25 * shrink * f_full
    return float(min(max_single_bet_pct, max(0.0025, raw)))


def construct_uncorrelated_game_card(
    candidates: list[dict[str, Any]],
    hit_vectors: dict[str, np.ndarray],
    max_straight_bets_per_game: int = 6,
    max_per_athlete: int = 1,
    max_abs_pairwise_corr: float = 0.45,
    max_game_bankroll_pct: float = 0.08,
    max_single_bet_pct: float = 0.02,
    a_plus_prob_threshold: float = 0.68,
    a_plus_wilson_margin: float = 0.06,
) -> dict[str, Any]:
    """Select max-edge uncorrelated straight card enforcing Baker-McHale Kelly & A+ exception."""
    out = [dict(c) for c in candidates]
    eligible_indices: list[tuple[int, str, bool]] = []
    for idx, c in enumerate(out):
        key = _candidate_key(c, idx)
        if not c.get("publishAllowed"):
            c.setdefault("recommended_stake_pct", 0.0)
            continue
        cal_p = float(c.get("calibrated_prob", c.get("win_prob_on_lean", 0.5)))
        w_lb = float(c.get("wilson_lower_90", cal_p - 0.02))
        mkt_p = c.get("market_fair_prob")
        is_ap = bool(
            cal_p >= a_plus_prob_threshold
            and mkt_p is not None
            and w_lb >= float(mkt_p) + a_plus_wilson_margin
        )
        eligible_indices.append((idx, key, is_ap))

    def _sort_key(tup: tuple[int, str, bool]) -> tuple[int, float, float]:
        idx, _k, is_ap = tup
        c = out[idx]
        edge = float(c.get("edge_vs_market") if c.get("edge_vs_market") is not None else c.get("ev_units", 0.0) or 0.0)
        prob = float(c.get("calibrated_prob", c.get("win_prob_on_lean", 0.5)))
        return (1 if is_ap else 0, edge, prob)

    eligible_indices.sort(key=_sort_key, reverse=True)

    selected_idxs: list[int] = []
    selected_keys: list[str] = []
    athlete_counts: dict[str, int] = {}
    std_count = 0
    ap_count = 0

    for idx, key, is_ap in eligible_indices:
        c = out[idx]
        ath_l = str(c.get("athlete") or f"GAME_{idx}").strip().lower()
        if athlete_counts.get(ath_l, 0) >= max_per_athlete:
            c["publishAllowed"] = False
            c["decision"] = "PASS_PORTFOLIO_CORR_OR_CAP"
            c["recommended_stake_pct"] = 0.0
            c["gate_reason"] = f"PASS_PORTFOLIO_CORR_OR_CAP: max {max_per_athlete} straight prop per athlete ({c.get('athlete')})."
            continue

        if not is_ap and std_count >= max_straight_bets_per_game:
            c["publishAllowed"] = False
            c["decision"] = "PASS_PORTFOLIO_CORR_OR_CAP"
            c["recommended_stake_pct"] = 0.0
            c["gate_reason"] = f"PASS_PORTFOLIO_CORR_OR_CAP: standard-tier game cap ({max_straight_bets_per_game}) reached."
            continue

        hv_cur = hit_vectors.get(key)
        if hv_cur is None:
            alt_k = f"{c.get('athlete', '')}|{c.get('market', '')}"
            hv_cur = hit_vectors.get(alt_k)
        corr_breach = False
        max_rho = 0.0
        if hv_cur is not None:
            for sk in selected_keys:
                hv_prev = hit_vectors.get(sk)
                if hv_prev is None:
                    prev_c = out[selected_idxs[selected_keys.index(sk)]]
                    hv_prev = hit_vectors.get(f"{prev_c.get('athlete', '')}|{prev_c.get('market', '')}")
                if hv_prev is not None:
                    rho = abs(_pearson_corr(hv_cur, hv_prev))
                    if rho > max_rho:
                        max_rho = rho
                    if rho > max_abs_pairwise_corr:
                        corr_breach = True
                        break
        if corr_breach:
            c["publishAllowed"] = False
            c["decision"] = "PASS_PORTFOLIO_CORR_OR_CAP"
            c["recommended_stake_pct"] = 0.0
            c["gate_reason"] = f"PASS_PORTFOLIO_CORR_OR_CAP: pairwise |rho|={max_rho:.2f} > {max_abs_pairwise_corr:.2f}."
            continue

        cal_p = float(c.get("calibrated_prob", c.get("win_prob_on_lean", 0.5)))
        odds = c.get("american_odds", c.get("playable_to_american_odds", -115))
        c["recommended_stake_pct"] = round(_baker_mchale_kelly_pct(cal_p, odds, max_single_bet_pct), 6)
        c["is_a_plus_conviction"] = is_ap
        selected_idxs.append(idx)
        selected_keys.append(key)
        athlete_counts[ath_l] = athlete_counts.get(ath_l, 0) + 1
        if is_ap:
            ap_count += 1
        else:
            std_count += 1

    # Enforce Baker-McHale game bankroll exposure ceiling (8.0% standard, up to 10.0% with A+ conviction)
    eff_cap = max_game_bankroll_pct + (0.02 if ap_count > 0 else 0.0)
    raw_tot = sum(float(out[i].get("recommended_stake_pct") or 0.0) for i in selected_idxs)
    if raw_tot > eff_cap and raw_tot > 1e-9:
        scale = eff_cap / raw_tot
        for i in selected_idxs:
            out[i]["recommended_stake_pct"] = round(min(max_single_bet_pct, float(out[i]["recommended_stake_pct"]) * scale), 6)

    total_stake = round(sum(float(out[i].get("recommended_stake_pct") or 0.0) for i in selected_idxs), 6)
    return {
        "evaluated_candidates": out,
        "selected_count": len(selected_idxs),
        "standard_selected_count": std_count,
        "a_plus_selected_count": ap_count,
        "total_game_stake_pct": total_stake,
        "effective_game_cap_pct": round(eff_cap, 4),
    }


def evaluate_sgp_strict_gate(
    legs: list[dict[str, Any]],
    hit_vectors: dict[str, np.ndarray],
    posted_sgp_american_odds: Any,
    straight_card_athletes: set[str] | list[str] | tuple[str, ...],
    sgp_publish_enabled: bool = False,
    min_joint_edge: float = 0.05,
    n_worlds: int = 10000,
) -> dict[str, Any]:
    """Fail-closed SGP quarantine gate requiring posted book odds & zero straight-leg recycling."""
    if not sgp_publish_enabled:
        return {
            "publishAllowed": False,
            "decision": "PASS_SGP_QUARANTINED_BY_DEFAULT",
            "net_edge": 0.0,
            "reason": "PASS_SGP_QUARANTINED_BY_DEFAULT: sgp_publish_enabled is False.",
        }

    book_implied = _american_to_implied(posted_sgp_american_odds)
    if book_implied is None:
        return {
            "publishAllowed": False,
            "decision": "PASS_SGP_MISSING_BOOK_PRICE",
            "net_edge": 0.0,
            "reason": "PASS_SGP_MISSING_BOOK_PRICE: No actual posted sportsbook SGP American odds provided.",
        }

    if len(legs) < 2:
        return {
            "publishAllowed": False,
            "decision": "PASS_SGP_INVALID_LEGS",
            "net_edge": 0.0,
            "reason": "PASS_SGP_INVALID_LEGS: Fewer than 2 SGP legs provided.",
        }

    straight_low = {str(a).strip().lower() for a in (straight_card_athletes or set()) if str(a).strip()}
    seen_ath: set[str] = set()
    masks: list[np.ndarray] = []
    cal_probs: list[float] = []
    raw_probs: list[float] = []

    for idx, leg in enumerate(legs):
        ath = str(leg.get("athlete") or "").strip()
        ath_l = ath.lower()
        if not ath_l or ath_l in seen_ath:
            return {
                "publishAllowed": False,
                "decision": "PASS_SGP_INVALID_LEGS",
                "net_edge": 0.0,
                "reason": f"PASS_SGP_INVALID_LEGS: Duplicate or empty athlete '{ath}'.",
            }
        seen_ath.add(ath_l)

        if ath_l in straight_low:
            return {
                "publishAllowed": False,
                "decision": "PASS_SGP_RECYCLED_STRAIGHT_LEG",
                "net_edge": 0.0,
                "reason": f"PASS_SGP_RECYCLED_STRAIGHT_LEG: '{ath}' already holds an approved straight ticket.",
            }

        if not leg.get("publishAllowed"):
            return {
                "publishAllowed": False,
                "decision": "PASS_SGP_UNAPPROVED_LEG",
                "net_edge": 0.0,
                "reason": f"PASS_SGP_UNAPPROVED_LEG: '{ath}' leg did not pass calibrated Stage 5.",
            }

        key = _candidate_key(leg, idx)
        hv = hit_vectors.get(key)
        if hv is None:
            hv = hit_vectors.get(f"{ath}|{leg.get('market', '')}")
        if hv is None:
            return {
                "publishAllowed": False,
                "decision": "PASS_SGP_MISSING_VECTOR",
                "net_edge": 0.0,
                "reason": f"PASS_SGP_MISSING_VECTOR: Missing simulation hit vector for '{ath}'.",
            }
        hv_bool = np.asarray(hv, dtype=bool)
        masks.append(hv_bool)
        raw_p = float(np.mean(hv_bool))
        cal_p = float(leg.get("calibrated_prob", leg.get("cal_prob", leg.get("win_prob_on_lean", raw_p))))
        raw_probs.append(max(1e-4, raw_p))
        cal_probs.append(max(1e-4, cal_p))

    n_eff_len = min(len(m) for m in masks)
    joint_mask = np.ones(n_eff_len, dtype=bool)
    for m in masks:
        joint_mask &= m[:n_eff_len]

    raw_joint_p = float(np.mean(joint_mask))
    cal_scale = math.prod(cal_probs) / max(1e-6, math.prod(raw_probs))
    joint_cal_p = float(min(min(cal_probs) * 0.98, max(0.01, raw_joint_p * max(0.75, min(1.05, cal_scale)))))
    w_lb = float(wilson_lower_bound(joint_cal_p * max(1, n_eff_len), max(1, n_eff_len)))
    net_edge = joint_cal_p - book_implied
    passes = bool(net_edge >= float(min_joint_edge) and w_lb > book_implied)

    return {
        "publishAllowed": passes,
        "decision": "PLAY" if passes else "PASS_SGP_INSUFFICIENT_EDGE",
        "joint_raw_prob": round(raw_joint_p, 4),
        "joint_calibrated_prob": round(joint_cal_p, 4),
        "book_parlay_implied_prob": round(book_implied, 4),
        "wilson_lower_90": round(w_lb, 4),
        "net_edge": round(net_edge, 4),
        "n_worlds": int(n_eff_len or n_worlds),
        "reason": (
            f"CLEARED_STRICT_SGP: joint_p={joint_cal_p:.4f} vs book={book_implied:.4f} (edge {net_edge:+.4f})"
            if passes
            else f"PASS_SGP_INSUFFICIENT_EDGE: edge={net_edge:+.4f} < +{min_joint_edge:.2f} or Wilson LB {w_lb:.4f} <= {book_implied:.4f}"
        ),
    }
