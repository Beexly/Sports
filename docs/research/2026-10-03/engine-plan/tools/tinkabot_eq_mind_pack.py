#!/usr/bin/env python3
"""Pack tinkabot_eq_column.py into a mind shard. No score. No mint. No Hermes touch.

Stated identity: tinkabot. Inputs must already exist on features_v1 / learn_joined / learn_wide.
Run tests before push.
"""
from __future__ import annotations

import ast
import json
import os
from pathlib import Path

IDENTITY = "tinkabot"
SOURCE = "docs/research/2026-10-03/engine-plan/eng/tinkabot_eq_column.py"
SHARD_NAME = "mind_knowledge_u_13_tinkabot_eq.jsonl"
ROW_TYPE = "equation"


def _load_module_ast(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def _const_tuple(node: ast.AST) -> tuple[str, ...]:
    if not isinstance(node, (ast.Tuple, ast.List)):
        raise TypeError("expected tuple/list")
    out: list[str] = []
    for elt in node.elts:
        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
            out.append(elt.value)
        else:
            raise TypeError("non-string in required columns")
    return tuple(out)


def extract(path: Path) -> tuple[dict[str, tuple[str, ...]], list[dict]]:
    tree = _load_module_ast(path)
    required: dict[str, tuple[str, ...]] = {}
    for node in tree.body:
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            name = node.target.id
            if name.startswith("REQUIRED_") and node.value is not None:
                required[name] = _const_tuple(node.value)

    known = set()
    for cols in required.values():
        known.update(cols)

    rows: list[dict] = []
    src_text = path.read_text(encoding="utf-8")
    bytes_read = len(src_text.encode("utf-8"))

    for node in tree.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        if node.name.startswith("_"):
            continue
        doc = ast.get_docstring(node) or ""
        args = [a.arg for a in node.args.args]
        # Map args that look like column names onto known columns when exact match
        input_cols = [a for a in args if a in known]
        # Prefer docstring as equation statement when it has '='
        eq_lines = []
        for ln in doc.splitlines():
            s = ln.strip()
            if "=" in s and len(s) >= 8:
                eq_lines.append(s)
        if not eq_lines:
            sig = f"{node.name}({', '.join(args)})"
            eq_lines = [f"{sig}  # {doc.splitlines()[0] if doc else 'column-backed helper'}"]

        rows.append(
            {
                "source_path": SOURCE,
                "host": "vm",
                "bytes_read": bytes_read,
                "coverage": "full",
                "row_type": ROW_TYPE,
                "title": f"{IDENTITY}_eq: {node.name}",
                "body": (
                    f"identity={IDENTITY}\n"
                    f"function={node.name}\n"
                    f"args={args}\n"
                    f"inputs_known={input_cols}\n"
                    f"doc={doc}\n"
                    "rule: inputs must already exist; NULL stays NULL; not a scorer; not a mint.\n"
                ),
                "equations": eq_lines[:8],
                "identity": IDENTITY,
                "function": node.name,
                "args": args,
                "inputs_known": input_cols,
                "inputs_exist": True,
            }
        )
    return required, rows


def write_shard(rows: list[dict], out_path: Path) -> int:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return out_path.stat().st_size


def patch_manifest(manifest_path: Path, shard_rel: str, rows: int, nbytes: int, commit: str | None = None) -> None:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    detail = data.setdefault("shards_detail", [])
    # replace existing u_13 entry if present
    detail = [d for d in detail if not (
        (isinstance(d.get("file"), str) and "u_13_tinkabot_eq" in d["file"])
        or (isinstance(d.get("files"), str) and "u_13_tinkabot_eq" in d["files"])
    )]
    entry = {
        "file": shard_rel,
        "rows": rows,
        "bytes": nbytes,
        "source": "tinkabot column-backed eq helpers packed for mind; inputs already on features_v1/learn_joined/learn_wide; no score; no mint",
        "extraction_script": "docs/research/2026-10-03/engine-plan/tools/tinkabot_eq_mind_pack.py",
        "identity": IDENTITY,
    }
    if commit:
        entry["commit"] = commit
    detail.append(entry)
    data["shards_detail"] = detail
    data["shards"] = len(detail)
    # recount rows from detail when possible
    total = 0
    for d in detail:
        if isinstance(d.get("rows"), int):
            total += d["rows"]
    if total:
        data["rows"] = total
    manifest_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    root = Path(os.environ.get("EQ_PACK_ROOT", "."))
    module = root / "tinkabot_eq_column.py"
    if not module.exists():
        # repo-relative fallback for Beexly checkout
        module = Path("docs/research/2026-10-03/engine-plan/eng/tinkabot_eq_column.py")
    required, rows = extract(module)
    if not rows:
        raise SystemExit("no equation rows extracted")
    if not required:
        raise SystemExit("REQUIRED_* column tuples missing")
    out = root / SHARD_NAME
    nbytes = write_shard(rows, out)
    print(json.dumps({"identity": IDENTITY, "rows": len(rows), "bytes": nbytes, "out": str(out), "required_keys": sorted(required)}, indent=2))


if __name__ == "__main__":
    main()
