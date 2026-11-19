from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

PROJECTIONS_PATH = (
    REPO_ROOT / "data" / "engine" / "week11_unified_sealed_projections_2026_11_18.json"
)
EXPECTED_SOURCE_SHA256 = (
    "ab30af438cfac08e66ed12fb8f545cb032ec3567d4a9160a95ff4237b24b1bd1"
)

BANNED_PATTERNS = [
    re.compile(r"\bJEV\b", re.IGNORECASE),
    re.compile(r"\bSinkhorn\b", re.IGNORECASE),
    re.compile(r"\bCholesky\b", re.IGNORECASE),
    re.compile(r"10,000\s+worlds", re.IGNORECASE),
    re.compile(r"tau_hat", re.IGNORECASE),
    re.compile(r"Romano\s+CQR", re.IGNORECASE),
    re.compile(r"62-23-1"),
    re.compile(r"\blocked\b", re.IGNORECASE),
    re.compile(r"\bguaranteed\b", re.IGNORECASE),
    re.compile(r"risk[- ]free", re.IGNORECASE),
    re.compile(r"Props withheld", re.IGNORECASE),
    re.compile("Users/" + "Garrett", re.IGNORECASE),
    re.compile(r"%"),
]

REQUIRED_WATCH_KEYS = ("one_q", "kicking", "idp", "atd")
REQUIRED_ROW_KEYS = (
    "matchup",
    "category",
    "selection",
    "decision",
    "publishAllowed",
    "model_p",
    "market_p",
    "edge",
    "model_median",
    "rationale",
    "confidence_display",
    "market_line",
)


def test_export_sealed_slate_builds_clean_week11_board(tmp_path: Path) -> None:
    from scripts.ops.export_sealed_slate_to_web import export_sealed_slate

    out_path = tmp_path / "current-sealed-slate.json"
    board = export_sealed_slate(source_path=PROJECTIONS_PATH, output_path=out_path)

    assert out_path.exists()
    raw = out_path.read_text(encoding="utf-8")
    assert raw.isascii(), "exported sealed slate JSON must be pure 7-bit ASCII"

    loaded = json.loads(raw)
    assert loaded == board

    assert board["season"] == 2026
    assert board["week"] == 11
    assert board["projection_source_sha256"] == EXPECTED_SOURCE_SHA256
    assert re.fullmatch(r"[0-9a-f]{64}", board["seal_digest"])
    assert "T" in board["generated_at"] and board["generated_at"].endswith("Z")

    for pat in BANNED_PATTERNS:
        assert not pat.search(raw), f"banned token matched in exported JSON: {pat.pattern}"

    counts = board["counts"]
    assert counts["publish"] == 0
    assert board["props"] == []
    assert counts["evaluated"] >= 13
    assert counts["evaluated"] == counts["publish"] + counts["abstain"] + counts["pass"]

    watch = board["watch"]
    for key in REQUIRED_WATCH_KEYS:
        assert key in watch and isinstance(watch[key], list) and len(watch[key]) >= 1

    all_rows = (
        list(board["main"])
        + list(board["props"])
        + list(board["passes"])
        + [row for key in REQUIRED_WATCH_KEYS for row in watch[key]]
    )
    assert counts["evaluated"] == len(all_rows)
    assert len(board["main"]) >= 1
    assert len(board["passes"]) >= 10

    proj_doc = json.loads(PROJECTIONS_PATH.read_text(encoding="utf-8"))
    paid_selections = {
        row["selection"]
        for game in proj_doc["games"]
        for row in (list(game["game_plays"]) + list(game["player_props"]))
        if row.get("decision") == "PLAY" and row.get("publish_allowed") is True
    }
    assert paid_selections, "expected paid PLAY rows in upstream Task 3 artifact"

    seen_matchups = set()
    for row in all_rows:
        for req_key in REQUIRED_ROW_KEYS:
            assert req_key in row, f"missing row field {req_key}"
        assert row["publishAllowed"] is False
        assert row["decision"] in ("ABSTAIN", "PASS")
        assert re.fullmatch(r"\d{1,3}/100", row["confidence_display"])
        assert row["selection"] not in paid_selections, (
            f"paid pick leaked onto public sealed slate: {row['selection']}"
        )
        seen_matchups.add(row["matchup"])

    expected_matchups = {g["matchup"] for g in proj_doc["games"]}
    assert expected_matchups.issubset(seen_matchups), (
        f"missing matchups on sealed slate: {expected_matchups - seen_matchups}"
    )


def test_committed_current_sealed_slate_matches_week11_contract() -> None:
    committed_path = (
        REPO_ROOT / "apps" / "web" / "lib" / "slate" / "current-sealed-slate.json"
    )
    raw = committed_path.read_text(encoding="utf-8")
    assert raw.isascii()
    data = json.loads(raw)
    assert data.get("season") == 2026
    assert data.get("week") == 11
    assert data.get("projection_source_sha256") == EXPECTED_SOURCE_SHA256
    assert data["counts"]["publish"] == 0
    assert data["props"] == []
