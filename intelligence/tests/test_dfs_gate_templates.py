"""Validation for the DFS process-gate templates (C-063..C-072).

The gates were template-only process records with no home. They now live as
stamped reasoning templates in intelligence/reasoning-templates/. This test
pins the homing: one file per gate, every schema header field present,
census IDs exactly C-063..C-072 once each, a Rule section per file, and the
emission fence (ZERO_OBJECT) on every template.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

BUCKET = Path(__file__).resolve().parents[1] / "reasoning-templates"

EXPECTED = {
    "C-063": ("dfs-gate-00-data-lock.md", "GATE 00"),
    "C-064": ("dfs-gate-01-qb-pool-scan.md", "GATE 01"),
    "C-065": ("dfs-gate-02-game-pick-firewall.md", "GATE 02"),
    "C-066": ("dfs-gate-03-stack-rules.md", "GATE 03"),
    "C-067": ("dfs-gate-04-injury-gate.md", "GATE 04"),
    "C-068": ("dfs-gate-05-weather-gate.md", "GATE 05"),
    "C-069": ("dfs-gate-06-garbage-time-discount.md", "GATE 06"),
    "C-070": ("dfs-gate-07-thesis-to-roster-audit.md", "GATE 07"),
    "C-071": ("dfs-gate-08-garretts-calls.md", "GATE 08"),
    "C-072": ("dfs-gate-09-simulations.md", "GATE 09"),
}


def header_of(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"^- ([a-z_]+): (.+)$", line)
        if m:
            fields[m.group(1)] = m.group(2).strip()
    return fields


def test_schema_declares_the_required_fields():
    schema = json.loads((BUCKET / "template.schema.json").read_text())
    for field in (
        "census_id", "family", "kind", "cadence", "inputs", "stamp_discipline",
        "reasoning_availability", "emission", "depends_on", "failure_lesson",
    ):
        assert field in schema["required"], field


def test_one_file_per_gate_with_complete_stamped_header():
    schema = json.loads((BUCKET / "template.schema.json").read_text())
    required = schema["required"]
    seen: set[str] = set()
    for census_id, (filename, gate_label) in EXPECTED.items():
        path = BUCKET / filename
        assert path.exists(), f"missing template file for {census_id}: {filename}"
        text = path.read_text()
        header = header_of(text)
        for field in required:
            assert header.get(field), f"{filename}: header field '{field}' missing or empty"
        assert header["census_id"] == census_id, filename
        assert header["kind"] == "stamped reasoning template", filename
        assert header["family"] == "dfs-process", filename
        assert header["emission"] == "ZERO_OBJECT", filename
        assert header["reasoning_availability"] == "NO", filename
        assert "weekly slate lock timestamps" in header["stamp_discipline"], filename
        assert gate_label in text, filename
        assert "## Rule" in text, filename
        seen.add(census_id)
    assert seen == set(EXPECTED)


def test_no_extra_gate_files_and_no_duplicate_census_ids():
    files = sorted(BUCKET.glob("dfs-gate-*.md"))
    assert len(files) == 10
    ids = [header_of(f.read_text())["census_id"] for f in files]
    assert len(set(ids)) == 10


def test_index_covers_all_nineteen_templates():
    index = json.loads((BUCKET / "index.json").read_text())
    entries = {t["census_id"]: t for t in index["templates"]}
    assert len(entries) == 19
    # The nine founding templates, indexed by census ID.
    for founding in ("C-014", "C-182", "C-016", "C-017", "C-018", "C-019", "C-022", "C-023", "C-024"):
        assert entries[founding]["home"] == "ingestion ledger record", founding
    # The ten gates, each pointing at a real file.
    for census_id, (filename, _) in EXPECTED.items():
        assert entries[census_id]["file"] == filename, census_id
        assert (BUCKET / filename).exists(), census_id
