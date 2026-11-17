"""Wave 22 cross-branch salvage verification and vault cross-link graph tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from gse_engine.memory.wave22_cross_branch_salvage_and_vault_crosslink_suite import (
    SALVAGE_FEED_REL,
    WAVE22_VAULTS,
    Wave22SalvageIntegrityError,
    build_vault_crosslink_graph,
    evaluate_wave22_crosslink_bridge,
    exact_substring_dedup,
    extract_link_tokens,
    firewall_violations,
    sanitize_trainer_record,
    to_ascii_7bit,
    verify_cross_branch_salvage_feed,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_to_ascii_maps_typography_and_drops_remainder() -> None:
    raw = "pace \u2014 drift \u2018q\u2019 \u201cz\u201d \u00e9"
    out = to_ascii_7bit(raw)
    assert out == "pace - drift 'q' \"z\" "
    assert all(ord(c) <= 127 for c in out)


def test_firewall_flags_odds_words_and_forbidden_family() -> None:
    assert "odds_vocabulary" in firewall_violations("the moneyline moved")
    assert "odds_vocabulary" in firewall_violations("two parlays and a wager")
    assert "forbidden_word_family" in firewall_violations("pass b" + "lock win rate")
    assert "secret_like_token" in firewall_violations("Bearer abc")
    assert firewall_violations("EPA per dropback rose 0.04 on early downs") == []


def test_sanitize_maps_messages_and_assigns_tier() -> None:
    rec = {
        "messages": [
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "Explain pressure to sack conversion."},
            {"role": "assistant", "content": "Conversion is a survival curve \u2014 hazard."},
        ]
    }
    out = sanitize_trainer_record(rec, source_ref="origin/x", source_path="a.jsonl")
    assert out is not None
    assert out["prompt"].startswith("Explain pressure")
    assert out["response"] == "Conversion is a survival curve - hazard."
    assert out["tier"] == "TIER_1_FOUNDATION"
    assert len(out["id"]) == 16


def test_sanitize_drops_odds_records_and_empty_records() -> None:
    assert (
        sanitize_trainer_record(
            {"prompt": "q", "response": "take the moneyline"}, source_ref="r", source_path="p"
        )
        is None
    )
    assert sanitize_trainer_record({"foo": 1}, source_ref="r", source_path="p") is None


def test_exact_substring_dedup_keeps_longest_container() -> None:
    texts = ["abc", "xxabcxx", "zzz", "abc", "zz"]
    kept = exact_substring_dedup(texts)
    assert kept == [1, 2]


def test_extract_link_tokens_typed() -> None:
    txt = (
        '{"game_id": "2026_05_KC_BUF", "gsis_id": "00-0036442", "team": "KC"} '
        "EQ_00042 THM_20261106_00001 FAM_000_PRESSURE TEAM-NFL-ARI 2312.11067 "
        'Path("data", "identity") data/equations'
    )
    toks = extract_link_tokens(txt)
    assert toks["game_id"] == {"2026_05_KC_BUF"}
    assert toks["gsis_id"] == {"00-0036442"}
    assert toks["equation_id"] == {"EQ_00042"}
    assert toks["theorem_id"] == {"THM_20261106_00001"}
    assert toks["team_canonical"] == {"TEAM-NFL-ARI"}
    assert toks["team_abbr_field"] == {"KC"}
    assert "2312.11067" in toks["arxiv_id"]
    assert toks["data_path_join"] == {"data/identity"}
    assert toks["data_path_ref"] == {"data/equations"}


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def test_crosslink_graph_on_synthetic_vaults(tmp_path: Path) -> None:
    _write(
        tmp_path / "data/identity/ids.jsonl",
        json.dumps({"gsis_id": "00-0011111", "team": "KC"}) + "\n",
    )
    _write(
        tmp_path / "data/gse-dataset/f.jsonl",
        json.dumps({"game_id": "2026_01_KC_BUF", "gsis_id": "00-0011111", "team": "KC"})
        + "\n",
    )
    _write(tmp_path / "engine/k.py", 'ROOT = Path("data", "identity")\n')
    vaults = (
        ("data_identity", "data/identity", "data"),
        ("data_gse_dataset", "data/gse-dataset", "data"),
        ("engine", "engine", "code"),
        ("workers", "workers", "code"),
    )
    g = build_vault_crosslink_graph(tmp_path, vaults=vaults)
    assert g["vaults_present"] == 3
    assert g["vaults_missing"] == ["workers"]
    assert g["undirected_edges"] == 1
    edge = g["edges"][0]
    assert {edge["u"], edge["v"]} == {"data_identity", "data_gse_dataset"}
    assert edge["shared_by_type"] == {"gsis_id": 1, "team_abbr_field": 1}
    assert g["code_to_data"] == [
        {"from": "engine", "to": "data_identity", "ref": "data/identity"}
    ]
    assert g["isolated_present_vaults"] == []
    g2 = build_vault_crosslink_graph(tmp_path, vaults=vaults)
    assert g2["crosslink_graph_sha256"] == g["crosslink_graph_sha256"]


def test_verify_salvage_feed_detects_breaches(tmp_path: Path) -> None:
    assert verify_cross_branch_salvage_feed(tmp_path)["feed_present"] is False
    feed = tmp_path / SALVAGE_FEED_REL
    good = [
        {
            "id": "a" * 16,
            "source_ref": "origin/x",
            "source_path": "p",
            "tier": "TIER_1_FOUNDATION",
            "prompt": "q",
            "response": "pocket survival hazard rises with pressure",
            "provenance": "wave22_cross_branch_readonly_salvage",
        },
        {
            "id": "b" * 16,
            "source_ref": "origin/x",
            "source_path": "p",
            "tier": "TIER_2_SYNTHESIS",
            "prompt": "q",
            "response": "drive success decays with third-down distance",
            "provenance": "wave22_cross_branch_readonly_salvage",
        },
    ]
    _write(feed, "\n".join(json.dumps(r) for r in good) + "\n")
    res = verify_cross_branch_salvage_feed(tmp_path)
    assert res["verified"] is True
    assert res["records"] == 2
    assert res["tier_counts"]["TIER_1_FOUNDATION"] == 1

    bad = [*good, dict(good[0], id="c" * 16, response="pocket survival")]
    _write(feed, "\n".join(json.dumps(r) for r in bad) + "\n")
    with pytest.raises(Wave22SalvageIntegrityError, match="substring_duplicates"):
        verify_cross_branch_salvage_feed(tmp_path)

    odds = [dict(good[0], response="the sportsbook line")]
    _write(feed, "\n".join(json.dumps(r) for r in odds) + "\n")
    with pytest.raises(Wave22SalvageIntegrityError, match="firewall_hits"):
        verify_cross_branch_salvage_feed(tmp_path)

    out_of_order = [good[1], good[0]]
    _write(feed, "\n".join(json.dumps(r) for r in out_of_order) + "\n")
    with pytest.raises(Wave22SalvageIntegrityError, match="tier_order_not_monotone"):
        verify_cross_branch_salvage_feed(tmp_path)


def test_live_repo_crosslink_and_bridge_shadow_weight() -> None:
    g = build_vault_crosslink_graph(REPO_ROOT)
    assert g["vaults_total"] == len(WAVE22_VAULTS) == 12
    assert g["vaults_present"] == 12
    assert g["undirected_edges"] >= 1
    bridge = evaluate_wave22_crosslink_bridge(away_team="KC", home_team="BUF", repo_root=REPO_ROOT)
    assert bridge["wave22_wired"] is True
    assert bridge["live_stage2_weight"] == 0.0
    assert bridge["wave22_epa_adj"] == 0.0


def test_live_salvage_feed_if_staged_is_clean() -> None:
    res = verify_cross_branch_salvage_feed(REPO_ROOT)
    if res["feed_present"]:
        assert res["verified"] is True
        assert res["non_ascii_bytes"] == 0


def test_integrator_imports_wave22_bridge() -> None:
    src = (REPO_ROOT / "src/gse_engine/compute/corpus_situational_integrator.py").read_text(
        encoding="utf-8"
    )
    assert "evaluate_wave22_crosslink_bridge(" in src
    assert "wave22_live_stage2_weight" in src
