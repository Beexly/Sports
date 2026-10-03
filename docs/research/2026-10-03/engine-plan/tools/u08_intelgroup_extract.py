#!/usr/bin/env python3
"""Deep-feed extractor: 5 GSE working directories -> JSONL shards (~8MB each).
Output: ~/workspace/eng-mine/shards-out/u08/intelgroup/intelgroup_NN.jsonl
"""
import os, re, json, csv, gzip, ast, io, math, sys
from collections import Counter

ROOTS = [
    os.path.expanduser("~/workspace/gse-intelligence-build"),
    os.path.expanduser("~/workspace/gse-repo-intel"),
    os.path.expanduser("~/workspace/wiring-wave2"),
    os.path.expanduser("~/workspace/improve-ledger-work"),
    os.path.expanduser("~/workspace/nfl-deep-dive"),
]
OUTDIR = os.path.expanduser("~/workspace/eng-mine/shards-out/u08/intelgroup")
SHARD_BYTES = 8_000_000
TEXT_PART = 48_000      # max body chars per text row before splitting
DATA_BATCH = 96_000     # target body bytes per batched data row (records atomic)

EXCLUDE_DIRS = {"venv", ".venv", "node_modules", ".git", "__pycache__"}
SKIP_BASENAMES = set()  # AGENTS.md handled by rule below
CACHE_SKIP = {
    ".pytest_cache/v/cache/nodeids": "transient pytest test-id index; test files themselves are fed",
    ".pytest_cache/README.md": "pytest boilerplate",
    ".pytest_cache/.gitignore": "pytest boilerplate",
    ".pytest_cache/CACHEDIR.TAG": "pytest boilerplate",
}

rows = []          # pending rows (list of dicts)
skips = []         # (path, reason)
per_root_counts = {}
row_types = Counter()

def is_skip(path, root):
    rel = os.path.relpath(path, root)
    base = os.path.basename(path)
    if base == "AGENTS.md":
        return "DEDUP lane: AGENTS.md fed separately"
    if "comp-intel" in rel.split(os.sep):
        return "DEDUP lane: comp-intel path"
    if "NFL_Analytics_Reverse-Engineering" in base and base.lower().endswith((".html", ".htm")):
        return "DEDUP lane: NFL_Analytics_Reverse-Engineering HTML"
    for k, reason in CACHE_SKIP.items():
        if rel == k or rel.endswith("/" + k):
            return reason
    return None

def walk(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS and not d.endswith(".egg-info"))
        for f in sorted(filenames):
            if f.endswith(".pyc"):
                continue
            out.append(os.path.join(dirpath, f))
    return out

def read_bytes(path):
    with open(path, "rb") as fh:
        return fh.read()

def is_textual(data, sample=8192):
    chunk = data[:sample]
    if b"\x00" in chunk:
        return False
    if not chunk:
        return True
    nontext = sum(1 for b in chunk if b < 9 or (13 < b < 32 and b != 27))
    return nontext / len(chunk) < 0.05

def decode(data):
    return data.decode("utf-8", errors="replace")

def split_text(text, limit=TEXT_PART):
    if len(text) <= limit:
        return [text]
    lines = text.split("\n")
    parts, cur, cur_len = [], [], 0
    for ln in lines:
        ln2 = ln if len(ln) <= limit else ln[:limit]  # pathological long line
        if cur and cur_len + len(ln2) + 1 > limit:
            parts.append("\n".join(cur)); cur, cur_len = [], 0
        cur.append(ln2); cur_len += len(ln2) + 1
    if cur:
        parts.append("\n".join(cur))
    return parts or [""]

def emit(source_path, root, fsize, row_type, title, body, equations=None, notes="", coverage="full"):
    rows.append({
        "source_path": source_path,
        "host": "vm",
        "bytes_read": fsize,
        "coverage": coverage,
        "row_type": row_type,
        "title": title[:300],
        "body": body,
        "equations": equations or [],
        "notes": notes[:4000],
    })
    row_types[row_type] += 1

