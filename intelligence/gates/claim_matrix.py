"""Claim matrix. A claim is not wired unless the code, the test, and the data file exist.

Status values:
  wired     — code path, test, and real data file all exist
  partial   — some of those exist; the claim says which
  measured  — a number was produced from real data and is not a published weight
  gap       — named absence, no file invented to close it
  refused   — looked at and declined

A status of wired with a missing path fails. That is the gate.
"""
from __future__ import annotations

import json
import os
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REQUIRED = ("id", "statement", "status", "code", "test", "data")
ALLOWED = {"wired", "partial", "measured", "gap", "refused"}


def load(path: str) -> list[dict[str, Any]]:
    return json.load(open(path, encoding="utf-8"))


def check(claims: list[dict[str, Any]], root: str = ROOT) -> list[str]:
    errors = []
    for c in claims:
        missing = [k for k in REQUIRED if k not in c]
        if missing:
            errors.append(f"{c.get('id', '?')}: missing fields {missing}")
            continue
        if c["status"] not in ALLOWED:
            errors.append(f"{c['id']}: bad status {c['status']}")
        if c["status"] != "wired":
            continue
        for key in ("code", "test", "data"):
            rel = c[key]
            if not rel or not os.path.exists(os.path.join(root, rel)):
                errors.append(f"{c['id']}: wired but {key} missing ({rel})")
    return errors


def main() -> None:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claims.json")
    errors = check(load(path))
    if errors:
        raise SystemExit("CLAIM MATRIX FAIL\n" + "\n".join(errors))
    print(f"CLAIM MATRIX OK {len(load(path))} claims")


if __name__ == "__main__":
    main()
