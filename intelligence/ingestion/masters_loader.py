"""Runtime loader for the extraction masters (`masters_loader.py`).

This module is the single bridge between the 645,864-row Equations Master
(and the 101,965-row Situational Master) produced by the 2026-11-10
Extraction Mandate and the live engine. Before this module existed, the
ingestion audit (`extraction_masters_and_sweeps_2026_11_10.py`) wrote an
audit, a manifest, and a curated sample that *nothing in the repo read*,
and the Week 10 projections pipeline contained zero references to the
master. This loader fixes that:

1. **Shared path resolution** (`resolve_masters_paths`): the masters are
   located in a strict order — explicit argument, then the
   `GSE_MASTERS_DIR` environment variable, then the real workspace
   extraction-output directory, then the legacy AGY-machine path (kept
   only as a last fallback). The ingestion script and every other
   consumer resolve through this one function.

2. **Honest classification**: every master row is classified by the
   honest executor's own `parse_and_execute_honestly`
   (`intelligence/equations/honest_equation_executor.py`). Parsing is
   never reimplemented here. Strict zero-binding classification decides
   the counts: `PARSED_EVALUATED` / `PARSED_SYMBOLIC_ONLY` /
   `UNPARSEABLE`.

3. **Practical loading**: the master is streamed (`.jsonl` or
   `.jsonl.gz`); only parsed rows are kept, in a local index file built
   on first load and reused while the master file's size/mtime are
   unchanged. `PARSED_SYMBOLIC_ONLY` rows are indexed as *bindable*:
   `evaluate(row_id, bindings)` re-runs the honest executor with the
   caller's bindings and returns the resulting number.

Zero fabrication: a row that cannot be evaluated is never assigned a
value here; failed evaluations raise.
"""

from __future__ import annotations

import gzip
import json
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

from intelligence.equations.honest_equation_executor import (
    STATUS_PARSED_EVALUATED,
    STATUS_PARSED_SYMBOLIC_ONLY,
    STATUS_UNPARSEABLE,
    parse_and_execute_honestly,
)

# --- Master filenames -------------------------------------------------------
EQ_MASTER_BASENAMES: Tuple[str, ...] = ("EQUATIONS-MASTER.jsonl.gz", "EQUATIONS-MASTER.jsonl")
SIT_MASTER_BASENAMES: Tuple[str, ...] = ("SITUATIONAL-MASTER.jsonl.gz", "SITUATIONAL-MASTER.jsonl")
LEGACY_EQ_BASENAME = "EQUATIONS-MASTER-2026-11-10.jsonl.gz"
LEGACY_SIT_BASENAME = "SITUATIONAL-MASTER-2026-11-10.jsonl.gz"

# The real workspace location of the extraction masters (Motif VM).
WORKSPACE_MASTERS_DIR = (
    Path.home() / "workspace" / "extraction-mandate-2026-11-10" / "extraction-output"
)
# Legacy location on the AGY machine; last-resort fallback only.
LEGACY_MASTERS_DIR = Path("/home/antigravity/extraction-masters-2026-11-10")

ENV_MASTERS_DIR = "GSE_MASTERS_DIR"
ENV_INDEX_PATH = "GSE_MASTERS_INDEX"

# Terms whose raw-text provenance is traced during the indexing pass
# (provenance only — most source rows for these methods are matrix /
# algorithmic statements, not scalar equations).
DEFAULT_TRACK_TERMS: Tuple[str, ...] = ("sinkhorn", "devig")


@dataclass(frozen=True)
class MastersPaths:
    equations: Path
    situational: Path
    resolution_source: str  # "explicit" | "env:GSE_MASTERS_DIR" | "workspace_default" | "legacy_fallback"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "equations_master": str(self.equations),
            "situational_master": str(self.situational),
            "resolution_source": self.resolution_source,
        }


def _first_existing(directory: Path, basenames: Sequence[str]) -> Optional[Path]:
    for name in basenames:
        cand = directory / name
        if cand.is_file():
            return cand
    return None


def _pair_in_dir(directory: Path, source: str) -> Optional[MastersPaths]:
    eq = _first_existing(directory, EQ_MASTER_BASENAMES)
    sit = _first_existing(directory, SIT_MASTER_BASENAMES)
    if eq is not None and sit is not None:
        return MastersPaths(equations=eq, situational=sit, resolution_source=source)
    return None


