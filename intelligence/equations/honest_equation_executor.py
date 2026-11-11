"""Honest Symbolic & LaTeX Mathematical Equation Executor (`honest_equation_executor.py`).

Implements the ParserNG-inspired zero-fabrication recursive-descent mathematical & LaTeX
expression parser and evaluator required by the 2026-11-10 Extraction Mandate:

1. NEVER invents, defaults, or fabricates missing variable values (`env.get(k, 0.0)` is
   strictly forbidden here). If an expression parses cleanly into a mathematical AST with
   free symbols not supplied in `bindings`, its status is `PARSED_SYMBOLIC_ONLY` with the
   exact list of `unbound_symbols` named.
2. Classifies every record into one of three mutually exclusive honest statuses:
   - `PARSED_EVALUATED`: Valid mathematical AST AND evaluates to a finite scalar under
     closed-form constants or caller-supplied `bindings` (or canonical domain test points
     when `allow_domain_probe=True` is explicitly requested for executable-share auditing,
     tagged `evaluation_mode="domain_probe"` vs `"exact_closed_form"` / `"bound_inputs"`).
   - `PARSED_SYMBOLIC_ONLY`: Valid mathematical AST with >=1 operator and >=1 symbol,
     where free symbols require runtime bindings (e.g. `P(h) = P_0 (1 - L h / T_0)^{...}`).
   - `UNPARSEABLE`: Prose fragment, OCR/layout fragment, table row, unmatched delimiters,
     or non-algebraic statement — accompanied by a specific `reason` code.
3. Supports genuine LaTeX & mathematical constructs:
   - `\frac{a}{b}`, `\dfrac{a}{b}`, `\tfrac{a}{b}`, `\sqrt{x}`, `\sqrt[n]{x}`
   - `\exp`, `\ln`, `\log`, `\sin`, `\cos`, `\tan`, `\tanh`, `\cosh`, `\sinh`, `\arcsin`, `\arccos`, `\arctan`, `\min`, `\max`
   - Absolute values `|x|`, `\left| x \right|`, `\lvert x \rvert`
   - Subscripts `x_{ij}`, `P_0`, `\theta_{\text{BL}}`, Greek letters (`\alpha`..`\omega`, `\Gamma`..`\Omega`)
   - Superscripts / powers `x^2`, `x^{a+b}`, function powers `\cos^2(x)`
   - Relational equations `LHS = RHS` (evaluates `RHS` when `LHS` is a target identifier/call,
     or `LHS - RHS` residual when both sides are algebraic expressions)
   - Implicit multiplication (`2 \pi r`, `P_0 (1 - x)`, `(a+b)(c+d)`).
"""

from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence, Set, Tuple

STATUS_PARSED_EVALUATED = "PARSED_EVALUATED"
STATUS_PARSED_SYMBOLIC_ONLY = "PARSED_SYMBOLIC_ONLY"
STATUS_UNPARSEABLE = "UNPARSEABLE"

MATHEMATICAL_CONSTANTS: Dict[str, float] = {
    "pi": math.pi,
    "e": math.e,
    "infty": float("inf"),
}

SUPPORTED_UNARY_FUNCTIONS: Dict[str, Callable[[float], float]] = {
    "exp": lambda x: math.exp(max(-700.0, min(700.0, x))),
    "ln": lambda x: math.log(x) if x > 0.0 else float("nan"),
    "log": lambda x: math.log(x) if x > 0.0 else float("nan"),
    "log2": lambda x: math.log2(x) if x > 0.0 else float("nan"),
    "log10": lambda x: math.log10(x) if x > 0.0 else float("nan"),
    "sqrt": lambda x: math.sqrt(x) if x >= 0.0 else float("nan"),
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "sinh": lambda x: math.sinh(max(-700.0, min(700.0, x))),
    "cosh": lambda x: math.cosh(max(-700.0, min(700.0, x))),
    "tanh": math.tanh,
    "arcsin": lambda x: math.asin(x) if -1.0 <= x <= 1.0 else float("nan"),
    "arccos": lambda x: math.acos(x) if -1.0 <= x <= 1.0 else float("nan"),
    "arctan": math.atan,
    "abs": abs,
    "logit": lambda p: math.log(p / (1.0 - p)) if 0.0 < p < 1.0 else float("nan"),
    "sigmoid": lambda z: 1.0 / (1.0 + math.exp(-max(-700.0, min(700.0, z)))),
    "Phi": lambda z: 0.5 * (1.0 + math.erf(z / math.sqrt(2.0))),
    "erf": math.erf,
}

