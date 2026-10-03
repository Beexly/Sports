#!/usr/bin/env python3
"""Extract mimo-verl repo files into JSONL shards for the GSE mind."""
import json, os, ast, re, sys

SRC = os.path.expanduser("~/workspace/mimo-verl")
OUTDIR = os.path.expanduser("~/workspace/eng-mine/shards-out/u08/mimoverl")
os.makedirs(OUTDIR, exist_ok=True)

FILELIST = sys.argv[1]
with open(FILELIST) as f:
    files = [l.strip() for l in f if l.strip()]

rows = []          # list of (jsonline_str, nbytes)
skipped = []       # (path, reason)
stats = {}         # ext -> count
rowtypes = {}      # row_type -> count

def add(obj):
    s = json.dumps(obj, ensure_ascii=False)
    rows.append((s, len(s.encode('utf-8'))))
    rt = obj["row_type"]
    rowtypes[rt] = rowtypes.get(rt, 0) + 1

def py_notes(src_text, path):
    """Extract module docstring + top-level classes/functions via ast."""
    try:
        tree = ast.parse(src_text)
    except Exception:
        return "UNVERIFIED parse: syntax parse failed"
    parts = []
    doc = ast.get_docstring(tree)
    if doc:
        parts.append("MODULE: " + doc.strip()[:2000])
    for node in tree.body:
        if isinstance(node, (ast.ClassDef,)):
            cdoc = ast.get_docstring(node) or ""
            bases = [ast.unparse(b) for b in node.bases] if hasattr(ast, "unparse") else []
            parts.append(f"CLASS {node.name}({', '.join(bases)}): {cdoc.strip()[:600]}")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            fdoc = ast.get_docstring(node) or ""
            args = [a.arg for a in node.args.args]
            parts.append(f"FUNC {node.name}({', '.join(args)}): {fdoc.strip()[:400]}")
    # loss/reward formula hunt
    forms = []
    for pat in [r'def\s+\w*(loss|reward|advantage|objective|compute\w*policy)\w*\s*\(', r'loss\s*=\s*[^\n]{0,120}', r'reward\s*=\s*[^\n]{0,120}']:
        for m in re.finditer(pat, src_text[:60000]):
            forms.append(m.group(0).strip())
    if forms:
        parts.append("FORMULA-LINES: " + " | ".join(forms[:12]))
    return "\n".join(parts)[:4000] if parts else "UNVERIFIED: no docstring/classes/functions found"

def process_py(path):
    with open(path, 'rb') as f:
        raw = f.read()
    try:
        text = raw.decode('utf-8', errors='replace')
    except Exception:
        text = raw.decode('latin-1', errors='replace')
    rel = os.path.relpath(path, SRC)
    add({
        "source_path": path, "host": "vm", "bytes_read": len(raw),
        "coverage": "full", "row_type": "method",
        "title": f"verl module: {rel}",
        "body": text,
        "equations": [],
        "notes": py_notes(text, path),
    })
    stats['py'] = stats.get('py', 0) + 1

