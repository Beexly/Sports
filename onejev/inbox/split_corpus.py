"""Build the evidence split: which rows are safe to hand downstream.

Three outcomes, all evidence-backed:
  EQUATION  a real equation core exists (verified detector from falsify_index_v2)
  PROSE_MIX equation(s) bundled with prose -- recoverable by splitting, not by
            dropping: the corpus value is real, the row shape is wrong
  NONMATH   no equation at all; includes config-shaped rows like
            'CLAUDE_PROVIDER=bedrock' that the gate let through because they
            contain '=' and a digit

Writes the split so downstream consumers can pick a policy instead of me
deciding silently. Read-only over the index; no re-extraction.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from falsify_index_v2 import has_real_equation

INDEX = os.path.join(HERE, 'mind-queue', 'wave-index.jsonl')
OUT_EQ = os.path.join(HERE, 'mind-queue', 'corpus-equations.jsonl')
OUT_MIX = os.path.join(HERE, 'mind-queue', 'corpus-prose-mixed.jsonl')
OUT_NO = os.path.join(HERE, 'mind-queue', 'corpus-nonmath.jsonl')

# Config/assignment rows that contain '=' and a value but are not mathematics.
CONFIGISH = re.compile(
    r'^(?:[A-Z][A-Z0-9_]{2,}|CLAUDE_[A-Z_]+|[a-z_]+path|[a-z_]*file|[a-z_]*url)'
    r'\s*=\s*[^\s=]', re.I)
KEYVAL = re.compile(r'^\s*[A-Za-z_][\w.\-]{1,30}\s*=\s*[\w./\\-]+\s*$')
RHS_WORD = re.compile(r'^\s*(?:true|false|yes|no|null|none|high|low|ok|done|bedrock'
                      r'|aws|gse=y|rho|alpha)\s*$', re.I)


def is_configish(eq):
    t = eq.strip()
    if CONFIGISH.match(t) and '=' in t:
        rhs = t.split('=', 1)[1].strip()
        # still mathematics if it has real operators/symbols
        if re.search(r'[+\-*/^_{}\\]|[α-ωΑ-Ω]|=', rhs):
            return False
        return True
    if KEYVAL.match(t):
        return False   # handled below by the word test
    if KEYVAL.match(t) and RHS_WORD.match(t.split('=', 1)[1].strip()):
        return True
    return False


def main():
    eq_rows, mix_rows, no_rows = [], [], []
    seen_key = set()
    dupes = 0
    with open(INDEX, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            eq = r.get('equation')
            if not eq:
                continue
            if is_configish(eq):
                no_rows.append({'file': r.get('file'), 'equation': eq,
                                'why': 'config-shaped assignment, not mathematics'})
                continue
            ok, _why = has_real_equation(eq)
            if not ok:
                no_rows.append({'file': r.get('file'), 'equation': eq,
                                'why': 'no equation core'})
                continue
            # prose-mixed = long row, or many long words, or sentence connective
            words = len(re.findall(r'[A-Za-z]{4,}', eq))
            connective = re.search(r'\b(?:the|and|or|with|for|from|that|this|where|'
                                   r'which|between|hence|therefore|thus)\b', eq, re.I)
            if len(eq) > 300 or words > 6 or (connective and len(eq) > 110):
                mix_rows.append({'file': r.get('file'), 'equation': eq,
                                 'why': 'equation bundled with prose'})
            else:
                eq_rows.append({'file': r.get('file'), 'equation': eq,
                                'why': 'equation core'})

    for rows, path in ((eq_rows, OUT_EQ), (mix_rows, OUT_MIX), (no_rows, OUT_NO)):
        with open(path, 'w', encoding='utf-8') as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    tot = len(eq_rows) + len(mix_rows) + len(no_rows)
    print(json.dumps({
        'total_rows': tot,
        'equation_clean': len(eq_rows),
        'prose_mixed_recoverable': len(mix_rows),
        'nonmath_drop': len(no_rows),
        'pct_usable_now': round(100.0 * len(eq_rows) / tot, 1),
        'pct_usable_after_split': round(100.0 * (len(eq_rows) + len(mix_rows)) / tot, 1),
        'files': {'equation': OUT_EQ, 'prose_mixed': OUT_MIX, 'nonmath': OUT_NO},
    }, indent=1))

    print('\nNONMATH sample:')
    for r in no_rows[:10]:
        print('  ', r['equation'][:120])


if __name__ == '__main__':
    main()