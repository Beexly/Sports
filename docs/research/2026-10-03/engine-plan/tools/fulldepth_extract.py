#!/usr/bin/env python3
"""Full-depth re-feed u_10: IG (all), X sweep (full tables), HTML artifacts
(embedded data), Grok Heavy outputs, arXiv program records. No truncation."""
import json, os, csv, re, glob, hashlib
from html.parser import HTMLParser

OUT = '/home/hatch/workspace/eng-mine/shards-out'
os.makedirs(OUT, exist_ok=True)
rows = []
skipped = []

def add(source_path, row_type, title, body, equations=None):
    try:
        size = os.path.getsize(source_path)
    except OSError:
        size = 0
    rows.append({
        "source_path": source_path, "host": "vm", "bytes_read": size,
        "coverage": "full", "row_type": row_type,
        "title": title[:220], "body": body, "equations": equations or []})

def md_sections(path):
    """Split markdown into (heading, text) sections; first chunk = preamble."""
    text = open(path, encoding='utf-8', errors='replace').read()
    parts = re.split(r'(?m)^(#{1,4}\s+.*)$', text)
    secs = []
    if parts[0].strip():
        secs.append(("preamble", parts[0].strip()))
    for i in range(1, len(parts), 2):
        head = parts[i].strip('# ').strip()
        body = parts[i+1].strip() if i+1 < len(parts) else ''
        if body:
            secs.append((head, body))
    return secs

# ============ LANE 1: INSTAGRAM (all 110 files, full records) ============
ig_files = sorted(glob.glob('/home/hatch/workspace/ig-*.json'))
ig_records = 0

def ig_post_row(fp, p):
    global ig_records
    author = p.get('author_name', '')
    caption = p.get('post_caption', '') or ''
    tags = re.findall(r'#\w+', caption)
    title = (f"IG post @{author} {p.get('created_at','')} "
             f"likes={p.get('likes','')} followers={p.get('follower_count','')}")
    body = (f"POST_ID: {p.get('post_id','')}\nAUTHOR: {author} (id {p.get('author_id','')})\n"
            f"CREATED: {p.get('created_at','')}\nLIKES: {p.get('likes','')}  "
            f"FOLLOWERS: {p.get('follower_count','')}\nMEDIA_TYPE: {p.get('media_type','')}\n"
            f"AUTHOR_BIO: {p.get('author_bio','')}\nHASHTAGS: {', '.join(tags)}\n"
            f"CAPTION:\n{caption}\nFULL RECORD:\n{json.dumps(p, ensure_ascii=False, indent=1)}")
    add(fp, 'finding', title, body)
    ig_records += 1

def ig_comment_row(fp, media_id, c):
    global ig_records
    title = f"IG comment by {c.get('author_name','')} on media {media_id}"
    body = (f"MEDIA_ID: {media_id}\nCOMMENT_ID: {c.get('comment_id','')}\n"
            f"AUTHOR: {c.get('author_name','')} (id {c.get('author_id','')})\nTEXT:\n{c.get('comment_text','')}")
    add(fp, 'finding', title, body)
    ig_records += 1

for fp in ig_files:
    try:
        data = json.load(open(fp, encoding='utf-8', errors='replace'))
    except Exception as e:
        skipped.append((fp, f'unparseable: {e}'))
        continue
    bn = os.path.basename(fp)
    if isinstance(data, dict) and isinstance(data.get('posts'), list):
        for p in data['posts']:
            if isinstance(p, dict):
                ig_post_row(fp, p)
    elif isinstance(data, dict) and isinstance(data.get('post_groups'), list):
        for g in data['post_groups']:
            for c in g.get('comments', []) or []:
                if isinstance(c, dict):
                    ig_comment_row(fp, g.get('media_id', ''), c)
    elif isinstance(data, dict) and isinstance(data.get('media'), list):
        for m in data['media']:
            if not isinstance(m, dict):
                continue
            su = m.get('semantic_understanding') or {}
            title = f"IG media semantic analysis {m.get('media_id','')}"
            body = (f"MEDIA_ID: {m.get('media_id','')}\nNARRATIVE:\n{m.get('narrative_summary','')}\n"
                    f"SEMANTIC UNDERSTANDING:\n{json.dumps(su, ensure_ascii=False, indent=1)}")
            add(fp, 'finding', title, body)
            ig_records += 1
    elif isinstance(data, dict) and data.get('post_id'):
        p = data
        author = p.get('author_handle', '')
        caption = p.get('caption', '') or p.get('post_caption', '') or ''
        tags = re.findall(r'#\w+', caption)
        title = f"IG enriched post @{author} {p.get('post_id','')}"
        body = (f"POST_ID: {p.get('post_id','')}\nURL: {p.get('post_url','')}\n"
                f"AUTHOR: {author} verified={p.get('author_is_verified','')} "
                f"followers={p.get('author_follower_count','')}\nHASHTAGS: {', '.join(tags)}\n"
                f"FULL RECORD:\n{json.dumps(p, ensure_ascii=False, indent=1)}")
        add(fp, 'finding', title, body)
        ig_records += 1
    elif isinstance(data, list):
        for r in data:
            add(fp, 'finding', f"IG record {bn}", json.dumps(r, ensure_ascii=False, indent=1))
            ig_records += 1
    else:
        add(fp, 'finding', f"IG file {bn} (full)",
            json.dumps(data, ensure_ascii=False, indent=1))
        ig_records += 1
