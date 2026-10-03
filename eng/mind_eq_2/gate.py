# -*- coding: utf-8 -*-
"""mind_eq_2 gate. Corpus-deep notes plus agent-bus sports and corpus-intelligence.

A function is written only when every input is an existing column or
play-by-play field and the right-hand side is arithmetic over those columns.
Blocked equations go to blocked.jsonl. Does not score. Does not write
mind.jsonl, cycle.py, mind_eq, mind_eq_0, or mind_eq_1.
"""
import ast, json, os, re
from collections import Counter
import pyarrow.parquet as pq

RESEARCH = r"C:\Users\Garrett\_research\ctx-2026-10-03"
OUT = r"C:\Users\Garrett\Sports-wt-engineplan\eng\mind_eq_2"
DOCS = r"C:\Users\Garrett\Sports-wt-engineplan\docs"
BUS_SPORTS = r"C:\Users\Garrett\_research\agent-bus\sports"
BUS_CI = r"C:\Users\Garrett\_research\agent-bus\research\corpus-intelligence"
EQ = os.path.join(RESEARCH, "eng", "equations_stated.jsonl")

BANNED = {"h_qb_act", "a_qb_act"}
SHORT_COLLISIONS = {
    "y", "n", "q", "w", "ep", "wp", "id", "div", "sp", "cp", "td", "fg",
    "x", "a", "b", "c", "p", "r", "s", "t", "u", "v", "k", "m", "d", "f",
    "home", "away", "team", "week", "time", "play", "total", "season",
    "result", "drive", "down", "half", "name", "pass", "rush", "wind",
    "rest", "series", "played", "success", "expected", "penalty", "neutral",
}
STOP = {
    "the","and","with","for","where","from","into","via","this","that","than",
    "then","else","when","only","over","under","between","within","without",
    "using","used","use","per","each","all","not","but","are","was","were",
    "been","being","have","has","had","its","their","there","these","those",
    "such","also","onto","across","after","before","above","below",
    "about","against","among","while","during","through","because","if",
    "or","of","in","on","to","as","at","by","an","be","is","it","we","no",
    "lemma","algorithm","model","models","layer","layers","loss","losses",
    "trained","training","reported","report","separate","claim","claims",
    "conclusion","count","subject","pointwise","formula","stated",
    "explicit","none","true","false","note","notes","see","figure","table",
    "equation","equations","paper","papers","section","appendix","proof",
    "given","let","define","defined","denote","denotes","respectively",
    "holds","hold","which","whose","softmax","relu","dropout","mse",
    "clip","normalize","argmax","argmin","exp","log","ln","sin","cos",
    "max","min","sum","sqrt","abs","inf","sup","arg","mean","std","var",
    "prob","probability","expected","expectation","conditional",
    "rate","rates","value","values","weight","weights","prior","post",
    "input","inputs","output","outputs","feature","features",
    "sample","samples","number","size","step","steps","function","functions",
    "parameter","parameters","constant","constants","vector","matrix",
    "index","set","case","left","right","high","low",
}
IDENT = re.compile(r"[A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*")

def load_columns():
    cols = set()
    eng = os.path.join(RESEARCH, "eng")
    for fn in os.listdir(eng):
        if fn.endswith(".parquet"):
            cols.update(pq.read_schema(os.path.join(eng, fn)).names)
    cols.update(pq.read_schema(os.path.join(RESEARCH, "pbp", "play_by_play_2024.parquet")).names)
    cols.update(pq.read_schema(os.path.join(RESEARCH, "engine_v1_features.parquet")).names)
    prot = os.path.join(RESEARCH, "brain", "protection_stress.parquet")
    if os.path.exists(prot):
        cols.update(pq.read_schema(prot).names)
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
    out, seen = [], set()
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
    if len(s) < 8 or "=" not in s and "≈" not in s:
        return False
    if not any(ch in s for ch in "/+−-·×*") and "ratio" not in s.lower() and "weighted" not in s.lower():
        return False
    if "=" in s:
        _l, _, right = s.partition("=")
        if right.strip() and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", right.strip()):
            return False
    return True

def lane_ok(sp):
    sp = sp.replace("\\", "/").lower()
    if "arxiv-sweep" in sp:
        return False
    if "corpus-deep" in sp:
        return True
    if sp.startswith("sports/") or "/sports/" in sp:
        return True
    if "corpus-intelligence" in sp:
        return True
    return False

def collect_jsonl():
    rows = []
    if not os.path.exists(EQ):
        return rows
    with open(EQ, encoding="utf-8") as f:
        for i, line in enumerate(f):
            o = json.loads(line)
            sp = o.get("source_path", "")
            if not lane_ok(sp):
                continue
            st = o.get("statement") or ""
            if st:
                rows.append((sp, st, i))
    return rows

