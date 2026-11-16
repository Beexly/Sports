"""Deterministic CAGE pre-execution publication policy gate for Python slates."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Sequence

from gse_engine.gates.conjunction import evaluate_prop_board
from gse_engine.models import CagePolicyReceipt, GatedPropDecision, TwoSidedPropCandidate

FORBIDDEN_PUBLIC_COPY_TERMS: tuple[str, ...] = (
    "romano cqr",
    "10,000 worlds",
    "tau_hat",
    "sinkhorn",
    "jev",
    "62-23-1",
    "16-5",
    "11-6",
)


def evaluate_cage_slate_policy(
    candidates: Sequence[TwoSidedPropCandidate],
    *,
    named_volume_share: float = 1.0,
    public_notes: Sequence[str] = (),
    min_edge: float = 0.02,
    min_conformal_margin: float = 0.005,
) -> tuple[list[GatedPropDecision], CagePolicyReceipt]:
    """Evaluates CAGE runtime invariants before any slate receipt can be sealed."""
    decisions, prop_receipt = evaluate_prop_board(
        candidates,
        min_edge=min_edge,
        min_conformal_margin=min_conformal_margin,
    )
    reasons: list[str] = list(prop_receipt.refused_reasons)
    blocking = False

    if named_volume_share < 0.94:
        reasons.append("UNATTRIBUTED_VOLUME_LEAK")
        blocking = True

    for idx, note in enumerate(public_notes):
        lower = note.lower()
        for phrase in FORBIDDEN_PUBLIC_COPY_TERMS:
            if phrase in lower:
                reasons.append(f"INTERNAL_JARGON_LEAK:{idx}")
                blocking = True
                break

    payload_digest = hashlib.sha256(
        json.dumps(
            {
                "prop_sha256": prop_receipt.payload_sha256,
                "named_volume_share": round(named_volume_share, 6),
                "reasons": reasons,
                "blocking": blocking,
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()

    return decisions, CagePolicyReceipt(
        policy_id="gse-cage-slate-policy-v3",
        decision="REFUSE" if blocking else "ADMIT",
        payload_sha256=payload_digest,
        refused_reasons=tuple(reasons),
    )
