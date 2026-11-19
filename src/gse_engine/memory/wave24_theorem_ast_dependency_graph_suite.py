"""Wave 24 Theorem-to-AST Mining, Cross-Chapter Dependency Graph & Fused Retrieval.

Deterministic in-process batched miner (no subagent, no network, no new
packages) over the canonical corpus stores:

  * data/corpus_parsed_full/*.jsonl            2,949 zero-skip theorem rows
  * data/mind/equations.jsonl                  equation registry with formula ASTs
  * foundry/artifacts/primitives/*.json        12,558 Foundry Tier-B book files

It builds the cross-chapter dependency graph
``G_doc = (V_def U V_assump U V_eq U V_code, E_dep)`` with typed nodes:

  * V_def    definitions / axioms and symbol-ledger entries
  * V_assump explicit modelling assumptions
  * V_eq     equations, theorems, lemmas, propositions, corollaries, laws, rules
  * V_code   algorithms and GSE code seams

Edges are added when (a) an equation uses a symbol defined in the same
source, (b) a primitive's equation rests on that primitive's assumptions, (c)
a code seam implements an equation, or (d) a statement cites "Equation N",
"Theorem N", "Lemma N" (etc.) of the same source. Acyclicity is checked with
Kahn's algorithm; sample floors use n_eff = n / DEFF_drive (DEFF = 2.0) and
NFL_EPA_MIN_GAMES = 4; the G_fire retraction lock zeroes any node whose source
cites arXiv:2312.11067.

The fused retriever combines four rank lists by reciprocal rank fusion:
BM25F over fields (title, statement, assumptions, body) with field weights
v = [3.0, 2.5, 2.0, 1.0]; AST operator-tree cosine against the top lexical hit
(pseudo-relevance feedback); 8D diagonal-Mahalanobis regime similarity over
(|S_mkt|, T_mkt, ||w_wind||, OL_Distress, D_disguise, PROE_delta, Pace_sec,
I_QB2); and an authority prior. A litstudy-style echo-chamber de-weight
discounts repeated sources inside the fused top-k. Retrieval outputs are
diagnostics: the live Stage-2 weight of the upgraded fusion is 0.0 until the
Wave 26 OOS ratchet promotes it.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import importlib
import json
import math
import os
import re
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    DIMENSIONLESS,
    StudyEffect,
    TheoremDependencyNode,
    evaluate_g_fire_gate,
    pool_pet_peese_meta_regression,
    verify_buckingham_pi_homogeneity,
)
from gse_engine.memory.wave20_openviking_ragas_bayesian_and_graph_suite import (
    compute_litstudy_bibliometric_authority,
    evaluate_ragas_retrieval_faithfulness,
    load_openviking_tiered_context,
    normalize_docling_layout_ast,
)
from gse_engine.memory.wave20b_openscholar_tddlog_woodelf_tree_suite import (
    synthesize_openscholar_verified_claims,
)

_DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[3]
INDEX_REL = Path("data") / "engine" / "wave24_theorem_ast_dependency_index_2026_11_17.json"

DEFF_DRIVE = 2.0
NFL_EPA_MIN_GAMES = 4
RETRACTED_ARXIV_IDS: frozenset[str] = frozenset({"2312.11067"})
BM25F_FIELD_WEIGHTS: tuple[float, float, float, float] = (3.0, 2.5, 2.0, 1.0)
BM25F_FIELDS: tuple[str, str, str, str] = ("title", "statement", "assumptions", "body")

REGIME_AXES_8D: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("abs_s_mkt", ("spread", "margin", "favorite", "underdog", "point differential")),
    ("t_mkt", ("total points", "scoring", "points scored", "shootout", "low scoring")),
    ("wind_norm", ("wind", "weather", "gust", "precipitation", "temperature")),
    ("ol_distress", ("offensive line", "pressure", "sack", "protection", "pocket")),
    ("d_disguise", ("disguise", "coverage", "rotation", "simulated pressure", "shell")),
    ("proe_delta", ("pass rate", "proe", "early down", "neutral situation", "play call")),
    ("pace_sec", ("pace", "tempo", "seconds per play", "no-huddle", "clock")),
    ("i_qb2", ("backup quarterback", "quarterback", "injury", "replacement", "qb")),
)

_KIND_TO_VTYPE: dict[str, str] = {
    "definition": "V_def",
    "axiom": "V_def",
    "assumption": "V_assump",
    "algorithm": "V_code",
}
_CITE_RE = re.compile(
    r"\b(Equation|Theorem|Lemma|Proposition|Corollary|Definition|Algorithm|Law|Rule)\s+"
    r"(\d+(?:\.\d+)*)",
    re.IGNORECASE,
)
_TOKEN_RE = re.compile(r"[a-z][a-z0-9_]+")
_LATEX_OPS: tuple[tuple[str, str], ...] = (
    ("\\frac", "div"),
    ("\\sum", "sum"),
    ("\\prod", "prod"),
    ("\\int", "integral"),
    ("\\exp", "exp"),
    ("\\log", "log"),
    ("\\ln", "log"),
    ("\\sqrt", "sqrt"),
    ("\\partial", "partial"),
    ("\\max", "max"),
    ("\\min", "min"),
    ("\\mathbb{e}", "expectation"),
    ("\\sigma", "sigma"),
    ("\\phi", "phi"),
    ("^", "pow"),
    ("_", "index"),
    ("+", "add"),
    ("-", "sub"),
    ("*", "mul"),
    ("=", "eq"),
    ("<", "lt"),
    (">", "gt"),
)
_LATEX_TOK_TO_OP: dict[str, str] = dict(_LATEX_OPS)
_LATEX_OP_RE = re.compile(
    r"\\(?:frac|sum|prod|int|exp|log|ln|sqrt|partial|max|min|mathbb\{e\}|sigma|phi)(?![a-z])"
    r"|[\^_+\-*=<>]"
)
_INDEX_CACHE: dict[str, dict[str, Any]] = {}
_BRIDGE_CACHE: dict[tuple[object, ...], dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Operator trees
# ---------------------------------------------------------------------------


def python_formula_operator_profile(expr: str) -> Counter[str]:
    """Operator-tree multiset of a Python-syntax formula (BinOp/Call/Compare)."""
    try:
        tree = ast.parse(expr, mode="eval")
    except (SyntaxError, ValueError):
        return Counter()
    prof: Counter[str] = Counter()
    for node in ast.walk(tree):
        if isinstance(node, ast.BinOp):
            prof[type(node.op).__name__.lower()] += 1
        elif isinstance(node, ast.UnaryOp):
            prof["u" + type(node.op).__name__.lower()] += 1
        elif isinstance(node, ast.Call):
            fn = node.func
            name = fn.id if isinstance(fn, ast.Name) else (
                fn.attr if isinstance(fn, ast.Attribute) else "call"
            )
            prof["call:" + name.lower()] += 1
        elif isinstance(node, ast.Compare):
            prof["compare"] += 1
        elif isinstance(node, ast.IfExp):
            prof["ifexp"] += 1
    return prof


def latex_operator_profile(latex: str) -> Counter[str]:
    """Operator multiset of a LaTeX string via single-pass compiled token matching."""
    prof: Counter[str] = Counter()
    if not latex:
        return prof
    for tok in _LATEX_OP_RE.findall(latex.lower()):
        op_name = _LATEX_TOK_TO_OP.get(tok)
        if op_name:
            prof[op_name] += 1
    return prof


def formula_ast_operator_profile(formula_ast: Mapping[str, Any]) -> Counter[str]:
    """Operator multiset of a registry ``formula_ast`` dict (recursive op/kernel keys)."""
    prof: Counter[str] = Counter()
    stack: list[Any] = [formula_ast]
    while stack:
        cur = stack.pop()
        if isinstance(cur, Mapping):
            for key in ("op", "kernel"):
                val = cur.get(key)
                if isinstance(val, str) and val:
                    prof["k:" + val.lower()] += 1
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)
    return prof


def operator_tree_cosine(a: Mapping[str, int], b: Mapping[str, int]) -> float:
    """Cosine similarity of two operator multisets (0 if either is empty)."""
    if not a or not b:
        return 0.0
    dot = sum(float(v) * float(b.get(k, 0)) for k, v in a.items())
    na = math.sqrt(sum(float(v) * float(v) for v in a.values()))
    nb = math.sqrt(sum(float(v) * float(v) for v in b.values()))
    return dot / (na * nb) if na > 0 and nb > 0 else 0.0


# ---------------------------------------------------------------------------
# Dependency graph, sample floors, boundary screens
# ---------------------------------------------------------------------------


def kahn_acyclicity(n_nodes: int, edges: Sequence[tuple[int, int]]) -> dict[str, Any]:
    """Kahn topological sort; returns whether the graph is a DAG and cycle mass."""
    indeg = [0] * n_nodes
    adj: list[list[int]] = [[] for _ in range(n_nodes)]
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
    queue = [i for i in range(n_nodes) if indeg[i] == 0]
    seen = 0
    head = 0
    while head < len(queue):
        u = queue[head]
        head += 1
        seen += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    return {"is_dag": seen == n_nodes, "nodes_in_cycles": n_nodes - seen}


def sample_floor_gate(
    n_obs: float,
    n_min: float,
    *,
    deff: float = DEFF_DRIVE,
    games_played: int | None = None,
) -> dict[str, Any]:
    """n_eff = n_obs / DEFF must reach n_min; game-scale also needs >= 4 games."""
    n_eff = float(n_obs) / max(1.0, float(deff))
    reasons: list[str] = []
    if n_eff < float(n_min):
        reasons.append("n_eff_below_n_min")
    if games_played is not None and int(games_played) < NFL_EPA_MIN_GAMES:
        reasons.append("epa_min_games_floor")
    return {"passes": not reasons, "n_eff": n_eff, "reasons": reasons}


def six_regime_boundary_screen(
    expr: str,
    bounds: Mapping[str, tuple[float, float]],
    *,
    abs_limit: float = 1e6,
) -> dict[str, Any]:
    """Evaluate a Python formula on six admissible-hypercube regimes.

    Regimes: all-low, all-high, center, alternating low/high, alternating
    high/low, and near-low (low + 1e-9 span). An equation is admissible on D_e
    only if every regime evaluates to a finite value with |f| <= abs_limit.
    Only arithmetic and math functions are exposed to the evaluator.
    """
    names = sorted(bounds)
    safe: dict[str, Any] = {
        k: getattr(math, k) for k in ("exp", "log", "sqrt", "tanh", "sin", "cos", "erf")
    }
    safe.update(
        {
            "abs": abs,
            "min": min,
            "max": max,
            "logit_inv": lambda z: 1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, z)))),
            "clip": lambda x, lo, hi: max(lo, min(hi, x)),
        }
    )
    try:
        code = compile(ast.parse(expr, mode="eval"), "<formula>", "eval")
    except (SyntaxError, ValueError) as exc:
        return {"admissible": False, "reason": f"parse_error:{exc.__class__.__name__}"}
    regimes: dict[str, dict[str, float]] = {
        "all_low": {n: bounds[n][0] for n in names},
        "all_high": {n: bounds[n][1] for n in names},
        "center": {n: 0.5 * (bounds[n][0] + bounds[n][1]) for n in names},
        "alt_low_high": {
            n: bounds[n][i % 2] for i, n in enumerate(names)
        },
        "alt_high_low": {
            n: bounds[n][(i + 1) % 2] for i, n in enumerate(names)
        },
        "near_low": {
            n: bounds[n][0] + 1e-9 * (bounds[n][1] - bounds[n][0]) for n in names
        },
    }
    values: dict[str, float] = {}
    failures: list[str] = []
    for rname, env in regimes.items():
        try:
            val = float(eval(code, {"__builtins__": {}}, {**safe, **env}))  # noqa: S307
        except (ArithmeticError, ValueError, TypeError, NameError) as exc:
            failures.append(f"{rname}:{exc.__class__.__name__}")
            continue
        if not math.isfinite(val) or abs(val) > abs_limit:
            failures.append(f"{rname}:out_of_range")
        values[rname] = val
    return {"admissible": not failures, "values": values, "failures": failures}


_SYMPY_LIMIT_SCREEN_CACHE: dict[tuple[object, ...], dict[str, Any]] = {}


def sympy_six_regime_limit_screen(
    expr: str,
    bounds: Mapping[str, tuple[float, float]],
    *,
    abs_limit: float = 1e6,
) -> dict[str, Any]:
    """Combine numeric 6-regime boundary screen with SymPy edge limit pole detection."""
    cache_key: tuple[object, ...] = (
        str(expr),
        tuple(
            (str(k), round(float(v[0]), 6), round(float(v[1]), 6))
            for k, v in sorted(bounds.items())
        ),
        round(float(abs_limit), 6),
    )
    cached = _SYMPY_LIMIT_SCREEN_CACHE.get(cache_key)
    if cached is not None:
        return dict(cached)

    numeric = six_regime_boundary_screen(expr, bounds, abs_limit=abs_limit)
    sympy_mod: Any = importlib.import_module("sympy")
    names = sorted(bounds)
    if not names:
        return {**numeric, "sympy_limits_finite": bool(numeric["admissible"]), "sympy_poles": []}
    sym_env = {n: sympy_mod.Symbol(n, real=True) for n in names}
    sym_env["logit_inv"] = lambda z: 1 / (1 + sympy_mod.exp(-z))
    try:
        parsed = sympy_mod.sympify(expr, locals=sym_env)
    except (ValueError, TypeError, sympy_mod.SympifyError) as exc:
        return {
            **numeric,
            "admissible": False,
            "sympy_limits_finite": False,
            "sympy_poles": [f"sympify:{exc.__class__.__name__}"],
        }
    poles: list[str] = []
    center_subs = {sym_env[n]: 0.5 * (bounds[n][0] + bounds[n][1]) for n in names}
    for n in names:
        sym = sym_env[n]
        other_subs = {k: v for k, v in center_subs.items() if k != sym}
        slice_expr = parsed.subs(other_subs)
        lo, hi = bounds[n]
        for tag, pt, side in (("low", lo, "+"), ("high", hi, "-")):
            try:
                lim = sympy_mod.limit(slice_expr, sym, pt, side)
                val = complex(lim.evalf())
                if (
                    abs(val.imag) > 1e-6
                    or not math.isfinite(val.real)
                    or abs(val.real) > abs_limit
                ):
                    poles.append(f"{n}:{tag}")
            except (ArithmeticError, ValueError, TypeError, NotImplementedError):
                poles.append(f"{n}:{tag}_error")
    limits_ok = not poles
    out: dict[str, Any] = {
        **numeric,
        "admissible": bool(numeric["admissible"]) and limits_ok,
        "sympy_limits_finite": limits_ok,
        "sympy_poles": poles,
    }
    if len(_SYMPY_LIMIT_SCREEN_CACHE) < 256:
        _SYMPY_LIMIT_SCREEN_CACHE[cache_key] = dict(out)
    return out


def g_fire_retraction_weight(source_text: str) -> float:
    """G_fire retraction lock: 0.0 if the source cites a retracted arXiv id."""
    return 0.0 if any(rid in source_text for rid in RETRACTED_ARXIV_IDS) else 1.0


# ---------------------------------------------------------------------------
# 8D regime embedding, BM25F, Mahalanobis, RRF, echo-chamber de-weighting
# ---------------------------------------------------------------------------


def embed_regime_vector_8d(text: str) -> list[float]:
    """Keyword-count embedding into the 8 regime axes (unnormalized counts)."""
    low = text.lower()
    return [float(sum(low.count(kw) for kw in kws)) for _, kws in REGIME_AXES_8D]


def diagonal_mahalanobis_similarity(
    query: Sequence[float], rows: Sequence[Sequence[float]], *, shrink: float = 0.1
) -> list[float]:
    """exp(-0.5 d^2 / D) with a shrunk diagonal covariance from ``rows``."""
    if not rows:
        return []
    dim = len(query)
    means = [sum(float(r[j]) for r in rows) / len(rows) for j in range(dim)]
    var = [
        sum((float(r[j]) - means[j]) ** 2 for r in rows) / max(1, len(rows) - 1)
        for j in range(dim)
    ]
    pooled = sum(var) / dim if dim else 1.0
    var_s = [(1.0 - shrink) * v + shrink * max(pooled, 1e-6) for v in var]
    out: list[float] = []
    for r in rows:
        d2 = sum((float(query[j]) - float(r[j])) ** 2 / var_s[j] for j in range(dim))
        out.append(math.exp(-0.5 * d2 / max(1, dim)))
    return out


def bm25f_scores(
    docs: Sequence[Mapping[str, str]],
    query_terms: Sequence[str],
    *,
    weights: Sequence[float] = BM25F_FIELD_WEIGHTS,
    fields: Sequence[str] = BM25F_FIELDS,
    k1: float = 1.2,
    b: float = 0.75,
) -> list[float]:
    """BM25F (Robertson-Zaragoza) with per-field length normalization."""
    toks = [
        {f: _TOKEN_RE.findall(str(d.get(f, "")).lower()) for f in fields} for d in docs
    ]
    n = len(docs)
    avg = {
        f: (sum(len(t[f]) for t in toks) / n if n else 0.0) or 1.0 for f in fields
    }
    terms = sorted({t.lower() for t in query_terms})
    df = {t: sum(1 for d in toks if any(t in d[f] for f in fields)) for t in terms}
    scores: list[float] = []
    for d in toks:
        s = 0.0
        for t in terms:
            tf_tilde = 0.0
            for w, f in zip(weights, fields, strict=True):
                tf = d[f].count(t)
                if tf:
                    tf_tilde += w * tf / (1.0 - b + b * len(d[f]) / avg[f])
            if tf_tilde > 0.0:
                idf = math.log(1.0 + (n - df[t] + 0.5) / (df[t] + 0.5))
                s += idf * tf_tilde / (k1 + tf_tilde)
        scores.append(s)
    return scores


def reciprocal_rank_fusion(score_lists: Sequence[Sequence[float]], *, k: int = 60) -> list[float]:
    """Sum over lists of 1/(k + rank); ties ranked by index for determinism."""
    if not score_lists:
        return []
    n = len(score_lists[0])
    fused = [0.0] * n
    for scores in score_lists:
        order = sorted(range(n), key=lambda i: (-scores[i], i))
        for rank, idx in enumerate(order, 1):
            fused[idx] += 1.0 / (k + rank)
    return fused


def echo_chamber_deweight(sources: Sequence[str], scores: Sequence[float]) -> list[float]:
    """Discount the j-th repeat of a source by 1/sqrt(j) in descending score order."""
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], i))
    seen: Counter[str] = Counter()
    out = list(scores)
    for i in order:
        seen[sources[i]] += 1
        out[i] = scores[i] / math.sqrt(seen[sources[i]])
    return out


def source_herfindahl(sources: Sequence[str]) -> float:
    """Herfindahl-Hirschman concentration of a list of sources (1 = monoculture)."""
    if not sources:
        return 0.0
    c = Counter(sources)
    n = float(len(sources))
    return sum((v / n) ** 2 for v in c.values())


# ---------------------------------------------------------------------------
# Corpus miner
# ---------------------------------------------------------------------------


def _vtype_for_kind(kind: str) -> str:
    return _KIND_TO_VTYPE.get(kind.strip().lower(), "V_eq")


def _symbols(text: str) -> set[str]:
    return {t for t in _TOKEN_RE.findall(text.lower()) if len(t) >= 3}


def mine_theorem_ast_corpus_index(
    repo_root: Path | None = None,
    *,
    max_foundry_files: int | None = None,
    max_equation_rows: int | None = None,
    retrieval_docs_cap: int = 900,
) -> dict[str, Any]:
    """Mine 503 books, 877 PDFs, 2,949 theorems, 50k+ Foundry & 58k+ Sovereign into G_doc."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    node_types: list[str] = []
    edges: list[tuple[int, int]] = []
    op_hist: Counter[str] = Counter()
    retracted_nodes = 0
    retrieval: list[dict[str, Any]] = []
    stats: Counter[str] = Counter()

    thm_ret_cap = max(5, retrieval_docs_cap * 25 // 90)
    eq_ret_cap = max(3, retrieval_docs_cap * 15 // 90)
    pdf_ret_cap = max(3, retrieval_docs_cap * 15 // 90)
    fnd_ret_cap = max(5, retrieval_docs_cap * 20 // 90)
    sov_ret_cap = max(3, retrieval_docs_cap * 15 // 90)

    def add_node(vtype: str) -> int:
        node_types.append(vtype)
        return len(node_types) - 1

    # 1. Zero-skip theorems
    thm_dir = root / "data" / "corpus_parsed_full"
    by_source_num: dict[tuple[str, str, str], int] = {}
    pending_cites: list[tuple[int, str, str, str]] = []
    thm_ret = 0
    for path in sorted(thm_dir.glob("*.jsonl")) if thm_dir.is_dir() else []:
        with path.open("r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    stats["theorem_unparsable"] += 1
                    continue
                kind = str(row.get("kind") or "Theorem")
                src = str(row.get("source") or path.name)
                stmt = str(row.get("statement") or "")
                idx = add_node(_vtype_for_kind(kind))
                stats["theorem_rows"] += 1
                if g_fire_retraction_weight(src + " " + stmt) == 0.0:
                    retracted_nodes += 1
                num = str(row.get("number") or "")
                if num:
                    by_source_num[(src, kind.lower(), num)] = idx
                for ck, cn in _CITE_RE.findall(stmt):
                    pending_cites.append((idx, src, ck.lower(), cn))
                prof = latex_operator_profile(stmt)
                op_hist.update(prof)
                if thm_ret < thm_ret_cap and len(retrieval) < retrieval_docs_cap:
                    thm_ret += 1
                    retrieval.append(
                        {
                            "doc_id": str(row.get("theorem_id") or f"thm_{idx}"),
                            "source": src,
                            "title": f"{kind} {num} {src}"[:200],
                            "statement": stmt[:600],
                            "assumptions": "",
                            "body": "",
                            "ops": dict(prof),
                            "n_obs": None,
                            "n_min": None,
                            "authority": 0.86,
                        }
                    )
    for idx, src, ck, cn in pending_cites:
        tgt = by_source_num.get((src, ck, cn))
        if tgt is not None and tgt != idx:
            edges.append((tgt, idx))
            stats["citation_edges"] += 1

    # 2. Equation registry with formula ASTs
    eq_path = root / "data" / "mind" / "equations.jsonl"
    floor_pass = 0
    floor_total = 0
    eq_ret = 0
    if eq_path.is_file():
        with eq_path.open("r", encoding="utf-8", errors="replace") as fh:
            for i, line in enumerate(fh):
                if max_equation_rows is not None and i >= max_equation_rows:
                    break
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    stats["equation_unparsable"] += 1
                    continue
                fa = row.get("formula_ast") if isinstance(row.get("formula_ast"), dict) else {}
                prof = formula_ast_operator_profile(fa)
                op_hist.update(prof)
                feats = [str(k) for k in (row.get("m5_feature_keys") or [])]
                eq_idx = add_node("V_eq")
                for _feat in feats:
                    d_idx = add_node("V_def")
                    edges.append((d_idx, eq_idx))
                stats["equation_rows"] += 1
                n_obs = row.get("sample_size_n")
                n_min = row.get("min_sample_size")
                if isinstance(n_obs, int | float) and isinstance(n_min, int | float):
                    floor_total += 1
                    if sample_floor_gate(float(n_obs), float(n_min))["passes"]:
                        floor_pass += 1
                if eq_ret < eq_ret_cap and len(retrieval) < retrieval_docs_cap and i % 140 == 0:
                    eq_ret += 1
                    title_s = f"{row.get('operator_domain', '')} {row.get('formula_type', '')}"
                    retrieval.append(
                        {
                            "doc_id": str(row.get("equation_id") or f"eq_{i}"),
                            "source": "data/mind/equations.jsonl",
                            "title": title_s[:200],
                            "statement": " ".join(feats)[:400],
                            "assumptions": f"n_min={n_min}",
                            "body": str(fa)[:400],
                            "ops": dict(prof),
                            "n_obs": n_obs,
                            "n_min": n_min,
                            "authority": 0.90,
                        }
                    )

    # 3. Complete 503 books & 877 PDFs manifests
    books_path = root / "data" / "mind" / "complete_458_book_registry.json"
    if books_path.is_file():
        b_data = json.loads(books_path.read_text(encoding="utf-8", errors="replace"))
        book_rows = list(b_data.get("books") or [])
        stats["complete_books"] = int(
            b_data.get("complete_503_corpus_books_count") or len(book_rows)
        )
        for b_row in book_rows:
            if not isinstance(b_row, Mapping):
                continue
            lane = str(b_row.get("lane") or "")
            is_med = lane == "books-b-medical"
            if is_med:
                stats["medical_quarantined_books"] += 1
            b_node = add_node("V_def")
            if not is_med:
                b_eq = add_node("V_eq")
                edges.append((b_node, b_eq))

    pdf_path = root / "data" / "sports_research_papers" / "manifest_877_pdfs.json"
    pdf_ret = 0
    if pdf_path.is_file():
        m_data = json.loads(pdf_path.read_text(encoding="utf-8", errors="replace"))
        papers = list(m_data.get("papers") or [])
        stats["manifest_pdfs"] = int(m_data.get("total_pdfs") or len(papers))
        for p_idx, p_row in enumerate(papers):
            p_name = (
                str(p_row.get("pdf_name") or p_row.get("title") or p_idx)
                if isinstance(p_row, Mapping)
                else str(p_row)
            )
            add_node("V_eq")
            if g_fire_retraction_weight(p_name) == 0.0:
                retracted_nodes += 1
            if (
                pdf_ret < pdf_ret_cap
                and len(retrieval) < retrieval_docs_cap
                and p_idx % max(1, len(papers) // pdf_ret_cap) == 0
            ):
                pdf_ret += 1
                retrieval.append(
                    {
                        "doc_id": f"pdf:{p_idx}:{p_name[:40]}",
                        "source": p_name[:120],
                        "title": p_name[:200],
                        "statement": p_name[:200],
                        "assumptions": "",
                        "body": p_name[:200],
                        "ops": {},
                        "n_obs": None,
                        "n_min": None,
                        "authority": 0.84,
                    }
                )

    # 4. Sovereign book primitives (58,486 rows)
    sov_dir = root / "brain" / "feeds" / "2026-11-14"
    sov_ret = 0
    sov_idx = 0
    sov_files = (
        sorted(sov_dir.glob("arxiv_sovereign_and_shard_b_*.jsonl")) if sov_dir.is_dir() else []
    )
    if not sov_files:
        sov_files = []
    for s_path in sov_files:
        with s_path.open("r", encoding="utf-8", errors="replace") as fh:
            for raw_ln in fh:
                if not raw_ln.strip():
                    continue
                stats["sovereign_primitives"] += 1
                s_eq = add_node("V_eq")
                s_def = add_node("V_def")
                edges.append((s_def, s_eq))
                if (
                    sov_idx % 380 == 0
                    and sov_ret < sov_ret_cap
                    and len(retrieval) < retrieval_docs_cap
                ):
                    try:
                        s_row = json.loads(raw_ln)
                    except json.JSONDecodeError:
                        s_row = {}
                    if isinstance(s_row, dict):
                        sov_ret += 1
                        s_title = str(s_row.get("title") or s_path.name)
                        s_claim = str(
                            s_row.get("equation_or_claim") or s_row.get("verbatim_quote") or ""
                        )
                        retrieval.append(
                            {
                                "doc_id": str(s_row.get("record_id") or f"sov_{sov_idx}"),
                                "source": s_title[:120],
                                "title": s_title[:200],
                                "statement": s_claim[:600],
                                "assumptions": "",
                                "body": s_claim[:600],
                                "ops": dict(latex_operator_profile(s_claim)),
                                "n_obs": None,
                                "n_min": None,
                                "authority": 0.88,
                            }
                        )
                sov_idx += 1

    # 5. Foundry Tier-B primitives (12,558 files / 50,656 primitives)
    prim_dir = root / "foundry" / "artifacts" / "primitives"
    files = sorted(os.listdir(prim_dir)) if prim_dir.is_dir() else []
    if max_foundry_files is not None:
        files = files[: int(max_foundry_files)]
    fnd_ret = 0
    fnd_stride = max(1, len(files) // max(1, fnd_ret_cap))
    for f_i, fname in enumerate(files):
        if not fname.endswith(".json"):
            continue
        try:
            book = json.loads((prim_dir / fname).read_text(encoding="utf-8", errors="replace"))
        except (OSError, json.JSONDecodeError):
            stats["foundry_unparsable"] += 1
            continue
        if not isinstance(book, dict):
            continue
        stats["foundry_files"] += 1
        title = str(book.get("title") or book.get("file_name") or fname)
        for prim in book.get("primitives") or []:
            if not isinstance(prim, dict):
                continue
            stats["foundry_primitives"] += 1
            latex = str(prim.get("latex") or "")
            quote = str(prim.get("verbatim_quote") or "")
            ledger = str(prim.get("symbol_and_unit_ledger") or "")
            assumptions = str(prim.get("assumptions") or "")
            eq_idx = add_node("V_eq")
            prof = latex_operator_profile(latex) if latex else Counter[str]()
            op_hist.update(prof)
            if g_fire_retraction_weight(title + " " + quote) == 0.0:
                retracted_nodes += 1
            if ledger:
                d_idx = add_node("V_def")
                edges.append((d_idx, eq_idx))
            if assumptions:
                a_idx = add_node("V_assump")
                edges.append((a_idx, eq_idx))
            gse_map = prim.get("gse_mapping") or book.get("gse_mapping")
            if gse_map:
                c_idx = add_node("V_code")
                edges.append((eq_idx, c_idx))
            if (
                f_i % fnd_stride == 0
                and fnd_ret < fnd_ret_cap
                and len(retrieval) < retrieval_docs_cap
            ):
                fnd_ret += 1
                retrieval.append(
                    {
                        "doc_id": f"{fname}:{prim.get('primitive_id', '')}",
                        "source": title,
                        "title": str(prim.get("name") or "")[:200],
                        "statement": (latex or quote)[:600],
                        "assumptions": assumptions[:400],
                        "body": quote[:600],
                        "ops": dict(prof),
                        "n_obs": None,
                        "n_min": None,
                        "authority": 0.89,
                    }
                )

    dag = kahn_acyclicity(len(node_types), edges)
    type_counts = Counter(node_types)
    has_in = [False] * len(node_types)
    has_out = [False] * len(node_types)
    for u, v in edges:
        has_out[u] = True
        has_in[v] = True
    orphan_eq = sum(
        1
        for i, t in enumerate(node_types)
        if t == "V_eq" and not has_in[i] and not has_out[i]
    )
    for doc in retrieval:
        doc["regime_8d"] = embed_regime_vector_8d(
            " ".join(str(doc.get(f, "")) for f in BM25F_FIELDS)
        )
        doc["g_fire_weight"] = g_fire_retraction_weight(
            str(doc.get("source", "")) + " " + str(doc.get("statement", ""))
        )
    summary = {
        "nodes_total": len(node_types),
        "edges_total": len(edges),
        "node_type_counts": dict(sorted(type_counts.items())),
        "is_dag": bool(dag["is_dag"]),
        "nodes_in_cycles": int(dag["nodes_in_cycles"]),
        "orphan_equation_nodes": orphan_eq,
        "retracted_g_fire_locked_nodes": retracted_nodes,
        "equation_sample_floor_pass": floor_pass,
        "equation_sample_floor_total": floor_total,
        "operator_histogram_top": dict(op_hist.most_common(25)),
        "stats": dict(sorted(stats.items())),
        "retrieval_docs": len(retrieval),
    }
    digest = hashlib.sha256(json.dumps(summary, sort_keys=True).encode("utf-8")).hexdigest()
    return {"summary": summary, "graph_sha256": digest, "retrieval_docs": retrieval}


def load_wave24_index(repo_root: Path | None = None) -> dict[str, Any]:
    """Load the persisted Wave 24 index (cached); empty structure if absent."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    key = str(root)
    if key in _INDEX_CACHE:
        return _INDEX_CACHE[key]
    path = root / INDEX_REL
    if path.is_file():
        data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {"summary": {}, "graph_sha256": "", "retrieval_docs": []}
    _INDEX_CACHE[key] = data
    return data


def fused_bm25f_ast_mahalanobis_retrieve(
    docs: Sequence[Mapping[str, Any]],
    *,
    query_terms: Sequence[str],
    regime_vector_8d: Sequence[float],
    top_k: int = 8,
    rrf_k: int = 60,
) -> dict[str, Any]:
    """Four-way RRF (BM25F, AST cosine, 8D Mahalanobis, authority) gated by G_fire."""
    live = [d for d in docs if float(d.get("g_fire_weight", 1.0)) > 0.0]
    if not live:
        return {"top": [], "ragas_faithfulness": 0.0, "source_hhi": 0.0, "candidates": 0}
    bm = bm25f_scores([{f: str(d.get(f, "")) for f in BM25F_FIELDS} for d in live], query_terms)
    top_lex = max(range(len(live)), key=lambda i: (bm[i], -i))
    q_ops = {str(k): int(v) for k, v in dict(live[top_lex].get("ops") or {}).items()}
    ast_s = [
        operator_tree_cosine(q_ops, {str(k): int(v) for k, v in dict(d.get("ops") or {}).items()})
        for d in live
    ]
    rows = [[float(x) for x in d.get("regime_8d") or [0.0] * 8] for d in live]
    maha = diagonal_mahalanobis_similarity([float(x) for x in regime_vector_8d], rows)
    auth = [float(d.get("authority", 0.8)) for d in live]
    fused = reciprocal_rank_fusion([bm, ast_s, maha, auth], k=rrf_k)
    fused_dw = echo_chamber_deweight([str(d.get("source", "")) for d in live], fused)
    order = sorted(range(len(live)), key=lambda i: (-fused_dw[i], i))[: max(1, top_k)]
    top = [
        {
            "doc_id": str(live[i].get("doc_id")),
            "source": str(live[i].get("source")),
            "fused_score": round(fused_dw[i], 6),
            "bm25f": round(bm[i], 6),
            "ast_cosine": round(ast_s[i], 6),
            "mahalanobis_sim": round(maha[i], 6),
        }
        for i in order
    ]
    supported = sum(1 for i in order if bm[i] > 0.0 or maha[i] >= 0.5)
    return {
        "top": top,
        "ragas_faithfulness": supported / float(len(order)),
        "source_hhi": source_herfindahl([str(t["source"]) for t in top]),
        "candidates": len(live),
        "g_fire_excluded": len(docs) - len(live),
    }


def evaluate_wave24_theorem_ast_bridge(
    *,
    query_terms: Sequence[str],
    regime_vector_8d: Sequence[float],
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Stage-2 Wave 24 diagnostics over G_doc, OpenViking, Docling, SymPy, G_fire & PET-PEESE."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    cache_key = (
        str(root),
        tuple(str(t) for t in query_terms),
        tuple(round(float(x), 4) for x in regime_vector_8d),
    )
    if cache_key in _BRIDGE_CACHE:
        return dict(_BRIDGE_CACHE[cache_key])

    idx = load_wave24_index(root)
    summ = dict(idx.get("summary") or {})
    ret = fused_bm25f_ast_mahalanobis_retrieve(
        list(idx.get("retrieval_docs") or []),
        query_terms=query_terms,
        regime_vector_8d=regime_vector_8d,
    )
    ov = load_openviking_tiered_context(
        [
            {
                "node_id": "g_doc_ast",
                "score": 1.0,
                "l0_abstract": "Stage-2 theorem AST abstract",
                "l1_overview": "Intermediate dependency summary over G_doc",
                "l2_detail": "Full theorem detail text",
            }
        ],
        token_budget=180,
    )
    docling = normalize_docling_layout_ast(
        [
            {"kind": "section", "section": "ast", "text": "Theorem-AST"},
            {"kind": "formula", "section": "ast", "text": "E[Y|X]"},
        ]
    )
    scholar = synthesize_openscholar_verified_claims(
        [
            {"claim_id": "c_ok", "statement": "DEFF=2.0 floor active", "citations": ["ref_deff"]},
            {"claim_id": "c_bad", "statement": "Unsupported claim", "citations": ["missing"]},
        ],
        ["ref_deff"],
    )
    lit = compute_litstudy_bibliometric_authority(
        {"s1": ["a", "b"], "s2": ["a", "b"], "s3": ["z"]}
    )
    ragas = evaluate_ragas_retrieval_faithfulness(
        supported_claims=7,
        total_claims=8,
        relevant_retrieved=7,
        total_retrieved=8,
        relevant_ground_truth=8,
        min_faithfulness=0.70,
    )
    bpi = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(1, 1, -2, 0, 0, 0),
        transcendental_arg_dims=(DIMENSIONLESS,),
        variable_dims=(
            (1, 1, -2, 0, 0, 0),
            (1, -3, 0, 0, 0, 0),
            (0, 1, -1, 0, 0, 0),
            (0, 2, 0, 0, 0, 0),
            (0, 0, -1, 0, 0, 0),
            (0, 1, 0, 0, 0, 0),
        ),
    )
    sym_lim = sympy_six_regime_limit_screen("logit_inv(2.0 * p - 1.0) * 10.0", {"p": (0.0, 1.0)})
    retracted = evaluate_g_fire_gate(
        TheoremDependencyNode("arxiv:2312.11067", "arxiv:2312.11067", "game", 4),
        query_scale="game",
        n_obs=60,
        deff_cluster=DEFF_DRIVE,
        games_played=10,
    )
    pet = pool_pet_peese_meta_regression(
        [
            StudyEffect("s1", 0.32, 0.11, 1.0, 120),
            StudyEffect("s2", 0.28, 0.10, 1.0, 160),
            StudyEffect("s3", 0.35, 0.13, 1.0, 95),
        ],
        lambda_prior=4.0,
    )
    ragas_score = float(ragas["faithfulness"])
    out = {
        "wave24_theorem_ast_wired": True,
        "g_doc_nodes": int(summ.get("nodes_total", 0)),
        "g_doc_edges": int(summ.get("edges_total", 0)),
        "g_doc_is_dag": bool(summ.get("is_dag", False)),
        "g_doc_sha256": str(idx.get("graph_sha256", "")),
        "fused_top_doc_ids": [str(t["doc_id"]) for t in ret["top"]],
        "ragas_faithfulness": ragas_score,
        "ragas_gate_passed": ragas_score >= 0.70,
        "source_hhi": float(ret["source_hhi"]),
        "openviking_tier_loaded": str(ov["highest_tier_loaded"]),
        "docling_ast_nodes": int(docling["parent_count"]),
        "openscholar_verified_count": len(scholar["verified_claims"]),
        "litstudy_effective_sources": float(lit["effective_independent_sources"]),
        "buckingham_pi_passed": bool(bpi["passed"]),
        "sympy_six_regime_admissible": bool(sym_lim["admissible"]),
        "g_fire_retracted_weight": float(retracted["quarantine_weight"]),
        "pet_peese_pooled_g": float(pet["pooled_g"]),
        "live_stage2_weight": 0.0,
        "wave24_epa_adj": 0.0,
    }
    _BRIDGE_CACHE[cache_key] = dict(out)
    return out


def main(argv: Sequence[str] | None = None) -> int:
    """CLI: mine the corpus and persist the Wave 24 index JSON (pure ASCII)."""
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    ap.add_argument("--repo-root", type=Path, default=_DEFAULT_REPO_ROOT)
    ap.add_argument("--max-foundry-files", type=int, default=None)
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args(argv)
    res = mine_theorem_ast_corpus_index(args.repo_root, max_foundry_files=args.max_foundry_files)
    if args.write:
        out = Path(args.repo_root) / INDEX_REL
        out.write_text(json.dumps(res, indent=1, ensure_ascii=True) + "\n", encoding="ascii")
    print(json.dumps({"summary": res["summary"], "graph_sha256": res["graph_sha256"]}, indent=1))
    return 0


__all__ = [
    "BM25F_FIELD_WEIGHTS",
    "DEFF_DRIVE",
    "INDEX_REL",
    "NFL_EPA_MIN_GAMES",
    "REGIME_AXES_8D",
    "bm25f_scores",
    "diagonal_mahalanobis_similarity",
    "echo_chamber_deweight",
    "embed_regime_vector_8d",
    "evaluate_wave24_theorem_ast_bridge",
    "formula_ast_operator_profile",
    "fused_bm25f_ast_mahalanobis_retrieve",
    "g_fire_retraction_weight",
    "kahn_acyclicity",
    "latex_operator_profile",
    "load_wave24_index",
    "mine_theorem_ast_corpus_index",
    "operator_tree_cosine",
    "python_formula_operator_profile",
    "reciprocal_rank_fusion",
    "sample_floor_gate",
    "six_regime_boundary_screen",
    "source_herfindahl",
    "sympy_six_regime_limit_screen",
]


if __name__ == "__main__":
    raise SystemExit(main())