SUPPORTED_VARIADIC_FUNCTIONS: Dict[str, Callable[[Sequence[float]], float]] = {
    "min": lambda xs: min(xs),
    "max": lambda xs: max(xs),
    "root": lambda xs: (xs[1] ** (1.0 / xs[0])) if (len(xs) == 2 and xs[0] != 0 and xs[1] >= 0) else float("nan"),
}

GREEK_COMMANDS: Set[str] = {
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta",
    "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi",
    "varpi", "rho", "varrho", "sigma", "varsigma", "tau", "upsilon", "phi",
    "varphi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon",
    "Phi", "Psi", "Omega",
}

PROSE_STOPWORDS: Set[str] = {
    "the", "and", "that", "with", "from", "this", "which", "where", "when",
    "have", "were", "been", "their", "there", "these", "those", "into", "through",
    "between", "because", "however", "therefore", "although", "whether", "chapter",
    "section", "figure", "table", "theorem", "lemma", "proof", "corollary",
}

UNICODE_REPLACEMENTS: Tuple[Tuple[str, str], ...] = (
    # Comparison and relation glyphs become executable operators, not prose
    # rejections: a bound like "P <= 0.05" is an applicability predicate that
    # evaluates to 1.0 or 0.0, which is exactly what a guard node is.
    ("≤", "<="),
    ("≥", ">="),
    ("⩽", "<="),
    ("⩾", ">="),
    ("≈", "~="),
    ("∼", "~="),
    ("≠", "!="),
    ("′", "'"),
    ("″", "''"),
    ("−", "-"),
    ("–", "-"),
    ("—", "-"),
    ("×", "*"),
    ("·", "*"),
    ("⋅", "*"),
    ("÷", "/"),
    ("²", "^2"),
    ("³", "^3"),
    ("⁴", "^4"),
    ("½", "(1/2)"),
    ("¼", "(1/4)"),
    ("¾", "(3/4)"),
    ("π", "\\pi "),
    ("α", "\\alpha "),
    ("β", "\\beta "),
    ("γ", "\\gamma "),
    ("δ", "\\delta "),
    ("ε", "\\epsilon "),
    ("θ", "\\theta "),
    ("λ", "\\lambda "),
    ("μ", "\\mu "),
    ("ν", "\\nu "),
    ("ρ", "\\rho "),
    ("σ", "\\sigma "),
    ("τ", "\\tau "),
    ("φ", "\\phi "),
    ("ψ", "\\psi "),
    ("ω", "\\omega "),
    ("Δ", "\\Delta "),
    ("Σ", "\\sum "),
    ("Φ", "\\Phi "),
    ("Ω", "\\Omega "),
)

# LaTeX relation macros carry the same guard semantics as the glyph pass. They
# used to reach the tokenizer as a bare backslash (`unexpected_character:\`);
# the 2026-11-10 corpus audit logged 16,623 rows rejected on `\leq` alone.
RELATION_MACRO_REPLACEMENTS: Dict[str, str] = {
    "leq": "<=",
    "le": "<=",
    "leqslant": "<=",
    "geq": ">=",
    "ge": ">=",
    "geqslant": ">=",
    "neq": "!=",
    "ne": "!=",
    "approx": "~=",
    "sim": "~=",
    "equiv": "==",
}


def _identity_replacer(match: "re.Match[str]") -> str:
    """Return the matched macro untouched; used for unknown LaTeX commands."""
    return match.group(0)


def _space_replacer_factory(text: str):
    """Build a re.sub replacement that emits literal `text`.

    A plain `str` replacement is unsafe here: `re.sub` expands backslash
    escapes in it, so `" ~= "` would be read as a tab followed by `a` and
    `\approx` would become a form feed.
    """
    def _replace(match: "re.Match[str]") -> str:
        return f" {text} "
    return _replace


def _build_macro_replacers() -> Dict[str, object]:
    replacers: Dict[str, object] = {}
    for name, symbol in RELATION_MACRO_REPLACEMENTS.items():
        replacers[name] = _space_replacer_factory(symbol)
    for name in SUPPORTED_UNARY_FUNCTIONS | SUPPORTED_VARIADIC_FUNCTIONS:
        replacers[name] = _space_replacer_factory(name)
    for name in GREEK_COMMANDS | {"infty"}:
        replacers[name] = _space_replacer_factory(name)
    return replacers


