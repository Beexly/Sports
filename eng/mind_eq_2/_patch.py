from pathlib import Path
p = Path(r"eng/mind_eq_2/gate.py")
t = p.read_text(encoding="utf-8-sig")
start = t.find("def compile_rhs(")
end = t.find("def main(")
if start < 0 or end < 0:
    raise SystemExit("markers missing %s %s" % (start, end))
new = r'''CALLS = {"sin": "math.sin", "sqrt": "math.sqrt", "log": "math.log", "abs": "abs", "min": "min", "max": "max"}

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

'''
t = t[:start] + new + t[end:]
t = t.replace(
    'lhs = set(symbols(st.split("=", 1)[0])) if "=" in st else set()\n            inputs = [s for s in syms if s not in lhs]\n            present = [s for s in inputs if s in usable]\n            missing = [s for s in inputs if s not in usable]\n            rhs = st.split("=", 1)[1] if "=" in st else ""',
    'lhs_text, rhs = split_eq(st)\n            lhs = set(symbols(lhs_text))\n            inputs = [s for s in syms if s not in lhs]\n            present = [s for s in inputs if s in usable]\n            missing = [s for s in inputs if s not in usable]',
)
t = t.replace(
    'missing = missing + [d for d in dropped if d not in present and len(d) >= 3]\n            short = [d for d in dropped if d not in present and len(d) < 3]\n            if not missing and not present and short:\n                missing = short',
    'missing = missing + [d for d in dropped if d not in present]',
)
t = t.replace('if complex_ and not missing and len(present) >= 2:', 'if complex_ and not missing and len(present) >= 1:')
t = t.replace('elif not missing and len(present) >= 2:', 'elif not missing and len(present) >= 1:')
t = t.replace('lhs_raw = st.split("=", 1)[0].strip()', 'lhs_raw = split_eq(st)[0].strip()')
t = t.replace('fn_lines = [\n        \'"""mind_eq_2 complex equations.',
              'fn_lines = [\n        "import math",\n        "",\n        \'"""mind_eq_2 complex equations.', 1)
if "def split_eq" not in t or "import math" not in t:
    raise SystemExit("patch incomplete")
p.write_text(t, encoding="utf-8")
print("ok", t.count("def compile_rhs"))
