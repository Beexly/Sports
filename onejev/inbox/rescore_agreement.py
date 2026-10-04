"""Rescore stored agreement rows with the verdict the docstring actually specifies.

wave_agreement_v3.py's header says the second opinion is a DETERMINISTIC local
normalizer and the label is AGREED_LOCAL, but the code compares model A to model B:

    a_key, b_key = local_norm(norm), local_norm(norm_b or '')
    if norm_b and a_key and a_key == b_key:   # two LLMs, byte equality

Two independent LLMs never emit identical normalizations, so that test measures
nothing about equation quality -- it reported 21% "AGREED" on rows whose norm_a
held truncated preamble fragments ("The input is: (6) Gradient direction:").

Both sides are already stored per row, so rescoring costs ZERO new LLM calls:

  AGREED_LOCAL  model output canonicalizes to the source equation's key under the
                same deterministic fold. This is the strict subset the docstring
                describes: it can CONFIRM the model's transcription, never deny it.
  CONFLICT      the model returned a real equation that is NOT the source.
  UNVERIFIED    no usable model output (err, empty, or still prose).

Agreement stays 21%-meaningless until this runs; the old verdict column is kept as
verdict_two_model so the change is auditable rather than silent.
"""
import json, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
SRC = os.path.join(Q, 'wave-agreement.jsonl')
DST = os.path.join(Q, 'wave-agreement-rescored.jsonl')

WS = re.compile(r'\s+')
LATEX = re.compile(r'\\(?:left|right|!|,|;|:|quad|qquad|displaystyle|limits)\b')
# Case-folding must also collapse MATH ALPHANUMERICS, which str.lower() leaves alone:
# the extractor writes 'e[...]' where the model writes 'E[...]', and 'ĉ(p)' vs 'Ĉ(p)'
# is the same symbol. Without this, byte-equal equations scored as CONFLICT.
UPPER = {c: c.lower() for c in
         'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ'
         'ĀĂĄǍǞǠȀȂȦḀẠẢẤẦẨẪẬẮẰẲẴẶ'
         'ÇĆĈĊČḈ'
         'ḌḐḒ'
         'ĖĘĚȄȆḖḘḚḜḞ'
         'ĜĠĢǦȀḠḢ'
         'ĤĦȞḤḦḨḪ'
         'ĨĪĬĮİǏȈḬḮİ'
         'ĴĶǨ'
         'ĹĻĽĿŁḶḸḺḼ'
         'ṀṂṄṆṈṊ'
         'ŌŎŐƠǑǪǬȌȎȪȬȮȰ'
         'ṖṘṚṜṞ'
         'ṠṢṤṦṨ'
         'ṪṬṮṰṲ'
         'ŨŪŬŮŰŲƯǓǕǗǙǛȔȖȘȚȜȞȠ'
         'ŴẀẂẄẆẈ'
         'ỲỴỶỸÝŶŸỸ'
         'ΆΈΉΊΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'}

# Hyphen/minus/dash are one character to a reader and three to a model: the source
# row spells 'exp{-β(-lnp)^α}' where the model returns 'exp{−β(−lnp)^α}'. They are
# the same equation, so every dash variant folds to ASCII '-'.
DASHES = {'\u2212': '-', '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-',
          '\u2014': '-', '\u2015': '-', '\u2213': '-', '\u2796': '-', '\ufe58': '-',
          '\ufe63': '-', '\uff0d': '-'}


def local_norm(s, fold_case=True):
    """Deterministic fold: unicode NFKC, whitespace-collapse, case, latex cosmetics."""
    if not s:
        return ''
    t = unicodedata.normalize('NFKC', str(s)).strip()
    t = LATEX.sub('', t)
    t = t.replace('\\left', '').replace('\\right', '')
    t = t.replace('\\cdot', '*').replace('\\times', '*')
    # Models prefix equations with U+FFFD / stray quotes from tokenizer mojibake
    # ("\ufffd\u0108(p)=..."). They carry no meaning and blocked every match.
    t = ''.join(c for c in t if c.isprintable() and c not in '\ufffd\ufeff\u200b')
    t = WS.sub(' ', t)
    t = t.translate(str.maketrans(UPPER))
    t = t.translate(str.maketrans(DASHES))
    # Case matters in PROSE and not in a formula, so compare formulas case-blind:
    # 'q(s)=b_{h,l}(s)p(m<s)' and 'Q(s)=b_{h,L}(s)P(M<s)' are the same equation.
    if fold_case:
        t = t.lower()
    return t.strip(' "\'`*')