print(f"LANE1 IG: {len(ig_files)} files, {ig_records} records, {len(skipped)} skipped")

# ============ LANE 2: X SWEEP (full tables + full section) ============
xdir = '/home/hatch/workspace/sports-docs/docs/dfs/research/2026-10-03/full-tables'
x_rows = 0
readme = open(os.path.join(xdir, 'README-2026-10-03-am.md'), encoding='utf-8').read()
for fn in sorted(os.listdir(xdir)):
    if not fn.endswith('.csv'):
        continue
    fp = os.path.join(xdir, fn)
    table = open(fp, encoding='utf-8', errors='replace').read()
    with open(fp, newline='', encoding='utf-8', errors='replace') as f:
        rdr = list(csv.reader(f))
    header = rdr[0] if rdr else []
    # README context for this file
    ctx = ''
    for line in readme.splitlines():
        if fn in line:
            ctx = line
            break
    body = (f"FILE: {fn}\nREADME: {ctx}\nCOLUMNS: {', '.join(header)}\n"
            f"DATA ROWS: {len(rdr)-1}\nFULL TABLE:\n{table}")
    add(fp, 'finding', f"X sweep 2026-10-03 AM full table: {fn}", body)
    x_rows += 1
# Full AGENTS.md X sweep section, split by item
agents = open('/home/hatch/workspace/sports-docs/AGENTS.md', encoding='utf-8').read().splitlines()
sec = agents[7537:]  # line 7538 (0-indexed 7537) to EOF
sec_text = '\n'.join(sec)
# split on numbered items 1.-12. and ### subsections
chunks = re.split(r'(?m)^(\d{1,2}\.\s+@\S+)', sec_text)
preamble = chunks[0]
items = []
for i in range(1, len(chunks), 2):
    items.append((chunks[i].strip(), chunks[i+1] if i+1 < len(chunks) else ''))
# preamble (window/method)
add('/home/hatch/workspace/sports-docs/AGENTS.md', 'method',
    'X analytics sweep 2026-10-03 AM: window and method', preamble.strip())
x_rows += 1
for head, body in items:
    # split trailing ### subsections off the last item
    subs = re.split(r'(?m)^(###\s+.*)$', body)
    main = head + '\n' + subs[0]
    add('/home/hatch/workspace/sports-docs/AGENTS.md', 'finding',
        f"X sweep 2026-10-03 AM post: {head[:120]}", main.strip())
    x_rows += 1
    for j in range(1, len(subs), 2):
        sub_head = subs[j].strip('# ').strip()
        sub_body = subs[j+1] if j+1 < len(subs) else ''
        if sub_body.strip():
            add('/home/hatch/workspace/sports-docs/AGENTS.md', 'method',
                f"X sweep 2026-10-03 AM {sub_head}", sub_body.strip())
            x_rows += 1
print(f"LANE2 X: {x_rows} rows")

