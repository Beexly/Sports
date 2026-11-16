"""Class B two-sided conjunction gate, anti-cannibalization & CAGE receipt (ADR-0008/0011)."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Sequence

from gse_engine.models import CagePolicyReceipt, GatedPropDecision, TwoSidedPropCandidate

QB_CORRELATED_MARKETS = frozenset({"pass_yds", "pass_attempts", "pass_completions"})


def american_to_implied(odds: int) -> float:
    """Converts American odds into raw implied probability in (0, 1)."""
    if odds == 0:
        raise ValueError("American odds cannot be zero.")
    if odds > 0:
        return 100.0 / (odds + 100.0)
    abs_odds = abs(odds)
    return abs_odds / (abs_odds + 100.0)


def multiplicative_devig(over_american: int, under_american: int) -> tuple[float, float]:
    """Removes sportsbook vig proportionally from a two-sided market."""
    p_over_raw = american_to_implied(over_american)
    p_under_raw = american_to_implied(under_american)
    total = p_over_raw + p_under_raw
    return p_over_raw / total, p_under_raw / total


def evaluate_prop_board(
    candidates: Sequence[TwoSidedPropCandidate],
    min_edge: float = 0.02,
    min_conformal_margin: float = 0.005,
) -> tuple[list[GatedPropDecision], CagePolicyReceipt]:
    """Applies Class B de-vig, conformal floor, and QB anti-cannibalization checks.

    Args:
        candidates: Candidate player props ordered or scored pre-market.
        min_edge: Minimum expected CLV (probability points) to clear PLAY.
        min_conformal_margin: Minimum surplus required on conformal_lower_prob over market fair.

    Returns:
        Tuple of GatedPropDecision objects (preserving input order) and a SHA-256
        CAGE policy receipt summarizing any refusal codes encountered.
    """
    preliminary: list[dict[str, object]] = []
    qb_published_best: dict[str, tuple[int, float]] = {}

    for idx, cand in enumerate(candidates):
        if cand.over_american is None or cand.under_american is None:
            preliminary.append(
                {
                    "decision": "PASS",
                    "publish_allowed": False,
                    "fair": None,
                    "clv": 0.0,
                    "reasons": ("MISSING_TWO_SIDED_JUICE",),
                }
            )
            continue

        p_fair_over, p_fair_under = multiplicative_devig(cand.over_american, cand.under_american)
        p_market = p_fair_over if cand.side == "OVER" else p_fair_under
        edge = cand.model_prob - p_market
        conformal_edge = cand.conformal_lower_prob - p_market

        reasons: list[str] = []
        if edge < min_edge:
            reasons.append("EDGE_BELOW_MIN")
        if conformal_edge < min_conformal_margin:
            reasons.append("CONFORMAL_LOWER_BELOW_MARKET")

        is_play = len(reasons) == 0
        if is_play and cand.market in QB_CORRELATED_MARKETS and cand.sgp_bundle_id is None:
            existing = qb_published_best.get(cand.player_id)
            if existing is None or edge > existing[1]:
                if existing is not None:
                    prev_idx = existing[0]
                    preliminary[prev_idx]["decision"] = "PASS"
                    preliminary[prev_idx]["publish_allowed"] = False
                    preliminary[prev_idx]["reasons"] = ("QB_ANTI_CANNIBALIZATION",)
                qb_published_best[cand.player_id] = (idx, edge)
            else:
                is_play = False
                reasons.append("QB_ANTI_CANNIBALIZATION")

        preliminary.append(
            {
                "decision": "PLAY" if is_play else "PASS",
                "publish_allowed": is_play,
                "fair": round(p_market, 6),
                "clv": round(edge, 6),
                "reasons": tuple(reasons) if reasons else ("CLEARED_CLASS_B",),
            }
        )

    decisions: list[GatedPropDecision] = []
    refused_codes: list[str] = []
    for cand, state in zip(candidates, preliminary, strict=True):
        conf_int = max(0, min(100, round(cand.model_prob * 100)))
        dec = GatedPropDecision(
            prop_id=cand.prop_id,
            player_id=cand.player_id,
            player_name=cand.player_name,
            market=cand.market,
            line=cand.line,
            side=cand.side,
            decision="PLAY" if state["decision"] == "PLAY" else "PASS",
            publish_allowed=bool(state["publish_allowed"]),
            confidence_display=f"{conf_int}/100",
            devigged_market_prob=state["fair"] if isinstance(state["fair"], float) else None,
            expected_clv=float(state["clv"]),  # type: ignore[arg-type]
            reasons=tuple(state["reasons"]),  # type: ignore[arg-type]
        )
        decisions.append(dec)
        if dec.decision == "PASS":
            for code in dec.reasons:
                if code != "CLEARED_CLASS_B":
                    refused_codes.append(f"{dec.prop_id}:{code}")

    serialized = json.dumps(
        [
            {
                "prop_id": d.prop_id,
                "decision": d.decision,
                "publish_allowed": d.publish_allowed,
                "confidence": d.confidence_display,
                "clv": d.expected_clv,
            }
            for d in decisions
        ],
        sort_keys=True,
    )
    receipt = CagePolicyReceipt(
        policy_id="gse-cage-prop-gate-v3",
        decision="ADMIT",
        payload_sha256=hashlib.sha256(serialized.encode("utf-8")).hexdigest(),
        refused_reasons=tuple(refused_codes),
    )
    return decisions, receipt
