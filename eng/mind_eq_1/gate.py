# -*- coding: utf-8 -*-
"""Gate equations_stated.jsonl lines 8001-end into eng/mind_eq_1.

A function is emitted only when a complex formula's every input symbol
is an exact column or play-by-play field already on disk. No invented
columns, no case-folding, no score, no mint.
"""
import ast
import json
import os
import re
from collections import Counter

import pyarrow.parquet as pq

RESEARCH = r"C:\Users\Garrett\_research\ctx-2026-10-03"
OUT = r"C:\Users\Garrett\Sports-wt-engineplan\eng\mind_eq_1"
EQ = os.path.join(RESEARCH, "eng", "equations_stated.jsonl")
START = 8001  # other worker owns 0..8000 inclusive

BANNED = {"h_qb_act", "a_qb_act"}
SHORT_COLLISIONS = {
    "y", "n", "q", "w", "ep", "wp", "id", "div", "sp", "cp", "td", "fg",
    "x", "a", "b", "c", "p", "r", "s", "t", "u", "v", "k", "m", "d", "f",
    "home", "away", "team", "week", "time", "play", "total", "season",
    "result", "drive", "down", "half", "name", "pass", "rush", "wind",
    "rest", "series", "played", "success", "expected", "penalty", "neutral",
    "epa",  # bare token collides with prose; do not treat as the column
}
MATH = {"abs", "max", "min"}
STOP = {
    "the","and","with","for","where","from","into","via","this","that","than",
    "then","else","when","only","over","under","between","within","without",
    "using","used","use","per","each","all","not","but","are","was","were",
    "been","being","have","has","had","its","their","there","these","those",
    "such","also","onto","across","after","before","above","below","about",
    "against","among","while","during","through","because","if","or","of",
    "in","on","to","as","at","by","an","be","is","it","we","no","let","define",
    "defined","denote","denotes","given","where","sum","sqrt","log","ln","exp",
    "sin","cos","mean","std","var","true","false","none","inf",
}

IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def load_columns():
    cols = set()
    eng = os.path.join(RESEARCH, "eng")
    if os.path.isdir(eng):
        for fn in os.listdir(eng):
            if fn.endswith(".parquet"):
                cols.update(pq.read_schema(os.path.join(eng, fn)).names)
    for rel in (
        os.path.join("pbp", "play_by_play_2024.parquet"),
        "engine_v1_features.parquet",
        os.path.join("brain", "protection_stress.parquet"),
    ):
        path = os.path.join(RESEARCH, rel)
        if os.path.exists(path):
            cols.update(pq.read_schema(path).names)
    ftn = set()
    ftn_path = os.path.join(RESEARCH, "pbp", "ftn_charting_2025.parquet")
    if os.path.exists(ftn_path):
        ftn = set(pq.read_schema(ftn_path).names)
    usable = set()
    for c in cols:
        if not isinstance(c, str):
            continue
        if c in BANNED or c in SHORT_COLLISIONS:
            continue
        if c in ftn and c not in (cols - ftn):
            continue
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", c):
            continue
        if len(c) < 4:
            continue
        usable.add(c)
    return usable


def is_complex(statement):
    s = statement.strip()
    if "=" not in s and "≈" not in s:
        return False
    body = s.replace("≈", "=")
    left, _, right = body.partition("=")
    right = right.strip()
    if not right:
        return False
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", right):
        return False
    if not any(ch in body for ch in "+-*/^"):
        return False
    return True


def normalize(text):
    return (
        text.replace("−", "-")
        .replace("–", "-")
        .replace("—", "-")
        .replace("×", "*")
        .replace("·", "*")
        .replace("÷", "/")
        .replace("≈", "=")
        .replace("^", "**")
    )


def compile_rhs(rhs, usable):
    """Return (expr_src, columns) or (None, missing_or_reason)."""
    text = normalize(rhs).strip().rstrip(".,;")
    if not text or any(ch in text for ch in "∑∫αβγδεθλμπσφωΣΔ\\{}[]"):
        # subscripts, greek, latex, indexing: not an exact column formula
        idents = IDENT.findall(text)
        missing = [t for t in idents if t not in usable and t not in MATH and t.lower() not in STOP]
        return None, missing or ["untranslated_formula"]
    # Reject assignment chains and comparisons.
    if any(op in text for op in ("==", "!=", "<=", ">=", "=>", "->")):
        return None, ["comparison_not_a_formula"]
    cols = sorted(usable, key=len, reverse=True)
    found = []
    def repl(m):
        tok = m.group(0)
        if tok in usable:
            found.append(tok)
            return tok
        return tok
    # Validate identifiers before transform.
    idents = []
    for m in IDENT.finditer(text):
        tok = m.group(0)
        if tok in MATH:
            continue
        idents.append(tok)
    missing = []
    for tok in idents:
        if tok not in usable:
            missing.append(tok)
    # unique preserve order
    seen = set()
    missing_u = []
    for t in missing:
        if t not in seen:
            seen.add(t)
            missing_u.append(t)
    if missing_u:
        return None, missing_u
    if not idents:
        return None, ["no_column_inputs"]
    # Map names to lookups so the function is side-effect free.
    expr = text
    for col in cols:
        if col in idents:
            expr = re.sub(rf"\b{re.escape(col)}\b", f'_n("{col}")', expr)
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return None, ["syntax"]
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name,
               ast.Load, ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div,
               ast.Pow, ast.USub, ast.UAdd, ast.Mod, ast.FloorDiv)
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            return None, ["syntax"]
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in MATH:
                return None, ["syntax"]
        if isinstance(node, ast.Name) and node.id != "_n":
            return None, [node.id]
    if not any(isinstance(n, ast.BinOp) for n in ast.walk(tree)):
        return None, ["not_complex"]
    return expr, list(dict.fromkeys(idents))


