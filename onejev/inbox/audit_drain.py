"""Audit agree-drain.jsonl. Does not open brain/mind.jsonl.

Flags the defects Hermes already measured:
- JSX or CSS that contains an equals sign
- a span longer than the source, or not a verbatim substring
- a leading ellipsis or an empty right-hand side
- a duplicate path plus equation
- a missing path
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from eq_recover import JSX
from eq_recover_ineq import recover


def audit(path: Path) -> dict:
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    jsx = trunc = nonverbatim = nopath = 0
    seen = set()
    dups = 0
    for row in rows:
        equation = str(row.get("equation") or "")
        source = str(row.get("printed_equation") or equation)
        if JSX.search(equation):
            jsx += 1
        got = recover(equation)
        if got["status"] != "EQUATION":
            trunc += 1
        if equation and equation not in source and not row.get("verbatim"):
            nonverbatim += 1
        if not row.get("path"):
            nopath += 1
        key = (row.get("path"), equation)
        if key in seen:
            dups += 1
        seen.add(key)
    return {
        "rows": len(rows),
        "jsx": jsx,
        "not_equation": trunc,
        "nonverbatim": nonverbatim,
        "missing_path": nopath,
        "dups": dups,
        "pass": jsx == trunc == nonverbatim == nopath == dups == 0,
    }


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/drain-fixture.jsonl")
    if not target.exists():
        target.write_text(
            "\n".join([
                json.dumps({"equation": "Q(s)=b_{h,L}(s)", "path": "a.md", "verbatim": True, "printed_equation": "Q(s)=b_{h,L}(s)"}),
                json.dumps({"equation": "className=\"bg\" />", "path": "b.tsx", "verbatim": True, "printed_equation": "className=\"bg\" />"}),
                json.dumps({"equation": "L_ij =", "path": "c.md", "verbatim": True, "printed_equation": "L_ij ="}),
            ]) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(audit(target)))
