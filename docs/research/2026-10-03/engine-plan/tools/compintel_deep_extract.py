#!/usr/bin/env python3
"""Deep extraction of Beexly/gse-competitive-intel into mind-training JSONL shards.
Closes the gap left by the 536-row selected-field first pass (u_03).
Emits NEW material only (dedup vs u_03 basename keys). Never invents data.
"""
import os, json, re, csv, sys, io
from html.parser import HTMLParser

ROOT = '/home/hatch/workspace/comp-intel'
OUT_DIR = os.environ.get('OUT_DIR', '/home/hatch/workspace/eng-mine/shards-out')
DEDUP = set(json.load(open('/tmp/u03_dedup_keys.json')))
SHARD_TARGET = 8 * 1024 * 1024
BODY_CAP = 12000

os.makedirs(OUT_DIR, exist_ok=True)

stats = {'rows': 0, 'bytes': 0, 'by_type': {}, 'by_ext': {}, 'by_dir': {},
         'skipped': [], 'errors': []}
seen_titles = set()

# ---------- helpers ----------

def is_binary(path, sample=8192):
    try:
        with open(path, 'rb') as f:
            chunk = f.read(sample)
        if b'\x00' in chunk:
            return True
        if not chunk:
            return False
        # high proportion of non-text bytes
        text_chars = sum(1 for b in chunk if b in b'\n\r\t\f\b' or 32 <= b < 127 or b >= 128)
        return text_chars / len(chunk) < 0.7
    except Exception:
        return True

def read_text(path, max_bytes=None):
    with open(path, 'rb') as f:
        data = f.read() if max_bytes is None else f.read(max_bytes)
    for enc in ('utf-8', 'latin-1'):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return data.decode('utf-8', errors='replace')

class TexExtract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.cur_table_rows = None  # list of rows while inside a table
        self.cur_row = None
        self.cur_cell = None
        self.title = ''
        self.meta_desc = ''
        self.in_title = False
        self.skip_depth = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript', 'svg', 'header', 'footer', 'nav'):
            self.skip_depth += 1
        elif tag == 'title':
            self.in_title = True
        elif tag == 'meta' and a.get('name', '').lower() == 'description':
            self.meta_desc = a.get('content', '')
        elif tag == 'table' and self.skip_depth == 0:
            self.cur_table_rows = []
        elif tag == 'tr' and self.cur_table_rows is not None:
            self.cur_row = []
        elif tag in ('td', 'th') and self.cur_row is not None:
            self.cur_cell = []
        elif tag in ('br', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'li', 'section', 'article') and self.skip_depth == 0 and self.cur_cell is None:
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg', 'header', 'footer', 'nav'):
            self.skip_depth = max(0, self.skip_depth - 1)
        elif tag == 'title':
            self.in_title = False
        elif tag == 'table' and self.cur_table_rows is not None:
            rows = self.cur_table_rows
            self.cur_table_rows = None
            md = '\n'.join(' | '.join(c for c in r) for r in rows[:60])
            self.parts.append(f'\n[TABLE {len(rows)} rows]\n{md}\n[/TABLE]\n')
        elif tag == 'tr' and self.cur_table_rows is not None and self.cur_row is not None:
            self.cur_table_rows.append(self.cur_row)
            self.cur_row = None
        elif tag in ('td', 'th') and self.cur_row is not None and self.cur_cell is not None:
            self.cur_row.append(re.sub(r'\s+', ' ', ''.join(self.cur_cell)).strip())
            self.cur_cell = None
    def handle_data(self, data):
        if self.skip_depth:
            return
        if self.in_title:
            self.title += data
            return
        if self.cur_cell is not None:
            self.cur_cell.append(data)
            return
        if data.strip():
            self.parts.append(data)

def html_to_text(data):
    p = TexExtract()
    try:
        p.feed(data[:2_000_000])
    except Exception:
        pass
    text = ''.join(p.parts)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return p.title.strip(), p.meta_desc.strip(), text.strip()

