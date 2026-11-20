"""Equation retrieval layer: enrichment tokens, index, situation query.

Hermetic: runs the real loader + executor over a tiny fixture master.
The pre-registered proofs against the REAL 940,102-row master live in
intelligence/ingestion/run_equation_proofs.py and are exercised by the
retrieval build report, not by unit tests (CI has no master).
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.ingestion.equation_embeddings import (
    EMBEDDING_CHANNEL_STATUS,
    HashTestEmbedder,
    make_dense_ranking_fn,
)
from intelligence.ingestion.equation_enrich import (
    parse_normalized,
    text_symbol_tokens,
    tree_tokens,
    build_enrichment,
)
from intelligence.ingestion.equation_index import build_index, connect, meta_by_id
from intelligence.ingestion.equation_retrieval import EquationRetriever, Situation
from intelligence.ingestion.masters_loader import build_or_load_index, resolve_masters_paths


class TestStructureTokens(unittest.TestCase):
    def test_paths_and_pairs_for_normalization_form(self) -> None:
        expr = parse_normalized("w_u/(w_u+w_v)", ["w_u", "w_v"])
        self.assertIsNotNone(expr)
        paths, pairs = tree_tokens(expr, ["w_u", "w_v"])
        self.assertTrue(any(p.startswith("pth_w_u_") for p in paths), paths)
        self.assertTrue(any(p.startswith("pth_w_v_") for p in paths), paths)
        self.assertTrue(any("w_u" in p and "w_v" in p for p in pairs), pairs)

    def test_text_tokens_handle_latex_braces(self) -> None:
        toks = text_symbol_tokens(r"\frac{w_{u}}{w_{u}+w_{v}}")
        self.assertIn("tsym_w_u", toks)
        self.assertIn("tsym_w_v", toks)
        # text-derived tokens are namespaced away from parsed symbols
        self.assertTrue(all(t.startswith("tsym_") for t in toks))


FIXTURE_ROWS = [
    {"equation": "2+3*4", "book": "Fixture Book", "_lane": "fixture"},
    {
        "equation": "w_{u}/(w_{u}+w_{v})",
        "title": "The Player Kernel: Learning Team Strengths",
        "section": "2.1 Pairwise Comparisons",
        "_lane": "equations-from-papers",
        "arxiv_id": "1609.01176",
    },
    {"equation": "x/(x+y)", "book": "Fixture Pairwise", "section": "Pairwise Comparisons", "_lane": "fixture"},
    {"equation": "m*x + n", "book": "Linear Fit", "_lane": "fixture"},
    {"equation": "the quick brown fox jumps over the lazy dog", "book": "Prose Rows", "_lane": "fixture"},
]


class TestRetrievalOnFixture(unittest.TestCase):
    def _build(self, td: Path):
        masters_dir = td / "masters"
        masters_dir.mkdir(parents=True)
        eq = masters_dir / "EQUATIONS-MASTER.jsonl"
        eq.write_text("".join(json.dumps(r) + "\n" for r in FIXTURE_ROWS), encoding="utf-8")
        sit = masters_dir / "SITUATIONAL-MASTER.jsonl"
        sit.write_text("", encoding="utf-8")
        paths = resolve_masters_paths(eq, sit)
        idx = build_or_load_index(paths, index_path=td / "idx.json", force_rebuild=True)
        build_enrichment(td / "enr.jsonl", masters_index=idx, master_jsonl=eq)
        build_index(td / "enr.jsonl", td / "idx.sqlite")
        conn = connect(td / "idx.sqlite")
        return EquationRetriever(conn, idx), conn

    def test_p1_shape_query_returns_pairwise_row_first(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            retriever, _ = self._build(Path(td))
            out = retriever.query(
                Situation(
                    description="win probability from two strength ratings (paired comparison)",
                    variables={"w_u": 0.5976133222560971, "w_v": 0.44738667774390284},
                    target_variable="w_u",
                )
            )
            self.assertGreaterEqual(len(out["results"]), 1)
            top = out["results"][0]
            self.assertEqual(top["equation"], "w_{u}/(w_{u}+w_{v})")
            self.assertAlmostEqual(top["value"], 0.5718787772785618, places=9)
            self.assertEqual(top["provenance"]["paper_id"], "1609.01176")

    def test_p2_shape_query_role_binds_normalization_row(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            retriever, _ = self._build(Path(td))
            out = retriever.query(
                Situation(
                    description=(
                        "devig: fair no-vig probability from American odds moneyline; "
                        "remove the bookmaker overround from the implied probabilities "
                        "by multiplicative normalization"
                    ),
                    variables={"q_fav": 450.0 / 550.0, "q_dog": 100.0 / 440.0},
                    target_variable="q_dog",
                )
            )
            values = [r["value"] for r in out["results"]]
            self.assertTrue(
                any(abs(v - 0.21739130434782608) < 1e-9 for v in values),
                f"no devig value in {values}",
            )

    def test_unbindable_rows_are_filtered_out(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            retriever, _ = self._build(Path(td))
            out = retriever.query(
                Situation(
                    description="win probability from two strength ratings (paired comparison)",
                    variables={"w_u": 0.6, "w_v": 0.4},
                    target_variable="w_u",
                )
            )
            equations = [r["equation"] for r in out["results"]]
            self.assertNotIn("m*x + n", equations)  # foreign symbols, not a norm form
            self.assertNotIn("the quick brown fox jumps over the lazy dog", equations)

    def test_unparseable_rows_stay_indexed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            _, conn = self._build(Path(td))
            meta = meta_by_id(conn, "eqrow-5")
            self.assertIsNotNone(meta)
            self.assertEqual(meta["class"], "UNPARSEABLE")
            self.assertIn("Prose Rows", meta["context"])


class TestEmbeddingChannelStub(unittest.TestCase):
    def test_status_is_honest_stub(self) -> None:
        self.assertEqual(EMBEDDING_CHANNEL_STATUS, "stub-not-populated")

    def test_hash_test_embedder_is_deterministic(self) -> None:
        emb = HashTestEmbedder(dim=16)
        self.assertEqual(emb.embed("w_u/(w_u+w_v)"), emb.embed("w_u/(w_u+w_v)"))
        self.assertEqual(len(emb.embed("anything")), 16)

    def test_dense_ranking_fn_absent_without_table(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            fn = make_dense_ranking_fn(Path(td) / "nope", HashTestEmbedder().embed)
            self.assertIsNone(fn)


if __name__ == "__main__":
    unittest.main()
