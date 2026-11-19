"""Task 6: 100% research-corpus wiring audit and Week 11 TNF zero-surprise preflight tests."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.guardrails.verify_total_corpus_and_w11_preflight import (
    DEFAULT_RECEIPT_PATH,
    run_total_corpus_and_w11_preflight,
)


def test_total_corpus_and_w11_preflight_all_invariants_green() -> None:
    receipt = run_total_corpus_and_w11_preflight(write_receipt=False)
    assert receipt["schema"] == "gse.w11_tnf_zero_surprise_preflight_receipt.v1"

    corpus = receipt["corpus"]
    assert int(corpus["pdfs_877"]) == 877
    assert int(corpus["alphaxiv_papers"]) >= 203
    assert int(corpus["matrix_equations"]) >= 9875
    assert int(corpus["inventory_equations"]) >= 21419
    assert int(corpus["complete_books"]) >= 503
    assert int(corpus["foundry_primitives"]) >= 50656
    assert int(corpus["nov16_to_18_csvs"]) >= 145
    assert int(corpus["zero_odds_rlvr_count"]) >= 412

    reach = receipt["reachability"]
    assert int(reach["src_gse_engine_total"]) >= 98
    assert int(reach["src_gse_engine_reachable"]) == int(reach["src_gse_engine_total"])
    assert reach["unreachable"] == []

    parity = receipt["parity"]
    assert len(str(parity["w11_sealed_sha256"])) == 64
    assert parity["w11_sealed_sha256"] == parity["web_sealed_sha256"]
    assert parity["hash_match"] is True

    guardrails = receipt["guardrails"]
    assert int(guardrails["public_root_zero_vault_violations"]) == 0
    assert int(guardrails["vercel_cron_count"]) <= 16
    assert guardrails["vercel_config_byte_identical"] is True
    assert int(guardrails["mind_staging_records"]) >= 500
    assert guardrails["mind_jsonl_untouched"] is True

    gov = receipt["governance"]
    assert float(gov["clinical_ruo_sports_weight"]) == 0.0
    assert gov["real_money_stake_cleared"] is False
    assert float(gov["live_stake_fraction"]) == 0.0

    assert receipt["overall_ready"] is True
    assert len(str(receipt["receipt_sha256"])) == 64


def test_written_preflight_receipt_is_pure_ascii_and_matches_live_audit(tmp_path: Path) -> None:
    out_p = tmp_path / "preflight_receipt.json"
    receipt = run_total_corpus_and_w11_preflight(write_receipt=True, receipt_path=out_p)
    assert out_p.is_file()
    raw = out_p.read_text(encoding="ascii")
    parsed = json.loads(raw)
    assert parsed["receipt_sha256"] == receipt["receipt_sha256"]
    assert parsed["overall_ready"] is True
    assert DEFAULT_RECEIPT_PATH.name == "w11_tnf_zero_surprise_preflight_receipt_2026_11_18.json"