EQ_PATTERNS = [
    re.compile(r'\\\([^\n\)]{3,300}\\\)'),
    re.compile(r'\\\[[^\n\]]{3,600}\\\]'),
    re.compile(r'\$[^$\n]{4,200}\$'),
]
def extract_equations(text):
    found = []
    for pat in EQ_PATTERNS:
        for m in pat.finditer(text[:200000]):
            s = m.group(0).strip()
            if s not in found and len(found) < 40:
                found.append(s)
    return found

def chunk_text(text, cap=BODY_CAP):
    if len(text) <= cap:
        return [text]
    paras = text.split('\n\n')
    chunks, cur = [], ''
    for p in paras:
        if len(cur) + len(p) + 2 > cap:
            if cur:
                chunks.append(cur)
            cur = p
        else:
            cur = (cur + '\n\n' + p) if cur else p
    if cur:
        chunks.append(cur)
    # safety: hard-split any overlong chunk
    out = []
    for c in chunks:
        while len(c) > cap * 2:
            out.append(c[:cap]); c = c[cap:]
        out.append(c)
    return out

shard_idx = 0
shard_bytes = 0
shard_fh = None

def get_fh():
    global shard_idx, shard_fh, shard_bytes
    if shard_fh is None:
        shard_fh = open(f'{OUT_DIR}/mind_knowledge_u_07_compintel_deep_{shard_idx:02d}.jsonl', 'w')
    return shard_fh

def emit(source_path, bytes_read, coverage, row_type, title, body, equations, attribution, claim_type):
    global shard_idx, shard_fh, shard_bytes, stats
    if not body or not body.strip():
        return
    row = {
        'source_path': source_path,
        'host': 'vm',
        'bytes_read': bytes_read,
        'coverage': coverage,
        'row_type': row_type,
        'title': title[:200],
        'body': body,
        'equations': equations or [],
        'attribution': attribution,
        'claim_type': claim_type,
    }
    line = json.dumps(row, ensure_ascii=False)
    if shard_bytes + len(line) > SHARD_TARGET and shard_bytes > 0:
        shard_fh.close()
        shard_idx += 1
        shard_bytes = 0
        shard_fh = open(f'{OUT_DIR}/mind_knowledge_u_07_compintel_deep_{shard_idx:02d}.jsonl', 'w')
    get_fh().write(line + '\n')
    shard_bytes += len(line) + 1
    stats['rows'] += 1
    stats['bytes'] += len(line) + 1
    stats['by_type'][row_type] = stats['by_type'].get(row_type, 0) + 1

def base_skip(rel, name):
    if rel.startswith('dossiers/'):
        return 'dossier-covered-by-first-pass'
    if name.lower() in DEDUP:
        return 'basename-in-u03-dedup'
    if rel.lower() in DEDUP:
        return 'relpath-in-u03-dedup'
    return None

ATTRIB_MAP = [
    ('fantasypros', ['fp-', 'fp_', 'fantasypros', '_fp', 'apidata', 'ecr-']),
    ('scores24', ['s24', '_s24', 's_24', 'en-', 'v-', 'v_', 'scores24', 'scores_24', 'score24', '_sm_', '_ps_', '_est_', '_ft-', '_atp-', '_news', '_articles']),
    ('bettingpros', ['bp-']),
    ('fantasyguru', ['fg-']),
    ('actionnetwork', ['an-', 'actionnetwork']),
    ('awesemo', ['awesemo']),
    ('linestar', ['linestar']),
    ('rotowire', ['rotowire', 'rw-']),
    ('kiito', ['kiito', 'teatmik']),
    ('sofascore', ['sw-sofascore']),
    ('flashscore', ['sw-flashscore']),
    ('forebet', ['sw-forebet']),
    ('365scores', ['sw-365scores']),
    ('similarweb', ['similarweb', 'sw_main']),
    ('semrush', ['semrush', 'sem_']),
    ('underdog', ['underdog']),
    ('sleeper', []),
    ('draftkings', []),
]

