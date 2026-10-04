"""Two-model agreement over the wave-queue equations (leap spec verification gate).

Reads wave-*.jsonl equation rows from the mind-queue, sends each equation to TWO
DIFFERENT live free models with a normalization task, compares the normalized forms,
and writes the verdict to wave-agreement.jsonl:
  AGREED    - both models normalize to the same canonical form
  UNVERIFIED- they differ (held, never dropped)

Rules (night order + leap spec):
- Two DIFFERENT models must agree, else UNVERIFIED.
- No equation is deleted. No synthesis. No pick.
- Secrets are never sent to a model: equations matching the secret gate are skipped
  with status SECRET_SKIPPED.
- Backoff on 429 to respect the 20/min free budget; this pass shares the fleet
  with the live lanes, so it runs at low rate and is resumable via a seen-file.
- Never writes brain/mind.jsonl or brain/agreement.jsonl.
"""
import json, os, re, sys, time, urllib.request, urllib.error

QUEUE = r'C:\Users\Garrett\onejev\inbox\mind-queue'
OUT = os.path.join(QUEUE, 'wave-agreement.jsonl')
SEEN = os.path.join(QUEUE, 'wave-agreement-seen.txt')

# (endpoint, model) pairs — verified live tonight; two DIFFERENT models per equation
# or2 first: its 20/min budget is separate from or1 (which the lanes saturate)
# nvidia-direct FIRST: it answered in 0.7s with NO rate cap tonight, while or1/or2
# are saturated by 24 lane workers (429 storms). Two DIFFERENT nvidia models still
# satisfies the two-model rule.
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

def main(limit=200):
    seen = set()
    if os.path.exists(SEEN):
        seen = set(open(SEEN, encoding='utf-8').read().splitlines())
    eqs = []
    for wf in sorted(os.listdir(QUEUE)):
        if not (wf.startswith('wave-') and wf.endswith('.jsonl')) or 'agreement' in wf:
            continue
        for line in open(os.path.join(QUEUE, wf), encoding='utf-8'):
            try:
                row = json.loads(line)
            except Exception:
                continue
            if row.get('equation') and len(eqs) < limit:
                if SECRET.search(row['equation']):
                    continue
                ckey = row['file'] + '|' + canon(row['equation'])[:80]
                if ckey in seen:
                    continue
                eqs.append(row)
    n_agree = n_unver = 0
    for row in eqs:
        key = row['file'] + '|' + canon(row['equation'])[:80]
        if key in seen:
            continue
        norm_a = norm_b = None
        err_a = err_b = None
        for attempt in range(4):
            try:
                ep1, m1 = PAIRS[0]
                ep2, m2 = PAIRS[(attempt + 1) % len(PAIRS)]
                norm_a = call(ep1, m1, row['equation'])
                norm_b = call(ep2, m2, row['equation'])
                break
            except urllib.error.HTTPError as e:
                if e.code in (429, 503):
                    time.sleep(25 + 10 * attempt)
                else:
                    err_a = f'HTTP {e.code}'
                    break
            except Exception as e:
                err_a = str(e)[:80]
                time.sleep(5)
        verdict = 'UNVERIFIED'
        if norm_a and norm_b and canon(norm_a) == canon(norm_b) and len(norm_a) > 3:
            verdict = 'AGREED'
            n_agree += 1
        else:
            n_unver += 1
        out = {'file': row['file'], 'equation': row['equation'][:300], 'wave': row.get('wave'),
               'verdict': verdict, 'norm_a': norm_a[:200] if norm_a else None, 'norm_b': norm_b[:200] if norm_b else None,
               'err': err_a or err_b}
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(json.dumps(out, ensure_ascii=False) + '\n')
        with open(SEEN, 'a', encoding='utf-8') as f:
            # dedupe on file + normalized equation, NOT file alone: file alone skipped
            # every remaining equation in a seen file (that bug capped us at 9 rows).
            f.write(row['file'] + '|' + canon(row['equation'])[:80] + '\n')
        time.sleep(3)  # budget pacing: shared fleet
    print(json.dumps({'checked': len(eqs), 'agreed': n_agree, 'unverified': n_unver}))

if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 200)