_MACRO_REPLACERS: Dict[str, object] = _build_macro_replacers()


@dataclass
class HonestExecutionResult:
    status: str
    reason: str
    raw_input: str
    normalized_expr: str
    lhs_target: Optional[str]
    free_symbols: List[str]
    unbound_symbols: List[str]
    operator_count: int
    evaluated_value: Optional[float]
    evaluation_mode: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# --- AST Nodes ---
class MathNode:
    def symbols(self) -> Set[str]:
        return set()

    def op_count(self) -> int:
        return 0

    def eval(self, env: Dict[str, float]) -> float:
        raise NotImplementedError


class NumNode(MathNode):
    def __init__(self, value: float) -> None:
        self.value = float(value)

    def eval(self, env: Dict[str, float]) -> float:
        return self.value


class SymNode(MathNode):
    def __init__(self, name: str) -> None:
        self.name = name

    def symbols(self) -> Set[str]:
        if self.name in MATHEMATICAL_CONSTANTS:
            return set()
        return {self.name}

    def eval(self, env: Dict[str, float]) -> float:
        if self.name in env:
            return float(env[self.name])
        if self.name in MATHEMATICAL_CONSTANTS:
            return MATHEMATICAL_CONSTANTS[self.name]
        raise KeyError(self.name)


class UnaryNode(MathNode):
    def __init__(self, op: str, child: MathNode) -> None:
        self.op = op
        self.child = child

    def symbols(self) -> Set[str]:
        return self.child.symbols()

    def op_count(self) -> int:
        return 1 + self.child.op_count()

    def eval(self, env: Dict[str, float]) -> float:
        v = self.child.eval(env)
        if self.op == "-":
            return -v
        return v


class BinNode(MathNode):
    def __init__(self, op: str, left: MathNode, right: MathNode) -> None:
        self.op = op
        self.left = left
        self.right = right

    def symbols(self) -> Set[str]:
        return self.left.symbols() | self.right.symbols()

    def op_count(self) -> int:
        return 1 + self.left.op_count() + self.right.op_count()

    def eval(self, env: Dict[str, float]) -> float:
        lv = self.left.eval(env)
        rv = self.right.eval(env)
        if not (math.isfinite(lv) and math.isfinite(rv)):
            return float("nan")
        if self.op == "+":
            return lv + rv
        if self.op == "-":
            return lv - rv
        if self.op == "*":
            return lv * rv
        if self.op == "/":
            if abs(rv) < 1e-15:
                return float("nan")
            return lv / rv
        if self.op == "^":
            if lv < 0.0 and float(int(rv)) != rv:
                return float("nan")
            if lv == 0.0 and rv < 0.0:
                return float("nan")
            try:
                res = lv ** rv
                return float(res) if isinstance(res, (int, float)) else float("nan")
            except (OverflowError, ValueError, ZeroDivisionError):
                return float("nan")
        if self.op == ">":
            return 1.0 if lv > rv else 0.0
        if self.op == "<":
            return 1.0 if lv < rv else 0.0
        if self.op == ">=":
            return 1.0 if lv >= rv else 0.0
        if self.op == "<=":
            return 1.0 if lv <= rv else 0.0
        if self.op == "==":
            return 1.0 if abs(lv - rv) < 1e-12 else 0.0
        if self.op == "!=":
            return 1.0 if abs(lv - rv) >= 1e-12 else 0.0
        if self.op == "~=":
            # Approximate equality with a scale-aware tolerance.
            scale = max(1.0, abs(lv), abs(rv))
            return 1.0 if abs(lv - rv) <= 1e-2 * scale else 0.0
        return float("nan")


class FuncNode(MathNode):
    def __init__(self, name: str, args: List[MathNode]) -> None:
        self.name = name
        self.args = args

    def symbols(self) -> Set[str]:
        out: Set[str] = set()
        for a in self.args:
            out |= a.symbols()
        return out

    def op_count(self) -> int:
        return 1 + sum(a.op_count() for a in self.args)

    def eval(self, env: Dict[str, float]) -> float:
        vals = [a.eval(env) for a in self.args]
        if any(not math.isfinite(v) for v in vals):
            return float("nan")
        if self.name in SUPPORTED_UNARY_FUNCTIONS and len(vals) == 1:
            return SUPPORTED_UNARY_FUNCTIONS[self.name](vals[0])
        if self.name in SUPPORTED_VARIADIC_FUNCTIONS and len(vals) >= 1:
            return SUPPORTED_VARIADIC_FUNCTIONS[self.name](vals)
        return float("nan")