def attribute_for(rel, name):
    low = (rel + ' ' + name).lower()
    for attr, prefixes in ATTRIB_MAP:
        for p in prefixes:
            if p and (low.startswith(p) or '/' + p in low or low.startswith('raw/' + p) or low.startswith(p)):
                return attr
    # raw/<domain>_... pattern
    m = re.match(r'raw/([a-z0-9.-]+?)[_.]', rel)
    if m:
        return m.group(1)
    m = re.match(r'^([a-z0-9.-]+?)[_.]', name)
    if m:
        return m.group(1)
    return 'gse-research'

def claim_for(name, row_type):
    low = name.lower()
    if any(k in low for k in ('accuracy', 'record', 'verify', 'measured', 'backtest', 'calibrat')):
        return 'measured'
    if row_type in ('method', 'data_source'):
        return 'methodology'
    if row_type == 'action':
        return 'methodology'
    return 'marketing'

# ---------- per-type processors ----------

def proc_codes_json(path, rel, name, size):
    try:
        o = json.loads(read_text(path, max_bytes=200000))
    except Exception as e:
        stats['errors'].append(f'{rel}: json parse {e}'); return
    repo = o.get('repo', name)
    owner = repo.split('/')[-2] if '/' in repo else 'unknown'
    head = o.get('readme_head', '') or ''
    desc = o.get('desc', '')
    body = (f"GitHub repo: {repo}\nStars: {o.get('stars','missing:stars')} | "
            f"Topic: {o.get('topic','')} | Updated: {o.get('updated','')} | "
            f"License: {o.get('license_first_line','missing:license')} | "
            f"README chars: {o.get('readme_chars','')}\nDescription: {desc}\n\n"
            f"README head:\n{head}")
    trunc = o.get('readme_chars') and len(head) < int(o.get('readme_chars') or 0)
    emit(path, size, 'truncated-head' if trunc else 'full', 'concept',
         f"OSS tool: {repo} — {desc[:80]}", body,
         extract_equations(body), owner, 'methodology')
    stats['by_ext']['codes-json'] = stats['by_ext'].get('codes-json', 0) + 1

def proc_json(path, rel, name, size):
    text = read_text(path)
    try:
        o = json.loads(text)
    except Exception as e:
        # not real json (e.g. .json.txt scrape wrappers) -> treat as text
        proc_text_chunks(path, rel, name, size, text, 'concept')
        stats['by_ext']['json-as-text'] = stats['by_ext'].get('json-as-text', 0) + 1
        return
    attr = attribute_for(rel, name)
    if isinstance(o, list):
        batch, blen = [], 0
        idx = 0
        def flush():
            nonlocal batch, blen, idx
            if batch:
                body = json.dumps(batch, ensure_ascii=False, indent=1)
                emit(path, size, 'full', 'finding',
                     f"{name}: records {idx-len(batch)+1}–{idx}",
                     body, extract_equations(body), attr, claim_for(name, 'finding'))
                batch, blen = [], 0
        for item in o:
            s = json.dumps(item, ensure_ascii=False)
            if blen + len(s) > BODY_CAP:
                flush()
            batch.append(item); blen += len(s); idx += 1
        flush()
    elif isinstance(o, dict):
        # per top-level key rows for big dicts
        total = len(text)
        if total <= BODY_CAP * 1.5:
            body = json.dumps(o, ensure_ascii=False, indent=1)
            emit(path, size, 'full', 'finding', f"{name}: full record",
                 body, extract_equations(body), attr, claim_for(name, 'finding'))
        else:
            for k, v in o.items():
                body = json.dumps({k: v}, ensure_ascii=False, indent=1)
                for i, ch in enumerate(chunk_text(body)):
                    emit(path, size, 'chunked', 'finding',
                         f"{name}: key '{k}'" + (f" part {i+1}" if len(chunk_text(body)) > 1 else ''),
                         ch, extract_equations(ch), attr, claim_for(name, 'finding'))
    else:
        emit(path, size, 'full', 'finding', f"{name}: scalar", str(o), [], attr, claim_for(name, 'finding'))
    stats['by_ext']['json'] = stats['by_ext'].get('json', 0) + 1

