"""
Cross-language golden-digest fixture — Python side.

The Tuesday v1.0 seal's coachMindsetHash is computed in TypeScript. The Python
verifier (gse-pre-seal/verify_engine.py) must reproduce byte-identical digests
or the seal is unverifiable across runtimes. This module implements the SAME
canonicalization the TypeScript `canonicalize()` in public-baseline/cadence.ts
performs, then hashes with SHA-256.

The trap: Python's json.dumps and JavaScript's JSON.stringify disagree on
floats. JSON.stringify(1.0) -> "1"; json.dumps(1.0) -> "1.0". A seal covering
EPA dropoff factors and team ratings (all floats) would hash differently in
each language if the Python side used stock json.dumps. That is the residual
risk this fixture exists to catch.

Usage:
    python canonical_payload.py            # prints the digest for the fixture
    python canonical_payload.py --verify   # exits 1 if it differs from the TS digest
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from typing import Any

# The fixture payload. Mirrors the four components the invariant names:
# team ratings, cost matrix C, inverse-MDP tau, and the Sealed EPA Dropoff Table.
# Values are intentionally float-heavy so the JS/Python divergence surfaces.
FIXTURE_PAYLOAD: dict[str, Any] = {
    "week": "2026-W44",
    "payload": {
        "teamRatings": {"ATL": 0.0, "SF": 2.5, "KC": 1.0, "SEA": -0.5},
        "costMatrixC": [[0.0, 1.0], [1.0, 0.0]],
        "tau": 0.0321,
        "epaDropoffTable": {
            "QB1": 0.78,
            "QB_QUESTIONABLE": 0.8106,
            "RB1": 0.85,
            "WR1": 0.82,
            "TE1": 0.84,
        },
        "nested": {"list": [1, 2.0, 3.5], "empty": {}, "none": None},
    },
}


def _js_number(n: int | float) -> str:
    """Match JavaScript JSON.stringify number formatting exactly."""
    if isinstance(n, bool):
        return "true" if n else "false"
    if isinstance(n, int):
        return str(n)
    if isinstance(n, float):
        if math.isnan(n) or math.isinf(n):
            return "null"
        if n.is_integer():
            # JSON.stringify(1.0) === "1"
            return str(int(n))
        # Shortest round-trip repr. Python's repr is close to JS's for
        # ordinary values; exponent formatting differs (1e+21 vs 1e21)
        # but the fixture avoids that range deliberately.
        return repr(n)
    return "null"


def _js_string(s: str) -> str:
    """Match JSON.stringify string escaping: no ASCII-escaping of unicode."""
    return json.dumps(s, ensure_ascii=False)


def canonicalize(value: Any) -> str:
    """Byte-identical mirror of cadence.ts canonicalize()."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return _js_number(value)
    if isinstance(value, str):
        return _js_string(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonicalize(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys())
        return "{" + ",".join(
            _js_string(k) + ":" + canonicalize(value[k]) for k in keys
        ) + "}"
    return "null"


def canonical_hash(obj: Any) -> str:
    return hashlib.sha256(canonicalize(obj).encode("utf-8")).hexdigest()


# The digest the TypeScript fixture must also produce. Regenerate with:
#   python canonical_payload.py
TS_EXPECTED = "PLACEHOLDER"


def main() -> int:
    digest = canonical_hash(FIXTURE_PAYLOAD)
    if "--verify" in sys.argv:
        if digest != TS_EXPECTED:
            print(f"MISMATCH: python={digest} expected={TS_EXPECTED}", file=sys.stderr)
            return 1
        print(f"OK: {digest}")
        return 0
    print(digest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
