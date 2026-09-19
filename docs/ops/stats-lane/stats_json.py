"""Shared JSON helpers for STATISTICS lane runners.

Weak spot fixed: Python json.dumps(float('inf')) emits bare Infinity, which is
NOT valid JSON and breaks any consumer (jq, node JSON.parse, fleet audits).
Infinite q̂ stays honest as null + an explicit boolean flag.
"""

from __future__ import annotations

import json
import math
from typing import Any


def sanitize(obj: Any) -> Any:
    """Recursively replace non-finite floats with None (paired flags stay true)."""
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize(v) for v in obj]
    return obj


def dumps_report(obj: Any) -> str:
    return json.dumps(sanitize(obj), indent=2, allow_nan=False)


def write_report(path, obj: Any) -> str:
    text = dumps_report(obj)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return text
