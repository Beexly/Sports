"""A fit that trains on the years it scores is contaminated. Discard it. Do not average it."""
from __future__ import annotations

import json
import sys


def check(manifest: dict) -> list[str]:
    train = set(manifest.get("train_years") or [])
    ev = set(manifest.get("eval_years") or [])
    overlap = sorted(train & ev)
    if overlap:
        return [f"contaminated: train and eval share {overlap}. Discard. Do not average."]
    if manifest.get("contaminated") is True:
        return ["contaminated flag set. Discard. Do not average."]
    return []


def main() -> None:
    path = sys.argv[1]
    errors = check(json.load(open(path, encoding="utf-8")))
    if errors:
        raise SystemExit("\n".join(errors))
    print("held-out OK")


if __name__ == "__main__":
    main()
