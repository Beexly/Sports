#!/usr/bin/env python3
"""Query the public OSV API for root package.json dependencies.

This is the piece of google/osv.dev that can run here: the HTTP API, not the
Go service. It does not replace scripts/guardrails/dependency-audit.mjs.
Exit 1 if any queried package has a vulnerability. Exit 2 if the API fails.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = "https://api.osv.dev/v1/query"


def versions() -> dict[str, str]:
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    deps = pkg.get("dependencies") or {}
    out = {}
    for name, spec in deps.items():
        # package.json ranges are not lock versions. Strip a leading range
        # marker so the query is a concrete version, and say so in the output.
        ver = spec.lstrip("^~>=< ")
        out[name] = ver
    return out


def query(name: str, version: str) -> dict:
    body = json.dumps({"package": {"name": name, "ecosystem": "npm"}, "version": version}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    rows = []
    failed = False
    for name, version in versions().items():
        try:
            payload = query(name, version)
        except Exception as exc:
            print(f"OSV_FAIL {name} {type(exc).__name__}: {exc}")
            return 2
        vulns = payload.get("vulns") or []
        rows.append({"package": name, "version": version, "count": len(vulns), "ids": [v.get("id") for v in vulns]})
        print(f"{name}@{version} vulns={len(vulns)}")
        if vulns:
            failed = True
    out = ROOT / "docs" / "engine" / "research" / "2026-10-21" / "repo-vet-2026-10-22" / "osv-query-pg-ioredis.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8", newline="\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
