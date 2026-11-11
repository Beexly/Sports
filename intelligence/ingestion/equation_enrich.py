"""Enrichment pass for equation retrieval (Layer 1 of the MathIR stack).

Streams the Equations Master once and computes, per row, everything the
retrieval index needs:

* the row's honest-executor classification — taken from `masters_loader`
  (its parsed index), never reimplemented here;
* operator-tree structure tokens (Tangent-S / Approach0 style): for every
  symbol leaf, the leaf-to-root operator path, plus symbol-pair tuples
  grouped by their lowest common ancestor operator. Produced from the
  SymPy tree of the loader's `normalized_expr` where the row parsed;
  rows that did not parse fall back to text-derived symbol tokens
  (prefixed ``tsym_`` so they can never masquerade as parsed symbols);
* the loader's probability-normalization detection
  (`normalization_form_symbols`): numerator / denominator symbols;
* a context string (title/book + section + lane + domain tags +
  description) for the FTS meaning channel;
* provenance, copied in the loader's own shape.

Output is a local JSONL build artifact (not committed; a small sample
is). Every master row is enriched — parsed or not — so unparsed rows
stay findable by structure text and context while parsing coverage
grows.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

import sympy
from sympy.parsing.sympy_parser import (
    auto_symbol,
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from intelligence.ingestion.masters_loader import (
    MastersIndex,
    build_or_load_index,
    normalization_form_symbols,
    _provenance,
    _raw_equation,
    _row_id,
)

_PARSE_TRANSFORMS = standard_transformations + (
    convert_xor,
    implicit_multiplication_application,
    auto_symbol,
)

_IDENT_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]*")
_LATEX_CMD_RE = re.compile(r"\\[A-Za-z]+")
_MAX_PATH_LEN = 8
_MAX_PAIR_TOKENS = 60
_MAX_TEXT_SYMBOLS = 12


def _op_name(node: Any) -> str:
    return type(node).__name__.lower()


def tree_tokens(expr: Any, symbols: Sequence[str]) -> Tuple[List[str], List[str]]:
    """(path_tokens, pair_tokens) from a SymPy operator tree.

    Path token per symbol leaf: ``pth_<sym>_<op>_<op>...`` with operators
    ordered leaf-to-root (the Approach0 leaf-root path idea, encoded
    FTS-safe). Pair token per internal node and pair of symbols in its
    subtree: ``par_<lca-op>_<s1>_<s2>`` (the Tangent-S symbol-tuple
    idea). Deterministic order, capped.
    """
    sym_set = set(symbols)
    paths: Dict[str, str] = {}
    pairs: Set[str] = set()

    def walk(node: Any, trail: List[str]) -> Set[str]:
        if isinstance(node, sympy.Symbol):
            name = node.name
            if name in sym_set and name not in paths:
                ops = [o for o in trail[:_MAX_PATH_LEN]]
                paths[name] = "pth_" + name + ("_" + "_".join(ops) if ops else "_self")
            return {name} if name in sym_set else set()
        if not getattr(node, "args", None):
            return set()
        trail2 = [_op_name(node)] + trail
        sub: Set[str] = set()
        for child in node.args:
            sub |= walk(child, trail2)
        sub_sorted = sorted(sub)
        if len(sub_sorted) >= 2:
            op = _op_name(node)
            for i in range(len(sub_sorted)):
                for j in range(i + 1, len(sub_sorted)):
                    pairs.add(f"par_{op}_{sub_sorted[i]}_{sub_sorted[j]}")
        return sub

    walk(expr, [])
    path_tokens = [paths[s] for s in sorted(paths)]
    pair_tokens = sorted(pairs)[:_MAX_PAIR_TOKENS]
    return path_tokens, pair_tokens


def text_symbol_tokens(equation: str) -> List[str]:
    """Fallback symbol tokens from raw (possibly LaTeX) equation text."""
    cleaned = _LATEX_CMD_RE.sub(" ", equation or "")
    # _{u} is a subscript join (part of the symbol); bare braces are
    # group boundaries, i.e. token separators — never delete them
    # outright or adjacent groups fuse into one bogus identifier.
    cleaned = cleaned.replace("_{", "_").replace("{", " ").replace("}", " ")
    idents: List[str] = []
    seen: Set[str] = set()
    for m in _IDENT_RE.finditer(cleaned):
        tok = m.group(0)
        if tok not in seen:
            seen.add(tok)
            idents.append(tok)
        if len(idents) >= _MAX_TEXT_SYMBOLS:
            break
    return [f"tsym_{t}" for t in idents]


# SymPy's implicit-multiplication parser has pathological blowups on
# some normalized strings (measured 2026-11-10: a row band near master
# row ~160k made parse_expr consume unbounded memory — a diagnostic
# process was OOM-killed at 36 CPU-seconds on one row). Tree tokens are
# a retrieval signal, not worth unbounded per-row cost, so enrichment
# builds them ONLY with the linear-time parser below
# (`fast_tree_tokens`). `parse_normalized`/`tree_tokens` remain as
# capped helpers for tests and small ad-hoc expressions, and are
# deliberately not used on the corpus path. SymPy itself remains the
# evaluation engine — via the honest executor, behind masters_loader.
_MAX_TREE_EXPR_CHARS = 300
_MAX_TREE_EXPR_TOKENS = 80

# --- Linear-time expression tree (for structure tokens) ----------------
# Grammar: the executor's normalized Python-style arithmetic —
# numbers, identifiers, + - * / ** ^, unary -, parentheses, function
# calls with comma-separated args. Anything else -> None (fallback).
_TOKEN_RE = re.compile(
    r"\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)"
    r"|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|<=|>=|==|!=|[-+*/(),^=<>]))"
)
_COMPARISONS = ("=", "==", "<=", ">=", "!=", "<", ">")
_MAX_FAST_NODES = 2000
_MAX_FAST_DEPTH = 64


def _tokenize(text: str) -> Optional[List[Tuple[str, str]]]:
    tokens: List[Tuple[str, str]] = []
    pos = 0
    while pos < len(text):
        if text[pos].isspace():
            pos += 1
            continue
        m = _TOKEN_RE.match(text, pos)
        if m is None or m.end() == pos:
            return None
        pos = m.end()
        if m.group(1) is not None:
            tokens.append(("num", m.group(1)))
        elif m.group(2) is not None:
            tokens.append(("ident", m.group(2)))
        else:
            tokens.append(("op", m.group(3)))
    return tokens


class _FastParser:
    def __init__(self, tokens: List[Tuple[str, str]]):
        self.toks = tokens
        self.i = 0
        self.nodes = 0

    def peek(self) -> Optional[Tuple[str, str]]:
        return self.toks[self.i] if self.i < len(self.toks) else None

    def next(self) -> Optional[Tuple[str, str]]:
        tok = self.peek()
        self.i += 1
        return tok

    def parse(self):
        node = self.expr(0)
        if node is None:
            return None
        tok = self.peek()
        if tok and tok[0] == "op" and tok[1] in _COMPARISONS:
            # assignment / equation / comparison statement: root both
            # sides under `eq` so symbols on either side get paths.
            self.next()
            rhs = self.expr(0)
            if rhs is None:
                return None
            node = self._mk("eq", node, rhs)
            if node is None:
                return None
        if self.i != len(self.toks):
            return None
        return node

    def expr(self, depth: int):
        if depth > _MAX_FAST_DEPTH:
            return None
        node = self.term(depth)
        if node is None:
            return None
        while True:
            tok = self.peek()
            if tok and tok[0] == "op" and tok[1] in ("+", "-"):
                self.next()
                rhs = self.term(depth)
                if rhs is None:
                    return None
                node = self._mk("add" if tok[1] == "+" else "sub", node, rhs)
                if node is None:
                    return None
            else:
                return node

    def term(self, depth: int):
        node = self.factor(depth)
        if node is None:
            return None
        while True:
            tok = self.peek()
            if tok and tok[0] == "op" and tok[1] in ("*", "/"):
                self.next()
                rhs = self.factor(depth)
                if rhs is None:
                    return None
                node = self._mk("mul" if tok[1] == "*" else "div", node, rhs)
                if node is None:
                    return None
            else:
                return node

    def factor(self, depth: int):
        node = self.unary(depth)
        if node is None:
            return None
        tok = self.peek()
        if tok and tok[0] == "op" and tok[1] in ("**", "^"):
            self.next()
            rhs = self.factor(depth)
            if rhs is None:
                return None
            return self._mk("pow", node, rhs)
        return node

    def unary(self, depth: int):
        tok = self.peek()
        if tok and tok[0] == "op" and tok[1] == "-":
            self.next()
            child = self.unary(depth)
            if child is None:
                return None
            return self._mk("neg", child)
        if tok and tok[0] == "op" and tok[1] == "+":
            self.next()
            return self.unary(depth)
        return self.atom(depth)

    def atom(self, depth: int):
        tok = self.next()
        if tok is None:
            return None
        if tok[0] == "num":
            self.nodes += 1
            return ("num", tok[1])
        if tok[0] == "ident":
            nxt = self.peek()
            if nxt and nxt[0] == "op" and nxt[1] == "(":
                self.next()
                args = []
                if self.peek() and self.peek() != ("op", ")"):
                    while True:
                        arg = self.expr(depth + 1)
                        if arg is None:
                            return None
                        args.append(arg)
                        if self.peek() == ("op", ","):
                            self.next()
                            continue
                        break
                if self.next() != ("op", ")"):
                    return None
                self.nodes += 1
                return (f"func_{tok[1]}", args)
            self.nodes += 1
            return ("sym", tok[1])
        if tok == ("op", "("):
            node = self.expr(depth + 1)
            if node is None or self.next() != ("op", ")"):
                return None
            return node
        return None

    def _mk(self, op: str, *children):
        self.nodes += 1
        if self.nodes > _MAX_FAST_NODES:
            return None
        return (op, list(children))


def _fast_walk(node, trail: List[str], sym_set: Set[str], paths: Dict[str, str], pairs: Set[str]) -> Set[str]:
    kind = node[0]
    if kind == "sym":
        name = node[1]
        if name in sym_set and name not in paths:
            ops = trail[:_MAX_PATH_LEN]
            paths[name] = "pth_" + name + ("_" + "_".join(ops) if ops else "_self")
        return {name} if name in sym_set else set()
    if kind == "num":
        return set()
    sub: Set[str] = set()
    for child in node[1]:
        sub |= _fast_walk(child, [kind] + trail, sym_set, paths, pairs)
    sub_sorted = sorted(sub)
    if len(sub_sorted) >= 2:
        for i in range(len(sub_sorted)):
            for j in range(i + 1, len(sub_sorted)):
                pairs.add(f"par_{kind}_{sub_sorted[i]}_{sub_sorted[j]}")
    return sub


def fast_tree_tokens(
    normalized_expr: str, free_symbols: Sequence[str]
) -> Optional[Tuple[List[str], List[str]]]:
    """(path_tokens, pair_tokens) from the linear-time parser, or None.

    Same token scheme as `tree_tokens` (which walks a SymPy tree); the
    operator vocabulary is the grammar's own (add/sub/mul/div/pow/neg/
    func_<name>). One parser serves the whole corpus in a build, so
    tokens are consistent across rows.
    """
    if not normalized_expr or len(normalized_expr) > 20000:
        return None
    tokens = _tokenize(normalized_expr)
    if tokens is None:
        return None
    tree = _FastParser(tokens).parse()
    if tree is None:
        return None
    paths: Dict[str, str] = {}
    pairs: Set[str] = set()
    _fast_walk(tree, [], set(free_symbols), paths, pairs)
    return [paths[s] for s in sorted(paths)], sorted(pairs)[:_MAX_PAIR_TOKENS]


def parse_normalized(normalized_expr: str, free_symbols: Sequence[str]) -> Optional[Any]:
    if not normalized_expr:
        return None
    if len(normalized_expr) > _MAX_TREE_EXPR_CHARS:
        return None
    if len(_IDENT_RE.findall(normalized_expr)) > _MAX_TREE_EXPR_TOKENS:
        return None
    local = {name: sympy.Symbol(name) for name in free_symbols}
    try:
        return parse_expr(
            normalized_expr,
            local_dict=local,
            transformations=_PARSE_TRANSFORMS,
            evaluate=True,
        )
    except Exception:
        return None


def context_string(row: Dict[str, Any], provenance: Dict[str, Any]) -> str:
    parts: List[str] = []
    for val in (
        provenance.get("book"),
        provenance.get("title"),
        provenance.get("section"),
        provenance.get("lane"),
        row.get("description"),
    ):
        if val:
            parts.append(str(val))
    tags = provenance.get("domain_tags") or row.get("domain_tags")
    if tags:
        parts.append(" ".join(str(t) for t in tags))
    return " ".join(parts)


def enrich_rows(
    master_path: Path,
    loader_records: Dict[int, Dict[str, Any]],
) -> Iterable[Dict[str, Any]]:
    """Yield one enrichment record per non-blank master line.

    `loader_records` maps row_index -> the loader's parsed record; rows
    absent from it are UNPARSEABLE by the loader's own classification.
    Row numbering mirrors the loader exactly: 1-based over non-blank
    lines, corrupt JSON lines counted.
    """
    total = 0
    with master_path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            total += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                yield {
                    "row_id": f"eqrow-{total}",
                    "row_index": total,
                    "class": "UNPARSEABLE",
                    "equation": "",
                    "normalized_expr": None,
                    "free_symbols": [],
                    "path_tokens": [],
                    "pair_tokens": [],
                    "structure_tokens": [],
                    "norm_num": None,
                    "norm_den": [],
                    "context": "",
                    "provenance": {},
                }
                continue

            row_id = _row_id(row, total)
            raw = _raw_equation(row)
            prov = _provenance(row)
            rec = loader_records.get(total)

            if rec is not None:
                status = rec["status"]
                normalized = rec.get("normalized_expr")
                free_symbols = list(rec.get("free_symbols") or [])
                # Linear-time parser ONLY on this path: the SymPy
                # re-parse fallback OOM-killed a process on this
                # corpus (see note at _MAX_TREE_EXPR_CHARS). Rows the
                # fast grammar rejects keep their `sym_` tokens.
                fast = fast_tree_tokens(normalized or "", free_symbols)
                if fast is not None:
                    path_tokens, pair_tokens = fast
                else:
                    path_tokens, pair_tokens = [], []
                structure = [f"sym_{s}" for s in free_symbols] + path_tokens + pair_tokens
                norm = normalization_form_symbols(normalized or "", free_symbols)
                norm_num, norm_den = (norm[0], list(norm[1])) if norm else (None, [])
            else:
                status = "UNPARSEABLE"
                normalized = None
                free_symbols = []
                path_tokens, pair_tokens = [], []
                structure = text_symbol_tokens(raw)
                norm_num, norm_den = None, []

            yield {
                "row_id": row_id,
                "row_index": total,
                "class": status,
                "equation": raw,
                "normalized_expr": normalized,
                "free_symbols": free_symbols,
                "path_tokens": path_tokens,
                "pair_tokens": pair_tokens,
                "structure_tokens": structure,
                "norm_num": norm_num,
                "norm_den": norm_den,
                "context": context_string(row, prov),
                "provenance": prov,
            }


def build_enrichment(
    out_path: Path,
    *,
    masters_index: Optional[MastersIndex] = None,
    master_jsonl: Optional[Path] = None,
    sample_path: Optional[Path] = None,
    sample_rows: int = 50,
) -> Dict[str, Any]:
    """Run the full enrichment pass; returns run stats."""
    t0 = time.time()
    idx = masters_index or build_or_load_index()
    loader_records: Dict[int, Dict[str, Any]] = {}
    for rec in idx.evaluated:
        loader_records[rec["row_index"]] = rec
    for rec in idx.bindable:
        loader_records[rec["row_index"]] = rec

    master = master_jsonl or (idx.paths.equations.parent / "EQUATIONS-MASTER.jsonl")
    if not master.is_file():
        master = idx.paths.equations  # fall back to the resolved master itself

    counts: Dict[str, int] = {}
    n = 0
    sample: List[Dict[str, Any]] = []
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as out:
        for rec in enrich_rows(master, loader_records):
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            counts[rec["class"]] = counts.get(rec["class"], 0) + 1
            n += 1
            if len(sample) < sample_rows:
                sample.append(rec)
    if sample_path is not None:
        sample_path.parent.mkdir(parents=True, exist_ok=True)
        with sample_path.open("w", encoding="utf-8") as sf:
            for rec in sample:
                sf.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return {
        "rows": n,
        "counts": counts,
        "master": str(master),
        "loader_total_rows": idx.total_rows,
        "loader_from_cache": idx.index_from_cache,
        "seconds": round(time.time() - t0, 2),
    }


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Build the equation enrichment artifact.")
    ap.add_argument("--out", required=True, help="enrichment JSONL output path")
    ap.add_argument("--sample", default=None, help="optional sample JSONL output path")
    args = ap.parse_args(argv)
    stats = build_enrichment(
        Path(args.out),
        sample_path=Path(args.sample) if args.sample else None,
    )
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
