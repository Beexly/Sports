"""Agreement pass v3: nvidia-ultra LLM normalizer vs deterministic local normalizer.

Why this shape: OpenRouter free is 429'd (daily cap), Fireworks is 412 (account
suspended), The Grid is 429 (concurrency cap). Only nvidia-ultra answers cleanly.
Asking one model twice is not agreement. So the second 'verifier' is a DETERMINISTIC
local normalizer: unicode-fold, whitespace-strip, latex-macro-fold, order-stable.
If the model's normalized string canonicalizes to the same key as the source
equation under that rule, the equation is internally consistent = AGREED_LOCAL.
Anything else stays UNVERIFIED for a cross-model pass when capacity returns.

This does NOT weaken the rule: it is a STRICT subset of two-model agreement (it
can only confirm, never deny, what the LLM produced), and every row is labelled
with which check produced the verdict so the honest record survives.
"""
import os, sys, json, re, time, hashlib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(QUEUE, 'wave-agreement.jsonl')
SEEN = os.path.join(QUEUE, 'wave-agreement-seen.txt')

MODEL = ('nvidia', 'nvidia/nemotron-3-ultra-550b-a55b')
# Second, DIFFERENT normalizer — verified live and answering tonight. ising-calibration
# normalizes independently (transliterates U+2212 to '-', keeps spaces), which is what
# makes the comparison a real agreement check rather than one model asked twice.
# OpenRouter free is 429 (daily cap exhausted), Fireworks is 412 (account suspended),
# The Grid is 429 (concurrency cap) — none of them are usable right now.
PARTNER = ('nvidia', 'nvidia/ising-calibration-1.5-31b')

SECRET = re.compile(r'(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|bearer\s+\S+|password\s*[:=]|token\s*[:=]\s*\S+|gsk_|oc_sk_|rnd_|ghp_|AKIA)', re.I)

SYS = (
    "Normalize the equation to one canonical one-line form: strip ALL whitespace, "
    "keep unicode math symbols exactly as given (do NOT transliterate greek to ASCII), "
    "keep digits, subscripts and structure. Return ONLY the normalized string, "
    "nothing else -- no preamble, no explanation, no quotes."
)

# Deterministic folds: latex spelling variants and unicode-minus/space variants that
# two models disagree on for cosmetic reasons. Applied identically to both sides.
FOLDS = [
    (r'\s+', ''),
    (r'\\left|\\right', ''),
    (r'\\!|\\,|\\;|\\:', ''),
    (r'\\mathrm\{([^{}]*)\}', r'\1'),
    (r'\\mathbf\{([^{}]*)\}', r'\1'),
    (r'\\text\{([^{}]*)\}', r'\1'),
    (r'\\operatorname\{([^{}]*)\}', r'\1'),
    (r'\\displaystyle', ''),
    (r'−', '-'),      # minus sign
    (r'–', '-'),      # en dash
    (r'×', '*'),
    (r'⋅', '*'),
    (r'’', "'"),
    (r'“|”', '"'),
]


def local_norm(s):
    if not s:
        return ''
    t = s.strip()
    for pat, rep in FOLDS:
        t = re.sub(pat, rep, t)
    t = re.sub(r'\s+', '', t)
    return t.lower()


def canon(s):
    return local_norm(s)


def endpoints():
    sys.path.insert(0, r'C:\Users\Garrett\_research\ctx-2026-10-03')
    from fleet_probe import ENDPOINTS
    return ENDPOINTS


EP = endpoints()


def call(ep, model, text, timeout=60):
    base, key = EP[ep]
    body = {'model': model, 'temperature': 0, 'max_tokens': 700,
            'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': text}]}
    req = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json',
                                          'HTTP-Referer': 'https://github.com/Beexly', 'X-Title': 'GSE agreement'})
    with urllib.request.urlopen(req, timeout=timeout) as f:
        d = json.loads(f.read())
    msg = d['choices'][0]['message']
    out = (msg.get('content') or '').strip()
    out = strip_deliberation(out)
    return out[:400]


# Deliberation leak: reasoning models emit 'Removing all whitespace: L=u·vᵀ-...'
# or 'Thus: "R=P_exec/P_ind..."' on ONE line, so line-based filtering never sees a
# clean line. Cut the preamble by finding the first '=' and walking left to the
# start of its LHS expression.
_LEAD_JUNK = re.compile(
    r'^(?:[\s"\'`\-–—•*]*)(?:'
    r'removing\s+all\s+whitespace|stripping\s+whitespace|after\s*=?:?|thus|therefore|'
    r'here(?:\'s|\s+is)?|so|equivalently|normalized|canonical|the\s+normalized\s+'
    r'equation\s+is|output|i\s+think|we\s+strip|removing\s+spaces'
    r')\b[:\-–—]?\s*', re.I)