# ============ LANE 3: HTML ARTIFACTS (embedded data) ============
class ArtParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.tables = []
        self.headings = []
        self._in_script = False
        self._in_table = False
        self._buf = ''
        self._tbuf = ''
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self._in_script = True; self._buf = ''
        elif tag == 'table':
            self._in_table = True; self._tbuf = ''
        elif tag in ('h1','h2','h3') :
            self._buf = ''; self._cur_head = tag
        elif tag in ('th','td') and self._in_table:
            self._tbuf += '|'
    def handle_endtag(self, tag):
        if tag == 'script' and self._in_script:
            self._in_script = False
            if self._buf.strip():
                self.scripts.append(self._buf)
        elif tag == 'table' and self._in_table:
            self._in_table = False
            if self._tbuf.strip('| \n'):
                self.tables.append(self._tbuf)
        elif tag in ('th','td','tr') and self._in_table:
            self._tbuf += '\n'
    def handle_data(self, data):
        if self._in_script:
            self._buf += data
        elif self._in_table:
            self._tbuf += data

h_rows = 0
for fp in ['/tmp/artifacts/ARTIFACT-dfs-process-system.html',
           '/tmp/artifacts/ARTIFACT-gse-dfs-process-system.html']:
    raw = open(fp, encoding='utf-8', errors='replace').read()
    p = ArtParser()
    p.feed(raw)
    # visible text (tags stripped)
    text = re.sub(r'<script.*?</script>', ' ', raw, flags=re.S | re.I)
    text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    add(fp, 'concept', f"HTML artifact overview: {os.path.basename(fp)}",
        f"VISIBLE TEXT ({len(text)} chars):\n{text}\n\nTABLES FOUND: {len(p.tables)}\nSCRIPT BLOCKS: {len(p.scripts)}")
    h_rows += 1
    for i, t in enumerate(p.tables):
        add(fp, 'data_source', f"{os.path.basename(fp)} embedded table {i+1}",
            f"TABLE {i+1} (pipe-delimited cells):\n{t.strip()}")
        h_rows += 1
    for i, s in enumerate(p.scripts):
        # pull out JSON-looking data and chart data arrays
        preview = s.strip()
        add(fp, 'data_source', f"{os.path.basename(fp)} embedded script {i+1} ({len(preview)} chars)",
            f"SCRIPT {i+1} FULL CONTENT:\n{preview}")
        h_rows += 1
skipped.append(('/tmp/artifacts/ARTIFACT-nfl-analytics-reverse-engineering.html',
                'skipped: reverse-engineering page already fully covered in u_05; also exceeds single-fetch API size (6MB)'))
print(f"LANE3 HTML: {h_rows} rows")

# ============ LANE 4: GROK HEAVY OUTPUTS ============
g_rows = 0
for fp in ['/tmp/grok/GROK-RUN1-INGESTION-2026-10-02.md',
           '/tmp/grok/GROK-RUN2-PROMOTE-OR-KILL-2026-10-02.md',
           '/tmp/grok/GROK-RUN3-ABYSSAL-2026-10-02.md',
           '/tmp/grok/GROK-INDEX-2026-10-03.md']:
    remote = 'Beexly/agent-bus@main:inbox/from-motif/' + os.path.basename(fp)
    fsize = os.path.getsize(fp)
    for head, body in md_sections(fp):
        rtype = 'finding' if any(k in head.lower() for k in
                 ['verdict', 'rank', 'contract', 'promote', 'kill', 'finding']) else 'concept'
        rows.append({"source_path": remote, "host": "vm", "bytes_read": fsize,
                     "coverage": "full", "row_type": rtype,
                     "title": f"Grok Heavy {os.path.basename(fp)}: {head}"[:220],
                     "body": body, "equations": []})
        g_rows += 1
print(f"LANE4 Grok: {g_rows} rows")

# ============ LANE 5: ARXIV PROGRAM ============
P = '/home/hatch/workspace/sports-docs/docs/arxiv-program/research/2026-09-21/arxiv-program/phase2'
a_rows = 0
# summaries + audit: full body + sections
for fn in ['AUDIT-2026-09-21-tracker.md', 'PHASE2-SUMMARY.md', 'PHASE3-SUMMARY.md',
           'PHASE4-SUMMARY.md', 'WAVE2-SUMMARY.md']:
    fp = os.path.join(P, fn)
    for head, body in md_sections(fp):
        add(fp, 'finding' if 'verdict' in head.lower() or 'finding' in head.lower() else 'concept',
            f"arXiv program {fn}: {head}", body)
        a_rows += 1
# dedup baseid lists: full content
for fn in ['wave4-dedup-baseids.txt', 'wave4b-dedup-baseids.txt', 'wave5-dedup-baseids.txt']:
    fp = os.path.join(P, fn)
    ids = [l.strip() for l in open(fp) if l.strip()]
    add(fp, 'data_source', f"arXiv program {fn}: {len(ids)} verdict base IDs (full list)",
        '\n'.join(ids))
    a_rows += 1
