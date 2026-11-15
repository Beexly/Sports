"""Tests for intelligence.foundry_bridge.priority_downloads_deep_harvester."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from intelligence.foundry_bridge.priority_downloads_deep_harvester import (
    compute_gatekeeper_sha256,
    parse_2026_nfl_rulebook,
    parse_usa_today_draft_guide_2026,
    run_deep_harvest,
)


def test_parse_2026_nfl_rulebook_extracts_amendments_rules_and_penalties() -> None:
    pages = {
        1: "2026 OFFICIAL PLAYING RULES OF THE NATIONAL FOOTBALL LEAGUE",
        2: "2026 Rules Changes\nRule-Section-Article\n6-1-3\nModifies setup zone alignment\n6-1-6\nPermits declared onside kick any time\n19-2\nPermits League consultation",
        8: "RULE 1\nTHE FIELD\nSECTION 1 DIMENSIONS\nField Markings 1.",
        72: "RULE 16\nOVERTIME PROCEDURES\nBoth teams have an opportunity to possess the ball.",
        78: "Distance Penalties\nLoss of Five Yards\nDelay of game ................................. 4-6\nFalse start ................................. 7-4-2",
    }
    doc = parse_2026_nfl_rulebook(pages, book_id="64f765ba0a849b1d", sha256="64f7", pages_total=91)
    assert doc["book_id"] == "64f765ba0a849b1d"
    codes = [c["rule_article"] for c in doc["rules_2026_changes"]]
    assert "6-1-3" in codes and "6-1-6" in codes and "19-2" in codes
    assert [r["rule_number"] for r in doc["rules_1_to_19"]] == [1, 16]
    assert doc["penalty_summary_entries_count"] == 2


def test_parse_draft_guide_2026_extracts_prospect_and_team_needs() -> None:
    pages = {
        5: "3 4 DIFFERENCE MAKERS 24 THE TOP 100 68 WHAT EACH NFL TEAM NEEDS",
        26: "1\nArvell Reese  LB\nOHIO STATE\nHeight: 6'4''  Weight: 243 pounds\nWhat to know: Outlier athleticism at linebacker.",
        31: "8\nRueben Bain Jr.\u2002EDGE\nMIAMI (FLA.)\nHeight: 6'3''\u2003Weight: 270 pounds\nWhat to know: Disruptive edge rusher.\n36\nGennings Dunker\u2002IOL\nIOWA\nHeight: 6'5''\u2003Weight: 315 pounds\nWhat to know: Road-grading guard.",
        93: "Minnesota\nVikings\nGeneral manager: To be announced\nHead coach: Kevin O'Connell\nProjected 2026\nNFL Draft picks: 8\n2026 Draft Priorities\nCornerback: Brian Flores needs younger DB help.",
    }
    doc = parse_usa_today_draft_guide_2026(pages, book_id="2b993f18a6c6a83d", sha256="2b99", pages_total=132)
    assert doc["top_100_extracted_count"] == 3
    assert [p["name"] for p in doc["top_100_prospects"]] == ["Arvell Reese", "Rueben Bain Jr.", "Gennings Dunker"]
    assert doc["team_needs_extracted_count"] == 1
    assert doc["team_needs_32_franchises"][0]["team"] == "Minnesota Vikings"


def test_run_deep_harvest_covers_all_pages_without_touching_real_mind(monkeypatch, tmp_path: Path) -> None:
    fake_pdf = tmp_path / "ops-2026-NFL-Rulebook-FINAL.pdf"
    payload = b"%PDF-fake-rulebook"
    fake_pdf.write_bytes(payload)

    expected_h = hashlib.sha256()
    expected_h.update(str(len(payload)).encode())
    expected_h.update(payload)
    assert compute_gatekeeper_sha256(fake_pdf) == expected_h.hexdigest()

    monkeypatch.setattr(
        "intelligence.foundry_bridge.priority_downloads_deep_harvester.PRIORITY_PDF_CATALOG",
        (
            {
                "key": "nfl_rulebook_2026",
                "path": str(fake_pdf),
                "title": "2026 Official Playing Rules",
                "domain": "football",
                "situational_family": "qbSkillScript",
            },
        ),
    )
    monkeypatch.setattr(
        "intelligence.foundry_bridge.priority_downloads_deep_harvester.extract_full_pdf_payloads",
        lambda _paths: {
            str(fake_pdf): {
                "pages_total": 4,
                "pages": {
                    1: "Preface of the 2026 Official NFL Rulebook governing playing field constraints.",
                    2: "2026 Rules Changes\n6-1-5\nModifies touchback spot.",
                    3: "RULE 6\nFREE KICKS\nSECTION 1 KICKOFF\nDynamic kickoff formation setup zone rules.",
                    4: "Penalty Summary\nDelay of game .................................... 4-6",
                },
                "toc": [[1, "Rule 6", 3]],
            }
        },
    )

    rb_out = tmp_path / "rb.json"
    dg_out = tmp_path / "dg.json"
    dig_out = tmp_path / "dig.json"
    feed_out = tmp_path / "feed.jsonl"
    res = run_deep_harvest(
        rulebook_out=rb_out,
        draft_guide_out=dg_out,
        digest_out=dig_out,
        trainer_feed_out=feed_out,
    )
    assert res["pages_inspected_total"] == 4
    assert res["real_books_count"] == 1
    assert rb_out.is_file() and dig_out.is_file() and feed_out.is_file()
    feed_lines = [json.loads(line) for line in feed_out.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert feed_lines[0]["book_id"] == expected_h.hexdigest()[:16]
