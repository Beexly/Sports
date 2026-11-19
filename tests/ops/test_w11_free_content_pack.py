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
COMMITTED_PACK_PATH = (
    REPO_ROOT
    / "data"
    / "content-os"
    / "drafts"
    / "week11_free_environment_threads_2026_11_18.json"
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
    re.compile(r"\b(?:lock|locked|locks|guaranteed)\b", re.IGNORECASE),
    re.compile(r"risk[- ]free", re.IGNORECASE),
    re.compile("Users/" + "Garrett", re.IGNORECASE),
    re.compile(r"%"),
]


def _load_paid_selections() -> set[str]:
    doc = json.loads(PROJECTIONS_PATH.read_text(encoding="utf-8"))
    paid: set[str] = set()
    for game in doc["games"]:
        for row in list(game["game_plays"]) + list(game["player_props"]):
            if row.get("decision") == "PLAY" and row.get("publish_allowed") is True:
                sel = str(row["selection"]).strip()
                if sel:
                    paid.add(sel)
    return paid


def test_generate_w11_free_environment_content_pack_draft_only(tmp_path: Path) -> None:
    from scripts.ops.generate_w11_free_environment_content_pack import (
        generate_free_environment_content_pack,
    )

    out_path = tmp_path / "w11_free_pack.json"
    pack = generate_free_environment_content_pack(
        source_path=PROJECTIONS_PATH, output_path=out_path
    )

    assert out_path.exists()
    raw = out_path.read_text(encoding="utf-8")
    assert raw.isascii()

    assert pack["draft_only"] is True
    assert pack["auto_publish_allowed"] is False
    assert pack["free_lane_only"] is True
    assert pack["paid_picks_included"] is False
    assert pack["season"] == 2026
    assert pack["week"] == 11
    assert pack["projection_source_sha256"] == EXPECTED_SOURCE_SHA256

    for pat in BANNED_PATTERNS:
        assert not pat.search(raw), f"banned token matched in content pack: {pat.pattern}"

    threads = pack["threads"]
    assert isinstance(threads, list) and len(threads) >= 4
    matchups = {t["matchup"] for t in threads}
    assert "IND @ HOU" in matchups

    paid_selections = _load_paid_selections()
    assert paid_selections
    for sel in paid_selections:
        assert sel not in raw, f"paid selection leaked into free content pack: {sel}"

    for thread in threads:
        assert thread["draft_only"] is True
        assert thread["lane"] == "free_environment"
        assert isinstance(thread["posts"], list) and len(thread["posts"]) >= 2
        for post in thread["posts"]:
            assert isinstance(post, str) and 20 <= len(post) <= 280


def test_committed_w11_free_environment_pack_exists_and_clean() -> None:
    raw = COMMITTED_PACK_PATH.read_text(encoding="utf-8")
    assert raw.isascii()
    data = json.loads(raw)
    assert data["draft_only"] is True
    assert data["auto_publish_allowed"] is False
    assert data["free_lane_only"] is True
    assert data["paid_picks_included"] is False
    assert data["projection_source_sha256"] == EXPECTED_SOURCE_SHA256
    for pat in BANNED_PATTERNS:
        assert not pat.search(raw), f"banned token matched: {pat.pattern}"
    paid_selections = _load_paid_selections()
    for sel in paid_selections:
        assert sel not in raw, f"paid selection leaked: {sel}"