def proc_csv(path, rel, name, size):
    text = read_text(path)
    lines = text.splitlines()
    if not lines:
        return
    header = lines[0]
    ncols = len(next(csv.reader([header])))
    attr = attribute_for(rel, name)
    # chunk by 150 data rows
    data = lines[1:]
    for i in range(0, max(1, len(data)), 150):
        chunk = '\n'.join([header] + data[i:i+150])
        emit(path, size, 'full' if len(data) <= 150 else 'chunked', 'finding',
             f"{name}: table rows {i+1}–{min(i+150, len(data))} of {len(data)} ({ncols} cols)",
             chunk, extract_equations(chunk), attr, 'measured')
    stats['by_ext']['csv'] = stats['by_ext'].get('csv', 0) + 1

ENDPOINT_RES = [
    re.compile(r'https?://[A-Za-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:/[A-Za-z0-9._~:/?#\[\]@!$&\'()*+,;=%-]*)?'),
    re.compile(r'''["'`](/(?:api|v\d|rest|graphql)[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)["'`]'''),
    re.compile(r'''(?:fetch|axios\.(?:get|post|put|delete)|XMLHttpRequest)\s*\(\s*["'`]([^"'`]+)["'`]'''),
]

def proc_js(path, rel, name, size):
    text = read_text(path, max_bytes=600000)
    found = []
    for pat in ENDPOINT_RES:
        for m in pat.finditer(text):
            u = m.group(1) if m.lastindex else m.group(0)
            u = u.strip().strip('",;')
            if len(u) > 4 and u not in found and len(found) < 1500:
                found.append(u)
    # also grep for interesting API-ish string literals
    interesting = sorted(set(re.findall(r'''["'`]([A-Za-z0-9_.-]*(?:api|endpoint|apikey|token|odds|projection|rankings|lineup)[A-Za-z0-9_./-]*)["'`]''', text, re.I)))[:200]
    attr = attribute_for(rel, name)
    body = f"JS bundle endpoint inventory for {name} ({size} bytes, first 600KB scanned).\n\nEndpoints/URLs found ({len(found)}):\n" + '\n'.join(found[:1500])
    if interesting:
        body += '\n\nAPI-ish identifiers:\n' + '\n'.join(interesting)
    if not found and not interesting:
        body = f"JS bundle {name}: no API endpoints detected in first 600KB (likely pure UI code). {size} bytes."
    emit(path, size, 'summary', 'data_source', f"{name}: API endpoint inventory",
         body, [], attr, 'methodology')
    stats['by_ext']['js'] = stats['by_ext'].get('js', 0) + 1

def proc_sitemap(path, rel, name, size):
    text = read_text(path)
    locs = re.findall(r'<loc>(.*?)</loc>', text)
    mods = re.findall(r'<lastmod>(.*?)</lastmod>', text)
    attr = attribute_for(rel, name)
    if not locs:
        # maybe inline URL list without tags
        urls = re.findall(r'https?://[^\s<>"\']+', text)
        locs = sorted(set(urls))
    entries = []
    for i, u in enumerate(locs):
        lm = mods[i] if i < len(mods) else ''
        entries.append(f"{u} {lm}".strip())
    CH = 400
    for i in range(0, max(1, len(entries)), CH):
        chunk = '\n'.join(entries[i:i+CH])
        emit(path, size, 'chunked' if len(entries) > CH else 'full', 'data_source',
             f"{name}: sitemap URL inventory ({i+1}–{min(i+CH, len(entries))} of {len(entries)})",
             f"Sitemap {name} — URLs {i+1} to {min(i+CH, len(entries))} of {len(entries)} "
             f"(site architecture / coverage inventory):\n\n{chunk}",
             [], attr, 'methodology')
    stats['by_ext']['sitemap-xml'] = stats['by_ext'].get('sitemap-xml', 0) + 1

def proc_html(path, rel, name, size):
    title, meta, text = html_to_text(read_text(path))
    attr = attribute_for(rel, name)
    header = f"Page: {title or name}\nURL-context: {name}\nMeta: {meta}\n\n" if (title or meta) else ''
    chunks = chunk_text(text)
    for i, ch in enumerate(chunks):
        emit(path, size, 'chunked' if len(chunks) > 1 else 'full', 'concept',
             (title or name) + (f" — part {i+1}/{len(chunks)}" if len(chunks) > 1 else ''),
             header + ch if i == 0 else ch, extract_equations(ch), attr,
             claim_for(name, 'concept'))
    stats['by_ext']['html'] = stats['by_ext'].get('html', 0) + 1