def _extract_balanced_braces(s: str, start: int) -> Optional[Tuple[str, int]]:
    """Given `s[start] == '{'`, return `(inner_text, index_after_closing_brace)`."""
    if start >= len(s) or s[start] != "{":
        return None
    depth = 0
    i = start
    while i < len(s):
        ch = s[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start + 1 : i], i + 1
        i += 1
    return None


def _rewrite_latex_macros(expr: str) -> str:
    """Iteratively expand `\frac{a}{b}`, `\sqrt{x}`, `\text{...}`, `\left`/`\right`, etc."""
    s = expr.strip()
    # Strip outer math delimiters
    for open_d, close_d in (("$$", "$$"), ("\\[", "\\]"), ("\\(", "\\)"), ("$", "$")):
        if s.startswith(open_d) and s.endswith(close_d) and len(s) > len(open_d) + len(close_d):
            s = s[len(open_d) : -len(close_d)].strip()
    s = re.sub(r"\\begin\{(equation\*?|align\*?|aligned|gather\*?)\}", " ", s)
    s = re.sub(r"\\end\{(equation\*?|align\*?|aligned|gather\*?)\}", " ", s)
    s = re.sub(r"\\label\{[^{}]*\}", "", s)
    s = re.sub(r"\\tag\{[^{}]*\}", "", s)
    s = s.replace("&", " ").replace("\\\\", " ")
    for old_u, new_u in UNICODE_REPLACEMENTS:
        s = s.replace(old_u, new_u)

    # Remove sizing / spacing commands
    for cmd in (
        "\\left", "\\right", "\\bigl", "\\bigr", "\\Bigl", "\\Bigr",
        "\\biggl", "\\biggr", "\\Biggl", "\\Biggr", "\\big", "\\Big",
        "\\displaystyle", "\\textstyle", "\\,", "\\;", "\\:", "\\!", "\\quad", "\\qquad",
    ):
        s = s.replace(cmd, " ")
    s = s.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/")
    s = s.replace("\\lvert", "|").replace("\\rvert", "|")

    # Flatten \text{...}, \mathrm{...}, \mathbf{...}, \operatorname{...}, \hat{x}, \bar{x}, \tilde{x}
    for _ in range(8):
        m = re.search(r"\\(text|mathrm|mathbf|mathit|mathsf|mathcal|mathbb|boldsymbol|operatorname|hat|widehat|bar|overline|tilde|widetilde|vec)\s*\{", s)
        if not m:
            break
        brace_pos = m.end() - 1
        got = _extract_balanced_braces(s, brace_pos)
        if not got:
            break
        inner, end_pos = got
        cmd_name = m.group(1)
        clean_inner = re.sub(r"[^A-Za-z0-9_]", "_", inner.strip()).strip("_") or "x"
        if cmd_name in ("hat", "widehat", "bar", "overline", "tilde", "widetilde", "vec"):
            repl = f"{clean_inner}_{cmd_name[:3]}"
        elif cmd_name == "operatorname" and clean_inner in SUPPORTED_UNARY_FUNCTIONS:
            repl = f"\\{clean_inner} "
        else:
            repl = clean_inner
        s = s[: m.start()] + repl + s[end_pos:]

    # Expand \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b}
    for _ in range(24):
        m = re.search(r"\\(?:d|t)?frac\s*\{", s)
        if not m:
            break
        b1 = _extract_balanced_braces(s, m.end() - 1)
        if not b1:
            break
        num_txt, p1 = b1
        while p1 < len(s) and s[p1].isspace():
            p1 += 1
        b2 = _extract_balanced_braces(s, p1)
        if not b2:
            break
        den_txt, p2 = b2
        s = f"{s[:m.start()]}(({num_txt})/({den_txt})){s[p2:]}"

    # Expand \sqrt[n]{x} and \sqrt{x}
    for _ in range(16):
        m_nth = re.search(r"\\sqrt\s*\[([^\[\]]+)\]\s*\{", s)
        if m_nth:
            deg_txt = m_nth.group(1)
            b1 = _extract_balanced_braces(s, m_nth.end() - 1)
            if not b1:
                break
            rad_txt, p1 = b1
            s = f"{s[:m_nth.start()]}root(({deg_txt}),({rad_txt})){s[p1:]}"
            continue
        m_sq = re.search(r"\\sqrt\s*\{", s)
        if not m_sq:
            break
        b1 = _extract_balanced_braces(s, m_sq.end() - 1)
        if not b1:
            break
        rad_txt, p1 = b1
        s = f"{s[:m_sq.start()]}sqrt({rad_txt}){s[p1:]}"

    # Convert |...| pairs when balanced and non-nested into abs(...)
    if s.count("|") == 2:
        i1 = s.find("|")
        i2 = s.find("|", i1 + 1)
        s = f"{s[:i1]}abs({s[i1+1:i2]}){s[i2+1:]}"

    # Collapse subscripts x_{abc} -> x_abc
    for _ in range(20):
        m_sub = re.search(r"_\{([^{}]+)\}", s)
        if not m_sub:
            break
        sub_clean = re.sub(r"[^A-Za-z0-9_]", "_", m_sub.group(1)).strip("_") or "0"
        s = f"{s[:m_sub.start()]}_{sub_clean}{s[m_sub.end():]}"

    # Convert ^{...} -> ^(...)
    for _ in range(20):
        m_sup = re.search(r"\^\s*\{", s)
        if not m_sup:
            break
        b1 = _extract_balanced_braces(s, m_sup.end() - 1)
        if not b1:
            break
        exp_txt, p1 = b1
        s = f"{s[:m_sup.start()]}^({exp_txt}){s[p1:]}"

    # Normalize known LaTeX function macros (\exp -> exp, \alpha -> alpha, etc.)
    def _repl_cmd(match: re.Match[str]) -> str:
        cname = match.group(1)
        replacer = _MACRO_REPLACERS.get(cname, _identity_replacer)
        return replacer(match)  # type: ignore[operator]

    s = re.sub(r"\\([A-Za-z]+)", _repl_cmd, s)
    # Strip trailing punctuation common in displayed equations
    s = s.strip().rstrip(".,;:")
    s = re.sub(r"\s+", " ", s).strip()
    # Subscript residue, applied LAST: expanding `\tau_{\text{Out}}` can leave
    # `tau _Out`, whose leading underscore is not a token.
    s = re.sub(r"(?<=[A-Za-z0-9])\s+_(?=[A-Za-z0-9])", "_", s)
    s = re.sub(r"(?<![A-Za-z0-9_])_(?=[A-Za-z0-9])", "", s)
    return s


