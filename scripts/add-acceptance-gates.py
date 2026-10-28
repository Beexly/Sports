"""Add a documented ACCEPTANCE_GATE to every disabled model module that lacks one.

Why
---
196 production modules in packages/prediction-engine/src declare `ENABLED = false`.
Only five documented an ACCEPTANCE_GATE -- a stated promotion condition. The other
190 are disabled with no reason on record, which means "disabled" carries no
information: a reviewer cannot tell whether a module is off because it is
unvalidated, superseded, or forgotten.

Hand-writing 190 gate blocks guarantees drift. This codemod inserts one gate
declaration per module, inline (no import needed), immediately after the
`ENABLED = false` line. The gate states the honest current condition:

    DISABLED_PENDING_WIRING -- no production consumer and no stated promotion
    condition. Somebody must decide what "validated" means for this module.

That is the truth for these 190 modules. The gate makes the debt visible and
machine-countable instead of implicit.

The codemod is idempotent: a module already carrying ACCEPTANCE_GATE is skipped.

Usage:
    python scripts/add-acceptance-gates.py            # dry run, prints what it would do
    python scripts/add-acceptance-gates.py --apply    # write the changes
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "packages" / "prediction-engine" / "src"

# The gate literal. Inline so no import line has to be rewritten -- importing a
# helper into 190 files would touch each file's import block and risk conflicts.
GATE_TEMPLATE = '''
/**
 * ACCEPTANCE_GATE — why this module is disabled and what would promote it.
 *
 * Recorded so "disabled" is a stated condition rather than an undocumented
 * default. Fill in a real promotion criterion when someone owns this module;
 * the ratchet test only requires that a gate exists and states a status.
 */
export const ACCEPTANCE_GATE = Object.freeze({
  status: "DISABLED_PENDING_WIRING",
  reason:
    "No production consumer and no stated promotion condition. This module is " +
    "disabled by default; wiring it changes predictions and requires an owner " +
    "to define what validated means.",
  gateActionWhenDisabled: "none" as const,
  requiresHumanSignoff: true as const,
});
'''


def _targets() -> list[Path]:
    out = []
    for p in SRC.rglob("*.ts"):
        if ".test." in p.name or "node_modules" in p.parts or p.name == "index.ts":
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if "ENABLED = false" not in txt:
            continue
        if "ACCEPTANCE_GATE" in txt:
            continue
        out.append(p)
    return sorted(out)


def _insert_gate(txt: str) -> str | None:
    """Insert the gate after the ENABLED = false declaration."""
    m = re.search(r"^export const ENABLED\s*=\s*false\s*;?[ \t]*$", txt, re.M)
    if not m:
        # Fall back to any line declaring ENABLED = false.
        m = re.search(r"^.*ENABLED\s*=\s*false.*$", txt, re.M)
    if not m:
        return None
    end = m.end()
    return txt[:end] + "\n" + GATE_TEMPLATE + txt[end:]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes to disk")
    args = ap.parse_args()

    targets = _targets()
    print(f"modules needing a gate: {len(targets)}")

    failed = []
    changed = 0
    for p in targets:
        txt = p.read_text(encoding="utf-8", errors="ignore")
        new = _insert_gate(txt)
        if new is None:
            failed.append(p)
            continue
        if args.apply:
            p.write_text(new, encoding="utf-8")
        changed += 1

    verb = "wrote" if args.apply else "would write"
    print(f"{verb} a gate into {changed} modules")
    if failed:
        print(f"could not locate ENABLED = false in {len(failed)} modules:")
        for p in failed[:20]:
            print(f"  {p.relative_to(REPO)}")
        if len(failed) > 20:
            print(f"  ... and {len(failed) - 20} more")
    if not args.apply:
        print("\ndry run -- re-run with --apply to write")


if __name__ == "__main__":
    main()