def emit_parts(source_path, root, fsize, row_type, base_title, parts, equations=None, notes="", coverage="full"):
    n = len(parts)
    for i, p in enumerate(parts, 1):
        t = base_title if n == 1 else f"{base_title} (part {i}/{n})"
        emit(source_path, root, fsize, row_type, t, p, equations if i == 1 else [], notes, coverage)

# ---------------- md ----------------
FINDING_HINT = re.compile(r"audit|teardown|benchmark|result|report|eval|digest|summary|reconcil|validat|test|finding|complet", re.I)
ACTION_HINT = re.compile(r"\bplan\b|todo|handoff|roadmap|checklist|wiring|orchestrat", re.I)
EQN_HINT = re.compile(r"equation|formula", re.I)

def md_row_type(name):
    if EQN_HINT.search(name): return "equation"
    if FINDING_HINT.search(name): return "finding"
    if ACTION_HINT.search(name): return "action"
    return "concept"

def extract_md_equations(text):
    eqs = []
    for m in re.finditer(r"\$\$(.+?)\$\$", text, re.S):
        eqs.append(m.group(1).strip()[:300])
        if len(eqs) >= 30: break
    if len(eqs) < 30:
        for m in re.finditer(r"\\\[(.+?)\\\]", text, re.S):
            eqs.append(m.group(1).strip()[:300])
            if len(eqs) >= 30: break
    seen = set(); out = []
    for e in eqs:
        if e and e not in seen:
            seen.add(e); out.append(e)
    return out

def handle_md(path, root, data, fsize):
    text = decode(data)
    m = re.search(r"^#\s+(.+)$", text, re.M)
    head = m.group(1).strip()[:120] if m else os.path.basename(path)
    eqs = extract_md_equations(text)
    notes = f"Markdown doc; {len(text)} chars; {len(eqs)} display-math blocks extracted."
    emit_parts(path, root, fsize, md_row_type(os.path.basename(path)), head,
               split_text(text), eqs, notes)

# ---------------- py / ts ----------------
def py_notes(text):
    try:
        tree = ast.parse(text)
    except Exception:
        tree = None
    purpose = ""
    funcs, classes = [], []
    if tree:
        doc = ast.get_docstring(tree)
        if doc: purpose = doc.strip()[:800]
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)): funcs.append(node.name)
            elif isinstance(node, ast.ClassDef): classes.append(node.name)
    if not purpose:
        for line in text.split("\n")[:15]:
            s = line.strip()
            if s.startswith("#") and len(s) > 4:
                purpose = (purpose + " " + s.lstrip("# ").strip())[:800]
    eq_lines = []
    for line in text.split("\n"):
        s = line.strip()
        if len(s) > 300 or not s or s.startswith(("import ", "from ", "def ", "class ", "@")):
            continue
        if re.search(r"=\s*.*(\*\*|\*|/|np\.|math\.|sqrt|exp\(|log\(|sigmoid|softmax|mean\(|std\(|var\()", s):
            eq_lines.append(s[:250])
        if len(eq_lines) >= 30: break
    inputs = sorted(set(re.findall(r"""['"]([^'"]*\.(?:csv|json|parquet|pkl|npy|npz|txt))['"]""", text)))[:20]
    inputs += sorted(set(re.findall(r"""['"]((?:data|inputs|datasets)/[^'"]+)['"]""", text)))[:10]
    notes = f"Python module. purpose: {purpose or 'missing:purpose'}. functions({len(funcs)}): {', '.join(funcs[:40]) or 'missing'}. classes({len(classes)}): {', '.join(classes[:20]) or 'missing'}."
    if inputs: notes += f" data_inputs: {', '.join(inputs[:20])}."
    return notes, eq_lines

