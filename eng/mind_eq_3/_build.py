# -*- coding: utf-8 -*-
"""Gate wire_3 equations into eng/mind_eq_3. No score. No invented columns."""
from __future__ import annotations

import ast
import json
import os
import re
import subprocess
import sys
from collections import Counter

import pyarrow.parquet as pq

RESEARCH = r"C:\Users\Garrett\_research\ctx-2026-10-03"
WIRE = os.path.join(RESEARCH, "eng", "wire_3_missing.json")
REPO = r"C:\Users\Garrett\Sports-wt-engineplan"
OUT = os.path.join(REPO, "eng", "mind_eq_3")
BRANCH = "research/engine-plan-2026-10-03"
LINE_LO = 12141
LINE_HI = 16186

BANNED = {"h_qb_act", "a_qb_act"}
SHORT_COLLISIONS = {
    "y", "n", "q", "w", "ep", "wp", "id", "div", "sp", "cp", "td", "fg",
    "x", "a", "b", "c", "p", "r", "s", "t", "u", "v", "k", "m", "d", "f",
    "home", "away", "team", "week", "time", "play", "total", "season",
    "result", "drive", "down", "half", "name", "pass", "rush", "wind",
    "rest", "series", "played", "success", "expected", "penalty", "neutral",
}
STOP = {
    "the", "and", "with", "for", "where", "from", "into", "via", "this", "that", "than",
    "then", "else", "when", "only", "over", "under", "between", "within", "without",
    "using", "used", "use", "per", "each", "all", "not", "but", "are", "was", "were",
    "been", "being", "have", "has", "had", "its", "their", "there", "these", "those",
    "such", "also", "onto", "across", "after", "before", "above", "below",
    "about", "against", "among", "while", "during", "through", "because", "if",
    "or", "of", "in", "on", "to", "as", "at", "by", "an", "be", "is", "it", "we", "no",
    "lemma", "algorithm", "model", "models", "layer", "layers", "loss", "losses",
    "trained", "training", "reported", "report", "separate", "claim", "claims",
    "conclusion", "count", "subject", "pointwise", "formula", "stated",
    "explicit", "none", "true", "false", "note", "notes", "see", "figure", "table",
    "equation", "equations", "paper", "papers", "section", "appendix", "proof",
    "given", "let", "define", "defined", "denote", "denotes", "respectively",
    "holds", "hold", "which", "whose", "softmax", "relu", "dropout", "mse",
    "crossentropy", "layernorm", "clip", "normalize", "argmax", "argmin",
    "exp", "log", "ln", "sin", "cos", "max", "min", "sum", "sqrt", "abs", "det",
    "inf", "sup", "arg", "sort", "median", "mean", "std", "var", "prob",
    "probability", "expectation", "conditional", "continuous", "discrete",
    "initial", "state", "states", "times", "rate", "rates", "value", "values",
    "weight", "weights", "prior", "post", "input", "inputs", "output", "outputs",
    "feature", "features", "channel", "channels", "sample", "samples",
    "number", "numbers", "size", "step", "steps", "function", "functions",
    "parameter", "parameters", "constant", "constants", "vector", "matrix",
    "matrices", "scalar", "index", "indices", "element", "elements", "set",
    "sets", "case", "cases", "form", "forms", "type", "types", "left", "right",
    "high", "low", "upper", "lower", "positive", "negative", "linear",
    "nonlinear", "adaptive", "bin", "bins", "rank", "forecast", "forecasts",
    "interpolation", "temperature", "accuracy", "correct", "evaluated",
    "proposal", "sampling", "candidate", "candidates", "budget", "threshold",
    "error", "errors", "confidence", "certain", "formulation", "assigned",
    "drawn", "until", "reached", "reward", "search", "biased", "expansion",
    "acceptance", "point", "score", "scores", "draft", "drafts", "biserial",
    "bankroll", "profit", "payoff", "remaining", "running", "terminal",
    "weeks", "framing", "tweet", "tweets", "detector", "operates",
    "converted", "counts", "second",
}
MATH_CALLS = {"abs": "abs", "min": "min", "max": "max", "sqrt": "math.sqrt", "log": "math.log", "exp": "math.exp"}
OPS = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.Pow: "**", ast.Mod: "%", ast.FloorDiv: "//"}
IDENT = re.compile(
    r"[A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*"
    r"|[θΘαβγδεζηικλμνξπρστυφχψωΑΒΓΔΕΖΗΛΜΝΞΠΣΤΥΦΧΨΩ](?:_?[A-Za-z0-9]+)*"
)


def load_columns():
    cols = set()
    eng = os.path.join(RESEARCH, "eng")
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
        if c in BANNED or c in ftn:
            continue
        if len(c) < 4 or c.lower() in SHORT_COLLISIONS:
            continue
        usable.add(c)
    return usable


def symbols(statement):
    out = []
    seen = set()
    for t in IDENT.findall(statement):
        if t in seen:
            continue
        seen.add(t)
        if t.lower() in STOP or t.lower() in SHORT_COLLISIONS or len(t) < 2:
            continue
        out.append(t)
    return out


