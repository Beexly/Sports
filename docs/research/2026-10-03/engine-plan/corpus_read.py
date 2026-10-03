"""GSE agent-bus full-corpus reader (map step). Every file is read by a model in full (chunked only when it exceeds
the model's window) and turned into a structured record. Resumable: corpus_extract/done.txt.
Fleet: OpenRouter free + cheap paid, NVIDIA API Nemotron Ultra, Groq gpt-oss, OpenCode Zen space-bunny-free.
Paid spend is capped (OR usage.cost summed) at MAX_USD."""
import os, sys, json, time, re, random, threading, queue, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
from fleet_probe import ENDPOINTS

ROOT = r'C:\Users\Garrett\_research\agent-bus'
OUT = os.path.join(os.path.dirname(__file__), 'corpus_extract'); os.makedirs(OUT, exist_ok=True)
MAX_USD = float(os.environ.get('MAX_USD', '8'))
SKIP_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.gz', '.ico', '.webp', '.parquet', '.mjs'}

# (endpoint, model, concurrency, max_chars_per_request, paid)
FLEET = [
    ('or1', 'xiaomi/mimo-v2.6-flash', 14, 900_000, True),
    ('or1', 'z-ai/glm-5.3-flash', 10, 900_000, True),
    ('or1', 'deepseek/deepseek-v4.1-flash', 6, 900_000, True),
    ('or1', 'nvidia/nemotron-3-ultra-550b-a55b:free', 3, 900_000, False),
    ('or2', 'nvidia/nemotron-3-super-120b-a12b:free', 3, 600_000, False),
    ('or2', 'poolside/laguna-s-2.1:free', 3, 600_000, False),
    ('or2', 'qwen/qwen3.8-27b:free', 2, 600_000, False),
    ('nvidia', 'nvidia/nemotron-3-ultra-550b-a55b', 4, 600_000, False),
    ('zen2', 'space-bunny-free', 3, 400_000, False),
    ('groq', 'openai/gpt-oss-120b', 2, 24_000, False),
]

SYSTEM = """You are a reader for GSE, a sports reasoning/prediction engine (NFL first; also NCAAF, MLB, NBA, NHL, MLS; picks, props, parlays, fantasy/DFS, analysis).
The engine loop: ingest (as-of signal store) -> encode (pretrained entity encoders) -> perceive (computer vision) -> reason (LLM traces) -> price (calibrated probability) -> decide (picks/props/DFS) -> grade (log loss, Brier, ECE on the engine's own outputs) -> learn (nightly refit, champion/challenger) -> chart (intelligence charts, external forecasting leaderboards). Plus ops (infra, crons, CI) and product.
Read the WHOLE document. Extract only what the text supports. Never invent numbers, URLs or module paths. If the text claims a result without a measurement, mark evidence "claimed".
Return ONLY a JSON object with key "docs": a list with one object per document you were given, each:
{"path": str, "title": str, "kind": "paper|brief|spec|handoff|status|message|data|code|other",
 "summary": "2-4 sentences, concrete",
 "key_numbers": [{"metric": str, "value": str, "context": str}],
 "methods": [str],
 "data_sources": [{"name": str, "url": str|null, "license": str|null, "free": true|false|null}],
 "components": [subset of ingest,encode,perceive,reason,price,decide,grade,learn,chart,ops,product],
 "signal_families": [str], "sports": [str],
 "repo_status": "implemented|partial|not_implemented|unknown", "repo_paths": [str],
 "actionable_builds": [{"build": str, "component": str, "expected_effect": str, "data_needed": str, "effort": "S|M|L", "test": str}],
 "warnings": [str],
 "evidence": "measured|claimed|speculative|none",
 "relevance": 0-10}"""

lock = threading.Lock(); spent = [0.0]; stats = {}
def log(msg):
    with lock: open(os.path.join(OUT, 'run.log'), 'a', encoding='utf-8').write(time.strftime('%H:%M:%S ') + msg + '\n')