def proc_text_chunks(path, rel, name, size, text=None, rtype='concept'):
    if text is None:
        text = read_text(path)
    attr = attribute_for(rel, name)
    chunks = chunk_text(text)
    for i, ch in enumerate(chunks):
        emit(path, size, 'chunked' if len(chunks) > 1 else 'full', rtype,
             name + (f" — part {i+1}/{len(chunks)}" if len(chunks) > 1 else ''),
             ch, extract_equations(ch), attr, claim_for(name, rtype))

def proc_code(path, rel, name, size):
    text = read_text(path)
    attr = attribute_for(rel, name)
    chunks = chunk_text(text, cap=20000)
    for i, ch in enumerate(chunks):
        emit(path, size, 'chunked' if len(chunks) > 1 else 'full', 'method',
             f"{name}: source code" + (f" — part {i+1}/{len(chunks)}" if len(chunks) > 1 else ''),
             ch, extract_equations(ch), attr, 'methodology')
    stats['by_ext']['code'] = stats['by_ext'].get('code', 0) + 1

def proc_openapi_yml(path, rel, name, size):
    import yaml
    spec = yaml.safe_load(read_text(path))
    info = spec.get('info', {}) or {}
    base = info.get('description', '')
    servers = ', '.join(s.get('url', '') for s in spec.get('servers', []) or [])
    n = 0
    for pth, ops in (spec.get('paths', {}) or {}).items():
        for method, op in (ops or {}).items():
            if not isinstance(op, dict):
                continue
            params = []
            for pr in op.get('parameters', []) or []:
                params.append(f"{pr.get('name')} (in={pr.get('in')}, required={pr.get('required')}, desc={pr.get('description','')})")
            resps = []
            for code, r in (op.get('responses', {}) or {}).items():
                resps.append(f"{code}: {(r or {}).get('description','')}")
            body = (f"FantasyPros Public API endpoint\n{method.upper()} {pth}\n"
                    f"Summary: {op.get('summary','')}\nTags: {op.get('tags')}\n"
                    f"Description: {op.get('description','')}\n\nParameters:\n" +
                    ('\n'.join(params) if params else 'missing:parameters') +
                    "\n\nResponses:\n" + ('\n'.join(resps) if resps else 'missing:responses') +
                    f"\n\nBase: {servers}\nAPI info: {base[:500]}")
            emit(path, size, 'full', 'data_source',
                 f"FantasyPros API {method.upper()} {pth}", body, [],
                 'fantasypros', 'methodology')
            n += 1
    stats['by_ext']['openapi-yml'] = stats['by_ext'].get('openapi-yml', 0) + 1
    stats['openapi_endpoints'] = n

def proc_pdf(path, rel, name, size):
    out = path + '.extracted.txt'
    rc = os.system(f'pdftotext -layout "{path}" "{out}" 2>/dev/null')
    if rc != 0 or not os.path.exists(out):
        stats['skipped'].append(f'{rel}: pdf text extraction failed')
        return
    text = read_text(out)
    os.remove(out)
    attr = attribute_for(rel, name)
    chunks = chunk_text(text)
    for i, ch in enumerate(chunks):
        emit(path, size, 'chunked' if len(chunks) > 1 else 'full', 'concept',
             f"{name} (PDF)" + (f" — part {i+1}/{len(chunks)}" if len(chunks) > 1 else ''),
             ch, extract_equations(ch), attr, claim_for(name, 'concept'))
    stats['by_ext']['pdf'] = stats['by_ext'].get('pdf', 0) + 1

def proc_master_matrix(path, rel, name, size):
    o = json.loads(read_text(path))
    for r in o.get('rows', []):
        body = json.dumps(r, ensure_ascii=False, indent=1)
        emit(path, size, 'full', 'finding',
             f"MASTER_MATRIX: {r.get('domain','unknown')}", body, [],
             'gse-research', 'methodology')
    stats['by_ext']['master-matrix'] = stats['by_ext'].get('master-matrix', 0) + 1