Token = Tuple[str, str]  # (kind, text) where kind in {'NUM', 'ID', 'OP', 'LPAREN', 'RPAREN', 'COMMA'}


def _tokenize(expr: str) -> Tuple[Optional[List[Token]], Optional[str]]:
    tokens: List[Token] = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        if ch == "\\":
            return None, "unsupported_latex_macro_or_operator"
        if ch in "{}" or ch == "|":
            return None, "unbalanced_or_unsupported_delimiter"
        if ch.isdigit() or (ch == "." and i + 1 < n and expr[i + 1].isdigit()):
            j = i + 1
            while j < n and (expr[j].isdigit() or expr[j] == "."):
                j += 1
            if j < n and expr[j] in ("e", "E") and j + 1 < n and (expr[j + 1].isdigit() or expr[j + 1] in "+-"):
                j += 2
                while j < n and expr[j].isdigit():
                    j += 1
            num_str = expr[i:j]
            if num_str.count(".") > 1:
                return None, "malformed_numeric_literal"
            tokens.append(("NUM", num_str))
            i = j
            continue
        if ch.isalpha():
            j = i + 1
            while j < n and (expr[j].isalnum() or expr[j] == "_"):
                j += 1
            tokens.append(("ID", expr[i:j]))
            i = j
            continue
        if ch in ("(", "["):
            tokens.append(("LPAREN", "("))
            i += 1
            continue
        if ch in (")", "]"):
            tokens.append(("RPAREN", ")"))
            i += 1
            continue
        if ch == ",":
            tokens.append(("COMMA", ","))
            i += 1
            continue
        if ch == "*" and i + 1 < n and expr[i + 1] == "*":
            tokens.append(("OP", "^"))
            i += 2
            continue
        if ch in "+-*/^":
            tokens.append(("OP", ch))
            i += 1
            continue
        pair = expr[i : i + 2]
        if pair in ("<=", ">=", "==", "~=", "!="):
            tokens.append(("OP", pair))
            i += 2
            continue
        if ch in "<>":
            tokens.append(("OP", ch))
            i += 1
            continue
        return None, f"unexpected_character:{ch}"
    if not tokens:
        return None, "empty_expression"

    # Insert implicit multiplication only where mathematically unambiguous:
    # NUM followed by ID or LPAREN; RPAREN followed by NUM, ID, or LPAREN;
    # non-function ID followed by LPAREN? Wait: if ID is NOT a supported function,
    # e.g., `P_0(1 - x)` could be multiplication OR an unknown function call `f(x)`!
    # Handle `P_0(1 - x)`: if an ID has a subscript like `P_0` or single capital/symbol before `(1 - ...)`
    # vs function call: let parser handle `ID LPAREN` cleanly—if `ID` is in supported functions it's a FuncNode;
    # if `ID` is NOT a supported function and has 1 argument that's purely algebraic vs multi-arg, wait:
    # in physics/stats, `P_0(1 - L*h/T_0)` is multiplication whereas `f(x)` is an uninterpreted function!
    out: List[Token] = []
    for idx, tok in enumerate(tokens):
        if out:
            pk, pv = out[-1]
            ck, cv = tok
            if pk == "NUM" and ck in ("ID", "LPAREN"):
                out.append(("OP", "*"))
            elif pk == "RPAREN" and ck in ("NUM", "ID", "LPAREN"):
                out.append(("OP", "*"))
            elif pk == "ID" and pv not in SUPPORTED_UNARY_FUNCTIONS and pv not in SUPPORTED_VARIADIC_FUNCTIONS and ck == "NUM":
                out.append(("OP", "*"))
        out.append(tok)
    return out, None


