"""Signal registry validator. The registry is an inventory with honest states,
not a wish list, so this gate enforces SHAPE, not verdict content.

Failures (the gate):
  - top-level keys are exactly {provenance, signals}
  - exactly EXPECTED_TOTAL signals (a silent row drop or dup is drift)
  - every signal carries an id and the six verdict-bearing dimensions
    (wired, weighted, tested, traced, gate, license), each a dict whose
    "verdict" is a non-empty string. A negative verdict is VALID; a missing
    or empty one is not.
  - provenance is a dict of non-empty string fields

Nothing here regenerates the registry or rewrites a verdict: nothing derives
them yet, so any future writer must ship its own provenance and this gate
still only checks that the inventory stays complete and readable.
"""
from __future__ import annotations

import json
import os
from collections import Counter
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXPECTED_TOTAL = 47
TOP_LEVEL_KEYS = {"provenance", "signals"}
DIMENSIONS = ("wired", "weighted", "tested", "traced", "gate", "license")


def load(path: str) -> dict[str, Any]:
    return json.load(open(path, encoding="utf-8"))


def check(doc: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(doc, dict):
        return ["registry: top level must be an object"]
    keys = set(doc.keys())
    if keys != TOP_LEVEL_KEYS:
        errors.append(f"registry: top-level keys must be {sorted(TOP_LEVEL_KEYS)}, got {sorted(keys)}")
        return errors

    prov = doc["provenance"]
    prov_ok = (
        (isinstance(prov, str) and bool(prov.strip()))
        or (isinstance(prov, dict) and bool(prov))
    )
    if not prov_ok:
        errors.append("provenance: must be a non-empty string or a non-empty object")
    elif isinstance(prov, dict):
        for k, v in prov.items():
            if not isinstance(v, str) or not v.strip():
                errors.append(f"provenance.{k}: must be a non-empty string")

    signals = doc["signals"]
    if not isinstance(signals, list):
        errors.append("signals: must be a list")
        return errors
    if len(signals) != EXPECTED_TOTAL:
        errors.append(f"signals: expected {EXPECTED_TOTAL}, got {len(signals)}")

    seen: set[str] = set()
    for s in signals:
        sid = s.get("id", "?") if isinstance(s, dict) else "?"
        if not isinstance(s, dict):
            errors.append(f"{sid}: signal must be an object")
            continue
        if not isinstance(sid, str) or not sid.strip() or sid == "?":
            errors.append(f"{sid}: missing id")
            continue
        if sid in seen:
            errors.append(f"{sid}: duplicate id")
        seen.add(sid)
        for dim in DIMENSIONS:
            entry = s.get(dim)
            if not isinstance(entry, dict):
                errors.append(f"{sid}.{dim}: missing or not an object")
                continue
            verdict = entry.get("verdict")
            if not isinstance(verdict, str) or not verdict.strip():
                errors.append(f"{sid}.{dim}.verdict: missing or empty")
    return errors


def summarize(doc: dict[str, Any]) -> str:
    lines: list[str] = [f"signals: {len(doc.get('signals', []))}"]
    for dim in DIMENSIONS:
        counts = Counter(
            (s.get(dim, {}) or {}).get("verdict", "<missing>")
            for s in doc.get("signals", [])
            if isinstance(s, dict)
        )
        rendered = ", ".join(
            f"{(k[:48] + '…') if len(k) > 49 else k}={v}"
            for k, v in sorted(counts.items())
        )
        lines.append(f"  {dim}: {rendered}")
    prov = doc.get("provenance", {})
    if isinstance(prov, dict):
        head = prov.get("note", "") or ""
        lines.append(f"  provenance: {str(head)[:120]}")
    return "\n".join(lines)


def main() -> None:
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "intelligence", "signals", "registry.json",
    )
    doc = load(path)
    errors = check(doc)
    if errors:
        raise SystemExit("REGISTRY CHECK FAIL\n" + "\n".join(errors))
    print("REGISTRY CHECK OK\n" + summarize(doc))


if __name__ == "__main__":
    main()