def ts_notes(text):
    m = re.search(r"/\*\*(.+?)\*/", text, re.S)
    purpose = re.sub(r"\s*\n\s*\*\s?", " ", m.group(1)).strip()[:800] if m else ""
    funcs = re.findall(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)", text)
    consts = re.findall(r"export\s+(?:const|let|var)\s+(\w+)", text)
    classes = re.findall(r"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)", text)
    ifaces = re.findall(r"(?:export\s+)?interface\s+(\w+)", text)
    types = re.findall(r"(?:export\s+)?type\s+(\w+)", text)
    eq_lines = []
    for line in text.split("\n"):
        s = line.strip()
        if len(s) > 300 or not s or s.startswith(("import ", "from ", "//")):
            continue
        if re.search(r"=\s*.*(\*\*|\*|/|Math\.|sqrt|exp\(|log\(|mean|std|var\()", s):
            eq_lines.append(s[:250])
        if len(eq_lines) >= 30: break
    notes = f"TypeScript module. purpose: {purpose or 'missing:purpose'}. functions({len(funcs)}): {', '.join(funcs[:40]) or 'missing'}. consts({len(consts)}): {', '.join(consts[:30]) or 'missing'}. classes: {', '.join(classes[:15]) or 'missing'}. interfaces: {', '.join(ifaces[:20]) or 'missing'}."
    return notes, eq_lines

def handle_code(path, root, data, fsize, lang):
    text = decode(data)
    notes, eqs = py_notes(text) if lang == "py" else ts_notes(text)
    base = os.path.basename(path)
    emit_parts(path, root, fsize, "method", f"{base} — {'Python' if lang=='py' else 'TypeScript'} source ({len(text)} chars)",
               split_text(text), eqs, notes)

# ---------------- json ----------------
def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def batch_records(path, root, fsize, records, ctx_title, ctx_notes):
    """records: list of objects. Emits ~DATA_BATCH rows with complete records."""
    batches, cur, cur_len = [], [], 0
    for r in records:
        s = compact(r)
        if cur and cur_len + len(s) + 1 > DATA_BATCH:
            batches.append(cur); cur, cur_len = [], 0
        cur.append(s); cur_len += len(s) + 1
    if cur:
        batches.append(cur)
    nparts = len(batches)
    if not nparts:
        emit(path, root, fsize, "data_source", f"{ctx_title} — empty", "[]", [],
             f"{ctx_notes} no records.", "full")
        return
    start = 1
    for i, b in enumerate(batches, 1):
        end = start + len(b) - 1
        emit(path, root, fsize, "data_source",
             f"{ctx_title} — records {start}–{end} (part {i}/{nparts})",
             "[" + ",".join(b) + "]", [], f"{ctx_notes} batch part {i}/{nparts}.", "full")
        start = end + 1

def find_record_lists(node, max_depth=8, node_budget=60000):
    """Recursively find lists-of-dicts (records) anywhere in a JSON tree.
    Returns [(path, records)]."""
    found = []
    stack = [(node, "$", 0)]
    seen = 0
    while stack and seen < node_budget:
        cur, path, depth = stack.pop()
        seen += 1
        if depth > max_depth:
            continue
        if isinstance(cur, dict):
            for k, v in cur.items():
                stack.append((v, f"{path}.{k}", depth + 1))
        elif isinstance(cur, list):
            if len(cur) >= 2 and sum(isinstance(x, dict) for x in cur[:5]) >= 2:
                found.append((path, cur))
            for j, x in enumerate(cur):
                if isinstance(x, (dict, list)):
                    stack.append((x, f"{path}[{j}]", depth + 1))
                    if j >= 50:  # bound fan-out; payload lists are usually uniform
                        break
    return found

def top_is_records(d):
    return (isinstance(d, dict) and len(d) > 20
            and sum(isinstance(x, dict) for x in list(d.values())[:10]) >= 5)

