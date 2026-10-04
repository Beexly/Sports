"""Verify eq_normalize.agreed() against the stated rules.

Written as a FILE, not a heredoc: bash mangles "\\varepsilon" into a vertical
tab, which masquerades as a normalization bug.
"""
import eq_normalize as E

BS = chr(92)  # backslash, built without a literal to dodge shell/heredoc escapes

checks = []


def chk(name, cond):
    checks.append((name, bool(cond)))


# --- the three stated rules --------------------------------------------
chk("exact match -> AGREE",
    E.agreed(E.normalize_key("e=(1-phi)/2"), E.normalize_key("e=(1-phi)/2")) == "AGREE")
chk("whitespace-only diff -> AGREE",
    E.agreed(E.normalize_key("q(s) = b(s)"), E.normalize_key("q(s)=b(s)")) == "AGREE")
chk("REORDER -> UNVERIFIED",
    E.agreed(E.normalize_key("a+b"), E.normalize_key("b+a")) == "UNVERIFIED")
chk("empty key a -> UNVERIFIED", E.agreed("", "x") == "UNVERIFIED")
chk("empty key b -> UNVERIFIED", E.agreed("x", "") == "UNVERIFIED")
chk("both empty -> UNVERIFIED", E.agreed("", "") == "UNVERIFIED")

# --- latex macro unification ------------------------------------------
chk("varepsilon == epsilon == glyph",
    E.normalize_key(BS + "varepsilon") == E.normalize_key(BS + "epsilon") == E.normalize_key("ε"))
chk("phi == varphi",
    E.normalize_key(BS + "phi") == E.normalize_key(BS + "varphi"))
chk("theta == vartheta",
    E.normalize_key(BS + "theta") == E.normalize_key(BS + "vartheta"))
chk("rho == varrho",
    E.normalize_key(BS + "rho") == E.normalize_key(BS + "varrho"))
chk("sum macro -> unicode",
    E.normalize_key(BS + "sum") == E.normalize_key("∑"))

# --- subscript / superscript brace forms ------------------------------
chk("x_{i,j} == x_ij", E.normalize_key("x_{i,j}") == E.normalize_key("x_ij"))
chk("x^{2} == x^2", E.normalize_key("x^{2}") == E.normalize_key("x^2"))

# --- dash unification --------------------------------------------------
chk("unicode minus == ascii hyphen",
    E.normalize_key("a" + chr(0x2212) + "b") == E.normalize_key("a-b"))

# --- printed equation is stored unchanged ------------------------------
src = "Q(s) = b_{h,l}(s) p(m<s)"
chk("normalize_key does not mutate its input", src == "Q(s) = b_{h,l}(s) p(m<s)")

# --- case is NOT folded (part of printed form) -------------------------
chk("case differs -> UNVERIFIED",
    E.agreed(E.normalize_key("Q(s)"), E.normalize_key("q(s)")) == "UNVERIFIED")

# --- prose must never agree -------------------------------------------
prose = "the baseline is flattered because vig is included in implied prob"
chk("prose -> UNVERIFIED", E.verdict(prose)[0] == "UNVERIFIED")
chk("prose key empty or ignored", E.verdict(prose)[0] != "AGREE")

for n, ok in checks:
    print(("PASS  " if ok else "FAIL  ") + n)
bad = [n for n, ok in checks if not ok]
print()
print("%d/%d passed" % (len(checks) - len(bad), len(checks)))
print("ALL RULES PASS" if not bad else "FAILED: " + "; ".join(bad))