"""eq_normalize.py -- the ONE agreement authority for every lane (Ising and Gemini).

Rules, exactly as specified:
  * Store the PRINTED equation unchanged. Never rewrite, normalize in place, or
    let a model return its own version of the equation.
  * Compare ONLY the key. Two printed forms agree iff their keys are equal.
  * A reorder is UNVERIFIED. normalize_key() never sorts terms, so a reordering
    yields a different key and therefore UNVERIFIED. That is intentional: term
    order in a printed equation is part of the artifact under review.
  * An empty key is UNVERIFIED (either side empty).

The stored `printed_equation` field is the raw source string; `compare_key` is the
derived comparison artifact. Nothing downstream may substitute the key back into
the equation.
"""
import re

# LaTeX macro -> unicode. Order matters: longer/more specific first so that
# \varepsilon does not become \epsilon + 's', and \geq is not eaten by \ge.
LATEX_MACROS = [
    (r'\\varepsilon', 'ε'), (r'\\epsilon', 'ε'), (r'\\vartheta', 'ϑ'),
    (r'\\varphi', 'φ'), (r'\\phi', 'φ'), (r'\\varrho', 'ϱ'), (r'\\rho', 'ρ'),
    (r'\\lambda', 'λ'), (r'\\sigma', 'σ'), (r'\\omega', 'ω'), (r'\\mu', 'μ'),
    (r'\\alpha', 'α'), (r'\\beta', 'β'), (r'\\gamma', 'γ'), (r'\\delta', 'δ'),
    (r'\\theta', 'θ'), (r'\\kappa', 'κ'), (r'\\nu', 'ν'), (r'\\xi', 'ξ'),
    (r'\\pi', 'π'), (r'\\tau', 'τ'), (r'\\chi', 'χ'), (r'\\psi', 'ψ'),
    (r'\\zeta', 'ζ'), (r'\\eta', 'η'), (r'\\iota', 'ι'), (r'\\upsilon', 'υ'),
    (r'\\Gamma', 'Γ'), (r'\\Delta', 'Δ'), (r'\\Theta', 'Θ'), (r'\\Lambda', 'Λ'),
    (r'\\Xi', 'Ξ'), (r'\\Pi', 'Π'), (r'\\Sigma', 'Σ'), (r'\\Upsilon', 'Υ'),
    (r'\\Phi', 'Φ'), (r'\\Psi', 'Ψ'), (r'\\Omega', 'Ω'),
    (r'\\cdot', '·'), (r'\\times', '×'), (r'\\div', '÷'),
    (r'\\leq', '≤'), (r'\\le(?![a-zA-Z])', '≤'),
    (r'\\geq', '≥'), (r'\\ge(?![a-zA-Z])', '≥'),
    (r'\\neq', '≠'), (r'\\ne(?![a-zA-Z])', '≠'),
    (r'\\approx', '≈'), (r'\\equiv', '≡'), (r'\\propto', '∝'),
    (r'\\sim', '~'), (r'\\infty', '∞'), (r'\\partial', '∂'),
    (r'\\nabla', '∇'), (r'\\pm', '±'), (r'\\mp', '∓'),
    (r'\\sum', '∑'), (r'\\prod', '∏'), (r'\\int', '∫'),
    (r'\\sqrt', '√'), (r'\\hat', ''), (r'\\bar', ''), (r'\\tilde', ''),
]

_DASHES = {'−': '-', '–': '-', '—': '-', '‐': '-', '‑': '-',
           '‒': '-', '―': '-', '−': '-'}

# \text{...}, \mathrm{...} etc. unwrap, keeping the inner content.
_WRAPPERS = [r'\\text', r'\\mathrm', r'\\mathbf', r'\\mathit',
            r'\\mathit', r'\\operatorname', r'\\mathsf', r'\\mathtt']


def _unwrap(t, macro):
    pat = re.compile(r'\\' + macro + r'\{([^{}]*)\}')
    while pat.search(t):
        t = pat.sub(r'\1', t)


def normalize_key(printed_equation):
    """Derive the comparison key from the PRINTED equation.

    Deliberately NOT doing: term sorting (a reorder must stay UNVERIFIED),
    case folding (case is part of the printed form), or any repair of a
    truncated expression.
    """
    if not printed_equation:
        return ''
    t = str(printed_equation)
    for pat, uni in LATEX_MACROS:
        t = re.sub(pat, uni, t)
    for macro in _WRAPPERS:
        _unwrap(t, macro)
    t = re.sub(r'\s+', '', t)
    t = t.translate(str.maketrans(_DASHES))
    # Drop subscript/superscript braces FIRST, then strip punctuation that only
    # exists to separate indices, so x_{i,j} and x_ij collapse to the same key.
    t = re.sub(r'_\{([^{}]*)\}', r'\1', t)
    t = re.sub(r'\^\{([^{}]*)\}', r'^\1', t)
    t = t.replace('_', '').replace('{', '').replace('}', '')
    t = re.sub(r'(?<=[0-9a-zΑ-Ωα-ω]),(?=[0-9a-zΑ-Ωα-ω])', '', t)
    # Variant glyphs that name the same symbol.
    for a, b in (('ε', 'ε'), ('ϑ', 'θ'), ('ϱ', 'ρ'),
                 ('φ', 'φ'), ('ς', 'σ')):
        t = t.replace(a, b)
    return t.strip()


def agreed(key_a, key_b):
    """The single agreement verdict used by every lane.

    Returns 'AGREE' only on exact key equality. Empty on either side is
    UNVERIFIED. A reorder produces unequal keys (terms are never sorted) and is
    therefore UNVERIFIED by construction.
    """
    if not key_a or not key_b:
        return 'UNVERIFIED'
    return 'AGREE' if key_a == key_b else 'UNVERIFIED'


def is_clean_equation(printed_equation):
    """True when the printed string is an equation, not prose or commentary.

    Used to decide whether the key is worth comparing at all. A non-equation is
    UNVERIFIED, never AGREE.
    """
    if not printed_equation or len(printed_equation) > 300:
        return False
    if not any(r in printed_equation for r in ('=', '←', '≤', '≥', '≈', '~')):
        return False
    words = re.findall(r'[A-Za-z]{4,}', printed_equation)
    math_words = {'logit', 'sigmoid', 'softmax', 'exp', 'log', 'max', 'min',
                  'sin', 'cos', 'tan', 'score', 'mean', 'prob', 'bernoulli',
                  'sampled', 'likelihood', 'prob'}
    prose_words = [w for w in words if w.lower() not in math_words]
    if len(prose_words) > 4:
        return False
    if re.search(r'\b(?:the|and|or|with|for|from|that|this|where|which|about'
                 r'|between|sample|hence|therefore|thus)\b', printed_equation, re.I):
        return False
    return True


def verdict(printed_equation, read_back_key=None):
    """Full verdict for one printed row.

    printed_equation is stored VERBATIM by the caller. compare_key is derived.
    When read_back_key is None the printed row is its own comparison target, so a
    clean equation agrees with its own normalization and a non-equation is
    UNVERIFIED.
    """
    key = normalize_key(printed_equation)
    if not key:
        return 'UNVERIFIED', key
    if not is_clean_equation(printed_equation):
        return 'UNVERIFIED', key
    return agreed(key, read_back_key if read_back_key else key), key