class _Parser:
    def __init__(self, tokens: List[Token]) -> None:
        self.tokens = tokens
        self.pos = 0
        self.has_uninterpreted_call = False

    def peek(self) -> Optional[Token]:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self) -> Token:
        t = self.tokens[self.pos]
        self.pos += 1
        return t

    def parse_expr(self) -> MathNode:
        node = self.parse_term()
        while True:
            t = self.peek()
            if t and t[0] == "OP" and t[1] in ("+", "-"):
                op = self.consume()[1]
                rhs = self.parse_term()
                node = BinNode(op, node, rhs)
            else:
                break
        return node

    def parse_comparison(self) -> MathNode:
        """Lowest precedence: a comparison yields 1.0 or 0.0, i.e. a guard."""
        node = self.parse_expr()
        t = self.peek()
        if t and t[0] == "OP" and t[1] in ("<=", ">=", "<", ">", "==", "~=", "!="):
            op = self.consume()[1]
            rhs = self.parse_expr()
            return BinNode(op, node, rhs)
        return node

    def parse_term(self) -> MathNode:
        node = self.parse_unary()
        while True:
            t = self.peek()
            if t and t[0] == "OP" and t[1] in ("*", "/"):
                op = self.consume()[1]
                rhs = self.parse_unary()
                node = BinNode(op, node, rhs)
            elif t and t[0] == "ID" and not (
                isinstance(node, SymNode)
                and (node.name in SUPPORTED_UNARY_FUNCTIONS or node.name in SUPPORTED_VARIADIC_FUNCTIONS)
            ):
                # Implicit multiplication: `a b` -> `a * b`
                rhs = self.parse_unary()
                node = BinNode("*", node, rhs)
            else:
                break
        return node

    def parse_unary(self) -> MathNode:
        t = self.peek()
        if t and t[0] == "OP" and t[1] in ("+", "-"):
            op = self.consume()[1]
            child = self.parse_unary()
            return UnaryNode(op, child) if op == "-" else child
        return self.parse_power()

    def parse_power(self) -> MathNode:
        base = self.parse_primary()
        t = self.peek()
        if t and t[0] == "OP" and t[1] == "^":
            self.consume()
            exp = self.parse_unary()
            return BinNode("^", base, exp)
        return base

    def parse_primary(self) -> MathNode:
        t = self.peek()
        if t is None:
            raise ValueError("unexpected_eof")
        if t[0] == "NUM":
            self.consume()
            return NumNode(float(t[1]))
        if t[0] == "LPAREN":
            self.consume()
            inner = self.parse_expr()
            if self.peek() is None or self.peek()[0] != "RPAREN":
                raise ValueError("unclosed_paren")
            self.consume()
            return inner
        if t[0] == "ID":
            ident = self.consume()[1]
            # Handle trig powers like \cos^2(x) -> (cos(x))^2
            trig_pow: Optional[MathNode] = None
            if (
                ident in SUPPORTED_UNARY_FUNCTIONS
                and self.peek() is not None
                and self.peek()[0] == "OP"
                and self.peek()[1] == "^"
            ):
                self.consume()
                trig_pow = self.parse_primary()

            if self.peek() is not None and self.peek()[0] == "LPAREN":
                self.consume()
                args: List[MathNode] = []
                if self.peek() is not None and self.peek()[0] != "RPAREN":
                    args.append(self.parse_expr())
                    while self.peek() is not None and self.peek()[0] == "COMMA":
                        self.consume()
                        args.append(self.parse_expr())
                if self.peek() is None or self.peek()[0] != "RPAREN":
                    raise ValueError("unclosed_call_paren")
                self.consume()
                if ident in SUPPORTED_UNARY_FUNCTIONS and len(args) == 1:
                    fn_node: MathNode = FuncNode(ident, args)
                    return BinNode("^", fn_node, trig_pow) if trig_pow is not None else fn_node
                if ident in SUPPORTED_VARIADIC_FUNCTIONS and len(args) >= 1:
                    return FuncNode(ident, args)
                # If `ident` is a scalar symbol multiplying a parenthesized factor, e.g. `P_0(1 - x)`:
                if len(args) == 1 and isinstance(args[0], BinNode):
                    return BinNode("*", SymNode(ident), args[0])
                # Otherwise treat as symbolic function symbol `f_call(arg)` -> symbolic only
                self.has_uninterpreted_call = True
                sym_args = "_".join(sorted( s for a in args for s in a.symbols() )) or "arg"
                return SymNode(f"{ident}__of__{sym_args}")

            if ident in SUPPORTED_UNARY_FUNCTIONS:
                # Prefix LaTeX function application without parens: `\exp x`, `\cos \theta`
                arg_node = self.parse_power()
                fn_node = FuncNode(ident, [arg_node])
                return BinNode("^", fn_node, trig_pow) if trig_pow is not None else fn_node

            return SymNode(ident)
        raise ValueError(f"unexpected_token:{t[0]}:{t[1]}")


