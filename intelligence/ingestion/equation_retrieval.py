"""Situation query layer for equation retrieval (Layer 3).

A game situation compiles to hybrid retrieval over the Equations
Master, following the ARQMath-settled recipe:

1. **Hard filters** — a candidate must be honestly evaluable
   (`PARSED_EVALUATED` / `PARSED_SYMBOLIC_ONLY`) and *bindable*: every
   free symbol resolvable from the situation's available quantities,
   either by exact name, or — for probability-normalization forms
   (`s_target / (s_target + s_other + ...)`, the loader's own
   `normalization_form_symbols` detection) — by role: the numerator
   symbol takes the situation's designated target variable, the
   remaining denominator symbols take the remaining variables in
   order. Role binding is the same mechanism the wiring proof used to
   bind the master's pairwise-normalization row to the architecture's
   multiplicative devig.
2. **Channels, fused** — (a) structure: normalization-form and
   exact-symbol-set tiers; (b) FTS context: BM25 over title/section/
   lane context; (c) FTS structure tokens: symbol/path/tuple tokens.
   Fused with reciprocal-rank fusion. (The dense embedding channel is
   wired in `equation_embeddings.py`; in v1 it is a documented,
   tested stub — see that module.)
3. **Executor verification** — fused candidates are bound and run
   through `masters_loader.evaluate()`; only rows that actually
   evaluate survive, with a target sanity check (a probability must
   land in [0, 1]).
4. Top-K returns **with provenance**.
"""

from __future__ import annotations

import json
import math
import re
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

from intelligence.ingestion.equation_index import fts_query, meta_by_id
from intelligence.ingestion.masters_loader import MastersIndex

EVALUABLE_CLASSES = ("PARSED_EVALUATED", "PARSED_SYMBOLIC_ONLY")
_WORD_RE = re.compile(r"[a-z0-9]+")
_RRF_K = 60


@dataclass
class Situation:
    description: str
    variables: Dict[str, float]
    target_variable: Optional[str] = None
    target_kind: str = "probability"
    top_k: int = 5
    pool: int = 200


@dataclass
class RetrievedEquation:
    row_id: str
    value: float
    bindings: Dict[str, float]
    equation: Optional[str]
    normalized_expr: Optional[str]
    provenance: Dict[str, Any]
    fused_score: float
    channels: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_id": self.row_id,
            "value": self.value,
            "bindings": self.bindings,
            "equation": self.equation,
            "normalized_expr": self.normalized_expr,
            "provenance": self.provenance,
            "fused_score": round(self.fused_score, 6),
            "channels": self.channels,
        }


def _description_terms(description: str) -> List[str]:
    terms: List[str] = []
    seen = set()
    for tok in _WORD_RE.findall((description or "").lower()):
        if len(tok) >= 3 and tok not in seen:
            seen.add(tok)
            terms.append(tok)
    return terms


def _rrf(rankings: Sequence[Sequence[str]]) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for ranking in rankings:
        for rank, row_id in enumerate(ranking):
            scores[row_id] = scores.get(row_id, 0.0) + 1.0 / (_RRF_K + rank + 1)
    return scores


_TIER_SQL = {
    "structure:norm+exact-symbols": (
        "SELECT row_id, LENGTH(COALESCE(normalized_expr, '')) AS elen"
        " FROM eq_meta WHERE is_norm = 1 AND sym_key = ?"
    ),
    "structure:exact-symbols": (
        "SELECT row_id, LENGTH(COALESCE(normalized_expr, '')) AS elen"
        " FROM eq_meta WHERE sym_key = ? AND sym_key != ''"
    ),
    "structure:norm-form": (
        "SELECT row_id, LENGTH(COALESCE(normalized_expr, '')) AS elen"
        " FROM eq_meta WHERE is_norm = 1 AND sym_count = ?"
    ),
}