def is_complex(statement):
    s = statement.strip()
    if len(s) < 8:
        return False
    has_eq = "=" in s or "≈" in s
    has_op = any(ch in s for ch in "/+−-·×∑∫*^") or "ratio" in s.lower() or "weighted" in s.lower()
    if not has_eq and not any(ch in s for ch in "∑∫≈"):
        return False
    if has_eq:
        _left, _sep, right = s.partition("=")
        if right.strip() and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", right.strip()):
            return False
    return (has_eq and has_op) or ("=" in s and len(symbols(s)) >= 2)


def analyze(statement, usable):
    syms = symbols(statement)
    lhs = set(symbols(statement.split("=", 1)[0])) if "=" in statement else set()
    inputs = [s for s in syms if s not in lhs]
    present = [s for s in inputs if s in usable]
    missing = [s for s in inputs if s not in usable]
    rhs = statement.split("=", 1)[1] if "=" in statement else ""
    dropped = []
    for tok in IDENT.findall(rhs):
        if tok in usable or tok.lower() in STOP or tok.lower() in MATH_CALLS:
            continue
        if tok not in missing and tok not in dropped:
            dropped.append(tok)
    short = [d for d in dropped if d not in present and len(d) < 3]
    missing = missing + [d for d in dropped if d not in present and len(d) >= 3]
    if not missing and not present and short:
        missing = short
    return present, missing


def emit(node, present):
    if isinstance(node, ast.Expression):
        return emit(node.body, present)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return repr(node.value)
        raise ValueError("const")
    if isinstance(node, ast.Name):
        if node.id not in present:
            raise ValueError(node.id)
        return "row[%r]" % node.id
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        op = "+" if isinstance(node.op, ast.UAdd) else "-"
        return "(%s%s)" % (op, emit(node.operand, present))
    if isinstance(node, ast.BinOp) and type(node.op) in OPS:
        return "(%s %s %s)" % (emit(node.left, present), OPS[type(node.op)], emit(node.right, present))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in MATH_CALLS and not node.keywords:
        args = ", ".join(emit(a, present) for a in node.args)
        return "%s(%s)" % (MATH_CALLS[node.func.id], args)
    raise ValueError(type(node).__name__)


def compile_rhs(statement, present):
    rhs = statement.split("=", 1)[1]
    rhs = rhs.replace("−", "-").replace("–", "-").replace("×", "*").replace("·", "*").replace("÷", "/")
    rhs = rhs.replace("^", "**")
    rhs = rhs.strip().rstrip(".")
    tree = ast.parse(rhs, mode="eval")
    return emit(tree, present)