def collect_files():
    rows = []
    roots = []
    engine = os.path.join(DOCS, "engine")
    if os.path.isdir(engine):
        for dirpath, _dirs, _files in os.walk(engine):
            if "corpus-deep" in dirpath.lower():
                roots.append(dirpath)
    for root in (BUS_SPORTS, BUS_CI):
        if os.path.isdir(root):
            roots.append(root)
    seen_root = []
    for r in roots:
        if any(r == s or r.startswith(s + os.sep) for s in seen_root):
            continue
        seen_root.append(r)
    n_files = 0
    for root in seen_root:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d.lower() not in {".git", "node_modules", "arxiv-sweep"}]
            if "arxiv-sweep" in dirpath.lower():
                continue
            for fn in filenames:
                if not fn.lower().endswith((".md", ".txt")):
                    continue
                path = os.path.join(dirpath, fn)
                n_files += 1
                try:
                    with open(path, encoding="utf-8", errors="replace") as f:
                        for line in f:
                            s = line.strip()
                            if len(s) < 8 or len(s) > 400:
                                continue
                            if "=" not in s and "≈" not in s:
                                continue
                            s = re.sub(r"^[-*]\s+", "", s).strip("`").strip()
                            if is_complex(s):
                                rel = path
                                rows.append((rel, s, None))
                except OSError:
                    continue
    return rows, n_files

CALLS = {"sin": "math.sin", "sqrt": "math.sqrt", "log": "math.log", "abs": "abs", "min": "min", "max": "max"}

def split_eq(statement):
    a = statement.find("=")
    b = statement.find("\u2248")
    if a < 0 and b < 0:
        return statement, ""
    if b >= 0 and (a < 0 or b < a):
        return statement.split("\u2248", 1)
    return statement.split("=", 1)

def compile_rhs(statement, present):
    _lhs, rhs = split_eq(statement)
    if not rhs:
        return None
    expr = rhs.replace("\u2212", "-").replace("\u00b7", "*").replace("\u00d7", "*").replace("\u00f7", "/")
    expr = expr.split(";")[0]
    expr = re.split(r"\bwhere\b", expr, maxsplit=1, flags=re.I)[0]
    expr = expr.replace("$", "")
    expr = expr.strip().rstrip(".")
    if expr.count("|") == 2:
        expr = re.sub(r"\|([^|]+)\|", r"abs(\1)", expr)
    expr = expr.replace("^", "**")
    used = []
    for col in sorted(present, key=len, reverse=True):
        pat = r"(?<![A-Za-z0-9_])" + re.escape(col) + r"(?![A-Za-z0-9_])"
        if re.search(pat, expr):
            expr = re.sub(pat, "row[%r]" % col, expr)
            used.append(col)
    if len(used) < 1:
        return None
    leftover = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", expr)
    allow = set(CALLS) | {"row"}
    if any(tok not in allow for tok in leftover):
        return None
    for name, repl in CALLS.items():
        if "." not in repl:
            continue
        expr = re.sub(r"(?<![A-Za-z0-9_])" + name + r"(?![A-Za-z0-9_])", repl, expr)
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            fn = node.func
            ok = isinstance(fn, ast.Name) and fn.id in ("abs", "min", "max")
            ok = ok or (
                isinstance(fn, ast.Attribute)
                and isinstance(fn.value, ast.Name)
                and fn.value.id == "math"
                and fn.attr in ("sin", "sqrt", "log")
            )
            if not ok:
                return None
        elif isinstance(node, ast.Name) and node.id not in ("row", "abs", "min", "max", "math"):
            return None
        elif isinstance(node, ast.Attribute):
            if not (isinstance(node.value, ast.Name) and node.value.id == "math"):
                return None
    if not any(isinstance(n, (ast.BinOp, ast.UnaryOp)) for n in ast.walk(tree)):
        return None
    return expr, used