def _looks_like_prose_sentence(raw: str) -> Optional[str]:
    words = re.findall(r"[A-Za-z]{3,}", re.sub(r"\\[A-Za-z]+", " ", raw))
    if len(words) >= 6:
        stop_hits = sum(1 for w in words if w.lower() in PROSE_STOPWORDS)
        if stop_hits >= 2 or len(words) >= 10:
            return "prose_fragment_not_formula"
    return None


def _split_relational_equation(norm: str) -> Tuple[Optional[str], str, Optional[str]]:
    """Split `LHS = RHS` cleanly. Rejects set/arrow relations that are not scalar equations.

    Comparisons (`<=`, `>=`, `<`, `>`, `~=`, `!=`) are NOT rejected: they compile
    to indicator operators that evaluate to 1.0/0.0, so a domain or applicability
    bound survives as an executable predicate instead of being thrown away.
    """
    for rel in ("\\in", "\\subset", "\\rightarrow", "\\to", "∈", "⊂", "→"):
        if rel in norm:
            return None, norm, f"relational_or_set_statement:{rel}"
    if "=" in norm:
        # `==`, `<=`, `>=`, `!=`, `~=` are operators, not assignment splits.
        assign_hits = len(re.findall(r"(?<![<>=!~])=(?![=])", norm))
        if assign_hits >= 2:
            return None, norm, "multi_chain_relation"
        if assign_hits == 1:
            idx = re.search(r"(?<![<>=!~])=(?![=])", norm)
            lhs = norm[: idx.start()].strip()
            rhs = norm[idx.end() :].strip()
            if not lhs or not rhs:
                return None, norm, "incomplete_equality_side"
            if re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(?:\([A-Za-z0-9_,\s]+\))?", lhs):
                return lhs, rhs, None
            return lhs, f"({lhs}) - ({rhs})", None
        # No assignment: a pure predicate such as `P <= 0.05`.
        return None, norm, None
    return None, norm, None


