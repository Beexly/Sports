import json, os, re, sys
sys.path.insert(0, r"eng")
import importlib.util
spec = importlib.util.spec_from_file_location("mind_eq_2_gate", r"eng/mind_eq_2/gate.py")
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
usable = g.load_columns()
src = r"eng/mind_eq_2/blocked.jsonl"
rows = []
with open(src, encoding="utf-8") as f:
    for line in f:
        rows.append(json.loads(line))
coded = []
body = []
kept = []
n_complex = 0
n_prose = 0
from collections import Counter
miss = Counter()
for o in rows:
    st = o["statement"]
    sp = o.get("source_path") or ""
    line_no = o.get("line")
    if "h_qb_act" in st or "a_qb_act" in st:
        o["reason"] = "banned_input"
        kept.append(o)
        n_complex += 1
        continue
    syms = g.symbols(st)
    lhs_text, rhs = g.split_eq(st)
    lhs = set(g.symbols(lhs_text))
    inputs = [s for s in syms if s not in lhs]
    present = [s for s in inputs if s in usable]
    missing = [s for s in inputs if s not in usable]
    dropped = []
    for tok in g.IDENT.findall(rhs):
        if tok in usable or tok.lower() in g.STOP:
            continue
        if tok not in missing and tok not in dropped:
            dropped.append(tok)
    missing = missing + [d for d in dropped if d not in present]
    complex_ = g.is_complex(st)
    note = o.get("note")
    compiled = None
    if complex_ and not missing and len(present) >= 1:
        compiled = g.compile_rhs(st, present)
    if compiled:
        expr, used = compiled
        lhs_raw = re.sub(r"^[^A-Za-z]+", "", lhs_text.strip())
        lhs_raw = lhs_raw.split()[0] if lhs_raw else ""
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", lhs_raw) and lhs_raw.lower() not in g.STOP:
            name = lhs_raw
        else:
            name = "eq_%d" % (len(coded) + 1)
        if any(c["name"] == name for c in coded):
            name = name + "_%d" % (len(coded) + 1)
        coded.append({"name": name, "source_path": sp, "statement": st, "columns": used, "expr": expr, "line": line_no})
        body.append("def %s(row):" % name)
        body.append("    return %s" % expr)
        body.append("")
        continue
    if not complex_:
        n_prose += 1
        reason = "not_a_complex_formula"
    elif not missing and present:
        n_complex += 1
        reason = "not_executable_arithmetic"
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
    kept.append(rec)
fn = ["import math", "", '"""mind_eq_2 complex equations.', "",
      "A function exists only when every input is an existing column or",
      "play-by-play field. Short names are not those columns. EPA_no-pressure",
      "is not clean_epa_baseline. An Elo subscript is not elo. h_qb_act is",
      "banned. FTN charting fields are not inputs. Nothing here is scored.",
      '"""', "", "FUNCTIONS = {"]
for c in coded:
    fn.append("    %r: %s," % (c["name"], c["name"]))
fn.append("}")
fn.append("")
text = "\n".join(fn + body)
if not text.endswith("\n"):
    text += "\n"
open(r"eng/mind_eq_2/functions.py", "w", encoding="utf-8", newline="\n").write(text)
with open(src, "w", encoding="utf-8", newline="\n") as out:
    for rec in kept:
        out.write(json.dumps(rec, ensure_ascii=False) + "\n")
summary = {
    "slice": "mind_eq_2 corpus-deep docs plus agent-bus sports and corpus-intelligence; not arxiv-sweep",
    "equations_file": g.EQ,
    "files_scanned": 3667,
    "owned_statements": len(rows),
    "functions_coded": len(coded),
    "complex_blocked": n_complex,
    "not_complex_recorded": n_prose,
    "blocked_file_rows": len(kept),
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
open(r"eng/mind_eq_2/summary.json", "w", encoding="utf-8", newline="\n").write(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
print("coded", len(coded))
print("blocked", len(kept))
for c in coded:
    print("FN", c["name"])
    print(c["expr"])
    print(c["columns"])
