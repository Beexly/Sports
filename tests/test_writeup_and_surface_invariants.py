"""Durable, data-driven invariants for writeups and public surfaces.

These replace the snapshot assertions that used to live inside the historical
session-audit e2e modules (``tests/e2e/test_session_3cd84455_and_agy_skills_e2e.py``
and ``tests/e2e/test_round2_gap_audit_and_google_skills_e2e.py``). Those modules
assert the antigravity dev-box filesystem layout and the pre-recompute ledger
snapshot, so they cannot be CI gates; this module keeps only the rules that are
true for any commit.

Every prohibition here is derived from data in the repo, never from a hardcoded
name list: a player is banned from a writeup when the current injury export
marks him Out, and that export moves week to week.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WRITEUP_ENGINE = REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts"
ENGINE_BRIDGE = REPO_ROOT / "apps" / "web" / "lib" / "engine" / "engine-live-bridge.ts"
INJURIES_CSV = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"

CONFIDENCE_RE = re.compile(r"\b\d{1,3}\s*/\s*100\b")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _current_week_out_players() -> tuple[int, set[str]]:
    """Players whose latest reported status in the newest week is Out."""
    rows = [
        r
        for r in csv.DictReader(INJURIES_CSV.open(encoding="utf-8", newline=""))
        if r.get("season") == "2026" and str(r.get("week", "")).strip().isdigit()
    ]
    assert rows, "injuries_2026.csv has no 2026 rows; cannot ground the writeup gate"
    week = max(int(r["week"]) for r in rows)
    out = {
        (r.get("full_name") or "").strip()
        for r in rows
        if int(r["week"]) == week and (r.get("report_status") or "").strip().lower() == "out"
    }
    return week, {n for n in out if n}


def test_writeup_engine_never_names_a_player_rule_out_for_the_current_week() -> None:
    week, out_players = _current_week_out_players()
    writeup = _read(WRITEUP_ENGINE)
    # Injury exports used by the engine mark designations as "First Initial. Last";
    # compare both that form and the full name.
    offenders = sorted(
        name
        for name in out_players
        if name in writeup or f"{name.split()[0][0]}. {name.split()[-1]}" in writeup
    )
    assert not offenders, (
        f"Week {week} lists these players Out, but the writeup engine names them: {offenders}"
    )


def test_writeup_engine_emits_at_most_one_play() -> None:
    writeup = _read(WRITEUP_ENGINE)
    side_plays = len(re.findall(r'"sideDecision":\s*"PLAY"', writeup))
    total_plays = len(re.findall(r'"totalDecision":\s*"PLAY"', writeup))
    assert side_plays + total_plays <= 1, f"writeup engine publishes {side_plays + total_plays} plays"


def test_voided_record_never_reaches_active_storefront_surfaces() -> None:
    for rel in (
        "apps/web/app/packages/page.tsx",
        "apps/web/lib/packages/catalog.ts",
        "apps/web/app/pricing/page.tsx",
    ):
        assert "62-23-1" not in _read(REPO_ROOT / rel), f"voided 62-23-1 record appears in {rel}"


def test_engine_bridge_derives_the_record_instead_of_hardcoding_it() -> None:
    bridge = _read(ENGINE_BRIDGE)
    assert "overallRecord: formatWlp(verifiedLedger.official.wlp)" in bridge, (
        "engine bridge must derive overallRecord from the verified ledger view"
    )
    # The superseded snapshot may appear, but only inside its labelled clause.
    for line in bridge.splitlines():
        if "47-19-1" in line:
            lowered = line.lower()
            assert any(word in lowered for word in ("superseded", "historical")), (
                f"unlabelled 47-19-1 record line: {line.strip()[:160]}"
            )


def test_free_tnf_note_carries_no_confidence_numbers() -> None:
    bridge = _read(ENGINE_BRIDGE)
    start = bridge.find("export const FREE_TNF_GAME_ENVIRONMENT_ANALYTICS")
    assert start != -1, "free TNF note is missing from the engine bridge"
    end = bridge.find("} as const;", start)
    assert end != -1, "free TNF note is not a const literal"
    block = bridge[start:end]
    assert not CONFIDENCE_RE.search(block), (
        "the free game-environment note must publish no confidence numbers (P0-2)"
    )


def test_gitignore_excludes_env_files() -> None:
    assert ".env" in _read(REPO_ROOT / ".gitignore")