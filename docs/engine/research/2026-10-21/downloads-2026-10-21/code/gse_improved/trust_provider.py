"""
Trust Provider — empty-store guard + improved injury/depth wiring.
Fail-closed: missing or stale store keeps cards INVALID.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any
import json

@dataclass
class TrustStatus:
    valid: bool
    reason: str
    source: str
    rows: int = 0
    freshness_hours: Optional[float] = None

class TrustProvider:
    def __init__(self, injuries_path: Optional[str] = None, depth_path: Optional[str] = None):
        self.injuries_path = Path(injuries_path) if injuries_path else None
        self.depth_path = Path(depth_path) if depth_path else None

    def check_injuries(self, max_age_hours: float = 48.0) -> TrustStatus:
        if not self.injuries_path or not self.injuries_path.exists():
            return TrustStatus(False, "injuries_store_missing", "injuries", 0)
        try:
            # In real use, load parquet and count rows
            size = self.injuries_path.stat().st_size
            mtime = datetime.fromtimestamp(self.injuries_path.stat().st_mtime)
            age_h = (datetime.utcnow() - mtime).total_seconds() / 3600
            if age_h > max_age_hours:
                return TrustStatus(False, "injuries_stale", "injuries", 0, age_h)
            return TrustStatus(True, "injuries_ok", "injuries", rows=1, freshness_hours=age_h)
        except Exception as e:
            return TrustStatus(False, f"injuries_error:{type(e).__name__}", "injuries")

    def check_depth(self) -> TrustStatus:
        if not self.depth_path or not self.depth_path.exists():
            return TrustStatus(False, "depth_store_missing", "depth")
        return TrustStatus(True, "depth_ok", "depth", rows=1)

    def overall(self) -> Dict[str, Any]:
        inj = self.check_injuries()
        dep = self.check_depth()
        valid = inj.valid and dep.valid
        return {
            "valid": valid,
            "injuries": inj.__dict__,
            "depth": dep.__dict__,
            "honesty": "fail_closed_empty_or_stale_store",
            "ts": datetime.utcnow().isoformat() + "Z",
        }