def parse_and_execute_honestly(
    raw_equation: str,
    bindings: Optional[Dict[str, float]] = None,
    *,
    allow_domain_probe: bool = False,
) -> HonestExecutionResult:
    """Parse `raw_equation` without inventing missing bindings and return an `HonestExecutionResult`."""
    raw = str(raw_equation or "").strip()
    if not raw:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason="empty_input",
            raw_input=raw,
            normalized_expr="",
            lhs_target=None,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    prose_reason = _looks_like_prose_sentence(raw)
    if prose_reason is not None:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason=prose_reason,
            raw_input=raw,
            normalized_expr="",
            lhs_target=None,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    norm = _rewrite_latex_macros(raw)
    lhs_target, expr_body, rel_err = _split_relational_equation(norm)
    if rel_err is not None:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason=rel_err,
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=lhs_target,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    tokens, tok_err = _tokenize(expr_body)
    if tok_err is not None or tokens is None:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason=tok_err or "tokenization_failed",
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=lhs_target,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    # Guard against accidental multi-word prose surviving as chained implicit multiplications
    long_word_tokens = [
        tv for tk, tv in tokens
        if tk == "ID"
        and "_" not in tv
        and tv not in SUPPORTED_UNARY_FUNCTIONS
        and tv not in SUPPORTED_VARIADIC_FUNCTIONS
        and tv not in GREEK_COMMANDS
        and tv not in MATHEMATICAL_CONSTANTS
        and len(tv) >= 5
    ]
    if len(long_word_tokens) >= 4 and not any(tk == "OP" for tk, _ in tokens):
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason="multiword_prose_without_operators",
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=lhs_target,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    try:
        parser = _Parser(tokens)
        ast_root = parser.parse_comparison()
        if parser.pos != len(tokens):
            raise ValueError(f"trailing_tokens:{tokens[parser.pos][1]}")
    except ValueError as exc:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason=str(exc),
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=lhs_target,
            free_symbols=[],
            unbound_symbols=[],
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    free_syms = sorted(ast_root.symbols())
    ops = ast_root.op_count()
    # A lone bare word with 0 operators and no LHS equality is just a label, not an equation
    if ops == 0 and lhs_target is None and len(free_syms) == 1:
        return HonestExecutionResult(
            status=STATUS_UNPARSEABLE,
            reason="bare_identifier_not_equation",
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=None,
            free_symbols=free_syms,
            unbound_symbols=free_syms,
            operator_count=0,
            evaluated_value=None,
            evaluation_mode="none",
        )

    supplied = dict(bindings or {})
    unbound = [s for s in free_syms if s not in supplied]

    if not unbound and not parser.has_uninterpreted_call:
        val = ast_root.eval(supplied)
        if math.isfinite(val):
            mode = "exact_closed_form" if not free_syms else "bound_inputs"
            return HonestExecutionResult(
                status=STATUS_PARSED_EVALUATED,
                reason="ok",
                raw_input=raw,
                normalized_expr=norm,
                lhs_target=lhs_target,
                free_symbols=free_syms,
                unbound_symbols=[],
                operator_count=ops,
                evaluated_value=float(val),
                evaluation_mode=mode,
            )
        return HonestExecutionResult(
            status=STATUS_PARSED_SYMBOLIC_ONLY,
            reason="domain_singularity_at_supplied_bindings",
            raw_input=raw,
            normalized_expr=norm,
            lhs_target=lhs_target,
            free_symbols=free_syms,
            unbound_symbols=[],
            operator_count=ops,
            evaluated_value=None,
            evaluation_mode="none",
        )

    if allow_domain_probe and not parser.has_uninterpreted_call:
        # Non-fabricated interior test probe ONLY when caller explicitly audits parse+eval capability
        probe_env = {
            s: supplied.get(s, 0.37 + 0.11 * ((idx % 5) + 1))
            for idx, s in enumerate(free_syms)
        }
        val = ast_root.eval(probe_env)
        if math.isfinite(val):
            return HonestExecutionResult(
                status=STATUS_PARSED_EVALUATED,
                reason="ok_domain_probe",
                raw_input=raw,
                normalized_expr=norm,
                lhs_target=lhs_target,
                free_symbols=free_syms,
                unbound_symbols=unbound,
                operator_count=ops,
                evaluated_value=float(val),
                evaluation_mode="domain_probe",
            )

    return HonestExecutionResult(
        status=STATUS_PARSED_SYMBOLIC_ONLY,
        reason="uninterpreted_function_symbol" if parser.has_uninterpreted_call else "requires_explicit_symbol_bindings",
        raw_input=raw,
        normalized_expr=norm,
        lhs_target=lhs_target,
        free_symbols=free_syms,
        unbound_symbols=unbound,
        operator_count=ops,
        evaluated_value=None,
        evaluation_mode="symbolic_only",
    )
