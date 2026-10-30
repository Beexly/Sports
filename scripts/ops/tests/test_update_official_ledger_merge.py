#!/usr/bin/env python3
"""Guards for the Official New Engine ledger builder (scripts/ops/update_official_16_5_ledger.py).

The builder is a PRE-GAME writer for a slate that has since settled. Its old
write path replaced the canonical JSON with a 4-key document and replaced the
ledger Markdown with a 25-line generated header -- destroying the settlement,
the merge resolution, the record reconciliation, the per-row results and the
OWNER-ATTESTED flag on the 16-5 base. These tests pin the merge semantics that
stop that.

Run: python scripts/ops/tests/test_update_official_ledger_merge.py
"""
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "scripts" / "ops"))

import update_official_16_5_ledger as gen  # noqa: E402


# --- merge_preserving: nothing in the file may be lost -----------------------


def test_unknown_top_level_keys_survive():
    existing = {
        "engine_version": "old",
        "settlement_2026-10-29": {"record": "15-6"},
        "merge_resolution_2026-10-30": {"kept": "both"},
    }
    generated = {"engine_version": "new", "as_of": "x", "verified_record": {}, "tonight_pending_card_car_at_gb": []}
    merged = gen.merge_preserving(existing, generated)
    assert merged["settlement_2026-10-29"] == {"record": "15-6"}
    assert merged["merge_resolution_2026-10-30"] == {"kept": "both"}


def test_generator_wins_on_keys_it_owns():
    merged = gen.merge_preserving({"engine_version": "old"}, {"engine_version": "new"})
    assert merged["engine_version"] == "new"


def test_verified_record_merges_fieldwise():
    existing = {
        "verified_record": {
            "wins": 31,
            "prior_record": "16-5",
            "prior_record_verification": {"status": "OWNER_ATTESTED_UNVERIFIED"},
        }
    }
    generated = {"verified_record": {"wins": 16, "losses": 5}}
    merged = gen.merge_preserving(existing, generated)
    vr = merged["verified_record"]
    # generator owns wins -> overwritten
    assert vr["wins"] == 16
    # file-only annotations -> preserved
    assert vr["prior_record"] == "16-5"
    assert vr["prior_record_verification"]["status"] == "OWNER_ATTESTED_UNVERIFIED"


def test_non_dict_existing_is_tolerated():
    assert gen.merge_preserving(None, {"a": 1}) == {"a": 1}
    assert gen.merge_preserving("garbage", {"a": 1}) == {"a": 1}


# --- merge_card_rows: settled rows are never un-settled ---------------------


def test_settled_row_is_not_downgraded_to_pending():
    existing = [
        {"id": "CAR-GB-01", "status": "SETTLED", "result": "WIN", "settling_stat": "GB won 27-19"}
    ]
    generated = [{"id": "CAR-GB-01", "status": "PENDING", "pick": "Packers -3.5"}]
    rows = gen.merge_card_rows(existing, generated)
    assert rows[0]["status"] == "SETTLED"
    assert rows[0]["result"] == "WIN"
    assert rows[0]["settling_stat"] == "GB won 27-19"
    assert rows[0]["pick"] == "Packers -3.5"


def test_pending_row_gains_file_annotations():
    existing = [{"id": "CAR-GB-02", "note": "hand note"}]
    generated = [{"id": "CAR-GB-02", "status": "PENDING"}]
    rows = gen.merge_card_rows(existing, generated)
    assert rows[0]["note"] == "hand note"
    assert rows[0]["status"] == "PENDING"


def test_rows_only_in_file_are_kept():
    existing = [{"id": "CAR-GB-99", "status": "SETTLED"}]
    generated = [{"id": "CAR-GB-01", "status": "PENDING"}]
    ids = [r["id"] for r in gen.merge_card_rows(existing, generated)]
    assert ids == ["CAR-GB-01", "CAR-GB-99"]


def test_row_order_follows_generated_card():
    existing = [{"id": "B"}, {"id": "A"}]
    generated = [{"id": "A"}, {"id": "B"}]
    assert [r["id"] for r in gen.merge_card_rows(existing, generated)] == ["A", "B"]


# --- ledger_is_settled: the pre-game builder has no business on a graded card


def test_pending_ledger_is_not_settled():
    assert gen.ledger_is_settled({"tonight_pending_card_car_at_gb": [{"id": "a", "status": "PENDING"}]}) is False


def test_settlement_key_marks_settled():
    assert gen.ledger_is_settled({"settlement_2026-10-29": {}}) is True


def test_settled_row_marks_settled():
    rows = [{"id": "a", "status": "PENDING"}, {"id": "b", "status": "SETTLED"}]
    assert gen.ledger_is_settled({"tonight_pending_card_car_at_gb": rows}) is True


def test_missing_or_bad_input_is_not_settled():
    assert gen.ledger_is_settled(None) is False
    assert gen.ledger_is_settled({}) is False


# --- check_markdown_clobber: the write is refused when it would lie ---------


GENERATED_MD = """# OFFICIAL NEW ENGINE VERIFIED LEDGER (`16-5`)

| Metric | Value |
| :--- | :--- |
| **Wins – Losses – Pushes** | **`16 - 5 - 0`** |

## Tonight's Official Tracked Card

| ID | Category | Pick | Units | Rating | Edge | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `CAR-GB-01` | Game Line | **Packers -3.5** | `1.00u` | `61/100` | `+8.62c` | `PENDING` |
"""


def test_generated_only_file_is_safe_to_overwrite():
    assert gen.check_markdown_clobber(GENERATED_MD, GENERATED_MD) == []


def test_empty_file_is_safe():
    assert gen.check_markdown_clobber("", GENERATED_MD) == []