def equation_shaped(s):
    if not s or len(s) > 300:
        return False
    if '=' not in s and '←' not in s:
        return False
    if len(re.findall(r'[A-Za-z]{4,}', s)) > 8:
        return False
    return True


_JUNK_LEAD = re.compile(r'^\s*(?:json|```|he input|the input|looking at|here(\'s| is)|'
                       r'output|note|answer|```json|the user wants|according to the|'
                       r'the given|based on the)\b', re.I)
# Models that fail the task emit a CHARACTER-LEVEL DIFF instead of an equation:
#   '"aper\'s" -> "paper\'s"\n"n" -> "n"'. It contains '=' so it passes a naive gate.
_DIFF_LINE = re.compile(r'^\s*"?[^"]{0,40}"?\s*->\s*"?', re.M)


def looks_like_equation(s):
    """True only for a single normalized equation line.

    Raw JSON ('json { "start_date": ...'), echoed prose ('he input.'), and
    character-diff dumps all contain '=' and pass a naive gate, which is how
    non-answers got scored as CONFLICT and manufactured a fake disagreement rate.
    """
    if not s:
        return False
    t = s.strip()
    if len(t) > 300 or _JUNK_LEAD.match(t):
        return False
    if _DIFF_LINE.search(t):
        return False
    if '{' in t and '":' in t:          # JSON object fragment
        return False
    if t.count('=') < 1:
        return False
    if len(re.findall(r'[A-Za-z]{4,}', t)) > 8:
        return False
    return True


def canon(s):
    """Same fold, minus the prose guard -- used to compare two normalized strings."""
    return local_norm(s)


def core(s):
    """The equation payload: everything from the first symbol or '=', so a source
    that wraps several equations in prose ('előwithhomeadvantage: p_ij=...; L=...')
    still compares against a model returning just one of them."""
    t = local_norm(s)
    for ch in ('=', '←'):
        i = t.find(ch)
        if i > 0:
            return t[i:]
    return t


def judge(row):
    src = row.get('norm_local_src') or ''
    a = row.get('norm_a') or ''
    b = row.get('norm_b') or ''
    if row.get('err'):
        return 'UNVERIFIED', 'model error: %s' % row['err']

    csrc = core(src)
    for name, val in (('norm_a', a), ('norm_b', b)):
        if not val or not looks_like_equation(val):
            continue
        cv = core(val)
        if not cv or not csrc:
            continue
        n = min(len(csrc), len(cv))
        # Agreement = one side's equation body is the other's, or they share a long
        # run. A shared prefix of >=12 normalized chars is not a coincidence: these
        # are alphanumeric math expressions, so 12 chars pins the formula.
        if csrc == cv or (n >= 12 and (csrc.startswith(cv) or cv.startswith(csrc))):
            return 'AGREED_LOCAL', '%s matches source under local fold' % name
        if equation_shaped(val):
            return 'CONFLICT', '%s is a real equation but differs from source' % name
    return 'UNVERIFIED', 'no usable equation-shaped model output'


rows = [json.loads(l) for l in open(SRC, encoding='utf-8') if l.strip()]
tally = {}
with open(DST, 'w', encoding='utf-8') as fh:
    for r in rows:
        verdict, why = judge(r)
        r['verdict_two_model'] = r.get('verdict')
        r['verdict'] = verdict
        r['verdict_reason'] = why
        tally[verdict] = tally.get(verdict, 0) + 1
        fh.write(json.dumps(r, ensure_ascii=False) + '\n')

n = len(rows)
print(json.dumps({'rows': n, 'verdicts': tally,
                  'agreed_local_pct': round(100.0 * tally.get('AGREED_LOCAL', 0) / n, 1) if n else 0,
                  'two_model_agreed_was': sum(1 for r in rows if r.get('verdict_two_model') == 'AGREED'),
                  'out': DST}, indent=1))