# ---------- main walk ----------

def main():
    files = []
    only = [x for x in os.environ.get('ONLY_FILES', '').split(',') if x]
    for dp, dn, fn in os.walk(ROOT):
        if '/.git' in dp:
            continue
        for f in fn:
            full = os.path.join(dp, f)
            rel = os.path.relpath(full, ROOT)
            if only and rel not in only:
                continue
            files.append((full, rel, f))
    files.sort(key=lambda x: x[1])
    print(f'total files to consider: {len(files)}', flush=True)

    for full, rel, name in files:
        reason = base_skip(rel, name)
        if reason:
            stats['skipped'].append(f'{rel}: {reason}')
            continue
        try:
            size = os.path.getsize(full)
        except Exception:
            stats['skipped'].append(f'{rel}: unreadable')
            continue
        if size == 0:
            stats['skipped'].append(f'{rel}: empty')
            continue
        low = name.lower()
        try:
            if low.endswith('.pdf'):
                proc_pdf(full, rel, name, size)
            elif is_binary(full):
                stats['skipped'].append(f'{rel}: binary')
                continue
            elif rel.startswith('codes/') and low.endswith('.json'):
                proc_codes_json(full, rel, name, size)
            elif low == 'master_matrix.json':
                proc_master_matrix(full, rel, name, size)
            elif low == 'fp-openapi.yml':
                proc_openapi_yml(full, rel, name, size)
            elif low.endswith('.pdf'):
                proc_pdf(full, rel, name, size)
            elif low.endswith(('.xml', '.xml.txt')):
                # sitemap-like or data xml
                txt_head = read_text(full, max_bytes=2000)
                if '<loc>' in txt_head or 'sitemap' in low:
                    proc_sitemap(full, rel, name, size)
                else:
                    title, meta, text = html_to_text(read_text(full))
                    proc_text_chunks(full, rel, name, size, text, 'concept')
                    stats['by_ext']['xml-as-text'] = stats['by_ext'].get('xml-as-text', 0) + 1
            elif low.endswith(('.json', '.json.txt', '.jsonl')):
                proc_json(full, rel, name, size)
            elif low.endswith('.csv'):
                proc_csv(full, rel, name, size)
            elif low.endswith('.js'):
                proc_js(full, rel, name, size)
            elif low.endswith(('.html', '.htm')):
                proc_html(full, rel, name, size)
            elif low.endswith(('.py', '.ts', '.tsx', '.sh', '.php')):
                proc_code(full, rel, name, size)
            elif low.endswith(('.md', '.txt', '.text', '.log', '.yml', '.yaml', '.tsv', '.sitemap')) or '.' not in name:
                # md: teardowns high value -> finding; else concept
                rt = 'finding' if any(k in low for k in ('teardown', 'dossier', 'accuracy', 'mistake', 'verify', 'playbook', 'audit', 'patent')) else 'concept'
                proc_text_chunks(full, rel, name, size, None, rt)
                stats['by_ext']['text'] = stats['by_ext'].get('text', 0) + 1
            else:
                # unknown extension: try as text
                if not is_binary(full):
                    proc_text_chunks(full, rel, name, size, None, 'concept')
                    stats['by_ext']['unknown-as-text'] = stats['by_ext'].get('unknown-as-text', 0) + 1
                else:
                    stats['skipped'].append(f'{rel}: binary-unknown-ext')
                    continue
            d = rel.split('/')[0] if '/' in rel else 'root'
            stats['by_dir'][d] = stats['by_dir'].get(d, 0) + 1
        except Exception as e:
            stats['errors'].append(f'{rel}: {type(e).__name__}: {e}')

    if shard_fh:
        shard_fh.close()
    with open(f'{OUT_DIR}/_extraction_stats.json', 'w') as f:
        json.dump(stats, f, indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k not in ('skipped', 'errors')}, indent=1))
    print(f"skipped: {len(stats['skipped'])}, errors: {len(stats['errors'])}")

if __name__ == '__main__':
    main()