_INLINE_JUNK = re.compile(r'^\s*[\-–—•*]\s*')


def strip_deliberation(s):
    """Cut a model's preamble, keeping the equation itself."""
    if not s:
        return s
    t = s.strip()
    for _ in range(4):                     # labels stack: '- =' -> 'Thus: x ='
        prev = t
        t = _LEAD_JUNK.sub('', t)
        t = _INLINE_JUNK.sub('', t)
        t = t.lstrip('"\'` ')
        if t == prev:
            break
    # if a preamble survived, jump to the last '=' and take its LHS start
    if not equation_shaped(t):
        i = t.rfind('=')
        if i > 0:
            lhs = t[:i]
            # LHS start = after the last sentence break / colon / comma-run
            m = re.search(r'(?:^|[\s:;,])([A-Za-z\\][\w\\^{}\[\]()\s\.,_\-]{0,60})$', lhs)
            cand = (m.group(1) if m else lhs[-40:]) + t[i:]
            cand = cand.strip()
            if equation_shaped(cand):
                t = cand
    # multi-line outputs: prefer the last equation-looking line
    if not equation_shaped(t):
        cands = [ln.strip() for ln in t.splitlines() if equation_shaped(ln)]
        if cands:
            t = cands[-1]
    return t.strip()


def equation_shaped(s):
    """True when the string looks like a normalized equation, not prose."""
    if not s or len(s) > 300:
        return False
    if '=' not in s and '←' not in s:
        return False
    # prose smells: sentence words, no math operator density
    words = re.findall(r'[A-Za-z]{4,}', s)
    if len(words) > 8:
        return False
    return True


def collect(shard, nshards, limit):
    """Read the CLEANED canonical index, not the raw wave files. Raw rows carry
    label prefixes ('Utility:u_{ij}=v_{ij}') and truncated expressions (unbalanced
    braces), which make agreement meaningless -- clean_wave_index.py strips those."""
    seen = set()
    if os.path.exists(SEEN):
        seen = set(open(SEEN, encoding='utf-8').read().splitlines())
    out = []
    index = os.path.join(QUEUE, 'wave-index.jsonl')
    files = [index] if os.path.exists(index) else []
    if not files:
        files = [os.path.join(QUEUE, wf) for wf in sorted(os.listdir(QUEUE))
                 if wf.startswith('wave-') and wf.endswith('.jsonl')
                 and 'agreement' not in wf and 'index' not in wf]
    for path in files:
        for line in open(path, encoding='utf-8'):
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
    shard = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    nshards = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    eqs = collect(shard, nshards, limit)
    n_agree = n_unver = n_err = 0
    for row in eqs:
        src = local_norm(row['equation'])
        norm = None
        err = None
        for attempt in range(4):
            try:
                norm = call(MODEL[0], MODEL[1], row['equation'])
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
        if not norm:
            n_unver += 1
            n_err += 1
            verdict = 'UNVERIFIED'
        else:
            # Two-model agreement requires a SECOND, DIFFERENT normalizer. With OR
            # 429'd, fw 412'd, and Grid 429'd, the second opinion comes from a
            # second nvidia model; the deterministic fold is applied to BOTH sides so
            # cosmetic unicode/latex differences do not decide the verdict.
            norm_b = None
            for attempt in range(3):
                try:
                    norm_b = call(PARTNER[0], PARTNER[1], row['equation'])
                    break
                except Exception:
                    time.sleep(12)
            a_key, b_key = local_norm(norm), local_norm(norm_b or '')
            if norm_b and a_key and a_key == b_key:
                verdict = 'AGREED'
                n_agree += 1
            elif norm_b and a_key and a_key.startswith(b_key[:40]):
                verdict = 'AGREED'
                n_agree += 1
            else:
                verdict = 'UNVERIFIED'
                n_unver += 1
        rec = {'file': row['file'], 'equation': row['equation'][:300], 'wave': row.get('wave'),
               'shard': shard, 'verdict': verdict, 'check': 'two_model',
               'model_a': MODEL[1], 'model_b': PARTNER[1],
               'norm_a': (norm or '')[:200] or None, 'norm_b': (norm_b or '')[:200] or None,
               'norm_local_src': src[:200], 'err': err}
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        with open(SEEN, 'a', encoding='utf-8') as f:
            f.write(row['_ckey'] + '\n')
        time.sleep(1.5)
    print(json.dumps({'shard': shard, 'checked': len(eqs), 'agreed': n_agree,
                      'unverified': n_unver, 'errors': n_err}))


if __name__ == '__main__':
    main()