import ast, json, os, re, collections
EQ = r"C:\Users\Garrett\_research\ctx-2026-10-03\eng\equations_stated.jsonl"
ROOTS = [
    r"C:\Users\Garrett\_research\ctx-2026-10-03\eng",
    r"C:\Users\Garrett\Sports-wt-engineplan\docs\research\2026-10-03\engine-plan\eng",
]
OUT = r"C:\Users\Garrett\Sports-wt-engineplan\eng\mind_eq_0"
BANNED = {"h_qb_act", "a_qb_act", "qb_act", "y", "result", "total"}
STOP = {
    "frac","sum","prod","left","right","mathrm","mathbf","text","operatorname","exp","log","ln","sqrt",
    "sin","cos","tan","max","min","argmax","argmin","if","else","elif","for","while","in","and","or","not",
    "len","lambda","True","False","None","return","def","class","import","from","as","with","range","int",
    "float","str","list","dict","set","tuple","print","abs","pow","round","sorted","reversed","enumerate",
    "zip","map","filter","np","pd","re","math","os","json","true","false","none","self","cls",
}
ID = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
OPS = re.compile(r"[\+\-\*/\^=]|\\frac|[−×÷]")

def harvest(obj, into):
    if isinstance(obj, dict):
        cols = obj.get("columns")
        if isinstance(cols, dict) and cols and all(isinstance(k, str) for k in cols):
            vals = list(cols.values())
            if vals and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals):
                into.update(cols)
        cov = obj.get("coverage")
        if isinstance(cov, dict) and cov and all(isinstance(k, str) for k in cov):
            vals = list(cov.values())
            if vals and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals[:20]):
                into.update(cov)
        att = obj.get("columns_attached")
        if isinstance(att, list) and att and all(isinstance(x, str) for x in att):
            into.update(att)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                harvest(v, into)
    elif isinstance(obj, list):
        for v in obj:
            if isinstance(v, (dict, list)):
                harvest(v, into)

allowed = set()
sources = []
for root in ROOTS:
    if not os.path.isdir(root):
        continue
    for dirpath, _, files in os.walk(root):
        if "mind_eq" in dirpath.replace("\\", "/"):
            continue
        for fn in files:
            if not fn.endswith(".json"):
                continue
            path = os.path.join(dirpath, fn)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                continue
            before = len(allowed)
            harvest(data, allowed)
            if len(allowed) > before:
                sources.append(path)
allowed = {c for c in allowed if "ftn" not in c.lower() and c not in BANNED and c.isidentifier()}

def idents(text):
    return [t for t in ID.findall(text) if t not in STOP]

def direct_rhs(rhs):
    try:
        tree = ast.parse(rhs.strip(), mode="eval")
    except SyntaxError:
        return None
    ok_nodes = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Name, ast.Constant, ast.Load,
                ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd, ast.Mod)
    names = []
    for n in ast.walk(tree):
        if not isinstance(n, ok_nodes):
            return None
        if isinstance(n, ast.Name):
            names.append(n.id)
        if isinstance(n, ast.Constant) and not isinstance(n.value, (int, float)):
            return None
    return names

def to_row_expr(rhs):
    tree = ast.parse(rhs.strip(), mode="eval")
    class R(ast.NodeTransformer):
        def visit_Name(self, node):
            return ast.Subscript(
                value=ast.Name(id="row", ctx=ast.Load()),
                slice=ast.Constant(node.id),
                ctx=ast.Load(),
            )
    new = R().visit(tree)
    ast.fix_missing_locations(new)
    return ast.unparse(new)

coded = []
blocked = []
skipped_copy = 0
skipped_not_formula = 0
miss_counts = collections.Counter()
n = 0
with open(EQ, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i > 8000:
            break
        n += 1
        if not line.strip():
            skipped_not_formula += 1
            continue
        o = json.loads(line)
        stmt = (o.get("statement") or "").strip()
        src = o.get("source_path")
        if not stmt or not OPS.search(stmt):
            skipped_not_formula += 1
            continue
        chunk = stmt.splitlines()[0].strip()
        if chunk.count("=") == 1:
            lhs, rhs = chunk.split("=", 1)
            names = direct_rhs(rhs)
            if names is not None and len(names) == 1 and not any(op in rhs for op in "+-*/%^"):
                skipped_copy += 1
                continue
            if names is not None and names and all(nm in allowed for nm in names) and any(op in rhs for op in "+-*/%^"):
                expr = to_row_expr(rhs)
                coded.append({
                    "line": i,
                    "source_path": src,
                    "statement": stmt,
                    "inputs": sorted(set(names)),
                    "expr": expr,
                    "lhs": lhs.strip(),
                })
                continue
        found = idents(chunk)
        missing = sorted({t for t in found if t not in allowed})
        if not missing:
            missing = ["<not a direct arithmetic expression of existing columns>"]
        for m in missing:
            if m != "<not a direct arithmetic expression of existing columns>":
                miss_counts[m] += 1
        blocked.append({
            "line": i,
            "source_path": src,
            "statement": stmt,
            "missing": missing,
        })

os.makedirs(OUT, exist_ok=True)
bp = os.path.join(OUT, "blocked.jsonl")
with open(bp, "w", encoding="utf-8") as f:
    for row in blocked:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
fp = os.path.join(OUT, "functions.py")
if coded:
    with open(fp, "w", encoding="utf-8", newline="\n") as f:
        f.write('"""PIT functions for stated equations whose every input is an existing column.\n')
        f.write("Home-minus-away columns already on the game row. Lag <= 2 seasons.\n")
        f.write("No h_qb_act. No FTN. Not a score and not a mint.\n")
        f.write('"""\n\n')
        f.write("FUNCTIONS = []\n\n")
        for c in coded:
            name = "eq_%06d" % c["line"]
            f.write("def %s(row):\n" % name)
            f.write("    # line %d %s\n" % (c["line"], (c["source_path"] or "").replace("\n", " ")))
            f.write("    # %s\n" % c["statement"].replace("\n", " ")[:500])
            f.write("    # inputs: %s\n" % ", ".join(c["inputs"]))
            f.write("    return %s\n\n" % c["expr"])
            f.write("FUNCTIONS.append(%s)\n\n" % name)
else:
    if os.path.exists(fp):
        os.remove(fp)
summary = {
    "lines_inclusive": "0-8000",
    "n_read": n,
    "allowed_columns": len(allowed),
    "column_sources": sources,
    "coded": len(coded),
    "coded_lines": [c["line"] for c in coded],
    "blocked": len(blocked),
    "skipped_not_formula": skipped_not_formula,
    "skipped_column_copy": skipped_copy,
    "top_missing": miss_counts.most_common(25),
    "banned_never_served": sorted(BANNED),
    "no_score": True,
    "no_mint": True,
}
with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)
print(json.dumps({k: summary[k] for k in ("n_read","allowed_columns","coded","blocked","skipped_not_formula","skipped_column_copy","top_missing")}, indent=2))
