"""Shadow ledger for the Combine-reliability lane.

Follows the established shadow pattern (intelligence/matchup/shadow,
intelligence/trust/shadow, intelligence/vision/shadow): JSONL rows,
weight 0, status SHADOW. Nothing written here is a recommendation; the
ledger records gate evaluations and shadow feature registrations so the
lane's claims stay auditable. Emission remains ZERO_OBJECT.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

LANE = "combine_reliability"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def append_ledger(path, record: dict) -> dict:
    """Append one row. Enforces the shadow invariants: weight must be 0 and
    status must be SHADOW -- anything else is a programming error, not data."""
    if record.get("weight", 0) != 0:
        raise ValueError("shadow ledger rows must carry weight 0")
    if record.get("status") != "SHADOW":
        raise ValueError("shadow ledger rows must carry status SHADOW")
    row = {"ts": _now(), "lane": LANE, **record}
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, sort_keys=True) + "\n")
    return row


def gate_evaluation_record(candidate: str, evidence_summary: dict, verdict) -> dict:
    return {
        "kind": "gate_evaluation",
        "candidate": candidate,
        "status": "SHADOW",
        "weight": 0,
        "gate_verdict": verdict.verdict,
        "gate_flags": list(verdict.flags),
        "gate_reasons": list(verdict.reasons),
        "legs": verdict.legs,
        "evidence": evidence_summary,
    }


def shadow_feature_record(feature: str, source: str, gate_verdict: str, note: str) -> dict:
    return {
        "kind": "shadow_feature",
        "candidate": feature,
        "status": "SHADOW",
        "weight": 0,
        "source": source,
        "gate_verdict": gate_verdict,
        "note": note,
    }