class EquationRetriever:
    def __init__(
        self,
        conn: sqlite3.Connection,
        masters: MastersIndex,
        dense_ranking_fn=None,
    ):
        """`dense_ranking_fn`: optional callable (Situation) -> [row_id]
        supplying the embedding channel's ranking (see
        equation_embeddings.py). When None, v1 runs on the structure +
        FTS channels alone and says so in every result's channel stats.
        """
        self.conn = conn
        self.masters = masters
        self.dense_ranking_fn = dense_ranking_fn

    # -- channels ------------------------------------------------------
    def _context_ranking(self, situation: Situation, limit: int = 400) -> List[str]:
        terms = _description_terms(situation.description)
        if not terms:
            return []
        match = " OR ".join(terms)
        return [row_id for row_id, _ in fts_query(self.conn, "eq_fts_context", match, limit)]

    def _structure_token_ranking(self, situation: Situation, limit: int = 400) -> List[str]:
        tokens = [f"sym_{name}" for name in situation.variables]
        if not tokens:
            return []
        match = " OR ".join(tokens)
        return [row_id for row_id, _ in fts_query(self.conn, "eq_fts_structure", match, limit)]

    def _tier(self, tier: str, params: Sequence[Any], ctx_rank: Dict[str, int]) -> List[str]:
        rows = self.conn.execute(_TIER_SQL[tier], params).fetchall()
        ids = [r["row_id"] for r in rows]
        elen = {r["row_id"]: r["elen"] for r in rows}
        ids.sort(key=lambda rid: (ctx_rank.get(rid, 1 << 30), elen[rid]))
        return ids

    def _structure_ranking(
        self, situation: Situation, ctx_rank: Dict[str, int]
    ) -> Tuple[List[str], Dict[str, str]]:
        sym_key = " ".join(sorted(situation.variables))
        nvars = len(situation.variables)
        channel_of: Dict[str, str] = {}
        ordered: List[str] = []
        tiers = [
            ("structure:norm+exact-symbols", (sym_key,)),
            ("structure:exact-symbols", (sym_key,)),
            ("structure:norm-form", (nvars,)),
        ]
        for name, params in tiers:
            for row_id in self._tier(name, params, ctx_rank):
                if row_id not in channel_of:
                    channel_of[row_id] = name
                    ordered.append(row_id)
        return ordered, channel_of

    # -- binding ---------------------------------------------------------
    def _bindings_for(
        self, meta: Dict[str, Any], situation: Situation
    ) -> Optional[Dict[str, float]]:
        free = json.loads(meta["free_symbols"] or "[]")
        variables = situation.variables
        if set(free) <= set(variables):
            return {sym: float(variables[sym]) for sym in free}
        # Role binding for normalization forms: numerator symbol takes
        # the target variable; denominator symbols (in master order)
        # take the remaining situation variables (in situation order).
        if meta.get("is_norm") and situation.target_variable in variables:
            if len(free) == len(variables) and meta.get("norm_num") in free:
                bindings = {meta["norm_num"]: float(variables[situation.target_variable])}
                den = [s for s in json.loads(meta["norm_den"] or "[]") if s != meta["norm_num"]]
                remaining = [v for v in variables if v != situation.target_variable]
                rest = [s for s in free if s != meta["norm_num"]]
                ordered_rest = den + [s for s in rest if s not in den]
                if len(ordered_rest) == len(remaining):
                    for sym, var in zip(ordered_rest, remaining):
                        bindings[sym] = float(variables[var])
                    return bindings
        return None

    def _sane(self, value: float, situation: Situation) -> bool:
        if not math.isfinite(value):
            return False
        if situation.target_kind == "probability":
            return 0.0 <= value <= 1.0
        return True

    # -- query -----------------------------------------------------------
    def query(self, situation: Situation) -> Dict[str, Any]:
        t0 = time.time()
        ctx = self._context_ranking(situation)
        ctx_rank = {row_id: i for i, row_id in enumerate(ctx)}
        structure, channel_of = self._structure_ranking(situation, ctx_rank)
        for row_id in structure:
            channel_of.setdefault(row_id, "structure")
        tok = self._structure_token_ranking(situation)
        dense: List[str] = []
        if self.dense_ranking_fn is not None:
            dense = list(self.dense_ranking_fn(situation) or [])
        fused = _rrf([structure, ctx, tok] + ([dense] if dense else []))
        for row_id in dense:
            channel_of.setdefault(row_id, "dense-embedding")
        for row_id in ctx:
            channel_of.setdefault(row_id, "fts-context")
        for row_id in tok:
            if row_id in channel_of and channel_of[row_id] == "fts-context":
                channel_of[row_id] = "fts-context+structure-tokens"
            else:
                channel_of.setdefault(row_id, "fts-structure-tokens")

        candidates = sorted(fused, key=lambda rid: fused[rid], reverse=True)
        verified: List[RetrievedEquation] = []
        attempts = 0
        failures = 0
        for row_id in candidates:
            if attempts >= situation.pool:
                break
            meta = meta_by_id(self.conn, row_id)
            if meta is None or meta["class"] not in EVALUABLE_CLASSES:
                continue
            bindings = self._bindings_for(meta, situation)
            if bindings is None:
                continue
            attempts += 1
            value: Any = None
            try:
                value = self.masters.evaluate(row_id, bindings)
            except Exception:
                failures += 1
            if value is None or not self._sane(value, situation):
                continue
            verified.append(
                RetrievedEquation(
                    row_id=row_id,
                    value=float(value),
                    bindings=bindings,
                    equation=meta["equation"],
                    normalized_expr=meta["normalized_expr"],
                    provenance=json.loads(meta["provenance"] or "{}"),
                    fused_score=fused[row_id],
                    channels=[channel_of.get(row_id, "fused")],
                )
            )
        verified.sort(key=lambda r: fused[r.row_id], reverse=True)
        return {
            "situation": {
                "description": situation.description,
                "variables": situation.variables,
                "target_variable": situation.target_variable,
                "target_kind": situation.target_kind,
            },
            "channels": {
                "structure_candidates": len(structure),
                "fts_context_candidates": len(ctx),
                "fts_structure_token_candidates": len(tok),
                "dense_embedding_candidates": len(dense),
                "dense_channel": "live" if dense else "stub-not-populated",
                "fused_candidates": len(candidates),
                "executor_attempts": attempts,
                "executor_failures": failures,
                "verified": len(verified),
            },
            "results": [r.to_dict() for r in verified[: situation.top_k]],
            "seconds": round(time.time() - t0, 3),
        }