def resolve_masters_paths(
    explicit_equations: Optional[Path] = None,
    explicit_situational: Optional[Path] = None,
    *,
    environ: Optional[Mapping[str, str]] = None,
) -> MastersPaths:
    """Resolve the extraction masters location.

    Order: explicit argument > ``GSE_MASTERS_DIR`` env var > the real
    workspace extraction-output directory > the legacy AGY path.
    Raises ``FileNotFoundError`` naming every location tried when no
    complete (equations + situational) pair exists anywhere.
    """
    env = os.environ if environ is None else environ

    if explicit_equations is not None or explicit_situational is not None:
        if explicit_equations is None or explicit_situational is None:
            raise ValueError(
                "explicit masters resolution requires BOTH the equations and situational paths"
            )
        eq, sit = Path(explicit_equations), Path(explicit_situational)
        missing = [str(p) for p in (eq, sit) if not p.is_file()]
        if missing:
            raise FileNotFoundError(f"explicit masters path(s) do not exist: {missing}")
        return MastersPaths(equations=eq, situational=sit, resolution_source="explicit")

    tried: List[str] = []

    env_dir = env.get(ENV_MASTERS_DIR)
    if env_dir:
        tried.append(f"{ENV_MASTERS_DIR}={env_dir}")
        hit = _pair_in_dir(Path(env_dir), f"env:{ENV_MASTERS_DIR}")
        if hit is not None:
            return hit

    tried.append(str(WORKSPACE_MASTERS_DIR))
    hit = _pair_in_dir(WORKSPACE_MASTERS_DIR, "workspace_default")
    if hit is not None:
        return hit

    tried.append(str(LEGACY_MASTERS_DIR))
    eq = LEGACY_MASTERS_DIR / LEGACY_EQ_BASENAME
    sit = LEGACY_MASTERS_DIR / LEGACY_SIT_BASENAME
    if eq.is_file() and sit.is_file():
        return MastersPaths(equations=eq, situational=sit, resolution_source="legacy_fallback")
    # Legacy dir may also carry the current filenames.
    hit = _pair_in_dir(LEGACY_MASTERS_DIR, "legacy_fallback")
    if hit is not None:
        return hit

    raise FileNotFoundError(
        "extraction masters not found; tried (in order): " + "; ".join(tried)
    )


# --- Index ------------------------------------------------------------------

_ROW_ID_KEYS = ("equation_id", "registry_equation_id", "source_id", "id")
_EQ_TEXT_KEYS = ("equation", "latex", "formula", "expression")


def _raw_equation(row: Mapping[str, Any]) -> str:
    for key in _EQ_TEXT_KEYS:
        val = row.get(key)
        if val:
            return str(val)
    return ""


def _row_id(row: Mapping[str, Any], row_index: int) -> str:
    for key in _ROW_ID_KEYS:
        val = row.get(key)
        if val:
            return str(val)
    return f"eqrow-{row_index}"


def _provenance(row: Mapping[str, Any]) -> Dict[str, Any]:
    return {
        "book": row.get("book") or row.get("title"),
        "title": row.get("title"),
        "author": row.get("author"),
        "file": row.get("file") or row.get("source_file") or row.get("source"),
        "paper_id": row.get("paper_id") or row.get("arxiv_id"),
        "repo": row.get("repo"),
        "page": row.get("page"),
        "section": row.get("section"),
        "lane": row.get("_lane") or row.get("lane"),
        "domain_tags": row.get("domain_tags"),
    }


def _domain_blob(rec: Mapping[str, Any]) -> str:
    prov = rec.get("provenance", {})
    parts = [
        " ".join(str(t) for t in (rec.get("domain_tags") or [])),
        str(prov.get("book") or ""),
        str(prov.get("title") or ""),
        str(prov.get("lane") or ""),
        str(rec.get("equation") or ""),
    ]
    return " ".join(parts).lower()


def _open_master(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


_NORM_FORM_RE = re.compile(r"^\s*\(?\s*([A-Za-z][A-Za-z0-9_]*)\s*\)?\s*/\s*\(?\s*(.+?)\s*\)?\s*$")
_IDENT_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]*")


def normalization_form_symbols(normalized_expr: str, free_symbols: Sequence[str]) -> Optional[Tuple[str, List[str]]]:
    """Detect the probability-normalization form ``s_num / (s_num + s_other [+ ...])``.

    This is exactly the architecture's Multiplicative devig method
    (``p_i = q_i / sum_j q_j``) as it appears in the extracted corpus.
    Returns ``(numerator_symbol, [denominator_symbols_in_order])`` or None.
    """
    if not (2 <= len(free_symbols) <= 4):
        return None
    m = _NORM_FORM_RE.match(normalized_expr or "")
    if not m:
        return None
    num, den = m.group(1), m.group(2)
    if num not in free_symbols or "+" not in den:
        return None
    den_syms = _IDENT_RE.findall(den)
    if not den_syms or set(den_syms) != set(free_symbols):
        return None
    if num not in den_syms:
        return None
    return num, den_syms


