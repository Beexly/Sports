#!/usr/bin/env python3
"""Deep-feed: Sports repo non-Markdown + packages -> mind shards u_09_sportsdeep_*.
Full content, split-don't-truncate. No git push. Never invents.
"""
import os, json, csv, re, sys, io, tarfile, hashlib
from datetime import datetime

HOME = os.path.expanduser("~")
SPORTS_DOCS = os.path.join(HOME, "workspace", "sports-docs")
VENDOR = os.path.join(HOME, "workspace", "vendor", "Sports")
OUT_DIR = os.path.join(HOME, "workspace", "eng-mine", "shards-out")
PREFIX = "mind_knowledge_u_09_sportsdeep"
SHARD_MAX = 8_000_000
BODY_MAX = 200_000  # max body chars per row; split beyond this
os.makedirs(OUT_DIR, exist_ok=True)

shard_idx = 0
shard_bytes = 0
shard_fh = None
stats = {"files": 0, "rows": 0, "bytes_in": 0, "by_type": {}, "skipped": []}

def new_shard():
    global shard_idx, shard_bytes, shard_fh
    if shard_fh: shard_fh.close()
    path = os.path.join(OUT_DIR, f"{PREFIX}_{shard_idx:02d}.jsonl")
    shard_fh = open(path, "w", encoding="utf-8")
    shard_idx += 1
    shard_bytes = 0
    return path

new_shard()

def emit(source_path, bytes_read, coverage, row_type, title, body, equations=None, extra=None):
    global shard_bytes
    row = {"source_path": source_path, "host": "vm", "bytes_read": bytes_read,
           "coverage": coverage, "row_type": row_type, "title": title, "body": body,
           "equations": equations or []}
    if extra: row.update(extra)
    line = json.dumps(row, ensure_ascii=False)
    global shard_fh
    if shard_bytes + len(line.encode("utf-8")) > SHARD_MAX:
        new_shard()
    shard_fh.write(line + "\n")
    shard_bytes += len(line.encode("utf-8"))
    stats["rows"] += 1
    stats["by_type"][row_type] = stats["by_type"].get(row_type, 0) + 1

EQ_PAT = re.compile(r"(=|:=|<-|→|≈|\+=|-=|\*=|/=)")
MATH_HINT = re.compile(r"(\*\*|Math\.|np\.|numpy|sum\(|mean\(|std\(|exp\(|log\(|sqrt\(|sigmoid|softmax|regress|kelly|poisson|normal\(|sigma|σ|α|β|λ|μ|Φ|brier|calibrat|likelihood|gradient|matrix|dot\(|\bEPA\b|\bWPA\b|\bCPOE\b)", re.I)
# config/env assignments are not equations (RHS has no arithmetic)
ENV_ASSIGN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(\"[^\"]*\"|'[^']*'|[A-Za-z0-9_:/.@?&=;~$-]+)\s*(#.*)?$")