def handle_json(path, root, data, fsize):
    text = decode(data)
    try:
        obj = json.loads(text)
    except Exception as e:
        emit_parts(path, root, fsize, "data_source", os.path.basename(path) + " — unparseable JSON, raw text",
                   split_text(text), [], f"JSON parse failed: {e}. Raw text preserved.")
        return
    base = os.path.basename(path)
    if isinstance(obj, list):
        batch_records(path, root, fsize, obj, base, f"JSON array, {len(obj)} records, {fsize} bytes.")
    elif isinstance(obj, dict):
        if top_is_records(obj):
            recs = [{"_key": kk, **(vv if isinstance(vv, dict) else {"value": vv})}
                    for kk, vv in obj.items()]
            batch_records(path, root, fsize, recs, base,
                          f"JSON object is itself a record dict ({len(obj)} records keyed by id).")
            return
        cands = find_record_lists(obj)
        if cands:
            cands.sort(key=lambda pr: sum(len(compact(r)) for r in pr[1]), reverse=True)
            best_path, best_recs = cands[0]
            best_bytes = sum(len(compact(r)) for r in best_recs)
            if best_bytes >= 48_000:
                meta = {k: (v if isinstance(v, (str, int, float, bool)) or v is None else f"<{type(v).__name__}>")
                        for k, v in obj.items()}
                batch_records(path, root, fsize, best_recs, f"{base}[{best_path}]",
                              f"JSON object; payload record list at {best_path} ({len(best_recs)} records, "
                              f"~{best_bytes} bytes); top-level metadata: {compact(meta)[:800]}")
                return
        emit_parts(path, root, fsize, "data_source", base + " — full JSON object",
                   split_text(json.dumps(obj, ensure_ascii=False, indent=1)), [],
                   f"JSON object (no dominant record list), keys: {list(obj.keys())[:30]}, {fsize} bytes.")
    else:
        emit(path, root, fsize, "data_source", base, text[:DATA_BATCH], [],
             f"JSON scalar, {fsize} bytes.")

def handle_jsonl(path, root, data, fsize):
    text = decode(data)
    lines = [ln for ln in text.split("\n") if ln.strip()]
    recs = []
    for ln in lines:
        try: recs.append(json.loads(ln))
        except Exception: recs.append({"_raw": ln[:2000]})
    batch_records(path, root, fsize, recs, os.path.basename(path), f"JSONL, {len(recs)} lines, {fsize} bytes.")

# ---------------- csv ----------------
def handle_csv(path, root, data, fsize, delimiter=","):
    text = decode(data)
    base = os.path.basename(path)
    if fsize < 200_000:
        try:
            nrows = sum(1 for _ in csv.reader(io.StringIO(text))) - 1
        except Exception:
            nrows = "missing"
        notes = f"CSV full content, {fsize} bytes, ~{nrows} data rows."
        emit_parts(path, root, fsize, "data_source", f"{base} — full CSV ({nrows} rows)", split_text(text), [], notes)
        return
    # stats mode
    try:
        rdr = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        cols = rdr.fieldnames or []
        n = 0
        nulls = Counter(); num = {c: [] for c in cols}; cats = {c: Counter() for c in cols}
        first20 = []
        for row in rdr:
            n += 1
            if n <= 20: first20.append(row)
            for c in cols:
                v = (row.get(c) or "").strip()
                if v == "": nulls[c] += 1; continue
                try:
                    fv = float(v)
                    num[c].append(fv)
                except ValueError:
                    pass
                if len(cats[c]) < 5000: cats[c][v] += 1
        colrep = []
        for c in cols:
            vals = num[c]
            if len(vals) > max(1, (n - nulls[c]) * 0.8):
                mean = sum(vals)/len(vals)
                var = sum((x-mean)**2 for x in vals)/len(vals)
                colrep.append(f"{c}: numeric n={len(vals)} null={nulls[c]} min={min(vals):.4g} max={max(vals):.4g} mean={mean:.4g} std={math.sqrt(var):.4g}")
            else:
                top = cats[c].most_common(5)
                colrep.append(f"{c}: categorical/null n_nonnull={n-nulls[c]} null={nulls[c]} nunique~{len(cats[c])} top={top}")
        body = (f"CSV SUMMARY (full content not embedded; file {fsize} bytes)\n"
                f"rows={n} cols={len(cols)}\ncolumns: {', '.join(cols)}\n\n"
                f"COLUMN STATS:\n" + "\n".join(colrep) +
                f"\n\nFIRST 20 ROWS:\n" + json.dumps(first20, ensure_ascii=False, indent=1)[:20000])
        notes = f"CSV summary: {n} rows x {len(cols)} cols; full content {fsize} bytes (>200KB threshold)."
        emit(path, root, fsize, "data_source", f"{base} — CSV summary ({n} rows x {len(cols)} cols)", body, [], notes, "summary")
    except Exception as e:
        emit(path, root, fsize, "data_source", base + " — CSV parse failed, raw head",
             text[:DATA_BATCH], [], f"CSV parse error: {e}; raw head preserved.", "filtered")

