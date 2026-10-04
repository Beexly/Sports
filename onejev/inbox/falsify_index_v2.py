"""Second-pass falsification: is my classifier itself wrong?

Pass 1 said "29.4% equation-like". But reading its samples showed the classifier
has FALSE POSITIVES on the junk side:

  HAS_LINK  : '\u03b8_i^Bayes = \u03bc + [\u03c4\u00b2/(\u03c4\u00b2+\u03c3_1i\u00b2)](X_1i \u2212 \u03bc)' is a REAL equation, caught
              because the link regex matched the bracketed term followed by parens.
  PROSE_CONJ: '*P_S I = I \u2212 (I \u2212 \u0120_S, I)_\u007e\u207b\u00b9...' is a real equation, rejected for a connective word.
  OVERLONG  : many are dense multi-equation blocks, i.e. GOOD rows.

So the honest question is not "did the gate admit prose" but: for each rejected
row, DOES IT CONTAIN A REAL EQUATION? That splits the junk population into
"recoverable" (equation buried in prose/markup) and "dead" (no equation at all).

Reports precision of the pass-1 classifier on a hand-checkable sample so the
number is falsifiable rather than asserted.
"""
import json, os, re, random, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eq_normalize as E

INDEX = os.path.join(HERE, 'mind-queue', 'wave-index.jsonl')

# A relation operator with real math on BOTH sides. Deliberately stricter than a
# bare '=' because prose sentences contain '=' too ("x = 5 yards, a QB-quality artifact").
# Definition '=' (':=' and '==') is still an equation. The lookahead must not
    # reject ':=' -- it blocked 'J_GP(π¹,π²) := E_x[...]'.
REL = re.compile(r'(?<![<>!=])=(?![=><])')
# Math evidence on the RHS. Must accept subscript/superscript identifiers
    # ('C h_k', 'wᵀx_i', 'u·vᵀ') and not just digits/Greek/slashes -- requiring
    # '_\{' or a numeral rejected plain valid equations like 'y_k = C h_k'.
MATHY = re.compile(
    r'[0-9πσβθλφΦΣ∏∫∂√≈≤≥≠αγδεηκμνρτωΩΓΔΘΛΞΠΨ]'
    r'|\^|_\{|_\w|\^\w|\\frac|\\sum|\\int|·|±|×|÷|∈|ℝ|→|⇒|−(?!\w)')
NOISE = re.compile(r'https?://|^\s*\||^#{1,6}\s')


def balanced(s):
    d = {'{': 0, '(': 0, '[': 0}
    p = {'}': '{', ')': '(', ']': '['}
    for ch in s:
        if ch in d:
            d[ch] += 1
        elif ch in p:
            d[p[ch]] -= 1
            if d[p[ch]] < 0:
                return False
    return all(v == 0 for v in d.values())


def has_real_equation(eq):
    """Does this row contain at least one genuine equation fragment?

    Ignores markdown decoration entirely: emphasis, links, list markers, table
    pipes, and leading/trailing prose are stripped, then the math core is checked.
    """
    if not eq or len(eq) > 600:
        return False, 'too long / empty'
    t = eq.strip()
    if NOISE.search(t) and not REL.search(t):
        return False, 'markup only'
    # strip markdown furniture
    t = re.sub(r'\[([^\]]{1,60})\]\([^)]*\)', r'\1', t)   # links -> label
    t = re.sub(r'\*\*|__|`+', '', t)
    t = re.sub(r'^\s*[-*•]\s+', '', t)
    t = re.sub(r'^\s*\d+[.)]\s+', '', t)
    t = re.sub(r'^\s*\|.*\|\s*$', '', t)
    t = re.sub(r'^\s*#{1,6}\s*', '', t)
    # Scan EVERY relation operator, not just the first: real equations follow
    # prose ("For a row x_0 = (x_0^C, x_0^D) with N_C continuous ...").
    for m in REL.finditer(t):
        lhs = t[:m.start()].strip()
        # Keep the final identifier-ish chunk of the LHS. Do NOT split on ';' or
        # ',' -- those are equation-internal ('log λ_0(t;θ_λ) = θ_1 + θ_2[...]',
        # 'J_GP(π¹,π²) := ...') and splitting them emptied the LHS so the row was
        # rejected. Split only on a sentence break or an English connective.
        lhs_id = re.split(r'[.:]|\b(?:with|where|and|for|given|if|when)\b', lhs)[-1].strip()
        # 'X := ...' leaves the LHS ending in ':', and the split above then returns
        # an empty chunk. Recover the identifier from before the definition colon.
        if not lhs_id:
            lhs_id = re.split(r'[.:]', lhs)[-2].strip() if len(re.split(r'[.:]', lhs)) > 1 else lhs
        lhs_id = lhs_id[-90:].strip()
        rhs = t[m.end():]
        # trailing prose / next sentence: stop at a clear break
        rhs = re.split(r'(?<=[.;])\s+(?=[A-Z(])|\s--\s|\s—\s', rhs)[0].strip()
        if len(rhs) < 2 or len(lhs_id) == 0 or len(lhs_id) > 90:
            continue
        if not re.search(r'[A-Za-z0-9α-ωΑ-Ω]', lhs_id):
            continue
        # RHS must carry math, not a bare English word or a unit phrase.
        if not MATHY.search(rhs):
            continue
        if re.match(r'^\s*(?:yards|yards,|gms|games|pts|points|%)', rhs, re.I):
            continue
        # Balanced-bracket test on the slice only. It must NOT reject a row just
        # because some LATER prose parenthesis is unbalanced: 'log α_i = wᵀx_i' is a
        # valid equation and 'y_k = C h_k' has no brackets at all, yet both failed
        # when the whole row was tested. Only count what is inside the fragment,
        # and only reject when the fragment's OWN brackets are unbalanced.
        frag = lhs_id + '=' + rhs
        if not balanced(frag):
            # allow a trailing unbalanced '(' only if the equation core before it
            # is already self-contained (common in '(a) p_ij = σ(θ_i-θ_j+h); L=...')
            cut = frag.rfind('(')
            if cut <= 0 or not balanced(frag[:cut]):
                continue
        return True, 'equation core found'
    return False, 'no relation operator with math both sides'


def main():
    rows = []
    with open(INDEX, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('equation'):
                rows.append(r)

    has = []
    dead = []
    reasons = Counter()
    for r in rows:
        ok, why = has_real_equation(r['equation'])
        if ok:
            has.append(r)
        else:
            dead.append(r)
            reasons[why] += 1

    n = len(rows)
    print('TOTAL cleaned-index rows : %d' % n)
    print('  CONTAINS a real eq    : %d  (%.1f%%)' % (len(has), 100.0 * len(has) / n))
    print('  genuinely no equation  : %d  (%.1f%%)' % (len(dead), 100.0 * len(dead) / n))
    print('\nwhy rejected:', dict(reasons))

    # precision check on the DEAD bucket: if any of these actually contain an
    # equation, my detector is too strict and the % above is an underestimate.
    rng = random.Random(11)
    sample = rng.sample(dead, min(15, len(dead)))
    print('\n--- DEAD sample (verify these really have no equation) ---')
    for r in sample:
        print('  ', r['equation'][:135])

    print('\n--- HAS-EQ sample (verify these really are equations) ---')
    for r in rng.sample(has, min(8, len(has))):
        print('  ', r['equation'][:135])


if __name__ == '__main__':
    main()