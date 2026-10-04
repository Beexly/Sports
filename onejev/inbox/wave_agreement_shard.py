"""Parallel agreement worker: shard N of M over the wave equations.

Usage: wave_agreement_shard.py <shard_index> <shard_count> <limit>
Sharding is by sha256(file|equation) % shard_count, so shards never overlap and
each equation gets exactly one verdict across all workers.
"""
import os, sys, json, re, time, hashlib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(QUEUE, 'wave-agreement.jsonl')
SEEN = os.path.join(QUEUE, 'wave-agreement-seen.txt')

PAIRS = [
    ('nvidia', 'nvidia/nemotron-3-super-120b-a12b'),
    ('nvidia', 'nvidia/nemotron-3-ultra-550b-a55b'),
    ('or2', 'nvidia/nemotron-3-super-120b-a12b:free'),
    ('or2', 'cohere/north-mini-code:free'),
    ('or1', 'liquid/lfm-2.5-2.6b:free'),
]

SECRET = re.compile(r'(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|bearer\s+\S+|password\s*[:=]|token\s*[:=]\s*\S+|gsk_|oc_sk_|rnd_|ghp_|AKIA)', re.I)

SYS = (
    "You verify extracted equations. Normalize the given equation to one canonical "
    "one-line form: strip ALL whitespace, keep unicode math symbols exactly as given "
    "(do NOT transliterate greek to ASCII), keep digits, subscripts and structure. "
    "Return ONLY the normalized string, nothing else."
)


def endpoints():
    sys.path.insert(0, r'C:\Users\Garrett\_research\ctx-2026-10-03')
    from fleet_probe import ENDPOINTS
    return ENDPOINTS


EP = endpoints()


def call(ep, model, text, timeout=60):
    base, key = EP[ep]
    body = {'model': model, 'temperature': 0, 'max_tokens': 900,
            'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': text}]}
    req = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json',
                                          'HTTP-Referer': 'https://github.com/Beexly', 'X-Title': 'GSE agreement'})
    with urllib.request.urlopen(req, timeout=timeout) as f:
        d = json.loads(f.read())
    msg = d['choices'][0]['message']
    out = (msg.get('content') or msg.get('reasoning_content') or '').strip()
    return out[:500]


def canon(s):
    return re.sub(r'\s+', '', s or '').lower()


def collect(shard, nshards, limit):
    seen = set()
    if os.path.exists(SEEN):
        seen = set(open(SEEN, encoding='utf-8').read().splitlines())
    out = []
    for wf in sorted(os.listdir(QUEUE)):
        if not (wf.startswith('wave-') and wf.endswith('.jsonl')) or 'agreement' in wf or 'index' in wf:
            continue
        for line in open(os.path.join(QUEUE, wf), encoding='utf-8'):
            try:
                row = json.loads(line)
            except Exception:
                continue
            eq = row.get('equation')
            if not eq or SECRET.search(eq):
                continue
            ckey = row.get('file', '') + '|' + canon(eq)[:80]
            if ckey in seen or len(out) >= limit:
                continue
            h = int(hashlib.sha256(ckey.encode('utf-8')).hexdigest()[:8], 16) % nshards
            if h != shard:
                continue
            row['_ckey'] = ckey
            out.append(row)
    return out


def main():
    shard = int(sys.argv[1]); nshards = int(sys.argv[2])
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    eqs = collect(shard, nshards, limit)
    n_agree = n_unver = 0
    for row in eqs:
        norm_a = norm_b = None
        err = None
        for attempt in range(4):
            try:
                ep1, m1 = PAIRS[0]
                ep2, m2 = PAIRS[(attempt + 1) % len(PAIRS)]
                norm_a = call(ep1, m1, row['equation'])
                norm_b = call(ep2, m2, row['equation'])
                break
            except urllib.error.HTTPError as e:
                if e.code in (429, 503):
                    time.sleep(20 + 10 * attempt)
                else:
                    err = f'HTTP {e.code}'
                    break
            except Exception as e:
                err = str(e)[:80]
                time.sleep(4)
        verdict = 'UNVERIFIED'
        if norm_a and norm_b and canon(norm_a) == canon(norm_b) and len(norm_a) > 3:
            verdict = 'AGREED'
            n_agree += 1
        else:
            n_unver += 1
        rec = {'file': row['file'], 'equation': row['equation'][:300], 'wave': row.get('wave'),
               'shard': shard, 'verdict': verdict,
               'norm_a': norm_a[:200] if norm_a else None, 'norm_b': norm_b[:200] if norm_b else None,
               'err': err}
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        with open(SEEN, 'a', encoding='utf-8') as f:
            f.write(row['_ckey'] + '\n')
        time.sleep(1.5)
    print(json.dumps({'shard': shard, 'checked': len(eqs), 'agreed': n_agree, 'unverified': n_unver}))


if __name__ == '__main__':
    main()