# ---------------- txt / log ----------------
METRIC_RE = re.compile(r"\d|ADAPT|REJECT|GATE|VERDICT|accuracy|error|fail|pass|metric|RMSE|AUC|Brier|F1|MAE|logloss|===|---|±|%|\b[A-Z]{2,}\b")

def handle_txt(path, root, data, fsize):
    text = decode(data)
    base = os.path.basename(path)
    if fsize < 100_000:
        emit_parts(path, root, fsize, "finding", f"{base} — full text ({len(text)} chars)",
                   split_text(text), [], f"Text/log full content, {fsize} bytes.")
        return
    kept = [ln for ln in text.split("\n") if METRIC_RE.search(ln)]
    body = "\n".join(kept)
    notes = (f"Large text/log ({fsize} bytes): kept {len(kept)} of {len(text.split(chr(10)))} lines matching "
             f"result/metric/error/number patterns; pure prose lines dropped.")
    emit_parts(path, root, fsize, "finding", f"{base} — metric/result lines ({len(kept)} lines)",
               split_text(body), [], notes, "filtered")

# ---------------- config / misc text ----------------
def handle_config(path, root, data, fsize):
    text = decode(data)
    base = os.path.basename(path)
    emit_parts(path, root, fsize, "method", f"{base} — full config/script ({len(text)} chars)",
               split_text(text), [], f"Config/script full content, {fsize} bytes.")

# ---------------- binaries ----------------
def handle_binary(path, root, data, fsize, ext):
    base = os.path.basename(path)
    desc = [f"BINARY SUMMARY (raw bytes never embedded); file {fsize} bytes, extension .{ext}"]
    try:
        if ext == "npy":
            import numpy as np
            a = np.load(io.BytesIO(data), allow_pickle=False, mmap_mode=None)
            desc.append(f"npy: shape={a.shape} dtype={a.dtype}")
            if a.size and np.issubdtype(a.dtype, np.number):
                desc.append(f"stats: min={float(a.min()):.6g} max={float(a.max()):.6g} mean={float(a.mean()):.6g} std={float(a.std()):.6g}")
            desc.append(f"sample flat[:5]: {a.flat[:5].tolist() if a.size else []}")
        elif ext == "npz":
            import numpy as np
            z = np.load(io.BytesIO(data), allow_pickle=False)
            desc.append(f"npz keys: {list(z.files)}")
            for k in z.files[:20]:
                a = z[k]
                desc.append(f"  {k}: shape={a.shape} dtype={a.dtype}")
        elif ext == "parquet":
            import pandas as pd
            df = pd.read_parquet(io.BytesIO(data))
            desc.append(f"parquet: rows={len(df)} cols={list(df.columns)}")
            desc.append(f"dtypes: {dict(df.dtypes.astype(str))}")
            desc.append("describe:\n" + df.describe(include="all").to_string()[:3000])
            desc.append("sample 5 rows:\n" + df.head(5).to_string()[:3000])
        elif ext in ("pkl", "pickle"):
            desc.append("pickle: unpickling skipped (arbitrary code risk); type/shape UNVERIFIED from header only.")
            desc.append(f"first 64 bytes hex: {data[:64].hex()}")
        else:
            desc.append(f"first 64 bytes hex: {data[:64].hex()}")
    except Exception as e:
        desc.append(f"inspection failed: {e}")
    emit(path, root, fsize, "data_source", base + " — binary summary", "\n".join(desc), [],
         f"Binary data file described, not embedded.", "summary")