# candidate records: one row per record
for fn in ['phase2-candidates-bayes.jsonl', 'phase2-candidates-bayes-raw-backup.jsonl']:
    fp = os.path.join(P, fn)
    n = 0
    for line in open(fp, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        rid = rec.get('id', '?')
        title = rec.get('title', '')
        verdict = rec.get('verdict', '')
        body = json.dumps(rec, ensure_ascii=False, indent=1)
        add(fp, 'finding', f"arXiv candidate {rid} [{verdict}]: {title[:100]}", body)
        n += 1
    a_rows += n
    print(f"  {fn}: {n} records")
# assignments + wave-reports + search: one row per record
for sub in ['assignments', 'wave-reports', 'search']:
    d = os.path.join(P, sub)
    if not os.path.isdir(d):
        continue
    for fn in sorted(os.listdir(d)):
        fp = os.path.join(d, fn)
        if fn.endswith('.jsonl'):
            n = 0
            for line in open(fp, encoding='utf-8', errors='replace'):
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                rid = rec.get('id') or rec.get('arxiv_id') or rec.get('arxiv') or '?'
                title = rec.get('title', fn)
                verdict = rec.get('verdict', '')
                add(fp, 'finding', f"arXiv {sub} {fn}: {rid} [{verdict}] {str(title)[:80]}",
                    json.dumps(rec, ensure_ascii=False, indent=1))
                n += 1
            a_rows += n
        elif fn.endswith('.json'):
            try:
                data = json.load(open(fp, encoding='utf-8', errors='replace'))
            except Exception:
                continue
            items = data if isinstance(data, list) else data.get('candidates', data.get('items', [data]))
            for rec in items if isinstance(items, list) else []:
                if not isinstance(rec, dict):
                    continue
                rid = rec.get('id', '?')
                add(fp, 'finding', f"arXiv {sub} {fn}: {rid} {str(rec.get('title',''))[:80]}",
                    json.dumps(rec, ensure_ascii=False, indent=1))
                a_rows += 1
# the 3 docs/research phase2 files (not in u_04)
for fn in ['phase2/quarantined/1028-google-research-football-rl-environment.md',
           'phase2/quarantined/1029-node-classification-integrated-reject-option.md',
           'phase2/wave2/reader-18-search-record.md']:
    fp = '/home/hatch/workspace/sports-docs/docs/research/2026-09-21/arxiv-program/' + fn
    for head, body in md_sections(fp):
        add(fp, 'concept', f"arXiv program {fn}: {head}", body)
        a_rows += 1
# vendor dupes skipped (md5-identical)
skipped.append(('~/workspace/vendor/Sports/.../arxiv-program (all)', 'skipped: md5-identical to sports-docs copies'))
print(f"LANE5 arXiv: {a_rows} rows")

# ============ WRITE SHARDS ============
SHARD_BYTES = 8 * 1024 * 1024
shard_idx = 0
buf = []
cur_bytes = 0
files_written = []
def flush():
    global shard_idx, buf, cur_bytes
    if not buf:
        return
    fn = f'mind_knowledge_u_10_fulldepth_{shard_idx:02d}.jsonl'
    fp = os.path.join(OUT, fn)
    with open(fp, 'w', encoding='utf-8') as f:
        for r in buf:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    files_written.append((fn, len(buf), os.path.getsize(fp)))
    shard_idx += 1
    buf = []
    cur_bytes = 0

for r in rows:
    line = json.dumps(r, ensure_ascii=False) + '\n'
    lb = len(line.encode('utf-8'))
    if cur_bytes + lb > SHARD_BYTES and buf:
        flush()
    buf.append(r)
    cur_bytes += lb
flush()

types = {}
for r in rows:
    types[r['row_type']] = types.get(r['row_type'], 0) + 1
print(f"\nTOTAL: {len(rows)} rows -> {len(files_written)} shards")
for fn, n, b in files_written:
    print(f"  {fn}: {n} rows, {b} bytes")
print("row types:", types)
print(f"skipped: {len(skipped)}")
for s, reason in skipped:
    print(f"  SKIP {s}: {reason}")
json.dump({"rows": len(rows), "types": types, "shards": [f[0] for f in files_written],
           "skipped": skipped},
          open('/home/hatch/workspace/eng-mine/u10_stats.json', 'w'), indent=1)
