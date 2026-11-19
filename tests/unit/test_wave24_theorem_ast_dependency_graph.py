"""Wave 24 theorem-to-AST mining, dependency graph and fused retriever tests."""

from __future__ import annotations

import json
import math
from pathlib import Path

from gse_engine.memory.wave24_theorem_ast_dependency_graph_suite import (
    INDEX_REL,
    bm25f_scores,
    diagonal_mahalanobis_similarity,
    echo_chamber_deweight,
    embed_regime_vector_8d,
    evaluate_wave24_theorem_ast_bridge,
    formula_ast_operator_profile,
    fused_bm25f_ast_mahalanobis_retrieve,
    g_fire_retraction_weight,
    kahn_acyclicity,
    latex_operator_profile,
    mine_theorem_ast_corpus_index,
    operator_tree_cosine,
    python_formula_operator_profile,
    reciprocal_rank_fusion,
    sample_floor_gate,
    six_regime_boundary_screen,
    source_herfindahl,
    sympy_six_regime_limit_screen,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_operator_profiles_and_cosine() -> None:
    p = python_formula_operator_profile("0.7 * logit_inv(0.2 * a + -0.1 * b) - c / 2")
    assert p["mult"] == 3 and p["add"] == 1 and p["sub"] == 1 and p["div"] == 1
    assert p["call:logit_inv"] == 1
    assert python_formula_operator_profile("not valid (") == {}
    lp = latex_operator_profile(r"\frac{\sum_i x_i^2}{n} + \exp(-\lambda t)")
    assert lp["div"] == 1 and lp["sum"] == 1 and lp["exp"] == 1 and lp["pow"] == 1
    fp = formula_ast_operator_profile({"op": "bilinear", "args": [{"kernel": "logit"}]})
    assert fp["k:bilinear"] == 1 and fp["k:logit"] == 1
    assert math.isclose(operator_tree_cosine(p, p), 1.0)
    assert operator_tree_cosine({"add": 1}, {"mul": 1}) == 0.0


def test_kahn_and_sample_floor() -> None:
    assert kahn_acyclicity(3, [(0, 1), (1, 2)])["is_dag"] is True
    cyc = kahn_acyclicity(3, [(0, 1), (1, 2), (2, 1)])
    assert cyc["is_dag"] is False and cyc["nodes_in_cycles"] == 2
    assert sample_floor_gate(60, 30)["passes"] is True
    assert sample_floor_gate(50, 30)["reasons"] == ["n_eff_below_n_min"]
    assert "epa_min_games_floor" in sample_floor_gate(100, 10, games_played=3)["reasons"]


def test_six_regime_boundary_screen() -> None:
    ok = six_regime_boundary_screen(
        "logit_inv(2.0 * p - 1.0) * 10.0", {"p": (0.0, 1.0)}
    )
    assert ok["admissible"] is True and len(ok["values"]) == 6
    bad = six_regime_boundary_screen("1.0 / p", {"p": (0.0, 1.0)})
    assert bad["admissible"] is False
    assert any(f.startswith("all_low") for f in bad["failures"])
    assert six_regime_boundary_screen("import os", {})["admissible"] is False


def test_g_fire_lock_and_regime_embedding() -> None:
    assert g_fire_retraction_weight("cites arXiv:2312.11067 heavily") == 0.0
    assert g_fire_retraction_weight("clean source") == 1.0
    v = embed_regime_vector_8d("Wind and pressure on the pocket; backup quarterback")
    assert len(v) == 8 and v[2] >= 1.0 and v[3] >= 2.0 and v[7] >= 1.0


def test_bm25f_field_weighting() -> None:
    docs = [
        {"title": "pressure model", "statement": "", "assumptions": "", "body": ""},
        {"title": "", "statement": "", "assumptions": "", "body": "pressure model"},
    ]
    s = bm25f_scores(docs, ["pressure"])
    assert s[0] > s[1] > 0.0


def test_mahalanobis_rrf_and_echo() -> None:
    sims = diagonal_mahalanobis_similarity([1.0, 0.0], [[1.0, 0.0], [5.0, 3.0], [0.0, 1.0]])
    assert sims[0] == max(sims) and math.isclose(sims[0], 1.0)
    fused = reciprocal_rank_fusion([[3.0, 2.0, 1.0], [1.0, 2.0, 3.0]], k=60)
    assert math.isclose(fused[0], fused[2])
    dw = echo_chamber_deweight(["a", "a", "b"], [1.0, 0.9, 0.5])
    assert math.isclose(dw[1], 0.9 / math.sqrt(2))
    assert source_herfindahl(["a", "a"]) == 1.0


def test_fused_retriever_g_fire_and_faithfulness() -> None:
    docs = [
        {
            "doc_id": "d1", "source": "s1", "title": "pressure sack hazard",
            "statement": "h = \\exp(beta x)", "assumptions": "", "body": "",
            "ops": {"exp": 1}, "regime_8d": [0, 0, 0, 3, 0, 0, 0, 0], "authority": 0.9,
            "g_fire_weight": 1.0,
        },
        {
            "doc_id": "d2", "source": "s2 2312.11067", "title": "pressure retracted",
            "statement": "", "assumptions": "", "body": "", "ops": {},
            "regime_8d": [0, 0, 0, 3, 0, 0, 0, 0], "authority": 0.99, "g_fire_weight": 0.0,
        },
        {
            "doc_id": "d3", "source": "s3", "title": "wind drag", "statement": "",
            "assumptions": "", "body": "", "ops": {"mul": 2},
            "regime_8d": [0, 0, 4, 0, 0, 0, 0, 0], "authority": 0.8, "g_fire_weight": 1.0,
        },
    ]
    res = fused_bm25f_ast_mahalanobis_retrieve(
        docs, query_terms=["pressure", "sack"], regime_vector_8d=[0, 0, 0, 3, 0, 0, 0, 0], top_k=2
    )
    ids = [t["doc_id"] for t in res["top"]]
    assert "d2" not in ids and ids[0] == "d1"
    assert res["g_fire_excluded"] == 1
    assert res["ragas_faithfulness"] >= 0.5


def test_miner_on_synthetic_corpus(tmp_path: Path) -> None:
    thm = tmp_path / "data/corpus_parsed_full/t.jsonl"
    thm.parent.mkdir(parents=True)
    rows = [
        {"theorem_id": "T1", "source": "book.pdf", "kind": "Equation", "number": "1",
         "statement": "x = a + b"},
        {"theorem_id": "T2", "source": "book.pdf", "kind": "Theorem", "number": "2",
         "statement": "By Equation 1 the bound holds"},
        {"theorem_id": "T3", "source": "bad 2312.11067", "kind": "Definition", "number": "1",
         "statement": "def"},
    ]
    thm.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    eq = tmp_path / "data/mind/equations.jsonl"
    eq.parent.mkdir(parents=True)
    eq.write_text(
        json.dumps(
            {"formula_ast": {"op": "logit"}, "m5_feature_keys": ["f1"], "sample_size_n": 80,
             "min_sample_size": 30}
        )
        + "\n",
        encoding="utf-8",
    )
    prim_dir = tmp_path / "foundry/artifacts/primitives"
    prim_dir.mkdir(parents=True)
    (prim_dir / "b.json").write_text(
        json.dumps(
            {"title": "Book", "gse_mapping": {"seam": "x"}, "primitives": [
                {"primitive_id": "p", "name": "Pocket", "latex": "\\exp(-t)",
                 "symbol_and_unit_ledger": "{'t': 'seconds'}", "assumptions": "iid hazards"}
            ]}
        ),
        encoding="utf-8",
    )
    res = mine_theorem_ast_corpus_index(tmp_path)
    s = res["summary"]
    assert s["stats"]["theorem_rows"] == 3
    assert s["stats"]["citation_edges"] == 1
    assert s["stats"]["foundry_primitives"] == 1
    assert s["retracted_g_fire_locked_nodes"] == 1
    assert s["equation_sample_floor_pass"] == 1
    assert s["is_dag"] is True
    assert set(s["node_type_counts"]) == {"V_def", "V_eq", "V_assump", "V_code"}


def test_persisted_index_and_bridge() -> None:
    path = REPO_ROOT / INDEX_REL
    assert path.is_file()
    raw = path.read_bytes()
    assert all(b <= 127 for b in raw)
    data = json.loads(raw)
    st = data["summary"]["stats"]
    assert st["theorem_rows"] >= 2949
    assert st["foundry_files"] >= 12558
    assert st["complete_books"] >= 503
    assert st["manifest_pdfs"] >= 877
    assert st["sovereign_primitives"] >= 58486
    assert data["summary"]["is_dag"] is True
    assert data["summary"]["retracted_g_fire_locked_nodes"] >= 1

    sym_ok = sympy_six_regime_limit_screen("logit_inv(2.0 * p - 1.0) * 10.0", {"p": (0.0, 1.0)})
    assert sym_ok["admissible"] is True and sym_ok["sympy_limits_finite"] is True
    sym_pole = sympy_six_regime_limit_screen("1.0 / p", {"p": (0.0, 1.0)})
    assert sym_pole["admissible"] is False and sym_pole["sympy_limits_finite"] is False

    br = evaluate_wave24_theorem_ast_bridge(
        query_terms=["pressure", "sack", "wind"],
        regime_vector_8d=[0.3, 0.45, 1.0, 2.0, 0.5, 0.1, 0.2, 0.0],
        repo_root=REPO_ROOT,
    )
    assert br["wave24_theorem_ast_wired"] is True
    assert br["live_stage2_weight"] == 0.0
    assert br["g_doc_nodes"] > 300000
    assert br["ragas_gate_passed"] is True
    assert br["sympy_six_regime_admissible"] is True
    assert br["g_fire_retracted_weight"] == 0.0
    assert len(br["fused_top_doc_ids"]) == 8