def extract_equations(text, limit=60):
    eqs, seen = [], set()
    for ln in text.splitlines():
        s = ln.strip()
        if len(s) < 8 or len(s) > 400: continue
        if s.startswith(("#", "//", "--", "*", "<", ">", "|")): continue
        if "<redacted>" in s.lower(): continue
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(#|$)", s): continue  # empty assignment
        if ENV_ASSIGN.match(s): continue
        if EQ_PAT.search(s) and MATH_HINT.search(s):
            s2 = re.sub(r"\s+", " ", s)
            if s2 not in seen:
                seen.add(s2); eqs.append(s2)
                if len(eqs) >= limit: break
    return eqs

def chunk_text(text, max_chars=BODY_MAX):
    if len(text) <= max_chars: return [text]
    chunks, cur, cur_len = [], [], 0
    for ln in text.splitlines(keepends=True):
        if cur_len + len(ln) > max_chars and cur:
            chunks.append("".join(cur)); cur, cur_len = [], 0
        cur.append(ln); cur_len += len(ln)
    if cur: chunks.append("".join(cur))
    return chunks

def read_text(path):
    for enc in ("utf-8", "latin-1"):
        try:
            with open(path, "r", encoding=enc) as f: return f.read()
        except Exception: pass
    return None

# ---------- file-type handlers ----------

def handle_json(path, size):
    txt = read_text(path)
    if txt is None:
        stats["skipped"].append((path, "undecodable")); return
    try:
        data = json.loads(txt)
    except Exception as e:
        emit(path, size, "full", "data_source", f"JSON (unparseable) {os.path.basename(path)}",
             f"File failed JSON parse ({e}). Raw text follows.\n\n{txt[:BODY_MAX]}")
        return
    full = json.dumps(data, ensure_ascii=False, indent=1)
    if len(full) <= BODY_MAX:
        emit(path, size, "full", "data_source", f"JSON dataset {os.path.basename(path)}", full)
        return
    # split: list -> batched items; dict -> batched key groups
    if isinstance(data, list):
        batch, blen, bstart = [], 0, 0
        for i, item in enumerate(data):
            s = json.dumps(item, ensure_ascii=False)
            if blen + len(s) > 150_000 and batch:
                emit(path, size, "full", "data_source",
                     f"JSON dataset {os.path.basename(path)} records {bstart}-{i-1}",
                     "\n".join(json.dumps(x, ensure_ascii=False) for x in batch))
                batch, blen, bstart = [], 0, i
            batch.append(item); blen += len(s)
        if batch:
            emit(path, size, "full", "data_source",
                 f"JSON dataset {os.path.basename(path)} records {bstart}-{bstart+len(batch)-1}",
                 "\n".join(json.dumps(x, ensure_ascii=False) for x in batch))
    elif isinstance(data, dict):
        keys = list(data.keys()); batch, blen, bstart = {}, 0, 0
        for i, k in enumerate(keys):
            s = json.dumps({k: data[k]}, ensure_ascii=False)
            if blen + len(s) > 150_000 and batch:
                emit(path, size, "full", "data_source",
                     f"JSON dataset {os.path.basename(path)} keys[{bstart}:{i}]",
                     json.dumps(batch, ensure_ascii=False, indent=1))
                batch, blen, bstart = {}, 0, i
            batch[k] = data[k]; blen += len(s)
        if batch:
            emit(path, size, "full", "data_source",
                 f"JSON dataset {os.path.basename(path)} keys[{bstart}:{len(keys)}]",
                 json.dumps(batch, ensure_ascii=False, indent=1))
    else:
        for i, ch in enumerate(chunk_text(full)):
            emit(path, size, "full", "data_source",
                 f"JSON dataset {os.path.basename(path)} part {i+1}", ch)

def handle_jsonl(path, size):
    lines = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for ln in f:
            if ln.strip(): lines.append(ln.rstrip("\n"))
    batch, blen, bstart = [], 0, 0
    for i, ln in enumerate(lines):
        if blen + len(ln) > 150_000 and batch:
            emit(path, size, "full", "data_source",
                 f"JSONL {os.path.basename(path)} lines {bstart+1}-{i}",
                 "\n".join(batch))
            batch, blen, bstart = [], 0, i
        batch.append(ln); blen += len(ln)
    if batch:
        emit(path, size, "full", "data_source",
             f"JSONL {os.path.basename(path)} lines {bstart+1}-{len(lines)}",
             "\n".join(batch))
    if not lines:
        emit(path, size, "full", "data_source", f"JSONL {os.path.basename(path)} (empty)", "Empty file.")

def handle_csv(path, size):
    try:
        with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:
            reader = csv.reader(f)
            rows = list(reader)
    except Exception as e:
        stats["skipped"].append((path, f"csv read error {e}")); return
    if not rows:
        emit(path, size, "full", "data_source", f"CSV {os.path.basename(path)} (empty)", "Empty file."); return
    header = rows[0]
    title_base = f"CSV table {os.path.basename(path)} ({len(rows)-1} data rows x {len(header)} cols)"
    meta = f"Columns: {', '.join(header)}\nRows: {len(rows)-1} data rows.\n\n"
    batch, blen, bstart = [], 0, 1
    def flush(end):
        body = meta + "\n".join(batch)
        emit(path, size, "full", "data_source",
             f"{title_base} rows {bstart}-{end}", body)
    for i, r in enumerate(rows[1:], start=1):
        s = ",".join('"%s"' % c.replace('"', '""') if ("," in c or '"' in c or "\n" in c) else c for c in r)
        if blen + len(s) > 150_000 and batch:
            flush(i - 1); batch, blen, bstart = [], 0, i
        batch.append(s); blen += len(s)
    if batch: flush(len(rows) - 1)

def handle_parquet(path, size):
    try:
        import pyarrow.parquet as pq
        import pyarrow.compute as pc
    except Exception as e:
        stats["skipped"].append((path, f"pyarrow missing: {e}")); return
    try:
        pf = pq.ParquetFile(path)
        schema = [(f.name, str(f.type)) for f in pf.schema_arrow]
        n = pf.metadata.num_rows
        body = [f"Parquet: {os.path.basename(path)}", f"Rows: {n}",
                f"Columns ({len(schema)}):"]
        for nm, tp in schema: body.append(f"  - {nm}: {tp}")
        # stats per column (first row-group sample)
        try:
            tbl = pf.read_row_group(0) if pf.num_row_groups else pf.read()
            body.append("\nColumn stats (from data):")
            for col in tbl.column_names:
                c = tbl.column(col)
                nn = pc.count(c).as_py()
                nulls = c.null_count
                line = f"  - {col}: non_null={nn}, null={nulls}"
                try:
                    import pyarrow as pa
                    if pa.types.is_floating(c.type) or pa.types.is_integer(c.type):
                        line += f", min={pc.min(c).as_py()}, max={pc.max(c).as_py()}, mean={round(float(pc.mean(c).as_py()),4) if pc.mean(c).as_py() is not None else None}"
                except Exception: pass
                body.append(line)
            # sample rows
            sample = tbl.slice(0, 25).to_pylist()
            body.append(f"\nFirst 25 rows (sample):\n{json.dumps(sample, ensure_ascii=False, indent=1, default=str)}")
        except Exception as e:
            body.append(f"\n(stats/sample failed: {e})")
        emit(path, size, "schema+stats+sample", "data_source",
             f"Parquet dataset {os.path.basename(path)} — schema, stats, sample ({n} rows)",
             "\n".join(body))
    except Exception as e:
        stats["skipped"].append((path, f"parquet read error {e}"))

def handle_archive(path, size):
    try:
        with tarfile.open(path, "r") as tf:
            members = [(m.name, m.size) for m in tf.getmembers() if m.isfile()]
    except Exception as e:
        stats["skipped"].append((path, f"archive read error {e}")); return
    total = sum(s for _, s in members)
    body = [f"Archive: {os.path.basename(path)}", f"Members: {len(members)}, total {total} bytes",
            "Full member inventory:"]
    for nm, sz in sorted(members): body.append(f"  {sz:>12}  {nm}")
    emit(path, size, "inventory", "data_source",
         f"Archive inventory {os.path.basename(path)} ({len(members)} members)", "\n".join(body))

def handle_binary_meta(path, size, kind):
    emit(path, size, "metadata", "data_source",
         f"Binary asset {os.path.basename(path)} ({kind})",
         f"Binary file not parsed as text.\nPath: {path}\nSize: {size} bytes\nKind: {kind}")

def handle_text_full(path, size, row_type, title_prefix=""):
    txt = read_text(path)
    if txt is None:
        stats["skipped"].append((path, "undecodable")); return
    eqs = extract_equations(txt)
    chunks = chunk_text(txt)
    for i, ch in enumerate(chunks):
        t = f"{title_prefix}{os.path.basename(path)}"
        if len(chunks) > 1: t += f" part {i+1}/{len(chunks)}"
        emit(path, size, "full", row_type, t, ch, equations=eqs if i == 0 else [])

def handle_code(path, size):
    txt = read_text(path)
    if txt is None:
        stats["skipped"].append((path, "undecodable")); return
    eqs = extract_equations(txt)
    chunks = chunk_text(txt)
    for i, ch in enumerate(chunks):
        t = f"Code {os.path.basename(path)}"
        if len(chunks) > 1: t += f" part {i+1}/{len(chunks)}"
        emit(path, size, "full", "method", t, ch, equations=eqs if i == 0 else [])

def handle_html(path, size):
    txt = read_text(path)
    if txt is None:
        stats["skipped"].append((path, "undecodable")); return
    # tables first, complete
    tables = re.findall(r"<table.*?</table>", txt, flags=re.S | re.I)
    trows = []
    for ti, tb in enumerate(tables):
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tb, flags=re.S | re.I)
        clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        trows.append(f"TABLE {ti+1} ({len(clean)} cells):\n" + "\n".join(clean))
    text = re.sub(r"<script.*?</script>", " ", txt, flags=re.S | re.I)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    body = "VISIBLE TEXT:\n" + text
    if trows: body += "\n\n" + "\n\n".join(trows)
    for i, ch in enumerate(chunk_text(body)):
        t = f"HTML {os.path.basename(path)}"
        if len(chunk_text(body)) > 1: t += f" part {i+1}"
        emit(path, size, "full", "data_source", t, ch)