def safe_name(line, cols):
    slug = "_".join(cols[:3])
    slug = re.sub(r"[^A-Za-z0-9_]", "_", slug)[:40]
    return f"eq_{line}_{slug}"


def main():
    os.makedirs(OUT, exist_ok=True)
    usable = load_columns()
    blocked_path = os.path.join(OUT, "blocked.jsonl")
    miss_counter = Counter()
    coded = []
    n_seen = 0
    n_complex = 0
    n_skip = 0
    fn_blocks = []
    with open(EQ, encoding="utf-8") as f, open(blocked_path, "w", encoding="utf-8", newline="\n") as out:
        for i, line in enumerate(f):
            if i < START:
                continue
            n_seen += 1
            o = json.loads(line)
            st = o.get("statement") or o.get("equation") or ""
            sp = (o.get("source_path") or "").replace("\\", "/")
            if not is_complex(st):
                n_skip += 1
                continue
            n_complex += 1
            rhs = normalize(st).split("=", 1)[1]
            expr, info = compile_rhs(rhs, usable)
            if expr is None:
                missing = [m for m in info if m not in ("syntax", "not_complex", "no_column_inputs", "comparison_not_a_formula", "untranslated_formula")]
                if not missing:
                    missing = info
                reason = "missing_columns"
                if info and info[0] in ("syntax", "not_complex", "no_column_inputs", "comparison_not_a_formula", "untranslated_formula") and not any(m in usable or True for m in missing if m not in ("syntax", "not_complex", "no_column_inputs", "comparison_not_a_formula", "untranslated_formula")):
                    reason = info[0]
                # Count real missing names, not gate reasons.
                names = [m for m in missing if m not in ("syntax", "not_complex", "no_column_inputs", "comparison_not_a_formula", "untranslated_formula")]
                if not names:
                    names = missing
                    reason = missing[0] if missing else "missing_columns"
                else:
                    reason = "missing_columns"
                miss_counter.update(n for n in names if len(n) >= 3)
                rec = {
                    "line": i,
                    "source_path": sp,
                    "statement": st,
                    "missing": names,
                    "reason": reason,
                }
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                continue
            # Every symbol matched. Still refuse banned / ftn if they slipped in.
            if any(c in BANNED for c in info):
                rec = {"line": i, "source_path": sp, "statement": st, "missing": ["banned_input"], "reason": "banned"}
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                continue
            fname = safe_name(i, info)
            coded.append({"line": i, "name": fname, "columns": info, "statement": st, "source_path": sp, "expr": expr})
            col_lines = "\n".join(
                f"        {c} = _n(row, \"{c}\")\n        if {c} is None:\n            return None" for c in info
            )
            # expr uses _n("col"); define _n in the closure via parameter row.
            fn_blocks.append(
                f"def {fname}(home, away):\n"
                f"    \"\"\"Line {i}. Point in time: home and away values must already be lagged (<= 2 seasons).\n"
                f"    Returns home minus away. No h_qb_act. No FTN. Not a score.\n"
                f"    {st}\n"
                f"    \"\"\"\n"
                f"    def side(row):\n"
                f"        def _n(name):\n"
                f"            return _num(row, name)\n"
                f"        try:\n"
                f"            return {expr}\n"
                f"        except (ZeroDivisionError, TypeError, ValueError, OverflowError):\n"
                f"            return None\n"
                f"    h = side(home)\n"
                f"    a = side(away)\n"
                f"    if h is None or a is None:\n"
                f"        return None\n"
                f"    return h - a\n"
            )
    parts = [
        '"""Complex equations from equations_stated.jsonl lines 8001-end.\n\n'
        "Each function is home minus away of a formula whose every input is an\n"
        "exact column already on disk. Caller must pass point-in-time values\n"
        "lagged by at most 2 seasons. No h_qb_act. No FTN fields. No score.\n"
        '"""\n',
        "def _num(row, name):\n"
        "    if row is None:\n"
        "        return None\n"
        "    try:\n"
        "        v = row[name]\n"
        "    except Exception:\n"
        "        return None\n"
        "    if v is None:\n"
        "        return None\n"
        "    try:\n"
        "        return float(v)\n"
        "    except (TypeError, ValueError):\n"
        "        return None\n",
        "\n\n".join(fn_blocks),
        "\nFUNCTIONS = {\n" + "".join(f"    \"{c['name']}\": {c['name']},\n" for c in coded) + "}\n",
    ]
    fn_path = os.path.join(OUT, "functions.py")
    with open(fn_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(parts))
        if not fn_blocks:
            f.write("\n")
    summary = {
        "slice": "lines 8001-end",
        "equations_file": EQ,
        "owned_lines": n_seen,
        "complex_seen": n_complex,
        "not_complex_skipped": n_skip,
        "functions_coded": len(coded),
        "blocked": n_complex - len(coded),
        "coded": [{k: c[k] for k in ("line", "name", "columns", "source_path", "statement")} for c in coded],
        "top_missing": miss_counter.most_common(40),
        "rules": [
            "exact column match only",
            "no case folding",
            "no h_qb_act",
            "no FTN-only fields",
            "home minus away",
            "lag <= 2 seasons is the caller's point-in-time contract",
            "no score",
        ],
    }
    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("usable_columns", len(usable))
    print("owned", n_seen)
    print("complex", n_complex)
    print("coded", len(coded))
    print("blocked", n_complex - len(coded))
    print("TOP")
    for name, c in miss_counter.most_common(25):
        print(f"{c:5d} {name}")
    if coded:
        print("CODED")
        for c in coded[:30]:
            print(c["line"], c["name"], c["columns"])


if __name__ == "__main__":
    main()