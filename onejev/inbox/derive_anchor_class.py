# Derive the EQ_SPAN anchor class from evidence, not from a guess.
#
# Two real equations are LOST because the leading class cannot anchor:
#   f* = (bp-(1-p))/b              (Kelly criterion)   -> needs '*'
#   max_{i} |r_i - r_j| = C        (Wasserstein)       -> needs to anchor at 'max'
# Seven junk strings are ADMITTED, several because they anchor too easily.
#
# This measures candidate classes against all 9 known failures plus 8 positives
# that must survive. A class is only acceptable if it fixes losses AND keeps
# positives AND does not widen the leak surface.

import re
import sys

sys.path.insert(0, r"C:\Users\Garrett\onejev\inbox")
import eq_recover as E

LOSSES = [            # must MATCH the span (currently missed)
    "f* = (bp−(1−p))/b",
    "max_{i} |r_i − r_j| = C",
]
LEAKS = [             # must NOT become worse
    'aria-live="polite"',
    "priced=true",
    "CLAUDE_PROVIDER=bedrock + AWS + BEDROCK_MODEL_MAP",
    "double_build_risk=HIGH",
    "src=\"https://www.facebook.com/tr?id=1&ev=PageView\"",
]
POSITIVES = [        # must still MATCH
    "Q(s)=b_{h,L}(s)P(M<s)+b_{v,L}(s)P(M>s)",
    "ℓ(θ|X,Y) = Y log p + (1−Y) log(1−p)",
    r"\hat{C}(p)=\sigma\left(a\cdot logit(p)+b\right)",
    "CED_α(λX+(1−λ)Y) ≤ λCED_α(X)+(1−λ)CED_α(Y)",
    "Brier = REL − RES + UNC",
    r"P(i beats j) = p_i / (p_i + p_j)",
]

BODY = r"[A-Za-z0-9_θμτσ∂^{},\\\−\-()]*"
TAIL = r"\s*=\s*[^\n]+"

BASE = r"[A-Za-zθμτσα-ωΑ-Ωκ]"
CANDIDATES = {
    "current":              BASE + BODY + TAIL,
    "star_underscore":      r"[A-Za-zθμτσα-ωΑ-Ωκ*_]" + BODY + TAIL,
    "backslash_macro":      r"(?:[A-Za-zθμτσα-ωΑ-Ωκ]|\\[A-Za-z]+)" + BODY + TAIL,
    "latin_ext_star":       r"[A-Za-z\u0100-\u017fθμτσα-ωΑ-Ωκ*_]" + BODY + TAIL,
    "mathbold":             r"[A-Za-z\U0001D400-\U0001D7FFθμτσα-ωΑ-Ωκ*_]" + BODY + TAIL,
}


def main():
    for name, pat in CANDIDATES.items():
        rx = re.compile(pat)
        losses = sum(1 for s in LOSSES if rx.search(s))
        keep = sum(1 for s in POSITIVES if rx.search(s))
        leak = sum(1 for s in LEAKS if rx.search(s))
        print("%-20s fixes %d/%d losses   keeps %d/%d   still-matches %d/%d leaks" % (
            name, losses, len(LOSSES), keep, len(POSITIVES), leak, len(LEAKS)))

    print("\n-- what the CURRENT class actually does --")
    cur = re.compile(CANDIDATES["current"])
    for label, group in (("LOSS ", LOSSES), ("KEEP ", POSITIVES), ("LEAK ", LEAKS)):
        for s in group:
            print("  %s match=%-5s  %s" % (label, bool(cur.search(s)), s[:56]))


if __name__ == "__main__":
    main()