def load_rows():
    with open(WIRE, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        for key in ("rows", "equations", "missing", "items", "records"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
        else:
            data = list(data.values())
    rows = []
    for i, row in enumerate(data):
        if not isinstance(row, dict):
            continue
        line = row.get("line", row.get("lineno"))
        if isinstance(line, int) and (line < LINE_LO or line > LINE_HI):
            continue
        rows.append((i, row))
    return rows


def git(args, check=True):
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    proc = subprocess.run(
        ["git", *args], cwd=REPO, env=env, text=True, capture_output=True, encoding="utf-8", errors="replace"
    )
    if check and proc.returncode != 0:
        sys.stderr.write(proc.stdout or "")
        sys.stderr.write(proc.stderr or "")
        raise SystemExit(proc.returncode)
    return proc


def main():
    if not OUT.endswith("mind_eq_3"):
        raise SystemExit("refusing to write outside mind_eq_3")
    os.makedirs(OUT, exist_ok=True)
    usable = load_columns()
    rows = load_rows()
    coded = []
    blocked_path = os.path.join(OUT, "blocked.jsonl")
    miss_counter = Counter()
    n_complex = 0
    n_prose = 0
    fn_lines = [
        "# -*- coding: utf-8 -*-",
        '"""wire_3 complex equations whose every input is a parquet column already on disk.',
        "",
        "Nothing in this module is scored. Columns are not invented.",
        "Short tokens are not treated as the columns they collide with.",
        "FTN charting fields and h_qb_act / a_qb_act are not inputs.",
        "EPA_no-pressure is not clean_epa_baseline. An Elo subscript is not elo.",
        '"""',
        "import math",
        "",
        "",
    ]
    with open(blocked_path, "w", encoding="utf-8", newline="\n") as out:
        for _i, row in rows:
            statement = row.get("statement") or row.get("formula") or row.get("equation") or ""
            present, missing = analyze(statement, usable)
            listed = row.get("missing", row.get("missing_symbols"))
            file_empty = isinstance(listed, list) and len(listed) == 0
            if isinstance(listed, list):
                for item in listed:
                    if isinstance(item, str) and item not in usable and item not in missing and item.lower() not in STOP:
                        if len(item) >= 3 or "_" in item or "-" in item:
                            missing.append(item)
            complex_flag = row.get("complex")
            complex_ = is_complex(statement) if complex_flag is None else bool(complex_flag) and is_complex(statement) or (complex_flag is True and ("=" in statement or "≈" in statement))
            # Prefer the structural test. A file flag cannot make prose into a formula
            # and cannot hide a real formula.
            complex_ = is_complex(statement)
            note = None
            if "EPA_no-pressure" in statement or "EPA_sack" in statement or "EPA_o" in statement:
                note = "EPA_no-pressure, EPA_o, and EPA_sack are not columns. No substitution."
            if re.search(r"Elo[_({]", statement) or "Elo " in statement:
                note = "Elo subscript is not the elo column. Not mapped."
            reason = None
            expr = None
            if not complex_:
                n_prose += 1
                reason = "not_a_complex_formula"
            else:
                n_complex += 1
                if missing or len(present) < 2:
                    reason = "missing_columns" if missing else "insufficient_real_columns"
                    miss_counter.update(m for m in missing if len(m) >= 3 or "_" in m or "-" in m)
                else:
                    try:
                        expr = compile_rhs(statement, set(present))
                    except Exception:
                        reason = "formula_not_closed_over_columns"
                        miss_counter.update(m for m in missing if len(m) >= 3 or "_" in m or "-" in m)
            if expr is not None:
                line = row.get("line", row.get("lineno", _i))
                name = "eq_%s" % line
                coded.append({
                    "line": line,
                    "name": name,
                    "source_path": row.get("source_path"),
                    "statement": statement,
                    "columns": present,
                    "expr": expr,
                })
                comment = statement.replace("\n", " ")
                fn_lines.append("def %s(row):" % name)
                fn_lines.append("    %s" % repr(comment))
                fn_lines.append("    return %s" % expr)
                fn_lines.append("")
                continue
            rec = {
                "line": row.get("line", row.get("lineno")),
                "source_path": row.get("source_path"),
                "statement": statement,
                "complex": complex_,
                "present_columns": present,
                "missing": missing,
                "reason": reason,
                "wire": "wire_3",
                "file_missing_empty": file_empty,
            }
            if note:
                rec["note"] = note
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    fn_lines.append("FUNCTIONS = {")
    for item in coded:
        fn_lines.append("    %r: %s," % (item["line"], item["name"]))
    fn_lines.append("}")
    fn_lines.append("")
    fn_path = os.path.join(OUT, "functions.py")
    text = "\n".join(fn_lines)
    ast.parse(text)
    with open(fn_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    summary = {
        "slice": "wire_3 lines %s-%s" % (LINE_LO, LINE_HI),
        "wire_file": WIRE,
        "owned_rows": len(rows),
        "usable_columns": len(usable),
        "functions_coded": len(coded),
        "complex_blocked": n_complex - len(coded),
        "not_complex_recorded": n_prose,
        "blocked_file_rows": n_complex - len(coded) + n_prose,
        "coded": [{k: v for k, v in item.items() if k != "expr"} | {"expr": item["expr"]} for item in coded],
        "top_missing": miss_counter.most_common(40),
        "scored": False,
    }
    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("CODED %d" % len(coded))
    print("BLOCKED %d" % summary["blocked_file_rows"])
    print("OWNED %d" % len(rows))
    print("USABLE %d" % len(usable))
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    if branch != BRANCH:
        raise SystemExit("wrong branch %s" % branch)
    git(["add", "--", "eng/mind_eq_3"])
    cached = git(["diff", "--cached", "--name-only"]).stdout.splitlines()
    bad = [p for p in cached if not p.replace("\\", "/").startswith("eng/mind_eq_3/")]
    if bad:
        git(["reset", "HEAD", "--", *bad], check=False)
        raise SystemExit("refusing to commit %s" % bad)
    if not cached:
        raise SystemExit("nothing staged")
    msg = (
        "Add mind_eq_3 wire_3 equation gate: %d functions, %d blocked.\n\n"
        "A function is emitted only when the statement is a closed arithmetic\n"
        "expression over parquet columns already on disk. No invented columns.\n"
        "No score. Does not touch mind.jsonl, cycle.py, or other mind_eq folders."
    ) % (len(coded), summary["blocked_file_rows"])
    git(["commit", "-m", msg])
    push = git(["push", "origin", BRANCH], check=False)
    sys.stderr.write(push.stdout or "")
    sys.stderr.write(push.stderr or "")
    if push.returncode != 0:
        pull = git(["pull", "--rebase", "origin", BRANCH], check=False)
        sys.stderr.write(pull.stdout or "")
        sys.stderr.write(pull.stderr or "")
        if pull.returncode != 0:
            git(["rebase", "--abort"], check=False)
            raise SystemExit(pull.returncode)
        push2 = git(["push", "origin", BRANCH], check=False)
        sys.stderr.write(push2.stdout or "")
        sys.stderr.write(push2.stderr or "")
        if push2.returncode != 0:
            raise SystemExit(push2.returncode)
    sha = git(["rev-parse", "HEAD"]).stdout.strip()
    print("SHA %s" % sha)
    status = git(["status", "-sb"]).stdout
    print(status)


if __name__ == "__main__":
    main()