# Find a CONTENT guard that kills the 7 leaks without killing the 10 positives.
#
# derive_anchor_class.py proved the leaks are not an anchor problem: all five
# sampled leaks already match EQ_SPAN. So the fix belongs in a junk guard that
# inspects the SPAN'S CONTENT.
#
# The 7 measured leaks:
#   aria-live="polite"                                    quoted value
#   priced=true                                           bare kebab-case boolean
#   [Start a trial100%](https://account.similarweb...)    markdown link
#   src="https://www.facebook.com/tr?id=...&ev=..."       quoted URL
#   ![adfox](http://x.com/getCode?p1=..&p2=..)            image/link markup
#   CLAUDE_PROVIDER=bedrock + AWS + BEDROCK_MODEL_MAP     SCREAMING_SNAKE key
#   double_build_risk=HIGH                                kebab key
#
# Common shape: the right-hand side is NOT mathematics. It is a quoted string,
# a bare word, a URL, or a config literal. The guard below encodes exactly that
# and is measured against all 28 negatives plus the 10 positives.

import re
import sys

sys.path.insert(0, r"C:\Users\Garrett\onejev\inbox")

# RHS that is provably not mathematics.
NOT_MATH_RHS = re.compile(
    r"""^\s*(?:
          ["'][^"']*["']\s*$                      # quoted literal
        | true | false | null | none | undefined   # bare keywords
        | https?:// | www\.                        # bare URL
        | [A-Z][A-Z0-9_]{3,}(?:\s*\+\s*[A-Z][A-Z0-9_]+)*   # SCREAMING_SNAKE chain
        | [a-z]+(?:[-_][a-z0-9]+)+\s*$            # kebab / snake identifier
    )\s*$""",
    re.I | re.X,
)
# Any URL or markdown link anywhere in the span.
ANY_URL = re.compile(r"(?:https?://|www\.)|\]\(|\]\[|!\[")


def looks_like_math(rhs):
    """True when the right-hand side carries actual mathematics."""
    t = rhs.strip()
    if not t:
        return False
    if NOT_MATH_RHS.match(t):
        return False
    if ANY_URL.search(t):
        return False
    # digits, math glyphs, operators, delimiters, or a Greek/LaTeX token
    return bool(re.search(
        r"[0-9]|[α-ωΑ-Ω]|\\[A-Za-z]+|[\^_{}\[\]∫∑∏∂√±]"
        r"|[−–]|\*\*|[<>≤≥≠≈]|/[0-9a-zA-Z(]", t))


# Longest-first: '\leq' must be tried before a bare '<' or the scan splits it.
_REL_OPS = (
    "\\leq", "\\geq", "\\le\\b", "\\ge\\b", "\\approx", "\\neq",
    "\\equiv", ":=", "==", "<=", ">=", "≤", "≥", "≈", "≠", "=", "<", ">",
)


def rhs_of(eq):
    """Everything after the FIRST relation operator that separates LHS from RHS.

    Measured bug: taking the LAST operator broke 'Q(s) = b_{h,L}(s)P(M<s) + ...'
    because the '<' inside 'M<s' was read as the relation, leaving rhs='s)'.
    Taking the last was wrong; taking a mid-string '<' or '>' is worse, so the
    scan skips any operator that is not followed by a plausible RHS start and
    stops at the first '=' -like separator.
    """
    # Prefer '=' style operators first: they are the unambiguous separator.
    for op in ("\\leq", "\\geq", "\\approx", "\\neq", "\\equiv", ":=", "==",
               "<=", ">=", "≤", "≥", "≈", "≠", "="):
        i = eq.find(op)
        if i > 0:
            return eq[i + len(op):]
    # No '=' family operator: a bare '<' or '>' only counts when it has content
    # on BOTH sides, which rules out the '<' inside M<s or P(M>s).
    for op in ("<", ">"):
        i = eq.find(op)
        if i <= 0:
            continue
        lhs, rhs = eq[:i], eq[i + 1:]
        if lhs.strip() and rhs.strip() and re.search(r"[A-Za-z0-9（]", lhs):
            return rhs
    return ""


def main():
    import negative_control as NC
    import eq_recover_ineq as W

    rows = []
    for s, note in NC.NEGATIVES:
        g = W.recover(s)
        v = g["status"]
        if v == "EQUATION":
            eq = g["equation"]
            rhs = rhs_of(eq)
            # The span can be cut mid-URL, so also test the ORIGINAL line.
            keep = looks_like_math(rhs) and not ANY_URL.search(s)
            rows.append((s, note, eq, rhs, keep))
    print("currently-admitted rows the guard would examine: %d\n" % len(rows))
    print("%-58s %-34s %s" % ("equation", "rhs", "keep?"))
    keep_n = drop_n = 0
    for s, note, eq, rhs, keep in rows:
        print("%-58s %-34s %s" % (eq[:56], rhs[:32], "KEEP" if keep else "drop"))
        keep_n += keep
        drop_n += (not keep)
    print("\nguard would drop %d, keep %d" % (drop_n, keep_n))

    print("\n-- guard must NOT drop any of the 10 positives --")
    bad = 0
    for s in NC.POSITIVES:
        g = W.recover(s)
        eq = g["equation"] if g["status"] == "EQUATION" else s
        keep = looks_like_math(rhs_of(eq)) and not ANY_URL.search(s)
        if not keep:
            bad += 1
        print("  %-5s %s" % ("KEEP" if keep else "LOST", eq[:66]))
    print("\npositives lost by the guard: %d" % bad)


if __name__ == "__main__":
    main()