"""Generate a TypeScript dispatch surface for every wireable disabled module.

The problem this solves
-----------------------
`generate-model-registry.py` answers "what exists and why is it off?" but the
registry is a catalog, not an executor. 152 PURE_MATH and 26 SELF_CONTAINED
modules need no external dataset — they need a caller. Until a caller exists,
they are dead code regardless of their ENABLED flag.

This script generates `wireable-dispatch.generated.ts`: a static import map from
`moduleName -> { exportName: fn }` covering every wireable module that exports at
least one function. A single hand-written wrapper (`wireable-dispatch.ts`) turns
that map into `invokeModel(module, export, args)`.

That gives every wireable module a real caller reachable from the live web app
through one API route, without 178 bespoke integration files. It does NOT change
predictions: nothing calls invokeModel unless a request asks for it. It makes the
modules *reachable*, which is the precondition for wiring them into workflows.

DATA_* modules are deliberately excluded — calling them would require inventing
data the repository forbids inventing. They stay in the registry as blocked.

Usage:
    python scripts/generate-wireable-dispatch.py [--check]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "packages" / "prediction-engine" / "src"
OUT = SRC / "wireable-dispatch.generated.ts"

# Tiers that need no external dataset. Mirrors WIREABLE_TIERS in model-registry.ts.
WIREABLE_TIERS = {"PURE_MATH", "SELF_CONTAINED"}

# Reuse the registry's classifier so tier decisions stay in one place.
sys.path.insert(0, str(REPO / "scripts"))
from importlib import import_module

_registry_mod = import_module("generate-model-registry")  # noqa: E402
collect = _registry_mod.collect


def _rel_import(module_id: str) -> str:
    """Turn a registry id (path relative to src) into a relative import specifier."""
    stem = module_id[:-3] if module_id.endswith(".ts") else module_id
    return "./" + stem + ".js"


def _var_name(module_id: str) -> str:
    """A valid, collision-resistant TS identifier for a module."""
    stem = os.path.splitext(os.path.basename(module_id))[0]
    safe = re.sub(r"[^A-Za-z0-9_]", "_", stem)
    if safe[0].isdigit():
        safe = "m_" + safe
    # Fold the directory in when two stems collide.
    d = os.path.dirname(module_id)
    if d:
        safe = re.sub(r"[^A-Za-z0-9_]", "_", d) + "__" + safe
    return safe


def build() -> tuple[str, int, int]:
    rows = collect()
    # Exclude modules that carry an ACCEPTANCE_GATE. The named-refusal guard test
    # forbids production importers of gated modules, because a static import is a
    # bypass risk even when the module still refuses at runtime. Those modules
    # require a human call before activation; putting them in a "callable" surface
    # would defeat the gate. They remain visible in model-registry.ts as gated.
    wireable = [
        r for r in rows
        if r["tier"] in WIREABLE_TIERS and r["exports"] and not r.get("hasGate")
    ]
    gated = [
        r for r in rows
        if r["tier"] in WIREABLE_TIERS and r["exports"] and r.get("hasGate")
    ]
    skipped = [r for r in rows if r["tier"] in WIREABLE_TIERS and not r["exports"]]

    imports = []
    table_entries = []
    seen: dict[str, str] = {}

    for r in sorted(wireable, key=lambda x: x["id"]):
        var = _var_name(r["id"])
        if var in seen:
            raise SystemExit(
                f"identifier collision: {var} for {r['id']} and {seen[var]}"
            )
        seen[var] = r["id"]
        imports.append(f'import * as {var} from "{_rel_import(r["id"])}";')
        names = ", ".join(json.dumps(e) for e in r["exports"])
        # Each function is cast through `unknown`: ModelFn is the untyped runtime
        # call signature, while the module's real signature is precise. The cast
        # is honest — this table exists precisely because there is no shared
        # interface across 178 modules.
        table_entries.append(
            f"  {json.dumps(r['name'])}: {{ "
            + ", ".join(
                f"{json.dumps(e)}: {var}.{e} as unknown as ModelFn"
                for e in r["exports"]
            )
            + " },"
        )

    lines = [
        "/**",
        " * GENERATED FILE -- do not edit by hand.",
        " *",
        " * Regenerate with: python scripts/generate-wireable-dispatch.py",
        " *",
        f" * Static dispatch map for {len(wireable)} wireable modules",
        " * (PURE_MATH + SELF_CONTAINED) that export at least one function.",
        " *",
        " * DATA_* modules are excluded: calling them would require data the",
        " * repository does not contain. They remain listed in model-registry.ts",
        " * as blocked.",
        " */",
        "",
        "export type ModelFn = (...args: unknown[]) => unknown;",
        "",
        "export const WIREABLE_DISPATCH: Readonly<",
        "  Record<string, Readonly<Record<string, ModelFn>>>",
        "> = {",
        *table_entries,
        "};",
        "",
        f"export const WIREABLE_MODULE_COUNT = {len(wireable)};",
        "",
    ]
    # The imports must precede the type/const declarations.
    content = "\n".join(imports) + "\n\n" + "\n".join(lines)
    return content, len(wireable), len(skipped)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="exit 1 if the generated file is stale")
    args = ap.parse_args()

    content, n_wireable, n_skipped = build()

    if args.check:
        if not OUT.exists():
            print(f"MISSING: {OUT.name} does not exist", file=sys.stderr)
            sys.exit(1)
        if OUT.read_text(encoding="utf-8") != content:
            print(f"STALE: {OUT.name} is out of date; re-run the generator", file=sys.stderr)
            sys.exit(1)
        print(f"OK: {OUT.name} is current ({n_wireable} wireable modules)")
        return

    OUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  wireable modules with callable exports: {n_wireable}")
    print(f"  wireable modules with no exported fn:   {n_skipped}")


if __name__ == "__main__":
    main()
