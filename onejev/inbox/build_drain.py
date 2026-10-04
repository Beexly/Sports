"""Build agree-drain.jsonl from an agreement file. Side file only.

Does not open brain/mind.jsonl. Does not start a trainer.
AGREE rows only. JSX junk. Long balanced equations kept.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from audit_drain import audit
from eq_recover_ineq import write_drain


def load_agree(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        status = str(row.get("status") or "").upper()
        if status in {"AGREE", "AGREED", "AGREE_RECOVERED"}:
            rows.append(row)
    return rows


def build(src: Path, dest: Path, receipt: Path) -> dict:
    agree = load_agree(src)
    counts = write_drain(agree, dest)
    checked = audit(dest)
    out = {"agree_in": len(agree), **counts, "audit_pass": checked["pass"], **{f"audit_{k}": v for k, v in checked.items() if k != "pass"}}
    receipt.write_text(json.dumps(out) + "\n", encoding="utf-8")
    return out


if __name__ == "__main__":
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/agree-fixture.jsonl")
    dest = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/agree-drain.jsonl")
    receipt = Path(sys.argv[3] if len(sys.argv) > 3 else "/tmp/wave-receipt.json")
    if not src.exists():
        src.write_text("\n".join([
            json.dumps({"status": "AGREE", "printed_equation": "Q(s)=b_{h,L}(s)P(M<s)", "path": "a.md", "page": 3}),
            json.dumps({"status": "AGREE", "printed_equation": "className=\"bg\" />", "path": "b.tsx"}),
            json.dumps({"status": "AGREE", "printed_equation": "L_ij =", "path": "c.md"}),
            json.dumps({"status": "UNVERIFIED", "printed_equation": "Q(s)=1", "path": "d.md"}),
            json.dumps({"status": "AGREE", "printed_equation": "Q(s)=" + "x+" * 200, "path": "e.md", "page": 9}),
        ]) + "\n", encoding="utf-8")
    print(json.dumps(build(src, dest, receipt)))
