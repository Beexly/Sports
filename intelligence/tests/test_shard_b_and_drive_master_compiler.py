"""Tests for intelligence.foundry_bridge.shard_b_and_drive_master_compiler."""

import gzip
import json
from pathlib import Path

from intelligence.foundry_bridge.shard_b_and_drive_master_compiler import (
    compile_drive_masters,
    compile_shard_b_directory,
    parse_shard_b_markdown_file,
    run_compile,
)


def test_parse_shard_b_markdown_uppercase_and_lowercase_xml(tmp_path: Path) -> None:
    md_path = tmp_path / "abc123_sample.pdf.md"
    md_path.write_text(
        """---
source: "sample.pdf"
folder: "/CorpusRoot"
pages: 14
model: "deepseek/deepseek-v4.1-flash-1017"
words: 1500
---
<THINK_TRACE>
Conformal weighted quantile regression preserves coverage when covariate distributions shift on short weeks [PAGE 3].
</THINK_TRACE>
<SOURCE_OPERATORS_AND_EQUATIONS>
$$Q_{1-\\alpha}(w) = \\inf \\{ y : \\sum_i w_i \\mathbf{1}(s_i \\le y) \\ge 1 - \\alpha \\}$$
Unit: probability in [0, 1].
</SOURCE_OPERATORS_AND_EQUATIONS>
<CROSS_LAYER_VETO_ADJUDICATION>
Reject unshrunk blitz pressure deltas during gale wind > 22 mph [PAGE 9].
</CROSS_LAYER_VETO_ADJUDICATION>
""",
        encoding="utf-8",
    )

    rec = parse_shard_b_markdown_file(md_path)
    assert rec["doc_hash"] == "abc123"
    assert rec["model"] == "deepseek/deepseek-v4.1-flash-1017"
    assert set(rec["sections_present"]) >= {"think", "operators", "cross_layer_veto"}
    assert len(rec["equations"]) == 1
    assert rec["page_refs"] == [3, 9]

    summary, trainer = compile_shard_b_directory(sync_dir=tmp_path)
    assert summary["total_markdown_files"] == 1
    assert summary["files_with_xml_sections"] == 1
    assert len(trainer) == 1


def test_compile_shard_b_deduplicates_by_node_mirrors_and_uses_word_boundaries(tmp_path: Path) -> None:
    from intelligence.foundry_bridge.shard_b_and_drive_master_compiler import classify_situational_family

    # Word-boundary classification must not match "rain" inside "training" or "man" inside "management"
    assert classify_situational_family("neural network model training convergence") == "marketMicrostructure"
    assert classify_situational_family("risk management portfolio optimization") == "marketMicrostructure"
    assert classify_situational_family("heavy rain and crosswind gusts") == "weather"

    # Mirror files under by_node/ must not double-count top-level Shard B files
    (tmp_path / "abc123_sample.md").write_text("<think>Blitz pressure timing.</think>", encoding="utf-8")
    node_dir = tmp_path / "by_node" / "node1"
    node_dir.mkdir(parents=True)
    (node_dir / "abc123_sample.md").write_text("<think>Duplicate mirror.</think>", encoding="utf-8")
    (node_dir / "def456_unpacked.md").write_text("<think>Quarterback CPOE curve.</think>", encoding="utf-8")

    summary, trainer = compile_shard_b_directory(sync_dir=tmp_path)
    assert summary["total_markdown_files"] == 2
    assert summary["files_with_xml_sections"] == 2
    assert {r["doc_hash"] for r in trainer} == {"abc123", "def456"}


def test_compile_drive_masters_and_run_compile(tmp_path: Path) -> None:
    sync_dir = tmp_path / "gcp_sync"
    sync_dir.mkdir()
    (sync_dir / "deadbeef_test.md").write_text(
        "<think>Bayesian posterior update across quarterback CPOE under blitz pressure.</think>\n"
        "<cross_layer_veto>Veto collinear blitz weights.</cross_layer_veto>",
        encoding="utf-8",
    )

    eq_gz = tmp_path / "EQUATIONS-MASTER.jsonl.gz"
    with gzip.open(eq_gz, "wt", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {
                    "book": "Sinkhorn 1964",
                    "author": "R. Sinkhorn",
                    "year": 1964,
                    "page": 12,
                    "section": "Bistochastic scaling",
                    "equation": r"\lim_{k\to\infty} D_1^{(k)} A D_2^{(k)} = P^*",
                    "description": "Optimal transport role scaling across defensive coverage zones.",
                    "domain_tags": ["optimal_transport", "matrix_scaling"],
                }
            )
            + "\n"
        )

    sit_gz = tmp_path / "SITUATIONAL-MASTER.jsonl.gz"
    with gzip.open(sit_gz, "wt", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {
                    "book": "NFL Fatigue Dynamics",
                    "author": "Doe",
                    "year": 2024,
                    "page": 4,
                    "kind": "situational_rule",
                    "situation": "Short week road circadian decay",
                    "statement": "Thursday road offenses traveling east-to-west suffer measurable second-half passing EPA fatigue decay.",
                }
            )
            + "\n"
        )

    vault_dir = tmp_path / "vault"
    vault_dir.mkdir()
    (vault_dir / "extra.jsonl").write_text(json.dumps({"k": 1}) + "\n", encoding="utf-8")

    comp_dir = tmp_path / "comp"
    feed = tmp_path / "feeds" / "trainer.jsonl"

    res = run_compile(
        sync_dir=sync_dir,
        equations_gz=eq_gz,
        situational_gz=sit_gz,
        vault_dir=vault_dir,
        compilation_dir=comp_dir,
        feed_path=feed,
    )
    assert res["ok"] is True
    assert res["shard_b_files_parsed"] == 1
    assert res["drive_equations_rows"] == 1
    assert res["drive_situational_rows"] == 1
    assert res["trainer_feed_rows"] == 3
    assert feed.exists()