# ---------- main walk: sports-docs non-Markdown ----------
TEXT_EXTS = {".txt", ".yml", ".yaml", ".sql", ".css", ".bat", ".ps1", ".sh",
             ".npmrc", ".gitignore", ".vercelignore", ".ini", ".patch", ".example",
             ".tla", ".guard", ".ghq"}
CODE_EXTS = {".py", ".js", ".ts", ".mjs"}
NOEXT_TEXT_NAMES = {"license", "notice", "data_license", "license.md"}

def process_file(path):
    size = os.path.getsize(path)
    stats["files"] += 1
    stats["bytes_in"] += size
    name = os.path.basename(path)
    low = name.lower()
    if low == "agents.md":
        stats["skipped"].append((path, "AGENTS.md covered in u_06")); return
    if low.endswith(".md"):
        stats["skipped"].append((path, "markdown covered in u_02/u_04")); return
    ext = os.path.splitext(low)[1]
    try:
        if ext == ".json": handle_json(path, size)
        elif ext == ".jsonl": handle_jsonl(path, size)
        elif ext == ".csv": handle_csv(path, size)
        elif ext == ".parquet": handle_parquet(path, size)
        elif ext in (".gz", ".tgz") or low.endswith(".tar.gz"): handle_archive(path, size)
        elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp"): handle_binary_meta(path, size, "image")
        elif ext in (".ttf", ".otf", ".woff", ".woff2"): handle_binary_meta(path, size, "font")
        elif ext in (".zip", ".tar", ".7z", ".rar"): handle_binary_meta(path, size, "archive-binary")
        elif ext in (".pyc", ".so", ".node", ".exe", ".bin"): handle_binary_meta(path, size, "binary")
        elif ext == ".html": handle_html(path, size)
        elif ext in TEXT_EXTS: handle_text_full(path, size, "data_source")
        elif ext in CODE_EXTS: handle_code(path, size)
        elif ext == "" and low.replace("_", "") in ("license", "notice", "datalicense", "datlicense"):
            handle_text_full(path, size, "data_source")
        elif name == "package-lock.json":
            # 459KB lockfile: summary, not 12k dep blobs
            txt = read_text(path) or ""
            try:
                d = json.loads(txt)
                pkgs = d.get("packages", {})
                body = [f"package-lock summary for {path}", f"lockfileVersion: {d.get('lockfileVersion')}",
                        f"packages entries: {len(pkgs)}"]
                direct = sorted(k for k in pkgs if k and pkgs[k] and not k.startswith("node_modules/") or k == "")
                body.append(f"Direct deps ({len([k for k in direct if k])}):")
                for k in sorted(direct):
                    if k: body.append(f"  - {k}: {pkgs[k].get('version', '?')}")
                emit(path, size, "summary", "data_source",
                     "package-lock.json dependency summary (Beexly/Sports)", "\n".join(body))
            except Exception as e:
                emit(path, size, "summary", "data_source", "package-lock.json (unparseable)",
                     f"Parse failed: {e}. First 5k chars:\n{txt[:5000]}")
        elif ext == "":
            # unknown no-extension: try text via binary-ratio check
            try:
                raw = open(path, "rb").read(4000)
                bin_ratio = sum(1 for b in raw if b < 9 or (13 < b < 32) or b > 126) / max(len(raw), 1)
                if bin_ratio < 0.10:
                    handle_text_full(path, size, "data_source")
                else:
                    handle_binary_meta(path, size, "unknown-binary")
            except Exception:
                handle_binary_meta(path, size, "unknown-binary")
        else:
            txt = read_text(path)
            if txt is not None and txt.strip():
                # looks like text?
                sample = txt[:2000]
                if sum(1 for c in sample if ord(c) < 9 or (13 < ord(c) < 32)) < len(sample) * 0.05:
                    handle_text_full(path, size, "data_source")
                    return
            handle_binary_meta(path, size, f"unhandled-ext-{ext or 'none'}")
    except Exception as e:
        stats["skipped"].append((path, f"handler exception: {e}"))