def call(ep, model, text, paid):
    base, key = ENDPOINTS[ep]
    body = {'model': model, 'temperature': 0, 'max_tokens': 16000,
            'messages': [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': text}]}
    if ep.startswith('or'):
        body['usage'] = {'include': True}; body['response_format'] = {'type': 'json_object'}
    r = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(), headers={
        'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/Beexly',
        'X-Title': 'GSE corpus reader', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) opencode/1.0'})
    with urllib.request.urlopen(r, timeout=600) as f: d = json.loads(f.read())
    if paid:
        with lock: spent[0] += float((d.get('usage') or {}).get('cost') or 0)
    msg = d['choices'][0]['message']; txt = msg.get('content') or ''
    m = re.search(r'\{.*\}', txt, re.S)
    if not m: raise ValueError('no json in reply')
    obj = json.loads(m.group(0))
    docs = obj.get('docs') if isinstance(obj, dict) else None
    if not isinstance(docs, list) or not docs: raise ValueError('no docs list')
    return docs

def units():
    files = []
    for dp, dn, fn in os.walk(ROOT):
        if '.git' in dp.split(os.sep): continue
        for f in fn:
            p = os.path.join(dp, f)
            if os.path.splitext(f)[1].lower() in SKIP_EXT: continue
            files.append(p)
    done = set(open(os.path.join(OUT, 'done.txt'), encoding='utf-8').read().split('\n')) if os.path.exists(os.path.join(OUT, 'done.txt')) else set()
    small, big = [], []
    for p in sorted(files):
        rel = os.path.relpath(p, ROOT).replace('\\', '/')
        try: t = open(p, encoding='utf-8', errors='replace').read()
        except Exception: continue
        if len(t.strip()) < 40: continue
        if len(t) <= 300_000:
            uid = rel
            if uid not in done: (small if len(t) < 12_000 else big).append((uid, [(rel, t)]))
        else:
            for i in range(0, len(t), 280_000):
                uid = f'{rel}#chunk{i // 280_000}'
                if uid not in done: big.append((uid, [(rel + f' [part {i // 280_000 + 1} of {(len(t) - 1) // 280_000 + 1}]', t[i:i + 280_000])]))
    batches, cur, cur_len = [], [], 0      # pack small docs 6 per request (each read in full)
    for uid, docs in small:
        if cur and (len(cur) >= 6 or cur_len + len(docs[0][1]) > 40_000): batches.append(cur); cur, cur_len = [], 0
        cur.append((uid, docs)); cur_len += len(docs[0][1])
    if cur: batches.append(cur)
    return [[u] for u in big] + batches

def prompt(batch):
    parts = [f'You are given {sum(len(d) for _, d in batch)} document(s). Return one entry per document in "docs".']
    for uid, docs in batch:
        for rel, t in docs: parts.append(f'\n===== DOCUMENT path="{rel}" chars={len(t)} =====\n{t}\n===== END {rel} =====')
    return '\n'.join(parts)

def worker(ep, model, maxc, paid, q):
    while True:
        try: batch, tries = q.get(timeout=5)
        except queue.Empty: return
        text = prompt(batch)
        if len(text) > maxc or (paid and spent[0] >= MAX_USD):
            q.put((batch, tries)); q.task_done(); time.sleep(2)
            if paid and spent[0] >= MAX_USD: return
            if q.qsize() <= 1 and len(text) > maxc: time.sleep(5)
            continue
        t0 = time.time()
        try:
            docs = call(ep, model, text, paid)
            with lock:
                with open(os.path.join(OUT, 'extract.jsonl'), 'a', encoding='utf-8') as f:
                    for d in docs:
                        d['_reader'] = f'{ep}:{model}'; d['_read_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
                        f.write(json.dumps(d, ensure_ascii=False) + '\n')
                with open(os.path.join(OUT, 'done.txt'), 'a', encoding='utf-8') as f:
                    for uid, _ in batch: f.write(uid + '\n')
                s = stats.setdefault(model, [0, 0]); s[0] += 1
            log(f'OK {model} {len(batch)}u {len(text)}c {time.time() - t0:.0f}s spent ${spent[0]:.3f}')
        except Exception as e:
            err = (f'HTTP {e.code} ' + e.read().decode(errors='replace')[:160]) if isinstance(e, urllib.error.HTTPError) else str(e)[:160]
            with lock: s = stats.setdefault(model, [0, 0]); s[1] += 1
            log(f'ERR {model} {err}')
            bump = 0 if ('HTTP 429' in err or 'HTTP 5' in err or 'timed out' in err) else 1
            if tries + bump < 6: q.put((batch, tries + bump))
            else:
                with open(os.path.join(OUT, 'failed.jsonl'), 'a', encoding='utf-8') as f: f.write(json.dumps([u for u, _ in batch]) + '\n')
            time.sleep(20 if '429' in err else 3)
        finally:
            q.task_done()

if __name__ == '__main__':
    work = units(); random.seed(7)
    q = queue.Queue()
    for b in work: q.put((b, 0))
    log(f'START units={len(work)} docs={sum(len(b) for b in work)} max_usd={MAX_USD}')
    print('work units', len(work), 'documents', sum(len(b) for b in work), flush=True)
    th = [threading.Thread(target=worker, args=(ep, m, mc, paid, q), daemon=True) for ep, m, c, mc, paid in FLEET for _ in range(c)]
    for t in th: t.start()
    last = time.time()
    while any(t.is_alive() for t in th):
        time.sleep(30)
        if time.time() - last > 120:
            last = time.time(); log(f'PROGRESS queue={q.qsize()} spent=${spent[0]:.3f} stats={stats}')
    log(f'END queue={q.qsize()} spent=${spent[0]:.3f} stats={stats}')
    print('END queue', q.qsize(), 'spent', round(spent[0], 3), stats)
