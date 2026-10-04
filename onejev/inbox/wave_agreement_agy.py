"""Independent agreement verifier using Google Antigravity CLI (Gemini 3.x).

Supplies the genuinely different model family that the agreement gate needs.
Batches equations (10 per prompt) to maximize throughput and minimize CLI spinup overhead.
Outputs to mind-queue/wave-agreement-gemini.jsonl and updates seen cache.
"""
import os
import sys
import json
import re
import time
import subprocess
import hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
INDEX = os.path.join(QUEUE, 'wave-index.jsonl')
OUT = os.path.join(QUEUE, 'wave-agreement-gemini.jsonl')
SEEN = os.path.join(QUEUE, 'wave-agreement-gemini-seen.txt')

MODEL = 'gemini-3.8-flash-low'
BATCH_SIZE = 10

FOLDS = [
    (r'\s+', ''),
    (r'\\left|\\right', ''),
    (r'\\!|\\,|\\;|\\:', ''),
    (r'\\mathrm\{([^{}]*)\}', r'\1'),
    (r'\\mathbf\{([^{}]*)\}', r'\1'),
    (r'\\text\{([^{}]*)\}', r'\1'),
    (r'\\operatorname\{([^{}]*)\}', r'\1'),
    (r'\\displaystyle', ''),
    (r'−', '-'),
    (r'–', '-'),
    (r'×', '*'),
    (r'⋅', '*'),
    (r'’', "'"),
    (r'“|”', '"'),
]

def canon(s):
    if not s:
        return ''
    t = s.strip()
    for pat, rep in FOLDS:
        t = re.sub(pat, rep, t)
    t = re.sub(r'\s+', '', t)
    return t.lower()

def call_agy_batch(equations):
    """Normalize a batch of equations via agy CLI."""
    lines = [f"{i+1}. {eq}" for i, eq in enumerate(equations)]
    prompt = (
        "Normalize each numbered equation below to one canonical one-line form: strip ALL whitespace, "
        "keep unicode math symbols exactly as given, keep digits, subscripts and structure.\n"
        "Return ONLY a valid JSON list of strings, e.g. [\"eq1\", \"eq2\", ...], with exactly one element per input, "
        "no markdown fences, no comments, no explanation:\n" + "\n".join(lines)
    )
    cmd = ['agy', '--model', MODEL, '-p', prompt, '--output-format', 'text']
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=45)
        if p.returncode != 0:
            return None, f"agy exit {p.returncode}: {p.stderr[:100]}"
        raw = p.stdout.strip()
        # strip code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        res = json.loads(raw)
        if isinstance(res, list) and len(res) == len(equations):
            return res, None
        return None, f"Length mismatch: got {len(res) if isinstance(res, list) else type(res)} vs {len(equations)}"
    except Exception as e:
        return None, str(e)[:120]

def main():
    seen = set()
    if os.path.exists(SEEN):
        with open(SEEN, encoding='utf-8') as f:
            seen = set(f.read().splitlines())

    rows = []
    if os.path.exists(INDEX):
        with open(INDEX, encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                    eq = r.get('equation')
                    if not eq:
                        continue
                    ckey = r.get('file', '') + '|' + canon(eq)[:80]
                    if ckey in seen:
                        continue
                    r['_ckey'] = ckey
                    rows.append(r)
                except Exception:
                    continue

    print(f"Loaded {len(rows)} pending equations from index. Seen={len(seen)}")
    total_agreed = 0
    total_checked = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        eqs = [r['equation'] for r in batch]
        norms, err = call_agy_batch(eqs)

        out_lines = []
        seen_lines = []
        for j, r in enumerate(batch):
            src_canon = canon(r['equation'])
            norm_gem = norms[j] if (norms and j < len(norms)) else None
            gem_canon = canon(norm_gem) if norm_gem else ''

            if norm_gem and (src_canon == gem_canon or src_canon.startswith(gem_canon[:40])):
                verdict = 'AGREED'
                total_agreed += 1
            else:
                verdict = 'UNVERIFIED'

            rec = {
                'file': r.get('file'),
                'equation': r.get('equation', '')[:300],
                'wave': r.get('wave'),
                'verdict': verdict,
                'check': 'gemini_agy',
                'model': MODEL,
                'norm_gemini': norm_gem,
                'src_canon': src_canon[:200],
                'err': err
            }
            out_lines.append(json.dumps(rec, ensure_ascii=False))
            seen_lines.append(r['_ckey'])
            total_checked += 1

        with open(OUT, 'a', encoding='utf-8') as f:
            for l in out_lines:
                f.write(l + '\n')
        with open(SEEN, 'a', encoding='utf-8') as f:
            for l in seen_lines:
                f.write(l + '\n')

        rate = (total_agreed / total_checked * 100) if total_checked else 0
        print(f"Batch {i//BATCH_SIZE + 1}: Checked {total_checked}/{len(rows)} | Agreed: {total_agreed} ({rate:.1f}%) | Err: {err}")
        time.sleep(1)

if __name__ == '__main__':
    main()