for root, dirs, files in os.walk(SPORTS_DOCS):
    if ".git" in root: continue
    dirs[:] = [d for d in dirs if d != ".git"]
    for fn in sorted(files):
        process_file(os.path.join(root, fn))

# ---------- packages ----------
PKG = os.path.join(VENDOR, "packages")
pkg_report = []
if os.path.isdir(PKG):
    for pkg in sorted(os.listdir(PKG)):
        pdir = os.path.join(PKG, pkg)
        if not os.path.isdir(pdir): continue
        pj = os.path.join(pdir, "package.json")
        meta = {}
        if os.path.exists(pj):
            try: meta = json.load(open(pj))
            except Exception: pass
        desc = meta.get("description", "missing:description")
        entry = meta.get("main") or meta.get("exports") or "missing:entry"
        n_src = sum(1 for r, d, f in os.walk(pdir) for x in f
                    if ".git" not in r and "node_modules" not in r)
        # README key sections
        readme = None
        for cand in ("README.md", "readme.md"):
            rp = os.path.join(pdir, cand)
            if os.path.exists(rp): readme = rp; break
        body = [f"Package: {pkg} (STALE checkout 2026-10-01 — vendor/Sports predates fresh clone)",
                f"Description: {desc}", f"Entry: {entry}", f"Files (excl node_modules/.git): {n_src}"]
        if readme:
            rtxt = read_text(readme) or ""
            # keep purpose + key sections, full if small
            body.append("\nREADME:\n" + (rtxt if len(rtxt) <= 6000 else rtxt[:6000] + "\n[coverage:excerpt-6k]"))
        # entry-point sources
        entry_files = []
        for cand in ("src/index.ts", "src/index.js", "index.ts", "index.js",
                     "src/main.ts", "src/main.js"):
            ep = os.path.join(pdir, cand)
            if os.path.exists(ep): entry_files.append(ep)
        for ef in entry_files:
            etxt = read_text(ef) or ""
            body.append(f"\nENTRY {os.path.relpath(ef, pdir)} ({len(etxt)} chars):\n{etxt[:12000]}")
            if len(etxt) > 12000: body.append("[coverage:entry-excerpt-12k]")
        # equation grep across package sources
        eq_hits, files_with_eq = [], set()
        for r, d, fs in os.walk(pdir):
            if ".git" in r or "node_modules" in r or "/attic" in r or "/test" in r: continue
            for fn in fs:
                if os.path.splitext(fn)[1] not in CODE_EXTS: continue
                fp = os.path.join(r, fn)
                try: ftxt = read_text(fp) or ""
                except Exception: continue
                eqs = extract_equations(ftxt, limit=8)
                if eqs:
                    files_with_eq.add(os.path.relpath(fp, pdir))
                    eq_hits.extend(eqs[:8])
        # module inventory: top-level src files
        srcd = os.path.join(pdir, "src")
        mods = []
        if os.path.isdir(srcd):
            for r, d, fs in os.walk(srcd):
                if "node_modules" in r: continue
                for fn in sorted(fs):
                    if os.path.splitext(fn)[1] in CODE_EXTS | {".json"}:
                        mods.append(os.path.relpath(os.path.join(r, fn), pdir))
        body.append(f"\nModules ({len(mods)}):\n" + "\n".join(mods[:120]))
        if len(mods) > 120: body.append(f"... +{len(mods)-120} more")
        body.append(f"\nFiles containing equation-like lines: {len(files_with_eq)}")
        for m in sorted(files_with_eq)[:40]: body.append(f"  - {m}")
        uniq_eq = list(dict.fromkeys(eq_hits))[:40]
        emit(pdir, 0, "package-eval", "method",
             f"Package evaluation: {pkg} — {desc[:90]}", "\n".join(body),
             equations=uniq_eq,
             extra={"package": pkg, "stale_checkout": "2026-10-01"})
        pkg_report.append((pkg, n_src, len(files_with_eq), "evaluated"))

# ---------- finalize ----------
if shard_fh: shard_fh.close()
print(json.dumps({"files_processed": stats["files"], "input_bytes": stats["bytes_in"],
                  "rows": stats["rows"], "row_types": stats["by_type"],
                  "shards": shard_idx,
                  "packages": pkg_report,
                  "skipped_count": len(stats["skipped"])}, indent=1))
open(os.path.join(OUT_DIR, "sportsdeep_skipped.json"), "w").write(
    json.dumps(stats["skipped"], indent=1))
print("Top skips:")
from collections import Counter
print(Counter(r for _, r in stats["skipped"]).most_common(10))