@dataclass
class MastersIndex:
    """In-memory view over the cached parsed-rows index of the Equations Master."""

    paths: MastersPaths
    counts: Dict[str, int] = field(default_factory=dict)
    total_rows: int = 0
    corrupt_lines: int = 0
    evaluated: List[Dict[str, Any]] = field(default_factory=list)
    bindable: List[Dict[str, Any]] = field(default_factory=list)
    term_provenance: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    index_path: Optional[Path] = None
    index_from_cache: bool = False
    build_seconds: Optional[float] = None

    def counts_by_class(self) -> Dict[str, int]:
        return dict(self.counts)

    def _filter_domain(self, rows: List[Dict[str, Any]], domain: Optional[str]) -> List[Dict[str, Any]]:
        if domain is None:
            return list(rows)
        needle = domain.lower()
        return [r for r in rows if needle in _domain_blob(r)]

    def get_evaluated(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """Strict ``PARSED_EVALUATED`` equations, with source provenance."""
        return self._filter_domain(self.evaluated, domain)

    def get_bindable(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """``PARSED_SYMBOLIC_ONLY`` equations: valid ASTs awaiting bindings."""
        return self._filter_domain(self.bindable, domain)

    def _lookup(self, row_id: str) -> Dict[str, Any]:
        for rec in self.evaluated:
            if rec["row_id"] == row_id:
                return rec
        for rec in self.bindable:
            if rec["row_id"] == row_id:
                return rec
        raise KeyError(f"row_id not in parsed masters index (UNPARSEABLE or unknown): {row_id}")

    def evaluate(self, row_id: str, bindings: Optional[Mapping[str, float]] = None) -> float:
        """Evaluate one master equation by row_id through the honest executor.

        Raises if the row is unknown/unparseable or the supplied bindings
        do not close the equation to a finite scalar. Nothing is invented.
        """
        rec = self._lookup(row_id)
        res = parse_and_execute_honestly(
            rec["equation"], bindings=dict(bindings or {}), allow_domain_probe=False
        )
        if res.status != STATUS_PARSED_EVALUATED or res.evaluated_value is None:
            raise ValueError(
                f"master row {row_id} did not evaluate under the supplied bindings: "
                f"status={res.status} reason={res.reason} unbound={res.unbound_symbols}"
            )
        return float(res.evaluated_value)

    def find_normalization_equation(self) -> Optional[Dict[str, Any]]:
        """Best master row in ``s / (s + t ...)`` probability-normalization form.

        Candidates are scored by provenance relevance (pairwise / player /
        team / probability / odds context first) so the row bound to the
        architecture's Multiplicative devig is a genuine counterpart, not
        an arbitrary algebra fragment. Falls back to the first candidate.
        """
        preference_terms = (
            "pairwise", "player", "team strength", "probab", "odds",
            "betting", "sport", "win", "comparison",
        )
        best: Optional[Dict[str, Any]] = None
        best_score = -1
        scanned = 0
        for rec in list(self.bindable) + list(self.evaluated):
            hit = normalization_form_symbols(rec.get("normalized_expr", ""), rec.get("free_symbols", []))
            if hit is None:
                continue
            scanned += 1
            prov = rec.get("provenance", {})
            blob = " ".join(
                str(prov.get(k) or "") for k in ("book", "title", "section", "file", "lane")
            ).lower()
            score = sum(1 for t in preference_terms if t in blob)
            if score > best_score:
                best_score = score
                best = dict(rec)
                best["normalization_numerator_symbol"] = hit[0]
                best["normalization_denominator_symbols"] = hit[1]
                best["normalization_preference_score"] = score
            if scanned >= 200 and best_score >= 3:
                break
        return best


def default_index_path(paths: MastersPaths) -> Path:
    env_val = os.environ.get(ENV_INDEX_PATH)
    if env_val:
        return Path(env_val)
    return paths.equations.parent / ".gse-masters-index" / "masters_parsed_index.json"


def build_or_load_index(
    paths: Optional[MastersPaths] = None,
    *,
    index_path: Optional[Path] = None,
    force_rebuild: bool = False,
    track_terms: Sequence[str] = DEFAULT_TRACK_TERMS,
    max_rows: Optional[int] = None,
) -> MastersIndex:
    """Stream the Equations Master once, classify honestly, cache parsed rows.

    The cache is keyed on the master file's (size, mtime_ns); a changed
    master rebuilds the index. ``max_rows`` exists for tests/small slices.
    """
    resolved = paths or resolve_masters_paths()
    idx_path = index_path or default_index_path(resolved)
    stat = resolved.equations.stat()
    cache_key = {"size": stat.st_size, "mtime_ns": stat.st_mtime_ns, "max_rows": max_rows}

    if not force_rebuild and idx_path.is_file():
        try:
            cached = json.loads(idx_path.read_text(encoding="utf-8"))
            if cached.get("cache_key") == cache_key and cached.get("equations_master") == str(resolved.equations):
                return MastersIndex(
                    paths=resolved,
                    counts=cached["counts"],
                    total_rows=cached["total_rows"],
                    corrupt_lines=cached.get("corrupt_lines", 0),
                    evaluated=cached["evaluated"],
                    bindable=cached["bindable"],
                    term_provenance=cached.get("term_provenance", {}),
                    index_path=idx_path,
                    index_from_cache=True,
                )
        except (json.JSONDecodeError, KeyError, OSError):
            pass  # corrupt cache -> rebuild below

    t0 = time.time()
    counts: Dict[str, int] = {
        STATUS_PARSED_EVALUATED: 0,
        STATUS_PARSED_SYMBOLIC_ONLY: 0,
        STATUS_UNPARSEABLE: 0,
    }
    evaluated: List[Dict[str, Any]] = []
    bindable: List[Dict[str, Any]] = []
    term_provenance: Dict[str, List[Dict[str, Any]]] = {t: [] for t in track_terms}
    total = 0
    corrupt = 0

    with _open_master(resolved.equations) as f:
        for line in f:
            if not line.strip():
                continue
            total += 1
            if max_rows is not None and total > max_rows:
                total -= 1
                break
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                corrupt += 1
                counts[STATUS_UNPARSEABLE] += 1
                continue
            raw = _raw_equation(row)

            low_blob = None
            for term in track_terms:
                if len(term_provenance[term]) < 8:
                    if low_blob is None:
                        low_blob = json.dumps(row, ensure_ascii=False).lower()
                    if term in low_blob:
                        term_provenance[term].append(
                            {
                                "row_index": total,
                                "row_id": _row_id(row, total),
                                "provenance": _provenance(row),
                                "equation_excerpt": raw[:240],
                            }
                        )

            res = parse_and_execute_honestly(raw, bindings=None, allow_domain_probe=False)
            counts[res.status] = counts.get(res.status, 0) + 1
            if res.status in (STATUS_PARSED_EVALUATED, STATUS_PARSED_SYMBOLIC_ONLY):
                rec = {
                    "row_id": _row_id(row, total),
                    "row_index": total,
                    "equation": raw,
                    "normalized_expr": res.normalized_expr,
                    "status": res.status,
                    "free_symbols": res.free_symbols,
                    "operator_count": res.operator_count,
                    "evaluated_value": res.evaluated_value,
                    "evaluation_mode": res.evaluation_mode,
                    "provenance": _provenance(row),
                    "domain_tags": row.get("domain_tags"),
                }
                if res.status == STATUS_PARSED_EVALUATED:
                    evaluated.append(rec)
                else:
                    bindable.append(rec)

    payload = {
        "schema": "gse_masters_parsed_index_v1",
        "equations_master": str(resolved.equations),
        "situational_master": str(resolved.situational),
        "resolution_source": resolved.resolution_source,
        "cache_key": cache_key,
        "counts": counts,
        "total_rows": total,
        "corrupt_lines": corrupt,
        "evaluated": evaluated,
        "bindable": bindable,
        "term_provenance": term_provenance,
    }
    try:
        idx_path.parent.mkdir(parents=True, exist_ok=True)
        idx_path.write_text(json.dumps(payload), encoding="utf-8")
    except OSError:
        idx_path = None  # cache is an optimization; the in-memory index still serves

    return MastersIndex(
        paths=resolved,
        counts=counts,
        total_rows=total,
        corrupt_lines=corrupt,
        evaluated=evaluated,
        bindable=bindable,
        term_provenance=term_provenance,
        index_path=idx_path,
        index_from_cache=False,
        build_seconds=round(time.time() - t0, 2),
    )
