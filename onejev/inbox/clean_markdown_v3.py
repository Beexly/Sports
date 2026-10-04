"""Resolve the 880 disputed rows by measurement, not by picking a flattering number.

clean_markdown_final.py says 0 prose; verify_markdown_clean.py says 880. Reading
the 880 shows BOTH are partly right:

  * many carry a real equation behind an English label:
      'SARSA loss (Sec. 3.3): L_t(θ_t) = E[(R_t + Q̂ - Q̂)^2]; θ_{t+1} = θ_t - α∇L_t'
  * some are genuinely junk with no equation at all:
      'PyTorch, single NVIDIA RTX 4090, AdamW, batch size 2, lr 1e-4'

So the discriminator is not word count -- it is whether an equation RELATION
survives after the prose. A row is kept only if cutting at the last relation
operator still leaves a math-bearing clause on BOTH sides. That is measurable,
and it does not rewrite anything: the kept row is the full original string.

Output splits the dispute into three explicit buckets so nothing is silently
decided:
  math-label   equation present behind an English label -> KEEP (labelled)
  junk         no equation relation at all               -> DROP
  ambiguous    relation present but prose-dominant      -> DROP, listed separately
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
IN = os.path.join(Q, 'markdown-clean-final.jsonl')
OUT = os.path.join(Q, 'markdown-clean-v3.jsonl')
AMBIG = os.path.join(Q, 'markdown-ambiguous.jsonl')

PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
REL_TOK = re.compile(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\le\b|\\ge\b|\\approx|\\to\b|\\rightarrow')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


def prose_words(eq):
    n = 0
    for m in PROSE_RUN.finditer(eq):
        n += len(re.findall(r'[A-Za-z]{3,}', strip_cmds(m.group(0))))
    return n


def equation_present(eq):
    """An equation relation with math on BOTH sides of its last operator."""
    rels = list(REL_TOK.finditer(eq))
    if not rels:
        return False
    last = rels[-1]
    lhs = eq[:last.start()]
    rhs = eq[last.end():]
    return bool(MATHY.search(lhs)) and bool(MATHY.search(rhs))


def main():
    rows = [json.loads(l) for l in open(IN, encoding='utf-8') if l.strip()]
    print('input:', len(rows))

    st = Counter()
    kept, ambig = [], []
    for r in rows:
        eq = r['equation']
        pw = prose_words(eq)
        has_eq = equation_present(eq)
        nm = len(MATHY.findall(eq))

        if pw < 3:
            st['clean_kept'] += 1
            kept.append(r)
            continue
        if has_eq and nm >= 4:
            # real equation behind an English label
            st['math_label_kept'] += 1
            kept.append(r)
            continue
        if not has_eq and nm == 0:
            st['junk_dropped'] += 1
            continue
        st['ambiguous'] += 1
        ambig.append(r)

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')
    with open(AMBIG, 'w', encoding='utf-8') as fh:
        for k in ambig:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    print(json.dumps({
        'input': len(rows),
        'kept': len(kept),
        'clean_kept': st['clean_kept'],
        'math_label_kept': st['math_label_kept'],
        'junk_dropped': st['junk_dropped'],
        'ambiguous_written_separately': len(ambig),
        'out': OUT,
        'ambiguous_out': AMBIG,
    }, indent=1))


if __name__ == '__main__':
    main()