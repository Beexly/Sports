"""Generate a TypeScript registry enumerating every disabled model module.

The problem this solves
-----------------------
196 production modules in packages/prediction-engine/src declare `ENABLED = false`.
184 of them have no production consumer -- they are reachable only through the
index.ts barrel and their own tests. Nothing in the codebase can answer "what
models exist, what do they need, and why are they off?" without grepping.

Editing 190 files to add inline gate blocks would produce a 190-file diff that
guarantees drift and merge pain. A single generated registry is one seam: it
enumerates every module with its status, its input-data tier, and its promotion
condition. The reasoning engine can query it; a ratchet test can enforce that
coverage never regresses.

This writes packages/prediction-engine/src/model-registry.generated.ts. The
hand-written companion model-registry.ts exposes the typed query API.

Re-run after adding, removing, or wiring a module.

Usage:
    python scripts/generate-model-registry.py [--check]

    --check  exit 1 if the generated file is stale (for CI)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "packages" / "prediction-engine" / "src"
OUT = SRC / "model-registry.generated.ts"

PRIMITIVE = {
    "number", "string", "boolean", "void", "never", "any", "unknown", "null",
    "undefined", "object", "bigint", "symbol", "readonly", "Array", "Record",
    "Partial", "Readonly", "ReadonlyArray", "Map", "Set", "Promise",
}

DATA_KEYWORDS = [
    ("TRACKING", [
        "trackpoint", "trajectory", "motionframe", "kinematic", "pose",
        "velocity", "acceleration", "route", "coverage", "separation", "ball",
        "punt", "kick", "return", "frame", "player", "position", "snap",
    ]),
    ("MODEL_ARTIFACT", [
        "embedding", "adapter", "backbone", "llm", "transformer", "token",
        "latent", "weight", "gradient", "policy", "reward", "logit", "attention",
        "vector", "prototype", "prompt", "completion", "inference", "subtask",
        "viewchunk", "experience", "searchinsight", "entitygraph", "pareto",
    ]),
    ("SLATE", [
        "injury", "depth", "chart", "drive", "situational", "pace", "ngs",
        "lineup", "slate", "odds", "market", "prop", "salary", "contest",
        "calibration", "environment", "weather", "wind", "rest", "schedule",
        "oddscell",
    ]),
    ("GAME", [
        "game", "score", "margin", "total", "spread", "result", "team", "win",
        "opponent", "season", "week", "epa", "success", "play", "down",
        "distance", "quarter", "half", "unitobservation",
    ]),
]


def _rel(p: Path) -> str:
    return os.path.relpath(p, SRC).replace(os.sep, "/")


def _param_tokens(txt: str) -> set[str]:
    toks: set[str] = set()
    for params in re.findall(r"^export (?:async )?function \w+\s*\((.*?)\)\s*:", txt, re.M | re.S):
        for m in re.finditer(r":\s*([^,=)]+)", params):
            for t in re.findall(r"[A-Za-z_][A-Za-z0-9_]*", m.group(1)):
                toks.add(t)
    return toks


def _local_types(txt: str) -> set[str]:
    return set(re.findall(r"^(?:export\s+)?(?:interface|type|class)\s+(\w+)", txt, re.M))


def _imports(txt: str) -> list[str]:
    specs = re.findall(r"""from\s+["'](\.[^"']+)["']""", txt)
    specs += re.findall(r"""require\(\s*["'](\.[^"']+)["']\s*\)""", txt)
    return specs


def _classify(txt: str, stems: set[str]) -> tuple[str, str]:
    toks = _param_tokens(txt)
    local = _local_types(txt)
    sigs = re.findall(r"^export (?:async )?function \w+\s*\(", txt, re.M)
    external = [
        os.path.basename(s).rsplit(".", 1)[0]
        for s in _imports(txt)
        if os.path.basename(s).rsplit(".", 1)[0] not in stems
    ]
    if not sigs:
        return "PURE_MATH", "no exported functions (constants/types only)"
    if not toks:
        return "PURE_MATH", "exported functions take no arguments"
    unknown = {t for t in toks if t.lower() not in PRIMITIVE and t not in local}
    if not unknown and not external:
        return "PURE_MATH", "all params primitive/local; no external imports"
    probe = " ".join(t.lower() for t in toks) + " " + " ".join(t.lower() for t in local)
    for tier, kws in DATA_KEYWORDS:
        hit = next((k for k in kws if k in probe), None)
        if hit:
            return f"DATA_{tier}", f"requires {tier.lower()} input (matched '{hit}')"
    if unknown:
        return "SELF_CONTAINED", f"locally-typed params ({', '.join(sorted(unknown)[:3])})"
    return "SELF_CONTAINED", "callable with local structs"


def collect() -> list[dict]:
    all_ts = [p for p in SRC.rglob("*.ts") if ".test." not in p.name and "node_modules" not in p.parts]
    disabled = []
    for p in all_ts:
        if p.name == "index.ts":
            continue
        # The registry files quote "ENABLED = false" in their own comments.
        # Counting them would make the registry enumerate itself.
        if p.name.startswith("model-registry"):
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if "ENABLED = false" in txt:
            disabled.append(p)
    stems = {p.stem for p in disabled}

    rows = []
    for m in sorted(disabled):
        txt = m.read_text(encoding="utf-8", errors="ignore")
        tier, reason = _classify(txt, stems)
        exports = re.findall(r"^export (?:async )?function (\w+)", txt, re.M)
        rows.append({
            "id": _rel(m),
            "name": m.stem,
            "lines": txt.count("\n") + 1,
            "tier": tier,
            "reason": reason,
            "exports": exports,
            "hasTest": m.with_suffix(".test.ts").exists(),
            "hasGate": "ACCEPTANCE_GATE" in txt,
        })
    return rows


def render(rows: list[dict]) -> str:
    counts = Counter(r["tier"] for r in rows)
    digest = hashlib.sha256(
        json.dumps([r["id"] for r in rows], sort_keys=True).encode()
    ).hexdigest()[:16]

    lines = [
        "/**",
        " * GENERATED FILE -- do not edit by hand.",
        " *",
        " * Regenerate with: python scripts/generate-model-registry.py",
        " *",
        f" * Enumerates all {len(rows)} production modules in this package that declare",
        " * `ENABLED = false` (ACCEPTANCE_GATE / BARREL_ONLY). Each entry records what input the module needs and why it",
        " * is off, so the reasoning engine can query availability without grepping.",
        " *",
        f" * module-set digest: {digest}",
        " */",
        "",
        'import type { ModelRegistryEntry } from "./model-registry.js";',
        "",
        f"export const MODEL_REGISTRY_DIGEST = {json.dumps(digest)};",
        "",
        f"export const MODEL_REGISTRY: readonly ModelRegistryEntry[] = [",
    ]
    for r in rows:
        lines.append(
            "  {"
            f'id: {json.dumps(r["id"])}, '
            f'name: {json.dumps(r["name"])}, '
            f"lines: {r['lines']}, "
            f'tier: {json.dumps(r["tier"])}, '
            f'reason: {json.dumps(r["reason"])}, '
            f'exports: {json.dumps(r["exports"])}, '
            f"hasTest: {str(r['hasTest']).lower()}, "
            f"hasGate: {str(r['hasGate']).lower()}"
            "},"
        )
    lines += [
        "];",
        "",
        "export const MODEL_REGISTRY_COUNTS = Object.freeze({",
        f"  total: {len(rows)},",
    ]
    for tier, n in sorted(counts.items()):
        key = tier.lower()
        lines.append(f"  {key}: {n},")
    lines += ["});", ""]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="exit 1 if the generated file is stale")
    args = ap.parse_args()

    rows = collect()
    content = render(rows)

    if args.check:
        if not OUT.exists():
            print(f"MISSING: {OUT.name} does not exist", file=sys.stderr)
            sys.exit(1)
        if OUT.read_text(encoding="utf-8") != content:
            print(f"STALE: {OUT.name} is out of date; re-run the generator", file=sys.stderr)
            sys.exit(1)
        print(f"OK: {OUT.name} is current ({len(rows)} modules)")
        return

    OUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({len(rows)} modules)")
    for tier, n in sorted(Counter(r["tier"] for r in rows).items()):
        print(f"  {tier:20s} {n:4d}")


if __name__ == "__main__":
    main()