def process_md_rst(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    rel = os.path.relpath(path, SRC)
    chunk = 50000
    if len(text) <= chunk:
        chunks = [text]
    else:
        chunks = [text[i:i+chunk] for i in range(0, len(text), chunk)]
    for i, c in enumerate(chunks):
        t = f"doc: {rel}" + (f" (part {i+1}/{len(chunks)})" if len(chunks) > 1 else "")
        add({
            "source_path": path, "host": "vm", "bytes_read": len(raw),
            "coverage": "full", "row_type": "concept",
            "title": t, "body": c, "equations": [],
            "notes": "DOC file in verl (RL framework for LLMs) — concepts, recipes, guides",
        })
    ext = path.rsplit('.', 1)[-1]
    stats[ext] = stats.get(ext, 0) + 1

def process_yaml(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    rel = os.path.relpath(path, SRC)
    add({
        "source_path": path, "host": "vm", "bytes_read": len(raw),
        "coverage": "full", "row_type": "data_source",
        "title": f"config: {rel}", "body": text, "equations": [],
        "notes": "verl config — hyperparameters / deployment settings matter for RL training design",
    })
    ext = path.rsplit('.', 1)[-1]
    stats[ext] = stats.get(ext, 0) + 1

def process_sh(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    rel = os.path.relpath(path, SRC)
    add({
        "source_path": path, "host": "vm", "bytes_read": len(raw),
        "coverage": "full", "row_type": "action",
        "title": f"script: {rel}", "body": text, "equations": [],
        "notes": "shell script in verl — training launch commands / recipes show real RL training invocations",
    })
    stats['sh'] = stats.get('sh', 0) + 1

def process_json(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    rel = os.path.relpath(path, SRC)
    add({
        "source_path": path, "host": "vm", "bytes_read": len(raw),
        "coverage": "full", "row_type": "data_source",
        "title": f"json: {rel}", "body": text, "equations": [],
        "notes": "JSON record in verl",
    })
    stats['json'] = stats.get('json', 0) + 1

def process_txt(path):
    with open(path, 'rb') as f:
        raw = f.read()
    rel = os.path.relpath(path, SRC)
    if len(raw) < 100 * 1024:
        text = raw.decode('utf-8', errors='replace')
    else:
        lines = raw.decode('utf-8', errors='replace').splitlines()
        text = "\n".join(lines[:200]) + f"\n... [{len(lines)-200} more lines, coverage partial]"
    add({
        "source_path": path, "host": "vm", "bytes_read": len(raw),
        "coverage": "full", "row_type": "concept",
        "title": f"text: {rel}", "body": text, "equations": [],
        "notes": "plain text file in verl",
    })
    stats['txt'] = stats.get('txt', 0) + 1

for path in sorted(files):
    name = os.path.basename(path)
    if name == "AGENTS.md":
        skipped.append((path, "dedup: fed in another lane"))
        continue
    if path.endswith('.py'):
        process_py(path)
    elif path.endswith('.md') or path.endswith('.rst'):
        process_md_rst(path)
    elif path.endswith('.yaml') or path.endswith('.yml'):
        process_yaml(path)
    elif path.endswith('.sh'):
        process_sh(path)
    elif path.endswith('.json'):
        process_json(path)
    elif path.endswith('.txt'):
        process_txt(path)
    else:
        skipped.append((path, f"out of scope: unlisted extension {path.rsplit('.',1)[-1] if '.' in name else 'noext'}"))
        stats['skipped_other'] = stats.get('skipped_other', 0) + 1

# write shards at ~8MB each
LIMIT = 8 * 1024 * 1024
idx, cur, cur_bytes = 0, [], 0
def flush():
    global idx, cur, cur_bytes
    if not cur:
        return
    p = os.path.join(OUTDIR, f"mimoverl_{idx:02d}.jsonl")
    with open(p, 'w') as f:
        f.write("\n".join(cur) + "\n")
    print(f"WROTE {p} rows={len(cur)} bytes={cur_bytes}", flush=True)
    idx += 1
    cur, cur_bytes = [], 0

for s, b in rows:
    if cur_bytes + b > LIMIT and cur:
        flush()
    cur.append(s)
    cur_bytes += b
flush()

print("EXT-STATS", json.dumps(stats), flush=True)
print("ROWTYPE-STATS", json.dumps(rowtypes), flush=True)
print("ROWS", len(rows), flush=True)
print("SKIPPED", len(skipped), flush=True)
with open(os.path.join(OUTDIR, "_skipped.tsv"), 'w') as f:
    for p, r in skipped:
        f.write(f"{p}\t{r}\n")
total_out = sum(os.path.getsize(os.path.join(OUTDIR, f)) for f in os.listdir(OUTDIR) if f.endswith('.jsonl'))
print("TOTAL-OUT-BYTES", total_out, flush=True)