def test_extra_sections_are_reported():
    existing = GENERATED_MD + "\n## Settlement (`CAR @ GB`)\n\nGB 27, CAR 19.\n"
    losses = gen.check_markdown_clobber(existing, GENERATED_MD)
    assert any("section" in l for l in losses)


def test_verification_blockquote_is_reported():
    existing = GENERATED_MD.replace(
        "# OFFICIAL NEW ENGINE VERIFIED LEDGER (`16-5`)\n",
        "# OFFICIAL NEW ENGINE VERIFIED LEDGER (`16-5`)\n\n> VERIFICATION STATUS: OWNER-ATTESTED, not ledger-verified.\n",
    )
    losses = gen.check_markdown_clobber(existing, GENERATED_MD)
    assert any("blockquote" in l for l in losses)


def test_widened_card_table_is_reported():
    existing = GENERATED_MD.replace(
        "| ID | Category | Pick | Units | Rating | Edge | Status |",
        "| ID | Category | Pick | Units | Rating | Edge | Status | Result | Actual Outcome |",
    ).replace(
        "| `CAR-GB-01` | Game Line | **Packers -3.5** | `1.00u` | `61/100` | `+8.62c` | `PENDING` |",
        "| `CAR-GB-01` | Game Line | **Packers -3.5** | `1.00u` | `61/100` | `+8.62c` | `SETTLED` | **WIN** | GB 27-19 |",
    )
    losses = gen.check_markdown_clobber(existing, GENERATED_MD)
    assert any("columns" in l for l in losses)


def test_extra_summary_row_is_reported():
    existing = GENERATED_MD.replace(
        "| **Wins – Losses – Pushes** | **`16 - 5 - 0`** |",
        "| **Wins – Losses – Pushes** | **`16 - 5 - 0`** |\n| **Prior Record (entering TNF)** | **`16 - 5`** |",
    )
    losses = gen.check_markdown_clobber(existing, GENERATED_MD)
    assert any("table row" in l for l in losses)


def test_marked_region_is_always_safe():
    existing = f"head\n{gen.GENERATED_BEGIN}\nold\n{gen.GENERATED_END}\ntail\n"
    assert gen.check_markdown_clobber(existing, GENERATED_MD) == []


# --- write_markdown: refusal is enforced, not advisory ----------------------


def test_write_markdown_refuses(tmp_path):
    target = tmp_path / "ledger.md"
    target.write_text(GENERATED_MD + "\n## Settlement\n\nGB 27, CAR 19.\n", encoding="utf-8")
    before = target.read_text(encoding="utf-8")
    with pytest.raises(gen.RefuseToClobber):
        gen.write_markdown(target, GENERATED_MD)
    assert target.read_text(encoding="utf-8") == before, "refusal must not touch the file"


def test_write_markdown_dry_run_writes_nothing(tmp_path):
    target = tmp_path / "ledger.md"
    target.write_text("original", encoding="utf-8")
    assert gen.write_markdown(target, GENERATED_MD, dry_run=True, force=True) is False
    assert target.read_text(encoding="utf-8") == "original"


def test_write_markdown_force_overrides(tmp_path):
    target = tmp_path / "ledger.md"
    target.write_text("original", encoding="utf-8")
    assert gen.write_markdown(target, GENERATED_MD, force=True) is True
    assert target.read_text(encoding="utf-8") == GENERATED_MD


# --- the live artifact: this is the regression that matters ----------------

LEDGER_JSON = REPO / "data" / "engine" / "new_engine_official_ledger_2026.json"
LEDGER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "NEW-ENGINE-OFFICIAL-LEDGER-16-5.md"


@pytest.mark.skipif(not LEDGER_JSON.exists(), reason="canonical ledger not present")
def test_canonical_json_survives_a_pre_game_rebuild():
    """Feed the real file the generator's own 16-5 skeleton; nothing may be lost."""
    existing = json.loads(LEDGER_JSON.read_text(encoding="utf-8"))
    skeleton = {
        "engine_version": "GSE v5.3.0 / 5-Stage JEV 10k-World Snap-by-Snap Engine",
        "as_of": "2026-10-29T18:18:00-05:00",
        "verified_record": {"wins": 16, "losses": 5, "pushes": 0, "total_graded": 21,
                            "win_pct": 76.19, "net_units": "+10.45u",
                            "roi_pct": "+49.76%", "display_banner": "16-5 (76.2%)"},
        "tonight_pending_card_car_at_gb": [
            {"id": r["id"], "status": "PENDING"} for r in existing.get("tonight_pending_card_car_at_gb", [])
        ],
    }
    merged = gen.merge_preserving(existing, skeleton)
    merged["tonight_pending_card_car_at_gb"] = gen.merge_card_rows(
        existing.get("tonight_pending_card_car_at_gb", []), skeleton["tonight_pending_card_car_at_gb"]
    )

    lost_top = set(existing) - set(merged)
    assert not lost_top, f"top-level keys destroyed: {sorted(lost_top)}"

    lost_vr = set(existing.get("verified_record", {})) - set(merged["verified_record"])
    assert not lost_vr, f"verified_record fields destroyed: {sorted(lost_vr)}"

    for old, new in zip(existing.get("tonight_pending_card_car_at_gb", []),
                        merged["tonight_pending_card_car_at_gb"]):
        assert new.get("result") == old.get("result"), f"{old['id']} lost its result"
        assert new.get("status") == old.get("status"), f"{old['id']} lost its status"


@pytest.mark.skipif(not LEDGER_MD.exists(), reason="canonical ledger MD not present")
def test_canonical_markdown_write_is_refused():
    existing = LEDGER_MD.read_text(encoding="utf-8")
    losses = gen.check_markdown_clobber(existing, GENERATED_MD)
    assert losses, "the settled+annotated ledger must not look safe to regenerate"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
