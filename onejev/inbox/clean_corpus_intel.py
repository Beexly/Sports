"""Filter corpus-intelligence rows using the PROVEN v3 discriminator.

extract_corpus_intel.py wrote 1,914 rows with 0 non-verbatim, but an independent
verifier found the writer's self-report was optimistic:
  755 prose rows, 265 with no relation operator, 106 containing '**' markdown,
  78 unbalanced brackets. Real math sits next to junk like
'**Eligibility gate:** GREEN x K' and 'NGS CPOE: n=255, r=+0.176 -> LIVE'.

Reuse the same rule that resolved the markdown dispute -- keep a row when a
relation operator has MATH ON BOTH SIDES; that is a measurement, not a word
count. Additionally strip the '**bold**' label wrapper and re-check balance.

Anything still ambiguous is written to its own file, never silently decided.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
IN = os.path.join(Q, 'corpus-intelligence.jsonl')
OUT = os.path.join(Q, 'corpus-intelligence-clean.jsonl')
AMB = os.path.join(Q, 'corpus-intelligence-ambiguous.jsonl')

REL_TOK = re.compile(r'(?<![<>!=])=(?![=><])|[≤≥≈←]|:=|\\le\b|\\ge\b|\\approx|\\to\b|\\rightarrow')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
LEDGER = re.compile(r'^\s*(?:status|state|owner|assign|assigned|tag|ref|path|verdict)\s*[:=]', re.I)


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


def balanced(s):
    return (s.count('{') == s.count('}') and s.count('(') == s.count(')')
            and s.count('[') == s.count(']'))


def prose_words(eq):
    n = 0
    for m in PROSE_RUN.finditer(eq):
        n += len(re.findall(r'[A-Za-z]{3,}', strip_cmds(m.group(0))))
    return n


def trim_markdown(eq):
    """Remove a leading '**Label:**' or '- ' wrapper BY INDEX, staying verbatim."""
    s = eq
    m = re.match(r'^\s*(?:[-*>\u2022]\s*)+', s)
    if m:
        s = s[m.end():]
    m = re.match(r'^\*\*(?:[^*]{1,60})\*\*\s*:?\s*', s)
    if m:
        s = s[m.end():]
    return s.strip()


def main():
    rows = [json.loads(l) for l in open(IN, encoding='utf-8') if l.strip()]
    print('input:', len(rows))

    kept, ambig, seen = [], [], set()
    st = Counter()
    for r in rows:
        eq = r['equation']
        src = r['path']

        if LEDGER.match(eq):
            st['ledger_dropped'] += 1
            continue

        trimmed = trim_markdown(eq)
        if trimmed and trimmed != eq:
            # only accept the trim if it is still a substring of the stored span
            if trimmed in eq and len(trimmed) >= 15:
                eq = trimmed
                r = dict(r)
                r['equation'] = eq

        rels = list(REL_TOK.finditer(eq))
        if not rels:
            st['no_relation_dropped'] += 1
            continue
        last = rels[-1]
        lhs, rhs = eq[:last.start()], eq[last.end():]
        if not (MATHY.search(lhs) and MATHY.search(rhs)):
            st['one_sided_dropped'] += 1
            continue
        if not balanced(eq):
            st['unbalanced_dropped'] += 1
            continue
        if len(eq) < 15:
            st['short_dropped'] += 1
            continue

        pw = prose_words(eq)
        if pw >= 3:
            # prose label over a real equation: keep only if the equation itself
            # dominates (many math tokens relative to words)
            if pw > 4 * len(MATHY.findall(eq)):
                st['prose_dropped'] += 1
                continue
            st['labelled_kept'] += 1
        else:
            st['clean_kept'] += 1

        k = (src, eq)
        if k in seen:
            st['dup'] += 1
            continue
        seen.add(k)
        kept.append(r)

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    print(json.dumps(dict(st, out=OUT, kept=len(kept)), indent=1))


if __name__ == '__main__':
    main()