"""Build a reviewable keep/archive manifest for the disabled arXiv model modules.

Reads every production .ts module in packages/prediction-engine/src that carries
``ENABLED = false`` and records who actually imports it. A module with no
production consumer other than the ``index.ts`` barrel is dead weight: wiring it
would mean inventing a call site. Those are marked ARCHIVE.

The manifest is written to artifacts/ and moves no files. Run it again after any
wiring change to refresh the verdicts.

Usage:
    python scripts/build-model-wiring-manifest.py [--json PATH] [--md PATH]
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "packages" / "prediction-engine" / "src"


def _rel(p: Path) -> str:
    return os.path.relpath(p, SRC).replace(os.sep, "/")


def _disabled_modules() -> list[Path]:
    out = []
    for p in SRC.rglob("*.ts"):
        if ".test." in p.name or "node_modules" in p.parts:
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if "ENABLED = false" in txt:
            out.append(p)
    return sorted(out)


def _importers(stem: str, all_ts: list[Path], exclude: Path) -> list[str]:
    """Production files that import this module by path.

    Matches ``./stem.js"``, ``../stem.js"`` etc. The barrel ``index.ts`` is
    excluded: a re-export is package surface, not a consumer. A module reachable
    only through the barrel and its own tests has no live call site.
    """
    pat = re.compile(
        r"""(?:/|\.\.?/|"|')""" + re.escape(stem) + r"""\.(?:js|ts)"|""" + re.escape(stem) + r"""\.js["']"""
    )
    hits = []
    for f in all_ts:
        if f == exclude:
            continue
        rel = _rel(f)
        if rel == "index.ts":
            continue
        try:
            txt = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if pat.search(txt):
            hits.append(rel)
    return hits


def build() -> dict:
    all_ts = [p for p in SRC.rglob("*.ts") if ".test." not in p.name and "node_modules" not in p.parts]
    rows = []
    for m in _disabled_modules():
        stem = m.stem
        txt = m.read_text(encoding="utf-8", errors="ignore")
        consumers = _importers(stem, all_ts, m)
        rows.append(
            {
                "module": _rel(m),
                "basename": stem,
                "lines": txt.count("\n") + 1,
                "has_gate": "ACCEPTANCE_GATE" in txt,
                "has_test": (m.with_suffix(".test.ts")).exists(),
                "real_consumers": len(consumers),
                "consumers": consumers[:5],
                "verdict": "KEEP" if consumers else "ARCHIVE",
            }
        )
    keep = [r for r in rows if r["verdict"] == "KEEP"]
    arch = [r for r in rows if r["verdict"] == "ARCHIVE"]
    return {
        "generated": "2026-10-27",
        "branch": "engine/public-baseline-2026-10-24",
        "source": "packages/prediction-engine/src",
        "rule": "KEEP = has at least one production importer other than index.ts. ARCHIVE = reachable only via the barrel and/or its own tests.",
        "totals": {
            "modules": len(rows),
            "keep": len(keep),
            "archive": len(arch),
            "keep_with_gate": sum(1 for r in keep if r["has_gate"]),
            "keep_without_gate": sum(1 for r in keep if not r["has_gate"]),
            "archive_with_gate": sum(1 for r in arch if r["has_gate"]),
            "with_test": sum(1 for r in rows if r["has_test"]),
        },
        "modules": rows,
    }


def to_markdown(data: dict) -> str:
    t = data["totals"]
    lines = [
        "# Model Wiring Manifest — 2026-10-27",
        "",
        f"Branch: `{data['branch']}`  ",
        f"Source: `{data['source']}`",
        "",
        "**Rule:** " + data["rule"],
        "",
        "## Totals",
        "",
        "| Measure | Count |",
        "|---|---|",
        f"| Disabled modules (`ENABLED = false`) | {t['modules']} |",
        f"| KEEP — has a production consumer | {t['keep']} |",
        f"| ARCHIVE — reachable only via tests/barrel | {t['archive']} |",
        f"| KEEP with `ACCEPTANCE_GATE` | {t['keep_with_gate']} |",
        f"| KEEP without a gate | {t['keep_without_gate']} |",
        f"| ARCHIVE that already has a gate | {t['archive_with_gate']} |",
        f"| Modules with a sibling test | {t['with_test']} |",
        "",
        "## KEEP — wire these",
        "",
        "| Module | Lines | Gate | Consumers |",
        "|---|---|---|---|",
    ]
    for r in sorted([m for m in data["modules"] if m["verdict"] == "KEEP"], key=lambda x: -x["real_consumers"]):
        lines.append(
            f"| `{r['basename']}` | {r['lines']} | {'yes' if r['has_gate'] else '**no**'} | {r['real_consumers']} |"
        )
    lines += ["", "## ARCHIVE — no production consumer", "", "| Module | Lines | Gate | Dir |", "|---|---|---|---|"]
    for r in sorted([m for m in data["modules"] if m["verdict"] == "ARCHIVE"], key=lambda x: x["module"]):
        d = r["module"].rsplit("/", 1)[0] if "/" in r["module"] else "ROOT"
        lines.append(f"| `{r['basename']}` | {r['lines']} | {'yes' if r['has_gate'] else 'no'} | {d} |")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default=str(REPO / "artifacts" / "model-wiring-manifest-2026-10-27.json"))
    ap.add_argument("--md", default=str(REPO / "artifacts" / "model-wiring-manifest-2026-10-27.md"))
    args = ap.parse_args()

    data = build()
    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(json.dumps(data, indent=2), encoding="utf-8")
    Path(args.md).write_text(to_markdown(data), encoding="utf-8")
    t = data["totals"]
    print(f"modules={t['modules']} keep={t['keep']} archive={t['archive']} keep_without_gate={t['keep_without_gate']}")
    print(f"wrote {args.json}")
    print(f"wrote {args.md}")


if __name__ == "__main__":
    main()
