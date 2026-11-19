"""Tests for Task 9: Compound Mind Shard, Week 11 DvP sheet, and worker fleet map."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

EXPORTER_SCRIPT = REPO_ROOT / "scripts" / "ops" / "export_mind_staging_waves20_to_48_shard.py"
SHARD_PATH = (
    REPO_ROOT
    / "data"
    / "mind_staging"
    / "mind_2026_11_18_waves20_to_48_compound_shard.jsonl"
)
W11_DVP_SHEET = REPO_ROOT / "data" / "content-os" / "week11_dvp_free_sheet_2026.json"
WORKER_FLEET_DOC = (
    REPO_ROOT / "docs" / "ops" / "WORKER_FLEET_OFFLOAD_AND_AIRWAVE_ACTIVATION_2026_11.md"
)

REQUIRED_FAMILIES = frozenset(
    {
        "books_503",
        "equations_21419",
        "alphaxiv_203",
        "rlvr_412",
        "w1_11_bakeoff",
    }
)

BANNED_PUBLIC_JARGON = (
    "JEV",
    "Sinkhorn",
    "Cholesky",
    "10,000 worlds",
    "tau_hat",
    "Romano CQR",
)

PAID_PICK_MARKERS = (
    "official_plays",
    "recommended_bets",
    "publish_allowed",
    "expected_clv",
    "conformal_lower_prob",
    "model_prob",
    "unit_stake",
    "PLAY",
)

_FORBIDDEN_HOME_SLASH = "Users" + "/Garrett"
_FORBIDDEN_HOME_BACK = "Users" + "\\Garrett"


def _assert_clean_ascii_and_no_local_user(text: str, label: str) -> None:
    assert text.isascii(), f"{label} must be pure 7-bit ASCII"
    assert _FORBIDDEN_HOME_SLASH not in text, f"{label} contains non-repo local home path"
    assert _FORBIDDEN_HOME_BACK not in text, f"{label} contains non-repo local home path"


def test_exporter_script_exists_and_shard_is_valid_ascii_with_all_5_families() -> None:
    assert EXPORTER_SCRIPT.is_file(), f"Missing exporter script: {EXPORTER_SCRIPT}"
    script_text = EXPORTER_SCRIPT.read_text(encoding="utf-8")
    _assert_clean_ascii_and_no_local_user(script_text, "exporter script")
    assert "brain/mind.jsonl" in script_text or "mind.jsonl" in script_text

    # Script must refuse targeting brain/mind.jsonl directly.
    bad_target = REPO_ROOT / "brain" / "mind.jsonl"
    proc = subprocess.run(
        [sys.executable, str(EXPORTER_SCRIPT), "--output", str(bad_target)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode != 0, "Exporter must refuse writing to brain/mind.jsonl"

    assert SHARD_PATH.is_file(), f"Missing generated shard: {SHARD_PATH}"
    raw_lines = [
        ln for ln in SHARD_PATH.read_text(encoding="ascii").splitlines() if ln.strip()
    ]
    assert len(raw_lines) >= 500, f"Expected >= 500 records, got {len(raw_lines)}"

    families_seen: set[str] = set()
    ids_seen: set[str] = set()
    for idx, raw in enumerate(raw_lines):
        _assert_clean_ascii_and_no_local_user(raw, f"shard line {idx + 1}")
        rec = json.loads(raw)
        assert isinstance(rec, dict)
        assert rec.get("trainer_ready") is True
        assert str(rec.get("id") or "").strip()
        assert rec["id"] not in ids_seen, f"Duplicate shard id: {rec['id']}"
        ids_seen.add(str(rec["id"]))
        fam = str(rec.get("family") or "")
        families_seen.add(fam)

    assert REQUIRED_FAMILIES.issubset(families_seen), (
        f"Missing required families: {REQUIRED_FAMILIES - families_seen}"
    )


def test_week11_dvp_free_sheet_schema_clean_copy_and_no_paid_picks() -> None:
    assert W11_DVP_SHEET.is_file(), f"Missing Week 11 DvP sheet: {W11_DVP_SHEET}"
    raw_text = W11_DVP_SHEET.read_text(encoding="utf-8")
    _assert_clean_ascii_and_no_local_user(raw_text, "week11_dvp_free_sheet_2026.json")

    low = raw_text.lower()
    for jargon in BANNED_PUBLIC_JARGON:
        assert jargon.lower() not in low, f"Banned jargon '{jargon}' found in free DvP sheet"
    for marker in PAID_PICK_MARKERS:
        if marker == "PLAY":
            assert '"PLAY"' not in raw_text, "Paid pick decision PLAY leaked in free DvP sheet"
        else:
            assert marker not in low, f"Paid pick field '{marker}' leaked in free DvP sheet"

    data = json.loads(raw_text)
    assert int(data.get("season", 0)) == 2026
    assert int(data.get("week", 0)) == 11
    assert data.get("type") == "FREE_TOP_OF_FUNNEL_DVP"
    rankings = data.get("rankings")
    assert isinstance(rankings, dict) and len(rankings) == 32
    matchup_env = data.get("week11_matchup_environments")
    assert isinstance(matchup_env, list) and len(matchup_env) >= 13


def test_worker_fleet_offload_and_airwave_doc_covers_all_5_workers() -> None:
    assert WORKER_FLEET_DOC.is_file(), f"Missing worker fleet doc: {WORKER_FLEET_DOC}"
    doc_text = WORKER_FLEET_DOC.read_text(encoding="utf-8")
    _assert_clean_ascii_and_no_local_user(doc_text, "WORKER_FLEET_OFFLOAD doc")

    for required_token in (
        "workers/airwave-listener",
        "immortal-orchestrator",
        "content-publishing",
        "data-refresh",
        "twitter-bot",
    ):
        assert required_token in doc_text, f"Missing worker section '{required_token}'"