def main():
    os.makedirs(OUT, exist_ok=True)
    usable = load_columns()
    rows = collect_jsonl()
    file_rows, n_files = collect_files()
    seen = set()
    merged = []
    for sp, st, line_no in rows + file_rows:
        key = st.strip()
        if key in seen:
            continue
        seen.add(key)
        merged.append((sp, st, line_no))
    coded = []
    miss = Counter()
    n_complex = 0
    n_prose = 0
    fn_lines = [
        "import math",
        "",
        '"""mind_eq_2 complex equations.',
        "",
        "A function exists only when every input is an existing column or",
        "play-by-play field. Short names are not those columns. EPA_no-pressure",
        "is not clean_epa_baseline. An Elo subscript is not elo. h_qb_act is",
        "banned. FTN charting fields are not inputs. Nothing here is scored.",
        '"""',
        "",
    ]
    body = []
    blocked_path = os.path.join(OUT, "blocked.jsonl")
    with open(blocked_path, "w", encoding="utf-8", newline="\n") as out:
        for sp, st, line_no in merged:
            if "h_qb_act" in st or "a_qb_act" in st:
                rec = {"line": line_no, "source_path": sp, "statement": st, "complex": True,
                       "present_columns": [], "missing": ["h_qb_act"], "reason": "banned_input"}
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                n_complex += 1
                continue
            syms = symbols(st)
            lhs_text, rhs = split_eq(st)
            lhs = set(symbols(lhs_text))
            inputs = [s for s in syms if s not in lhs]
            present = [s for s in inputs if s in usable]
            missing = [s for s in inputs if s not in usable]
            dropped = []
            for tok in IDENT.findall(rhs):
                if tok in usable or tok.lower() in STOP:
                    continue
                if tok not in missing and tok not in dropped:
                    dropped.append(tok)
            missing = missing + [d for d in dropped if d not in present]
            complex_ = is_complex(st)
            note = None
            if "EPA_no-pressure" in st or "EPA_sack" in st or "EPA_o" in st:
                note = "EPA_no-pressure, EPA_o, and EPA_sack are not columns. Not substituted."
            if re.search(r"Elo[_({]", st) or "Elo " in st:
                note = "Elo subscript is not the elo column. Not mapped."
            compiled = None
            if complex_ and not missing and len(present) >= 1:
                compiled = compile_rhs(st, present)
            if compiled:
                expr, used = compiled
                lhs_raw = split_eq(st)[0].strip()
                lhs_raw = re.sub(r"^[^A-Za-z]+", "", lhs_raw)
                if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", lhs_raw) and lhs_raw.lower() not in STOP:
                    name = lhs_raw
                else:
                    name = "eq_%d" % (len(coded) + 1)
                if any(c["name"] == name for c in coded):
                    name = name + "_%d" % (len(coded) + 1)
                coded.append({"name": name, "source_path": sp, "statement": st, "columns": used, "expr": expr})
                body.append("def %s(row):" % name)
                body.append("    return %s" % expr)
                body.append("")
                continue
            if not complex_:
                n_prose += 1
                reason = "not_a_complex_formula"
            elif not missing and len(present) >= 1:
                n_complex += 1
                reason = "not_executable_arithmetic"
                miss.update(present)
            else:
                n_complex += 1
                reason = "missing_columns"
                miss.update(m for m in missing if len(m) >= 3 or "_" in m or "-" in m)
            spn = sp.replace("\\", "/")
            lane = "corpus-deep" if "corpus-deep" in spn.lower() else ("sports" if "sports" in spn.lower() else "corpus-intelligence")
            rec = {
                "line": line_no,
                "lane": lane,
                "source_path": spn,
                "statement": st,
                "complex": complex_,
                "present_columns": present,
                "missing": missing,
                "reason": reason,
            }
            if note:
                rec["note"] = note
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    reg = ["", "FUNCTIONS = {"]
    for c in coded:
        reg.append("    %r: %s," % (c["name"], c["name"]))
    reg.append("}")
    reg.append("")
    text = "\n".join(fn_lines + body + reg)
    with open(os.path.join(OUT, "functions.py"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    summary = {
        "slice": "mind_eq_2 corpus-deep docs plus agent-bus sports and corpus-intelligence; not arxiv-sweep",
        "equations_file": EQ,
        "files_scanned": n_files,
        "owned_statements": len(merged),
        "functions_coded": len(coded),
        "complex_blocked": n_complex,
        "not_complex_recorded": n_prose,
        "blocked_file_rows": n_complex + n_prose,
        "coded": [{"name": c["name"], "columns": c["columns"], "statement": c["statement"], "source_path": c["source_path"]} for c in coded],
        "top_missing": miss.most_common(30),
        "refused_mappings": [
            "EPA_no-pressure -> clean_epa_baseline",
            "EPA_o -> epa or epa_press",
            "EPA_sack -> sack",
            "Elo subscript -> elo",
        ],
        "scored": False,
    }
    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("files", n_files)
    print("owned", len(merged))
    print("coded", len(coded))
    print("complex_blocked", n_complex)
    print("not_complex", n_prose)
    for c in coded:
        print("FN", c["name"], c["columns"])

if __name__ == "__main__":
    main()