def handle_gz(path, root, data, fsize):
    base = os.path.basename(path)
    try:
        raw = gzip.decompress(data)
    except Exception as e:
        handle_binary(path, root, data, fsize, "gz")
        return
    if base.endswith(".csv.gz"):
        handle_csv(path, root, raw, len(raw))
        return
    if is_textual(raw):
        t = decode(raw)
        emit_parts(path, root, fsize, "data_source", f"{base} — decompressed text ({len(raw)} bytes)",
                   split_text(t), [], f"gzip-compressed text; decompressed {len(raw)} bytes.")
    else:
        handle_binary(path, root, raw, len(raw), "gz-inner")

# ---------------- dispatcher ----------------
CODE_EXT = {"py", "ts"}
CONFIG_EXT = {"yaml", "yml", "ini", "toml", "cfg", "sh", "rst", "gitignore", "ghq", "env", "sample"}

def process_file(path, root):
    reason = is_skip(path, root)
    if reason:
        skips.append((path, reason)); return
    fsize = os.path.getsize(path)
    data = read_bytes(path)
    base = os.path.basename(path)
    ext = base.rsplit(".", 1)[-1].lower() if "." in base else ""
    if base.endswith(".csv.gz"):
        handle_gz(path, root, data, fsize); return
    if ext == "gz":
        handle_gz(path, root, data, fsize); return
    if ext in ("parquet", "pkl", "pickle", "npy", "npz"):
        handle_binary(path, root, data, fsize, ext); return
    if ext == "md":
        handle_md(path, root, data, fsize); return
    if ext in CODE_EXT:
        handle_code(path, root, data, fsize, ext); return
    if ext == "json":
        handle_json(path, root, data, fsize); return
    if ext == "jsonl":
        handle_jsonl(path, root, data, fsize); return
    if ext == "csv":
        handle_csv(path, root, data, fsize); return
    if ext in ("txt", "log"):
        handle_txt(path, root, data, fsize); return
    if ext in CONFIG_EXT:
        handle_config(path, root, data, fsize); return
    if base in ("lastfailed", "test-results", "failures"):
        emit(path, root, fsize, "finding", base + " — failing-test evidence (full)",
             decode(data), [], "Pytest lastfailed cache: names the currently failing tests.", "full")
        return
    if is_textual(data):
        handle_config(path, root, data, fsize); return
    handle_binary(path, root, data, fsize, ext or "unknown")

def write_shards():
    os.makedirs(OUTDIR, exist_ok=True)
    idx, cur_size, fh = 0, 0, None
    def new_shard():
        nonlocal idx, cur_size, fh
        if fh: fh.close()
        p = os.path.join(OUTDIR, f"intelgroup_{idx:02d}.jsonl")
        fh = open(p, "w", encoding="utf-8"); idx += 1; cur_size = 0
        return p
    new_shard()
    for r in rows:
        line = json.dumps(r, ensure_ascii=False) + "\n"
        b = len(line.encode("utf-8"))
        if cur_size > 0 and cur_size + b > SHARD_BYTES:
            new_shard()
        fh.write(line); cur_size += b
    if fh: fh.close()
    return idx

def main():
    total_files = 0
    for root in ROOTS:
        files = walk(root)
        per_root_counts[os.path.basename(root)] = {"found": len(files), "processed": 0, "skipped": 0}
        for p in files:
            before_skips = len(skips)
            try:
                process_file(p, root)
            except Exception as e:
                skips.append((p, f"EXTRACTION ERROR (not retried): {e}"))
            total_files += 1
            if len(skips) > before_skips:
                per_root_counts[os.path.basename(root)]["skipped"] += 1
            else:
                per_root_counts[os.path.basename(root)]["processed"] += 1
    n_shards = write_shards()
    total_bytes = sum(os.path.getsize(os.path.join(OUTDIR, f)) for f in os.listdir(OUTDIR) if f.endswith(".jsonl"))
    summary = {
        "per_root": per_root_counts,
        "total_files_seen": total_files,
        "rows_by_type": dict(row_types),
        "total_rows": len(rows),
        "shards": n_shards,
        "bytes_written": total_bytes,
        "skips": [{"path": p, "reason": r} for p, r in skips],
    }
    print(json.dumps(summary, indent=1))

if __name__ == "__main__":
    main()
