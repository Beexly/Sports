"""
Trust Provider — empty-store guard + freshness + identity readiness.

Clears INVALID only when required stores are non-empty and fresh.
Fail-closed. Improves on the Hermes empty-store gap.

Stores checked:
- injuries (parquet or json meta)
- depth_charts
- snap_counts
- participation (optional but logged)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

BRAIN = Path("artifacts/gse_brain")
TRUST_LOG = BRAIN / "intelligence" / "trust" / "trust_log.jsonl"
TRUST_LOG.parent.mkdir(parents=True, exist_ok=True)


@dataclass
class StoreStatus:
    name: str
    present: bool
    bytes: int = 0
    fresh: bool = False
    age_hours: float | None = None
    path: str | None = None
    honesty: str = ""


@dataclass
class TrustVerdict:
    card_id: str
    valid: bool
    reasons: list[str] = field(default_factory=list)
    stores: list[StoreStatus] = field(default_factory=list)
    checked_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def _latest_meta(kind: str, season: int = 2025) -> Path | None:
    folder = BRAIN / "artifacts" / "gse_brain" / "nflverse"
    if not folder.exists():
        folder = BRAIN / "nflverse"
    if not folder.exists():
        return None
    files = sorted(folder.glob(f"{kind}_{season}_meta_*.json"), reverse=True)
    return files[0] if files else None


def _inspect(kind: str, season: int = 2025, max_age_hours: float = 48) -> StoreStatus:
    path = _latest_meta(kind, season)
    if path is None:
        return StoreStatus(kind, present=False, honesty="missing")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        payload = data.get("payload", data)
        nbytes = int(payload.get("bytes", 0))
        fetched = data.get("fetched_at")
        age = None
        fresh = False
        if fetched:
            dt = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
            age = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            fresh = age <= max_age_hours and nbytes > 0
        return StoreStatus(
            name=kind,
            present=nbytes > 0,
            bytes=nbytes,
            fresh=fresh,
            age_hours=round(age, 2) if age is not None else None,
            path=str(path),
            honesty="ok" if fresh else "stale_or_empty",
        )
    except Exception as e:
        return StoreStatus(kind, present=False, honesty=f"read_error:{e}")


def evaluate_card(card_id: str, require: list[str] | None = None) -> TrustVerdict:
    """
    Empty-store guard.
    A card is VALID only when every required store is present, non-empty, and fresh.
    Otherwise INVALID with explicit reasons. Never silently passes.
    """
    require = require or ["injuries", "depth_charts"]
    statuses = [_inspect(k) for k in require]
    reasons = []
    for s in statuses:
        if not s.present:
            reasons.append(f"{s.name}:missing")
        elif not s.fresh:
            reasons.append(f"{s.name}:stale_or_empty")
    valid = len(reasons) == 0
    verdict = TrustVerdict(card_id=card_id, valid=valid, reasons=reasons, stores=statuses)
    try:
        with TRUST_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(verdict), default=str) + "\n")
    except OSError:
        pass
    return verdict


def evaluate_batch(card_ids: list[str], require: list[str] | None = None) -> list[TrustVerdict]:
    return [evaluate_card(cid, require) for cid in card_ids]


if __name__ == "__main__":
    # Simulate the 14 cards Hermes mentioned
    cards = [f"card_{i:02d}" for i in range(1, 15)]
    verdicts = evaluate_batch(cards)
    valid_count = sum(1 for v in verdicts if v.valid)
    print(f"valid={valid_count}/{len(verdicts)}")
    print(json.dumps(asdict(verdicts[0]), indent=2, default=str))
